import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsService, ReturnStatus } from './returns.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

const mockReturn = (overrides: Record<string, any> = {}) => ({
  id: 'return-123',
  orderId: 'order-123',
  userId: 'user-123',
  reason: 'Wrong size',
  description: null,
  images: [],
  status: 'REQUESTED',
  refundAmount: null,
  adminNotes: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ReturnsService', () => {
  let service: ReturnsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ReturnsService>(ReturnsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createReturn() ────────────────────────────────────────────────────────
  describe('createReturn()', () => {
    it('should create a return for a DELIVERED order', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'order-123', status: 'DELIVERED' });
      prisma.return.findFirst.mockResolvedValue(null);
      prisma.return.create.mockResolvedValue(mockReturn());

      const result = await service.createReturn('order-123', 'user-123', { reason: 'Wrong size' });

      expect(prisma.return.create).toHaveBeenCalled();
      expect(result.reason).toBe('Wrong size');
    });

    it('should throw BadRequestException for non-DELIVERED orders', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'order-123', status: 'SHIPPED' });

      await expect(
        service.createReturn('order-123', 'user-123', { reason: 'Changed mind' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if return already exists', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'order-123', status: 'DELIVERED' });
      prisma.return.findFirst.mockResolvedValue(mockReturn());

      await expect(
        service.createReturn('order-123', 'user-123', { reason: 'Duplicate' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if order not found or belongs to different user', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.createReturn('order-123', 'wrong-user', { reason: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAllAdmin() ────────────────────────────────────────────────────────
  describe('findAllAdmin()', () => {
    it('should return paginated return requests with user and order info', async () => {
      prisma.return.findMany.mockResolvedValue([
        { ...mockReturn(), user: { name: 'Test', email: 'test@test.com', phone: null }, order: { orderNumber: 'ORD-1', total: 999 } },
      ]);
      prisma.return.count.mockResolvedValue(1);

      const result = await service.findAllAdmin(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.return.findMany.mockResolvedValue([]);
      prisma.return.count.mockResolvedValue(0);

      await service.findAllAdmin(1, 20, ReturnStatus.APPROVED);

      expect(prisma.return.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: ReturnStatus.APPROVED } }),
      );
    });
  });

  // ─── updateStatus() ────────────────────────────────────────────────────────
  describe('updateStatus()', () => {
    it('should update return status to APPROVED', async () => {
      prisma.return.findUnique.mockResolvedValue(mockReturn());
      prisma.return.update.mockResolvedValue(mockReturn({ status: 'APPROVED' }));

      const result = await service.updateStatus('return-123', { status: ReturnStatus.APPROVED });

      expect(result.status).toBe('APPROVED');
    });

    it('should set resolvedAt when status is REFUNDED', async () => {
      prisma.return.findUnique.mockResolvedValue(mockReturn());
      prisma.return.update.mockResolvedValue(mockReturn({ status: 'REFUNDED', resolvedAt: new Date() }));

      await service.updateStatus('return-123', { status: ReturnStatus.REFUNDED });

      expect(prisma.return.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException for unknown return', async () => {
      prisma.return.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('unknown', { status: ReturnStatus.APPROVED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getMyReturns() ────────────────────────────────────────────────────────
  describe('getMyReturns()', () => {
    it('should return all return requests for a user', async () => {
      prisma.return.findMany.mockResolvedValue([
        { ...mockReturn(), order: { orderNumber: 'ORD-123' } },
      ]);

      const result = await service.getMyReturns('user-123');

      expect(result).toHaveLength(1);
      expect(prisma.return.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-123' } }),
      );
    });
  });
});
