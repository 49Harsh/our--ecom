import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsBoolean, IsOptional, IsInt, IsUrl, IsDate, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateHeroBannerDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subtitle?: string;
  @ApiProperty() @IsUrl() image: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() mobileImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() link?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaText?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
}

export class UpdateHeroBannerDto extends PartialType(CreateHeroBannerDto) {}

export enum SectionType {
  HERO = 'HERO', FEATURED_PRODUCTS = 'FEATURED_PRODUCTS', NEW_ARRIVALS = 'NEW_ARRIVALS',
  TRENDING = 'TRENDING', BEST_SELLERS = 'BEST_SELLERS', CATEGORIES = 'CATEGORIES',
  COLLECTIONS = 'COLLECTIONS', NEWSLETTER = 'NEWSLETTER', REVIEWS = 'REVIEWS', CUSTOM = 'CUSTOM',
}

export class CreateHomepageSectionDto {
  @ApiProperty({ enum: SectionType }) @IsEnum(SectionType) type: SectionType;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() data?: Record<string, unknown>;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateHomepageSectionDto extends PartialType(CreateHomepageSectionDto) {}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Hero Banners ─────────────────────────────────────────────────────────
  async getHeroBanners(activeOnly = false) {
    const where: Record<string, unknown> = {};
    if (activeOnly) {
      where.isActive = true;
      const now = new Date();
      where.OR = [
        { startDate: null }, { startDate: { lte: now } },
      ];
    }
    return this.prisma.heroBanner.findMany({ where, orderBy: { sortOrder: 'asc' } });
  }

  async createHeroBanner(dto: CreateHeroBannerDto) {
    return this.prisma.heroBanner.create({ data: dto });
  }

  async updateHeroBanner(id: string, dto: UpdateHeroBannerDto) {
    await this.prisma.heroBanner.findUniqueOrThrow({ where: { id } });
    return this.prisma.heroBanner.update({ where: { id }, data: dto });
  }

  async deleteHeroBanner(id: string) {
    await this.prisma.heroBanner.findUniqueOrThrow({ where: { id } });
    await this.prisma.heroBanner.delete({ where: { id } });
    return { message: 'Hero banner deleted' };
  }

  // ─── Homepage Sections ────────────────────────────────────────────────────
  async getHomepageSections(activeOnly = false) {
    return this.prisma.homepageSection.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createHomepageSection(dto: CreateHomepageSectionDto) {
    return this.prisma.homepageSection.create({ data: dto as any });
  }

  async updateHomepageSection(id: string, dto: UpdateHomepageSectionDto) {
    await this.prisma.homepageSection.findUniqueOrThrow({ where: { id } });
    return this.prisma.homepageSection.update({ where: { id }, data: dto as any });
  }

  async deleteHomepageSection(id: string) {
    await this.prisma.homepageSection.findUniqueOrThrow({ where: { id } });
    await this.prisma.homepageSection.delete({ where: { id } });
    return { message: 'Section deleted' };
  }

  // ─── Activity Logs ────────────────────────────────────────────────────────
  async getActivityLogs(page = 1, limit = 50, userId?: string, entity?: string) {
    const { skip, take } = { skip: (page - 1) * limit, take: limit };
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async logActivity(userId: string | null, action: string, entity: string, entityId?: string, newData?: unknown, oldData?: unknown) {
    return this.prisma.activityLog.create({
      data: { userId, action, entity, entityId, newData: newData as any, oldData: oldData as any },
    });
  }

  // ─── Dashboard Stats ──────────────────────────────────────────────────────
  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalOrders, totalCustomers, totalProducts,
      thisMonthRevenue, lastMonthRevenue,
      thisMonthOrders, lastMonthOrders,
      thisMonthCustomers, lastMonthCustomers,
      pendingOrders, confirmedOrders, deliveredOrders, cancelledOrders,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.aggregate({
        where: { status: 'DELIVERED', createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'DELIVERED', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { status: 'CANCELLED' } }),
      this.prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }),
    ]);

    const calcChange = (current: number, previous: number) =>
      previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);

    const thisRev = Number(thisMonthRevenue._sum.total ?? 0);
    const lastRev = Number(lastMonthRevenue._sum.total ?? 0);

    return {
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      totalOrders,
      totalCustomers,
      totalProducts,
      revenueChange: calcChange(thisRev, lastRev),
      ordersChange: calcChange(thisMonthOrders, lastMonthOrders),
      customersChange: calcChange(thisMonthCustomers, lastMonthCustomers),
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      cancelledOrders,
    };
  }

  async getRevenue(period = '30d') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: { status: 'DELIVERED', createdAt: { gte: since } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      grouped[key] = 0;
    }
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (key in grouped) grouped[key] += Number(o.total);
    }

    return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  }

  async getTopProducts(limit = 10) {
    const topItems = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: topItems.map((i) => i.productId) } },
      select: { id: true, title: true, thumbnail: true, ratingAvg: true },
    });

    return topItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        id: item.productId,
        title: product?.title ?? 'Unknown',
        thumbnail: product?.thumbnail,
        soldCount: item._sum.quantity ?? 0,
        revenue: Number(item._sum.total ?? 0),
        ratingAvg: product?.ratingAvg,
      };
    });
  }

  async getRecentOrders(limit = 10) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        payment: { select: { status: true } },
      },
    });
  }
}
