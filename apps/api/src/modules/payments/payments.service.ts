import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import * as PDFDocument from 'pdfkit';
import { generateInvoiceNumber } from '../../common/utils/helpers.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID')!,
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET')!,
    });
  }

  // ─── Create Razorpay Order ────────────────────────────────────────────────
  async createRazorpayOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');

    if (!['PENDING'].includes(order.status)) {
      throw new BadRequestException('Order is not in a payable state');
    }

    const rzpOrder = await this.razorpay.orders.create({
      amount: Math.round(Number(order.total) * 100), // convert to paise
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId: order.id, userId },
    });

    // Store Razorpay order ID
    await this.prisma.payment.update({
      where: { orderId },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return {
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: this.configService.get('RAZORPAY_KEY_ID'),
    };
  }

  // ─── Verify Payment ───────────────────────────────────────────────────────
  async verifyPayment(dto: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    method?: string;
  }) {
    const expectedSignature = crypto
      .createHmac('sha256', this.configService.get<string>('RAZORPAY_KEY_SECRET')!)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId: dto.orderId },
        data: {
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
          status: 'CAPTURED',
          webhookVerified: true,
          paidAt: new Date(),
          method: (dto.method as any) ?? undefined,
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: { status: 'CONFIRMED' },
      });

      await tx.transaction.create({
        data: {
          paymentId: (await tx.payment.findUnique({ where: { orderId: dto.orderId }, select: { id: true } }))!.id,
          type: 'CAPTURE',
          amount: (await tx.order.findUnique({ where: { id: dto.orderId }, select: { total: true } }))!.total,
        },
      });
    });

    // Generate GST Invoice
    await this.generateInvoice(dto.orderId);

    return { success: true, message: 'Payment verified and order confirmed' };
  }

  // ─── Razorpay Webhook ──────────────────────────────────────────────────────
  async handleWebhook(payload: string, signature: string) {
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET')!;
    const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    if (expected !== signature) {
      throw new BadRequestException('Webhook signature mismatch');
    }

    const event = JSON.parse(payload) as { event: string; payload: any };
    this.logger.log(`Razorpay Webhook: ${event.event}`);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      // Additional reconciliation if needed
    }

    if (event.event === 'refund.processed') {
      const refund = event.payload.refund.entity;
      await this.prisma.payment.updateMany({
        where: { razorpayPaymentId: refund.payment_id },
        data: { status: 'REFUNDED', refundId: refund.id, refundedAt: new Date() },
      });
    }

    return { received: true };
  }

  // ─── Refund ───────────────────────────────────────────────────────────────
  async refundPayment(orderId: string, amount?: number) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!payment.razorpayPaymentId) throw new BadRequestException('No Razorpay payment found');
    if (payment.status !== 'CAPTURED') throw new BadRequestException('Payment is not in a refundable state');

    const refundAmount = amount ?? Number(payment.amount);
    const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: Math.round(refundAmount * 100),
      speed: 'normal',
      notes: { orderId },
    });

    await this.prisma.payment.update({
      where: { orderId },
      data: {
        status: refundAmount >= Number(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundId: refund.id,
        refundAmount,
        refundedAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDED' },
    });

    return { success: true, refundId: refund.id };
  }

  async getPaymentByOrder(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { transactions: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  // ─── Generate GST Invoice ─────────────────────────────────────────────────
  async generateInvoice(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });
    if (!order) return;

    const existing = await this.prisma.invoice.findUnique({ where: { orderId } });
    if (existing) return; // Already generated

    const cgst = Number(order.taxAmount) / 2;
    const sgst = Number(order.taxAmount) / 2;

    await this.prisma.invoice.create({
      data: {
        orderId,
        invoiceNumber: generateInvoiceNumber(),
        subtotal: order.subtotal,
        cgst,
        sgst,
        igst: 0,
        totalTax: order.taxAmount,
        grandTotal: order.total,
        gstin: this.configService.get('GST_NUMBER'),
      },
    });

    // TODO: Generate PDF via pdfkit and upload to Cloudinary
    // For now the invoice record is created; PDF generation can be added as a BullMQ job
  }
}
