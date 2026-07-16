import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createPrismaMock, createRedisMock, mockCart } from '../../common/test/mocks';

const mockVariantWithStock = (stock = 5) => ({
  id: 'variant-123',
  isActive: true,
  price: 999,
  discountPrice: 799,
  product: { id: 'product-123', title: 'Test T-Shirt', status: 'ACTIVE', thumbnail: null, deletedAt: null },
  inventory: { stock, reserved: 0 },
  size: { name: 'M' },
  color: { name: 'Black' },
});

describe('CartService', () => {
  let service: CartService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let redis: ReturnType<typeof createRedisMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    redis = createRedisMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    service = module.get<CartService>(CartService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── addItem() ─────────────────────────────────────────────────────────────
  describe('addItem()', () => {
    it('should add a new item to the user cart', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(mockVariantWithStock(10));
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue(mockCart({ id: 'cart-new' }));
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({
        id: 'ci-123', cartId: 'cart-new', variantId: 'variant-123', quantity: 2,
      });

      const result = await service.addItem({ variantId: 'variant-123', quantity: 2 }, 'user-123');

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ variantId: 'variant-123', quantity: 2 }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should increment quantity if item already in cart', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(mockVariantWithStock(10));
      prisma.cart.findFirst.mockResolvedValue(mockCart());
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'ci-123', quantity: 1 });
      prisma.cartItem.update.mockResolvedValue({ id: 'ci-123', quantity: 3 });

      await service.addItem({ variantId: 'variant-123', quantity: 2 }, 'user-123');

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantity: 3 }),
        }),
      );
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(mockVariantWithStock(1));
      prisma.cart.findFirst.mockResolvedValue(mockCart());
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem({ variantId: 'variant-123', quantity: 5 }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent variant', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem({ variantId: 'unknown-variant', quantity: 1 }, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getCart() ─────────────────────────────────────────────────────────────
  describe('getCart()', () => {
    it('should return empty cart structure if no cart exists', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      const result = await service.getCart('user-123');

      expect(result.items).toHaveLength(0);
      expect(result.totals).toBeDefined();
    });

    it('should return cart with items and computed totals', async () => {
      const cartWithItems = {
        ...mockCart(),
        items: [{
          id: 'ci-123', quantity: 2,
          variant: mockVariantWithStock(10),
        }],
      };
      prisma.cart.findFirst.mockResolvedValue(cartWithItems);

      const result = await service.getCart('user-123');

      expect(result.items).toHaveLength(1);
      expect(result.totals.subtotal).toBeGreaterThan(0);
      expect(result.totals.gst).toBeGreaterThan(0);
      expect(result.totals.total).toBeGreaterThan(result.totals.subtotal);
    });
  });

  // ─── updateItem() ──────────────────────────────────────────────────────────
  describe('updateItem()', () => {
    it('should update item quantity', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'ci-123', cartId: 'cart-123', quantity: 1,
        variant: mockVariantWithStock(10),
      });
      prisma.cartItem.update.mockResolvedValue({ id: 'ci-123', quantity: 4 });

      await service.updateItem('ci-123', { quantity: 4 }, 'user-123');

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 4 } }),
      );
    });

    it('should throw BadRequestException if requested quantity exceeds stock', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'ci-123', cartId: 'cart-123', quantity: 1,
        variant: mockVariantWithStock(2),
      });

      await expect(
        service.updateItem('ci-123', { quantity: 10 }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent cart item', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem('unknown-item', { quantity: 1 }, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── removeItem() ──────────────────────────────────────────────────────────
  describe('removeItem()', () => {
    it('should remove an item from the cart', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'ci-123', cartId: 'cart-123' });
      prisma.cartItem.delete.mockResolvedValue({ id: 'ci-123' });

      const result = await service.removeItem('ci-123', 'user-123');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'ci-123' } });
      expect(result.message).toContain('removed');
    });

    it('should throw NotFoundException for non-existent cart item', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem('unknown', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── applyCoupon() ─────────────────────────────────────────────────────────
  describe('applyCoupon()', () => {
    it('should apply a valid coupon to cart', async () => {
      const cart = { ...mockCart(), items: [{ quantity: 2, variant: mockVariantWithStock(5) }] };
      prisma.cart.findFirst.mockResolvedValue(cart);
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coupon-123', code: 'SAVE10', type: 'PERCENTAGE', value: 10,
        isActive: true, startDate: null, endDate: null, minOrderAmount: 500,
        usageLimit: null, usedCount: 0,
      });
      prisma.cart.update.mockResolvedValue({ ...cart, couponId: 'coupon-123' });

      const result = await service.applyCoupon('SAVE10', 'user-123');

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ couponId: 'coupon-123' }),
        }),
      );
    });

    it('should throw NotFoundException for invalid coupon code', async () => {
      prisma.cart.findFirst.mockResolvedValue(mockCart({ items: [{ quantity: 1, variant: mockVariantWithStock() }] }));
      prisma.coupon.findFirst.mockResolvedValue(null);

      await expect(service.applyCoupon('INVALID', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── clearCart() ───────────────────────────────────────────────────────────
  describe('clearCart()', () => {
    it('should delete all cart items', async () => {
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      await service.clearCart('cart-123');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-123' } });
    });
  });
});
