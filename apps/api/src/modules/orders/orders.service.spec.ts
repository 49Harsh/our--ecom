import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { CartService } from '../cart/cart.service';
import { CouponsService } from '../coupons/coupons.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createPrismaMock, mockOrder } from '../../common/test/mocks';

const mockAddress = () => ({
  id: 'addr-123', userId: 'user-123', fullName: 'Test User',
  phone: '+919876543210', line1: '123 Test St', city: 'Mumbai',
  state: 'Maharashtra', pincode: '400001', country: 'India',
  type: 'HOME', isDefault: true,
});

const mockInventory = (stock = 10) => ({
  stock, reserved: 0,
});

const mockCartItem = () => ({
  id: 'ci-1',
  variantId: 'variant-123',
  quantity: 2,
  variant: {
    sku: 'VAR-001',
    price: 999,
    discountPrice: null,
    images: [],
    product: { id: 'product-123', title: 'Test T-Shirt', thumbnail: null, status: 'ACTIVE' },
    size: null, color: null,
    inventory: mockInventory(10),
  },
});

const mockCartRow = (items: any[] = []) => ({
  id: 'cart-123', userId: 'user-123', guestId: null,
  couponId: null, coupon: null, items,
});

// Mock CartService: only clearCart used in orders flow
const createCartServiceMock = () => ({
  clearCart: jest.fn().mockResolvedValue({ message: 'Cart cleared' }),
  getCart: jest.fn(),
});

// Mock CouponsService: validate + calculateDiscount
const createCouponsServiceMock = () => ({
  validate: jest.fn(),
  calculateDiscount: jest.fn().mockReturnValue(0),
});

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let cartService: ReturnType<typeof createCartServiceMock>;
  let couponsService: ReturnType<typeof createCouponsServiceMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    cartService = createCartServiceMock();
    couponsService = createCouponsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: cartService },
        { provide: CouponsService, useValue: couponsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create an order from a cart with sufficient stock', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCartRow([mockCartItem()]));
      prisma.address.findFirst.mockResolvedValue(mockAddress());

      // Transaction mock creates order + payment
      const createdOrder = mockOrder();
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => fn({
        order: {
          create: jest.fn().mockResolvedValue({ ...createdOrder, items: [mockCartItem()] }),
        },
        inventory: { update: jest.fn() },
        coupon: { update: jest.fn() },
        payment: { create: jest.fn().mockResolvedValue({ id: 'pay-123' }) },
        cartItem: { deleteMany: jest.fn() },
        cart: { update: jest.fn() },
      }));

      // findOne called after transaction
      prisma.order.findFirst.mockResolvedValue({
        ...createdOrder,
        items: [], address: mockAddress(),
        coupon: null, payment: null, invoice: null, shipment: null, returns: [],
      });

      const result = await service.create('user-123', { addressId: 'addr-123' });

      expect(result).toBeDefined();
      expect(result.id).toBe('order-123');
    });

    it('should throw BadRequestException if cart is empty', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCartRow([]));

      await expect(
        service.create('user-123', { addressId: 'addr-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if cart does not exist', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-123', { addressId: 'addr-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if address not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCartRow([mockCartItem()]));
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-123', { addressId: 'wrong-addr' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      const lowStockItem = {
        ...mockCartItem(),
        quantity: 20,
        variant: { ...mockCartItem().variant, inventory: mockInventory(5) },
      };
      prisma.cart.findUnique.mockResolvedValue(mockCartRow([lowStockItem]));
      prisma.address.findFirst.mockResolvedValue(mockAddress());

      await expect(
        service.create('user-123', { addressId: 'addr-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if product is not ACTIVE', async () => {
      const inactiveItem = {
        ...mockCartItem(),
        variant: { ...mockCartItem().variant, product: { ...mockCartItem().variant.product, status: 'INACTIVE' } },
      };
      prisma.cart.findUnique.mockResolvedValue(mockCartRow([inactiveItem]));
      prisma.address.findFirst.mockResolvedValue(mockAddress());

      await expect(
        service.create('user-123', { addressId: 'addr-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findMyOrders() ────────────────────────────────────────────────────────
  describe('findMyOrders()', () => {
    it('should return paginated user orders', async () => {
      prisma.order.findMany.mockResolvedValue([mockOrder()]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.findMyOrders('user-123', {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-123' } }),
      );
    });

    it('should filter by order status', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      await service.findMyOrders('user-123', { status: 'DELIVERED' as any });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', status: 'DELIVERED' },
        }),
      );
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    const fullOrder = {
      ...mockOrder(),
      items: [], address: mockAddress(), coupon: null,
      payment: null, invoice: null, shipment: null, returns: [],
    };

    it('should return a single order', async () => {
      prisma.order.findFirst.mockResolvedValue(fullOrder);
      const result = await service.findOne('order-123', 'user-123');
      expect(result.id).toBe('order-123');
    });

    it('should throw NotFoundException for wrong user', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.findOne('order-123', 'wrong-user')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── cancelOrder() ─────────────────────────────────────────────────────────
  describe('cancelOrder()', () => {
    it('should cancel a PENDING order and restore inventory', async () => {
      const order = {
        ...mockOrder({ status: 'PENDING' }),
        items: [{ variantId: 'v-1', quantity: 2, productId: 'p-1' }],
        address: mockAddress(), coupon: null,
        payment: null, invoice: null, shipment: null, returns: [],
      };
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => fn({
        order: { update: jest.fn() },
        inventory: { update: jest.fn() },
      }));

      const result = await service.cancelOrder('order-123', 'user-123');
      expect(result.message).toContain('cancelled');
    });

    it('should throw BadRequestException for SHIPPED order', async () => {
      const order = {
        ...mockOrder({ status: 'SHIPPED' }),
        items: [], address: mockAddress(),
        coupon: null, payment: null, invoice: null, shipment: null, returns: [],
      };
      prisma.order.findFirst.mockResolvedValue(order);
      await expect(service.cancelOrder('order-123', 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for DELIVERED order', async () => {
      const order = {
        ...mockOrder({ status: 'DELIVERED' }),
        items: [], address: mockAddress(),
        coupon: null, payment: null, invoice: null, shipment: null, returns: [],
      };
      prisma.order.findFirst.mockResolvedValue(order);
      await expect(service.cancelOrder('order-123', 'user-123')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateStatus() ────────────────────────────────────────────────────────
  describe('updateStatus()', () => {
    it('should update order status to SHIPPED', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder(), items: [] });
      prisma.order.update.mockResolvedValue(mockOrder({ status: 'SHIPPED' }));

      const result = await service.updateStatus('order-123', { status: 'SHIPPED' as any });
      expect(result.status).toBe('SHIPPED');
    });

    it('should set deliveredAt and reduce stock when DELIVERED', async () => {
      const items = [{ variantId: 'v-1', quantity: 1, productId: 'p-1' }];
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder({ status: 'SHIPPED' }), items });
      prisma.inventory.update.mockResolvedValue({});
      prisma.product.update.mockResolvedValue({});
      prisma.order.update.mockResolvedValue(mockOrder({ status: 'DELIVERED', deliveredAt: new Date() }));

      await service.updateStatus('order-123', { status: 'DELIVERED' as any });

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

  // ─── getStats() ────────────────────────────────────────────────────────────
  describe('getStats()', () => {
    it('should return total order count and breakdown by status', async () => {
      prisma.order.count.mockResolvedValue(100);
      prisma.order.groupBy.mockResolvedValue([
        { status: 'DELIVERED', _count: { id: 60 }, _sum: { total: 60000 } },
      ]);

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.byStatus).toHaveLength(1);
    });
  });
});
