import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

const mockVariant = (stock = 10) => ({
  id: 'variant-123', isActive: true,
  price: 999, discountPrice: null,
  product: { id: 'prod-123', title: 'T-Shirt', status: 'ACTIVE' },
  inventory: { stock, reserved: 0 },
  size: { name: 'M' }, color: { name: 'Black' },
});

// enrichCart internally calls cart.findUnique - this full object is what it returns
const mockFullCart = (items: any[] = [], coupon: any = null) => ({
  id: 'cart-123', userId: 'user-123', guestId: null,
  couponId: coupon?.id ?? null, coupon,
  items: items.map((it) => ({
    id: it.id ?? 'ci-123',
    addedAt: new Date(),
    variant: it.variant ?? mockVariant(),
    quantity: it.quantity ?? 1,
  })),
});

describe('CartService', () => {
  let service: CartService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CartService>(CartService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── addItem() ─────────────────────────────────────────────────────────────
  describe('addItem()', () => {
    it('should add a new item to cart', async () => {
      // findOrCreateCart → cart.upsert
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-123', userId: 'user-123' });
      // variant check
      prisma.productVariant.findFirst.mockResolvedValue(mockVariant(10));
      // existing item check
      prisma.cartItem.findUnique.mockResolvedValue(null);
      // create item
      prisma.cartItem.create.mockResolvedValue({ id: 'ci-new' });
      // enrichCart: cart.findUnique
      prisma.cart.findUnique.mockResolvedValue(mockFullCart([{ quantity: 2, variant: mockVariant(10) }]));

      const result = await service.addItem({ variantId: 'variant-123', quantity: 2 }, 'user-123');

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ variantId: 'variant-123', quantity: 2 }),
        }),
      );
      expect(result.items).toHaveLength(1);
    });

    it('should increment quantity if item already in cart', async () => {
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-123' });
      prisma.productVariant.findFirst.mockResolvedValue(mockVariant(10));
      prisma.cartItem.findUnique.mockResolvedValue({ id: 'ci-1', quantity: 1 });
      prisma.cartItem.update.mockResolvedValue({ id: 'ci-1', quantity: 3 });
      prisma.cart.findUnique.mockResolvedValue(mockFullCart([{ quantity: 3 }]));

      await service.addItem({ variantId: 'variant-123', quantity: 2 }, 'user-123');

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 3 } }),
      );
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-123' });
      prisma.productVariant.findFirst.mockResolvedValue(mockVariant(1));
      prisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem({ variantId: 'variant-123', quantity: 5 }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when variant is not found or inactive', async () => {
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-123' });
      prisma.productVariant.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem({ variantId: 'unknown', quantity: 1 }, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getCart() ─────────────────────────────────────────────────────────────
  describe('getCart()', () => {
    it('should return empty cart when no cart exists', async () => {
      // findOrCreateCart → upsert creates cart
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-new', userId: 'user-123' });
      // enrichCart → findUnique returns null for non-existent cart
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getCart('user-123');

      expect(result.items).toHaveLength(0);
      expect(result.totals).toBeDefined();
    });

    it('should return cart with computed totals', async () => {
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-123' });
      prisma.cart.findUnique.mockResolvedValue(mockFullCart([{ quantity: 2, variant: mockVariant(10) }]));

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
      // findCart → cart.findUnique
      prisma.cart.findUnique.mockResolvedValueOnce({ id: 'cart-123', userId: 'user-123' });
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'ci-123', cartId: 'cart-123', quantity: 1,
        variant: { inventory: { stock: 10, reserved: 0 } },
      });
      prisma.cartItem.update.mockResolvedValue({ id: 'ci-123', quantity: 4 });
      // enrichCart call
      prisma.cart.findUnique.mockResolvedValueOnce(mockFullCart([{ quantity: 4 }]));

      await service.updateItem('ci-123', { quantity: 4 }, 'user-123');

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 4 } }),
      );
    });

    it('should throw BadRequestException if quantity exceeds available stock', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-123', userId: 'user-123' });
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'ci-123', cartId: 'cart-123', quantity: 1,
        variant: { inventory: { stock: 2, reserved: 0 } },
      });

      await expect(
        service.updateItem('ci-123', { quantity: 10 }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when cart item not found', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-123' });
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem('unknown', { quantity: 1 }, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── removeItem() ──────────────────────────────────────────────────────────
  describe('removeItem()', () => {
    it('should remove an item and return enriched cart', async () => {
      prisma.cart.findUnique.mockResolvedValueOnce({ id: 'cart-123', userId: 'user-123' });
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'ci-123', cartId: 'cart-123' });
      prisma.cartItem.delete.mockResolvedValue({});
      // enrichCart
      prisma.cart.findUnique.mockResolvedValueOnce(mockFullCart([]));

      const result = await service.removeItem('ci-123', 'user-123');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'ci-123' } });
      // removeItem returns enriched cart (not a {message} object)
      expect(result).toHaveProperty('items');
    });

    it('should throw NotFoundException if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.removeItem('ci-123', 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if item not in cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-123' });
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem('unknown', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── applyCoupon() ─────────────────────────────────────────────────────────
  describe('applyCoupon()', () => {
    it('should apply a valid coupon to cart', async () => {
      // findOrCreateCart
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-123' });
      // enrichCart (for subtotal check)
      prisma.cart.findUnique.mockResolvedValueOnce(
        mockFullCart([{ quantity: 2, variant: mockVariant(10) }]),
      );
      // coupon lookup
      prisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-1', code: 'SAVE10', type: 'PERCENTAGE', value: 10,
        isActive: true, startDate: null, endDate: null,
        usageLimit: null, usedCount: 0, minOrderAmount: 500,
      });
      // cart.update to attach coupon
      prisma.cart.update.mockResolvedValue({ id: 'cart-123', couponId: 'coupon-1' });
      // enrichCart again (return value)
      prisma.cart.findUnique.mockResolvedValueOnce(
        mockFullCart([{ quantity: 2, variant: mockVariant(10) }], {
          id: 'coupon-1', code: 'SAVE10', type: 'PERCENTAGE', value: 10, maxDiscount: null,
        }),
      );

      // Real signature: applyCoupon(dto: ApplyCouponDto, userId?, guestId?)
      const result = await service.applyCoupon({ code: 'SAVE10' }, 'user-123');

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ couponId: 'coupon-1' }),
        }),
      );
      expect(result.totals.discount).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for invalid coupon code', async () => {
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-123' });
      prisma.cart.findUnique.mockResolvedValue(
        mockFullCart([{ quantity: 1, variant: mockVariant(5) }]),
      );
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.applyCoupon({ code: 'INVALID' }, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── clearCart() ───────────────────────────────────────────────────────────
  describe('clearCart()', () => {
    it('should delete all cart items and remove coupon', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-123', userId: 'user-123' });
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });
      prisma.cart.update.mockResolvedValue({ id: 'cart-123', couponId: null });

      const result = await service.clearCart('user-123');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-123' } });
      expect(result.message).toBe('Cart cleared');
    });

    it('should return success even when cart is already empty', async () => {
      // findCart returns null → nothing to clear
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.clearCart('user-123');
      expect(result.message).toBe('Cart cleared');
    });
  });
});
