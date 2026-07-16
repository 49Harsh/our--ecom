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
    it('should create a coupon with uppercased code', async () => {
      prisma.coupon.create.mockResolvedValue(mockCoupon({ code: 'SAVE20' }));

      const result = await service.create({
        code: 'save20',
        type: 'PERCENTAGE' as any,
        value: 20,
        minOrderAmount: 500,
      });

      expect(prisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'SAVE20' }),
        }),
      );
    });
  });

  // ─── validate() ────────────────────────────────────────────────────────────
  describe('validate()', () => {
    it('should return discount amount for valid PERCENTAGE coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(mockCoupon());

      const result = await service.validate('SAVE20', 1000);

      // 20% of 1000 = 200, capped at maxDiscount 300
      expect(result.discountAmount).toBe(200);
      expect(result.coupon.code).toBe('SAVE20');
    });

    it('should cap percentage discount at maxDiscount', async () => {
      prisma.coupon.findFirst.mockResolvedValue(mockCoupon({ value: 50, maxDiscount: 150 }));

      const result = await service.validate('SAVE50', 1000);

      // 50% of 1000 = 500, capped at 150
      expect(result.discountAmount).toBe(150);
    });

    it('should return flat discount for FIXED coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(mockCoupon({ type: 'FIXED', value: 100, maxDiscount: null }));

      const result = await service.validate('FLAT100', 1000);

      expect(result.discountAmount).toBe(100);
    });

    it('should return full shipping cost for FREE_SHIPPING coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        mockCoupon({ type: 'FREE_SHIPPING', value: 99, maxDiscount: null }),
      );

      const result = await service.validate('FREESHIP', 600);

      expect(result.discountAmount).toBe(99);
    });

    it('should throw BadRequestException if order is below minimum amount', async () => {
      prisma.coupon.findFirst.mockResolvedValue(mockCoupon({ minOrderAmount: 1000 }));

      await expect(service.validate('SAVE20', 400)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for invalid coupon code', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);

      await expect(service.validate('INVALID', 1000)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        mockCoupon({ endDate: new Date(Date.now() - 86400000) }), // yesterday
      );

      await expect(service.validate('EXPIRED', 1000)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for not-yet-started coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        mockCoupon({ startDate: new Date(Date.now() + 86400000) }), // tomorrow
      );

      await expect(service.validate('FUTURE', 1000)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if usage limit exhausted', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        mockCoupon({ usageLimit: 10, usedCount: 10 }), // used up
      );

      await expect(service.validate('MAXED', 1000)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for inactive coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null); // findFirst returns null for inactive

      await expect(service.validate('INACTIVE', 1000)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update() ──────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should update coupon', async () => {
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
    it('should delete a coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon());
      prisma.order.count.mockResolvedValue(0);
      prisma.coupon.delete.mockResolvedValue({});

      const result = await service.delete('coupon-123');

      expect(prisma.coupon.delete).toHaveBeenCalledWith({ where: { id: 'coupon-123' } });
      expect(result.message).toContain('deleted');
    });

    it('should throw ConflictException if coupon is used in orders', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon());
      prisma.order.count.mockResolvedValue(5);

      await expect(service.delete('coupon-123')).rejects.toThrow(ConflictException);
    });
  });
});
