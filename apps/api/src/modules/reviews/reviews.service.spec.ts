import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

const mockReview = (overrides: Record<string, any> = {}) => ({
  id: 'review-123', productId: 'product-123', userId: 'user-123',
  rating: 4, title: 'Great!', body: 'Love it.', images: [],
  isVerified: false, isApproved: false, helpfulCount: 0,
  createdAt: new Date(), updatedAt: new Date(),
  user: { name: 'Test User', avatar: null },
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

  // ─── createReview() ────────────────────────────────────────────────────────
  describe('createReview()', () => {
    it('should create a verified review for a purchaser', async () => {
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'oi-1' }); // has purchased
      prisma.review.findUnique.mockResolvedValue(null);             // no existing review
      prisma.review.create.mockResolvedValue(mockReview({ isVerified: true }));
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: { id: 1 } });
      prisma.product.update.mockResolvedValue({});

      const result = await service.createReview('product-123', 'user-123', { rating: 4, title: 'Great!' });

      expect(result.isVerified).toBe(true);
    });

    it('should create an unverified review for a non-purchaser', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue(mockReview({ isVerified: false }));
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 3 }, _count: { id: 1 } });
      prisma.product.update.mockResolvedValue({});

      const result = await service.createReview('product-123', 'user-123', { rating: 3 });
      expect(result.isVerified).toBe(false);
    });

    it('should throw ConflictException if user already reviewed product', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.review.findUnique.mockResolvedValue(mockReview());

      await expect(
        service.createReview('product-123', 'user-123', { rating: 4 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── getProductReviews() ───────────────────────────────────────────────────
  describe('getProductReviews()', () => {
    it('should return paginated approved reviews with rating distribution', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview({ isApproved: true })]);
      prisma.review.count.mockResolvedValue(1);
      prisma.review.groupBy.mockResolvedValue([
        { rating: 4, _count: { id: 1 } },
      ]);

      const result = await service.getProductReviews('product-123', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result).toHaveProperty('ratingDistribution');
      expect(result.meta.total).toBe(1);
    });
  });

  // ─── approveReview() ───────────────────────────────────────────────────────
  describe('approveReview()', () => {
    it('should approve a review and recalculate product rating', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview());
      prisma.review.update.mockResolvedValue(mockReview({ isApproved: true }));
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { id: 5 } });
      prisma.product.update.mockResolvedValue({});

      const result = await service.approveReview('review-123');

      expect(result.isApproved).toBe(true);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ratingAvg: 4.5, reviewCount: 5 }),
        }),
      );
    });

    it('should throw NotFoundException for unknown review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.approveReview('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteReview() ────────────────────────────────────────────────────────
  describe('deleteReview()', () => {
    it('should delete own review (isAdmin = false)', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview({ userId: 'user-123' }));
      prisma.review.delete.mockResolvedValue({});
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.0 }, _count: { id: 9 } });
      prisma.product.update.mockResolvedValue({});

      const result = await service.deleteReview('review-123', 'user-123', false);
      expect(result.message).toBe('Review deleted');
    });

    it('should allow admin to delete any review', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview({ userId: 'other-user' }));
      prisma.review.delete.mockResolvedValue({});
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 3.0 }, _count: { id: 5 } });
      prisma.product.update.mockResolvedValue({});

      const result = await service.deleteReview('review-123', 'admin-user', true);
      expect(result.message).toBe('Review deleted');
    });

    it('should throw BadRequestException if non-admin tries to delete another user\'s review', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview({ userId: 'other-user' }));

      await expect(
        service.deleteReview('review-123', 'user-123', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for unknown review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.deleteReview('unknown', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getPendingReviews() ───────────────────────────────────────────────────
  describe('getPendingReviews()', () => {
    it('should return paginated unapproved reviews for admin', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview({ isApproved: false })]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.getPendingReviews(1, 20);

      expect(result.data).toHaveLength(1);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isApproved: false } }),
      );
    });
  });
});
