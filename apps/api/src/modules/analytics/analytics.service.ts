import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalOrders, thisMonthOrders, lastMonthOrders,
      totalRevenue, thisMonthRevenue, lastMonthRevenue,
      totalCustomers, thisMonthCustomers,
      totalProducts, activeProducts, lowStockCount,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: 'CANCELLED' } } }),

      this.prisma.order.aggregate({ where: { status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY'] } }, _sum: { total: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: startOfMonth }, status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY'] } }, _sum: { total: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY'] } }, _sum: { total: true } }),

      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startOfMonth } } }),

      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM inventory WHERE stock <= "lowStock"`,
    ]);

    const revenueGrowth = lastMonthRevenue._sum.total
      ? (((Number(thisMonthRevenue._sum.total) - Number(lastMonthRevenue._sum.total)) / Number(lastMonthRevenue._sum.total)) * 100).toFixed(1)
      : null;

    const ordersGrowth = lastMonthOrders
      ? (((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100).toFixed(1)
      : null;

    return {
      revenue: {
        total: Number(totalRevenue._sum.total ?? 0),
        thisMonth: Number(thisMonthRevenue._sum.total ?? 0),
        growth: revenueGrowth,
      },
      orders: { total: totalOrders, thisMonth: thisMonthOrders, growth: ordersGrowth },
      customers: { total: totalCustomers, thisMonth: thisMonthCustomers },
      products: { total: totalProducts, active: activeProducts, lowStock: Number(lowStockCount[0]?.count ?? 0) },
    };
  }

  async getRevenueChart(period: 'week' | 'month' | 'year' = 'month') {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from },
        status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'CONFIRMED'] },
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped: Record<string, number> = {};
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      grouped[dateKey] = (grouped[dateKey] ?? 0) + Number(order.total);
    }

    return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  }

  async getBestSellingProducts(limit = 10) {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      orderBy: { soldCount: 'desc' },
      take: limit,
      select: { id: true, title: true, slug: true, thumbnail: true, soldCount: true, price: true, discountPrice: true, ratingAvg: true },
    });
  }

  async getOrdersByStatus() {
    return this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { total: true },
    });
  }

  async getTopCustomers(limit = 10) {
    return this.prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { orders: { _count: 'desc' } },
      take: limit,
    });
  }

  async getInventoryReport() {
    return this.prisma.$queryRaw`
      SELECT
        p.id, p.title, p.thumbnail,
        pv.sku, s.name as size, c.name as color,
        i.stock, i."lowStock", i.reserved,
        CASE WHEN i.stock <= i."lowStock" THEN true ELSE false END as "isLowStock"
      FROM inventory i
      JOIN product_variants pv ON pv.id = i."variantId"
      JOIN products p ON p.id = pv."productId"
      LEFT JOIN sizes s ON s.id = pv."sizeId"
      LEFT JOIN colors c ON c.id = pv."colorId"
      WHERE p."deletedAt" IS NULL
      ORDER BY i.stock ASC
      LIMIT 100
    `;
  }

  async getConversionMetrics() {
    const [totalSessions, totalOrders, totalRevenue] = await Promise.all([
      this.prisma.product.aggregate({ _sum: { viewCount: true } }),
      this.prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.order.aggregate({ where: { status: { in: ['DELIVERED', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'] } }, _sum: { total: true } }),
    ]);

    const views = Number(totalSessions._sum.viewCount ?? 0);
    const conversionRate = views > 0 ? ((totalOrders / views) * 100).toFixed(2) : '0';
    const avgOrderValue = totalOrders > 0 ? (Number(totalRevenue._sum.total ?? 0) / totalOrders).toFixed(2) : '0';

    return { totalProductViews: views, totalOrders, conversionRate: `${conversionRate}%`, avgOrderValue: `₹${avgOrderValue}` };
  }
}
