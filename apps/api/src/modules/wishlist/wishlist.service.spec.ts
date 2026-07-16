import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<WishlistService>(WishlistService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getWishlist() ─────────────────────────────────────────────────────────
  describe('getWishlist()', () => {
    it('should return all wishlist items for a user', async () => {
      prisma.wishlist.findMany.mockResolvedValue([
        {
          id: 'wl-1', userId: 'user-123', productId: 'prod-1', addedAt: new Date(),
          product: { id: 'prod-1', title: 'T-Shirt', slug: 'tshirt', thumbnail: null, price: 999, discountPrice: null },
        },
      ]);

      const result = await service.getWishlist('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].product.title).toBe('T-Shirt');
    });
  });

  // ─── addToWishlist() ───────────────────────────────────────────────────────
  describe('addToWishlist()', () => {
    it('should add a product to wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);
      prisma.wishlist.create.mockResolvedValue({
        id: 'wl-new', userId: 'user-123', productId: 'prod-1', addedAt: new Date(),
      });

      const result = await service.addToWishlist('user-123', 'prod-1');

      expect(prisma.wishlist.create).toHaveBeenCalledWith({
        data: { userId: 'user-123', productId: 'prod-1' },
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if product already in wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });

      await expect(
        service.addToWishlist('user-123', 'prod-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── removeFromWishlist() ──────────────────────────────────────────────────
  describe('removeFromWishlist()', () => {
    it('should remove a product from wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });
      prisma.wishlist.delete.mockResolvedValue({});

      const result = await service.removeFromWishlist('user-123', 'prod-1');

      expect(prisma.wishlist.delete).toHaveBeenCalledWith({
        where: { userId_productId: { userId: 'user-123', productId: 'prod-1' } },
      });
      expect(result.message).toContain('removed');
    });

    it('should throw NotFoundException if product not in wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFromWishlist('user-123', 'prod-not-there'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── isInWishlist() ────────────────────────────────────────────────────────
  describe('isInWishlist()', () => {
    it('should return true when product is in wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });

      const result = await service.isInWishlist('user-123', 'prod-1');

      expect(result.inWishlist).toBe(true);
    });

    it('should return false when product is not in wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      const result = await service.isInWishlist('user-123', 'prod-99');

      expect(result.inWishlist).toBe(false);
    });
  });
});
