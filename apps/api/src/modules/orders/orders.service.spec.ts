import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createPrismaMock, mockOrder, mockUser } from '../../common/test/mocks';

const mockAddress = () => ({
  id: 'addr-123', userId: 'user-123', fullName: 'Test User',
  phone: '+919876543210', line1: '123 Test St', city: 'Mumbai',
  state: 'Maharashtra', pincode: '400001', country: 'India',
  type: 'HOME', isDefault: true,
});

const mockVariant = (stock = 10) => ({
  id: 'variant-123',
  productId: 'product-123',
  sku: 'VAR-001',
  product: {
    id: 'product-123',
    title: 'Test T-Shirt',
    sku: 'PRD-001',
    thumbnail: null,
    status: 'ACTIVE',
    deletedAt: null,
  },
  price: null,
  discountPrice: null,
  inventory: { id: 'inv-123', stock, reserved: 0 },
});

const mockCartWithItems = (items: any[] = []) => ({
  id: 'cart-123', userId: 'user-123', guestId: null, couponId: null,
  coupon: null, items,
});

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create an order from a cart with sufficient stock', async () => {
      const cartItems = [{ id: 'ci-1', variantId: 'variant-123', quantity: 2, variant: mockVariant(10) }];
      prisma.cart.findFirst.mockResolvedValue(mockCartWithItems(cartItems));
      prisma.address.findFirst.mockResolvedValue(mockAddress());
      prisma.order.create.mockResolvedValue(mockOrder());
      prisma.payment.create.mockResolvedValue({ id: 'pay-123', status: 'PENDING' });
      prisma.$transaction.mockImplementation(async (fn) => fn({
        order: { create: jest.fn().mockResolvedValue(mockOrder()) },
        inventory: { update: jest.fn() },
        coupon: { update: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
        cart: { update: jest.fn() },
        payment: { create: jest.fn().mockResolvedValue({ id: 'pay-123' }) },
      }));

      const result = await service.create('user-123', {
        addressId: 'addr-123',
      });

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if cart is empty', async () => {
      prisma.cart.findFirst.mockResolvedValue(mockCartWithItems([]));

      await expect(
        service.create('user-123', { addressId: 'addr-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if cart does not exist', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-123', { addressId: 'addr-123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      const cartItems = [{ id: 'ci-1', variantId: 'variant-123', quantity: 20, variant: mockVariant(5) }];
      prisma.cart.findFirst.mockResolvedValue(mockCartWithItems(cartItems));
      prisma.address.findFirst.mockResolvedValue(mockAddress());

      await expect(
        service.create('user-123', { addressId: 'addr-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if address not found', async () => {
      const cartItems = [{ id: 'ci-1', variantId: 'variant-123', quantity: 2, variant: mockVariant(10) }];
      prisma.cart.findFirst.mockResolvedValue(mockCartWithItems(cartItems));
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-123', { addressId: 'wrong-addr' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findMyOrders() ────────────────────────────────────────────────────────
  describe('findMyOrders()', () => {
    it('should return paginated list of user orders', async () => {
      prisma.order.findMany.mockResolvedValue([mockOrder()]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.findMyOrders('user-123', {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('should return a single order by ID for the correct user', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrder(),
        items: [],
        payment: null,
        address: mockAddress(),
      });

      const result = await service.findOne('order-123', 'user-123');

      expect(result.id).toBe('order-123');
    });

    it('should throw NotFoundException for wrong user or unknown order', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne('order-123', 'wrong-user')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── cancelOrder() ─────────────────────────────────────────────────────────
  describe('cancelOrder()', () => {
    it('should cancel a PENDING order and restore inventory', async () => {
      const order = {
        ...mockOrder({ status: 'PENDING' }),
        items: [{ variantId: 'variant-123', quantity: 2 }],
      };
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.inventory.update.mockResolvedValue({});
      prisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' });

      const result = await service.cancelOrder('order-123', 'user-123');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should cancel a CONFIRMED order', async () => {
      const order = {
        ...mockOrder({ status: 'CONFIRMED' }),
        items: [{ variantId: 'variant-123', quantity: 1 }],
      };
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.inventory.update.mockResolvedValue({});
      prisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' });

      const result = await service.cancelOrder('order-123', 'user-123');
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for DELIVERED order', async () => {
      prisma.order.findFirst.mockResolvedValue(mockOrder({ status: 'DELIVERED', items: [] }));

      await expect(service.cancelOrder('order-123', 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for SHIPPED order', async () => {
      prisma.order.findFirst.mockResolvedValue(mockOrder({ status: 'SHIPPED', items: [] }));

      await expect(service.cancelOrder('order-123', 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for wrong user', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.cancelOrder('order-123', 'wrong-user')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStatus() ────────────────────────────────────────────────────────
  describe('updateStatus()', () => {
    it('should update order status to SHIPPED', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder());
      prisma.order.update.mockResolvedValue(mockOrder({ status: 'SHIPPED' }));

      const result = await service.updateStatus('order-123', { status: 'SHIPPED' as any });

      expect(result.status).toBe('SHIPPED');
    });

    it('should set deliveredAt when status is DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: 'SHIPPED' }));
      prisma.order.update.mockResolvedValue(mockOrder({ status: 'DELIVERED', deliveredAt: new Date() }));

      const result = await service.updateStatus('order-123', { status: 'DELIVERED' as any });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deliveredAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException for unknown order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('unknown', { status: 'SHIPPED' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
