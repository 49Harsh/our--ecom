import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateOrderDto, UpdateOrderStatusDto, OrderQueryDto, OrderStatus } from './dto/orders.dto';
import {
  generateOrderNumber, calculateGST, roundMoney,
  getPaginationParams, buildPaginatedResponse,
} from '../../common/utils/helpers.util';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly couponsService: CouponsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    // 1. Get user's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true, thumbnail: true, status: true } },
                size: true,
                color: true,
                inventory: true,
              },
            },
          },
        },
        coupon: true,
      },
    });

    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    // 2. Validate address
    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');

    // 3. Validate stock for all items
    for (const item of cart.items) {
      const available = (item.variant.inventory?.stock ?? 0) - (item.variant.inventory?.reserved ?? 0);
      if (available < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.variant.product.title}". Available: ${available}`,
        );
      }
      if (item.variant.product.status !== 'ACTIVE') {
        throw new BadRequestException(`Product "${item.variant.product.title}" is no longer available`);
      }
    }

    // 4. Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      const price = Number(item.variant.discountPrice ?? item.variant.price ?? 0);
      return sum + price * item.quantity;
    }, 0);

    // 5. Apply coupon
    let discount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const { coupon, discount: d } = await this.couponsService.validate({
        code: dto.couponCode,
        orderAmount: subtotal,
      });
      discount = d;
      couponId = coupon.id;
    } else if (cart.coupon) {
      discount = this.couponsService.calculateDiscount(cart.coupon, subtotal);
      couponId = cart.coupon.id;
    }

    const discountedSubtotal = subtotal - discount;
    const shippingCharge = discountedSubtotal >= 999 ? 0 : 99;
    const { totalTax: taxAmount } = calculateGST(discountedSubtotal, 5);
    const total = roundMoney(discountedSubtotal + shippingCharge + taxAmount);

    // 6. Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          addressId: dto.addressId,
          couponId,
          notes: dto.notes,
          subtotal: roundMoney(subtotal),
          discount: roundMoney(discount),
          shippingCharge,
          taxAmount: roundMoney(taxAmount),
          total,
          status: 'PENDING',
          items: {
            create: cart.items.map((item) => ({
              productId: item.variant.product.id,
              variantId: item.variantId,
              title: item.variant.product.title,
              sku: item.variant.sku,
              image: item.variant.product.thumbnail ?? item.variant.images?.[0] ?? undefined,
              price: Number(item.variant.discountPrice ?? item.variant.price ?? 0),
              quantity: item.quantity,
              total: roundMoney(Number(item.variant.discountPrice ?? item.variant.price ?? 0) * item.quantity),
              gstRate: 5,
            })),
          },
        },
        include: { items: true },
      });

      // 7. Reserve inventory
      await Promise.all(
        cart.items.map((item) =>
          tx.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { increment: item.quantity } },
          }),
        ),
      );

      // 8. Increment coupon usage
      if (couponId) {
        await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      }

      // 9. Create payment record
      await tx.payment.create({
        data: { orderId: newOrder.id, amount: total, status: 'PENDING' },
      });

      // 10. Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });

      return newOrder;
    });

    return this.findOne(order.id, userId);
  }

  async findMyOrders(userId: string, query: OrderQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const { skip, take } = getPaginationParams(page, limit);
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: { include: { variant: { include: { size: true, color: true } } } },
          payment: { select: { status: true, method: true } },
          shipment: { select: { status: true, awbCode: true, trackingUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, userId?: string) {
    const where: Record<string, unknown> = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            variant: { include: { size: true, color: true } },
            product: { select: { id: true, slug: true } },
          },
        },
        address: true,
        coupon: { select: { code: true, type: true, value: true } },
        payment: true,
        invoice: { select: { id: true, invoiceNumber: true, pdfUrl: true } },
        shipment: true,
        returns: { select: { id: true, status: true, reason: true, createdAt: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(id: string, userId: string) {
    const order = await this.findOne(id, userId);

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order with status: ${order.status}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledReason: 'Cancelled by customer' },
      });

      // Restore inventory
      await Promise.all(
        order.items.map((item) =>
          tx.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { decrement: item.quantity } },
          }),
        ),
      );
    });

    return { message: 'Order cancelled successfully' };
  }

  async findAllAdmin(query: OrderQueryDto) {
    const { page = 1, limit = 20, status, userId, search, dateFrom, dateTo } = query;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (search) where.orderNumber = { contains: search };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = dateFrom;
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = dateTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          items: { select: { quantity: true, total: true, title: true } },
          payment: { select: { status: true, method: true } },
          shipment: { select: { status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');

    const updateData: Record<string, unknown> = { status: dto.status };
    if (dto.status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancelledReason = dto.cancelledReason;

      // Restore inventory on admin cancel
      await Promise.all(
        order.items.map((item) =>
          this.prisma.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { decrement: item.quantity } },
          }),
        ),
      );
    }
    if (dto.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
      // Decrement actual stock on delivery
      await Promise.all(
        order.items.map((item) =>
          this.prisma.inventory.update({
            where: { variantId: item.variantId },
            data: {
              stock: { decrement: item.quantity },
              reserved: { decrement: item.quantity },
            },
          }),
        ),
      );
      // Increment sold count
      await Promise.all(
        order.items.map((item) =>
          this.prisma.product.update({
            where: { id: item.productId },
            data: { soldCount: { increment: item.quantity } },
          }),
        ),
      );
    }

    return this.prisma.order.update({ where: { id }, data: updateData });
  }

  async getStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.groupBy({ by: ['status'], _count: { id: true }, _sum: { total: true } }),
    ]);

    return { total, byStatus };
  }
}
