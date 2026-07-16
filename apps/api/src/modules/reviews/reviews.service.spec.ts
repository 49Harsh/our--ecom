import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

const mockReview = (overrides: Record<string, any> = {}) => ({
  id: 'review-123',
  productId: 'product-123',
  userId: 'user-123',
  rating: 4,
  title: 'Great product!',
  body: 'Really loved this item.',
  images: [],
  isVerified: false,
  isApproved: false,
  helpfulCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create a review with verified purchase flag', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      // Check if user has purchased
      prisma.order.findFirst.mockResolvedValue({ id: 'order-123', status: 'DELIVERED' });
      prisma.review.create.mockResolvedValue(mockReview({ isVerified: true }));

      const result = await service.create('product-123', 'user-123', {
        rating: 4,
        title: 'Great product!',
        body: 'Really loved this item.',
      });

      expect(result.isVerified).toBe(true);
    });

    it('should create review without verified flag for non-purchasers', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue(mockReview({ isVerified: false }));

      const result = await service.create('product-123', 'user-123', { rating: 3 });

      expect(result.isVerified).toBe(false);
    });

    it('should throw ConflictException if user already reviewed product', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview());

      await expect(
        service.create('product-123', 'user-123', { rating: 4 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── findAll() ─────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated approved reviews for a product', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview({ isApproved: true })]);
      prisma.review.count.mockResolvedValue(1);
      prisma.review.groupBy.mockResolvedValue([
        { rating: 5, _count: { id: 3 } }, { rating: 4, _count: { id: 7 } },
      ]);

      const result = await service.findAll('product-123', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result).toHaveProperty('ratingBreakdown');
    });
  });

  // ─── approve() ─────────────────────────────────────────────────────────────
  describe('approve()', () => {
    it('should approve a review and recalculate product rating', async () => {
      prisma.review.update.mockResolvedValue(mockReview({ isApproved: true }));
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.2 }, _count: { id: 10 } });
      prisma.product.update.mockResolvedValue({});

      const result = await service.approve('review-123');

      expect(prisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isApproved: true } }),
      );
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ratingAvg: 4.2, reviewCount: 10 }),
        }),
      );
    });
  });

  // ─── delete() ──────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should delete a review and recalculate product rating', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview());
      prisma.review.delete.mockResolvedValue({});
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.0 }, _count: { id: 9 } });
      prisma.product.update.mockResolvedValue({});

      const result = await service.delete('review-123', 'user-123');

      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'review-123' } });
      expect(result.message).toContain('deleted');
    });

    it('should throw NotFoundException for unknown review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.delete('unknown', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });
});
