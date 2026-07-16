import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupons.dto';
import { getPaginationParams, buildPaginatedResponse, roundMoney } from '../../common/utils/helpers.util';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const code = dto.code.toUpperCase().trim();
    const exists = await this.prisma.coupon.findUnique({ where: { code } });
    if (exists) throw new ConflictException(`Coupon code "${code}" already exists`);
    return this.prisma.coupon.create({ data: { ...dto, code } });
  }

  async findAll(page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.coupon.count(),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id);
    if (dto.code) dto.code = dto.code.toUpperCase().trim();
    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    const inUse = await this.prisma.order.count({ where: { couponId: id } });
    if (inUse > 0) throw new BadRequestException('Coupon is used in orders. Deactivate instead of deleting.');
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted' };
  }

  async validate(dto: ValidateCouponDto) {
    const code = dto.code.toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });

    if (!coupon) throw new NotFoundException('Invalid coupon code');
    if (!coupon.isActive) throw new BadRequestException('Coupon is no longer active');
    if (coupon.startDate && coupon.startDate > new Date()) throw new BadRequestException('Coupon is not yet active');
    if (coupon.endDate && coupon.endDate < new Date()) throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');
    if (coupon.minOrderAmount && dto.orderAmount < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount ₹${coupon.minOrderAmount} required`);
    }

    const discount = this.calculateDiscount(coupon, dto.orderAmount);
    return { valid: true, coupon, discount };
  }

  calculateDiscount(coupon: { type: string; value: any; maxDiscount: any }, orderAmount: number): number {
    if (coupon.type === 'FREE_SHIPPING') return 0; // handled separately
    if (coupon.type === 'FIXED') return roundMoney(Math.min(Number(coupon.value), orderAmount));
    if (coupon.type === 'PERCENTAGE') {
      let d = roundMoney((orderAmount * Number(coupon.value)) / 100);
      if (coupon.maxDiscount) d = Math.min(d, Number(coupon.maxDiscount));
      return d;
    }
    return 0;
  }
}
