import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

const mockCoupon = (overrides: Record<string, any> = {}) => ({
  id: 'coupon-123',
  code: 'SAVE20',
  description: '20% off',
  type: 'PERCENTAGE',
  value: 20,
  minOrderAmount: 500,
  maxDiscount: 300,
  usageLimit: 100,
  usageLimitPerUser: 1,
  usedCount: 0,
  isActive: true,
  startDate: null,
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CouponsService>(CouponsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create coupon with uppercased code', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue(mockCoupon({ code: 'SAVE20' }));

      await service.create({ code: 'save20', type: 'PERCENTAGE' as any, value: 20 });

      expect(prisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'SAVE20' }),
        }),
      );
    });

    it('should throw ConflictException if code already exists', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon());
      await expect(
        service.create({ code: 'SAVE20', type: 'PERCENTAGE' as any, value: 20 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── validate() ────────────────────────────────────────────────────────────
  // validate() takes a single ValidateCouponDto: { code, orderAmount }
  describe('validate()', () => {
    it('should return discount for valid PERCENTAGE coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon());

      const result = await service.validate({ code: 'SAVE20', orderAmount: 1000 });

      // 20% of 1000 = 200 (capped at maxDiscount 300) → 200
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(200);
      expect(result.coupon.code).toBe('SAVE20');
    });

    it('should cap PERCENTAGE discount at maxDiscount', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon({ value: 50, maxDiscount: 150 }));

      const result = await service.validate({ code: 'SAVE50', orderAmount: 1000 });

      // 50% of 1000 = 500, capped at 150
      expect(result.discount).toBe(150);
    });

    it('should return flat discount for FIXED coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(
        mockCoupon({ type: 'FIXED', value: 100, maxDiscount: null }),
      );

      const result = await service.validate({ code: 'FLAT100', orderAmount: 1000 });
      expect(result.discount).toBe(100);
    });

    it('should return 0 discount for FREE_SHIPPING coupon (handled separately)', async () => {
      prisma.coupon.findUnique.mockResolvedValue(
        mockCoupon({ type: 'FREE_SHIPPING', value: 99, maxDiscount: null }),
      );

      const result = await service.validate({ code: 'FREESHIP', orderAmount: 600 });
      expect(result.discount).toBe(0); // FREE_SHIPPING returns 0 from calculateDiscount
    });

    it('should throw BadRequestException if order is below minimum amount', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon({ minOrderAmount: 1000 }));

      await expect(
        service.validate({ code: 'SAVE20', orderAmount: 400 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for invalid/unknown coupon code', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.validate({ code: 'INVALID', orderAmount: 1000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(
        mockCoupon({ endDate: new Date(Date.now() - 86400000) }),
      );

      await expect(
        service.validate({ code: 'EXPIRED', orderAmount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for not-yet-started coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(
        mockCoupon({ startDate: new Date(Date.now() + 86400000) }),
      );

      await expect(
        service.validate({ code: 'FUTURE', orderAmount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if usage limit exhausted', async () => {
      prisma.coupon.findUnique.mockResolvedValue(
        mockCoupon({ usageLimit: 10, usedCount: 10 }),
      );

      await expect(
        service.validate({ code: 'MAXED', orderAmount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for inactive coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(
        mockCoupon({ isActive: false }),
      );

      await expect(
        service.validate({ code: 'INACTIVE', orderAmount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── calculateDiscount() ───────────────────────────────────────────────────
  describe('calculateDiscount()', () => {
    it('should compute PERCENTAGE discount correctly', () => {
      const result = service.calculateDiscount({ type: 'PERCENTAGE', value: 10, maxDiscount: null }, 1000);
      expect(result).toBe(100);
    });

    it('should cap PERCENTAGE discount at maxDiscount', () => {
      const result = service.calculateDiscount({ type: 'PERCENTAGE', value: 50, maxDiscount: 200 }, 1000);
      expect(result).toBe(200);
    });

    it('should compute FIXED discount correctly', () => {
      const result = service.calculateDiscount({ type: 'FIXED', value: 150, maxDiscount: null }, 1000);
      expect(result).toBe(150);
    });

    it('should not exceed order amount for FIXED discount', () => {
      const result = service.calculateDiscount({ type: 'FIXED', value: 5000, maxDiscount: null }, 800);
      expect(result).toBe(800);
    });

    it('should return 0 for FREE_SHIPPING type', () => {
      const result = service.calculateDiscount({ type: 'FREE_SHIPPING', value: 99, maxDiscount: null }, 1000);
      expect(result).toBe(0);
    });
  });

  // ─── update() ──────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should update coupon fields', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon());
      prisma.coupon.update.mockResolvedValue(mockCoupon({ description: 'Updated' }));

      const result = await service.update('coupon-123', { description: 'Updated' });
      expect(result.description).toBe('Updated');
    });

    it('should throw NotFoundException for unknown coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.update('unknown', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delete() ──────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should delete unused coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon());
      prisma.order.count.mockResolvedValue(0);
      prisma.coupon.delete.mockResolvedValue({});

      const result = await service.delete('coupon-123');
      expect(prisma.coupon.delete).toHaveBeenCalledWith({ where: { id: 'coupon-123' } });
      expect(result.message).toContain('deleted');
    });

    it('should throw BadRequestException if coupon is used in orders', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon());
      prisma.order.count.mockResolvedValue(5);

      await expect(service.delete('coupon-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for unknown coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.delete('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
