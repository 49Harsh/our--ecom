import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock } from '../../common/test/mocks';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getOverview() ─────────────────────────────────────────────────────────
  describe('getOverview()', () => {
    it('should return overview with all KPI metrics', async () => {
      prisma.order.count.mockResolvedValue(100);
      prisma.order.aggregate.mockResolvedValue({ _sum: { total: 150000 } });
      prisma.user.count.mockResolvedValue(500);
      prisma.product.count.mockResolvedValue(80);
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(3) }]);

      const result = await service.getOverview();

      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('customers');
      expect(result).toHaveProperty('products');
      expect(result.products.lowStock).toBe(3);
    });

    it('should calculate revenue growth percentage', async () => {
      // This month: 10000, last month: 8000 → growth = 25%
      prisma.order.count.mockResolvedValue(50);
      prisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 100000 } }) // total
        .mockResolvedValueOnce({ _sum: { total: 10000 } })  // this month
        .mockResolvedValueOnce({ _sum: { total: 8000 } });  // last month
      prisma.user.count.mockResolvedValue(50);
      prisma.product.count.mockResolvedValue(20);
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.getOverview();

      expect(result.revenue.growth).toBe('25.0');
    });
  });

  // ─── getRevenueChart() ─────────────────────────────────────────────────────
  describe('getRevenueChart()', () => {
    it('should return daily revenue grouped by date for "week" period', async () => {
      const today = new Date().toISOString().split('T')[0];
      prisma.order.findMany.mockResolvedValue([
        { createdAt: new Date(), total: 500 },
        { createdAt: new Date(), total: 300 },
      ]);

      const result = await service.getRevenueChart('week');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0].revenue).toBe(800);
    });

    it('should return empty array when no orders', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      const result = await service.getRevenueChart('month');
      expect(result).toEqual([]);
    });

    it('should filter orders by the correct date range for "year"', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      await service.getRevenueChart('year');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  // ─── getBestSellingProducts() ──────────────────────────────────────────────
  describe('getBestSellingProducts()', () => {
    it('should return top N products ordered by soldCount', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', title: 'Best Seller', soldCount: 200, price: 999 },
      ]);

      const result = await service.getBestSellingProducts(5);

      expect(result).toHaveLength(1);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { soldCount: 'desc' },
          take: 5,
        }),
      );
    });
  });

  // ─── getOrdersByStatus() ───────────────────────────────────────────────────
  describe('getOrdersByStatus()', () => {
    it('should return order counts grouped by status', async () => {
      prisma.order.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { id: 5 }, _sum: { total: 5000 } },
        { status: 'DELIVERED', _count: { id: 20 }, _sum: { total: 25000 } },
      ]);

      const result = await service.getOrdersByStatus();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PENDING');
    });
  });

  // ─── getTopCustomers() ─────────────────────────────────────────────────────
  describe('getTopCustomers()', () => {
    it('should return top customers sorted by order count', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', name: 'Top Customer', email: 'top@test.com', _count: { orders: 15 } },
      ]);

      const result = await service.getTopCustomers(10);

      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  // ─── getConversionMetrics() ────────────────────────────────────────────────
  describe('getConversionMetrics()', () => {
    it('should compute conversion rate and avg order value', async () => {
      prisma.product.aggregate.mockResolvedValue({ _sum: { viewCount: 1000 } });
      prisma.order.count.mockResolvedValue(50);
      prisma.order.aggregate.mockResolvedValue({ _sum: { total: 75000 } });

      const result = await service.getConversionMetrics();

      expect(result.totalProductViews).toBe(1000);
      expect(result.totalOrders).toBe(50);
      // 50/1000 * 100 = 5%
      expect(result.conversionRate).toBe('5.00%');
      // 75000/50 = 1500
      expect(result.avgOrderValue).toBe('₹1500.00');
    });

    it('should return 0% conversion when there are no views', async () => {
      prisma.product.aggregate.mockResolvedValue({ _sum: { viewCount: 0 } });
      prisma.order.count.mockResolvedValue(0);
      prisma.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });

      const result = await service.getConversionMetrics();

      expect(result.conversionRate).toBe('0%');
      expect(result.avgOrderValue).toBe('₹0');
    });
  });
});
