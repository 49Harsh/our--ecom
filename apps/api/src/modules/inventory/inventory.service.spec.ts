import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

const mockInventory = (overrides: Record<string, any> = {}) => ({
  id: 'inv-123',
  variantId: 'variant-123',
  stock: 20,
  lowStock: 5,
  reserved: 2,
  updatedAt: new Date(),
  variant: {
    id: 'variant-123',
    sku: 'VAR-001',
    product: { id: 'prod-123', title: 'Test Product', thumbnail: null },
    size: { name: 'M' },
    color: { name: 'Black' },
  },
  ...overrides,
});

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll() ─────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated inventory list', async () => {
      prisma.inventory.findMany.mockResolvedValue([mockInventory()]);
      prisma.inventory.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20, false);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter to low-stock items only', async () => {
      prisma.inventory.findMany.mockResolvedValue([mockInventory({ stock: 3 })]);
      prisma.inventory.count.mockResolvedValue(1);

      await service.findAll(1, 20, true);

      expect(prisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stock: expect.objectContaining({ lte: expect.any(Object) }),
          }),
        }),
      );
    });
  });

  // ─── updateStock() ─────────────────────────────────────────────────────────
  describe('updateStock()', () => {
    it('should update stock for a variant', async () => {
      prisma.inventory.findUnique.mockResolvedValue(mockInventory());
      prisma.inventory.update.mockResolvedValue(mockInventory({ stock: 50 }));

      const result = await service.updateStock('variant-123', 50);

      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { variantId: 'variant-123' },
          data: expect.objectContaining({ stock: 50 }),
        }),
      );
      expect(result.stock).toBe(50);
    });

    it('should update lowStock threshold when provided', async () => {
      prisma.inventory.findUnique.mockResolvedValue(mockInventory());
      prisma.inventory.update.mockResolvedValue(mockInventory({ stock: 30, lowStock: 10 }));

      await service.updateStock('variant-123', 30, 10);

      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stock: 30, lowStock: 10 }),
        }),
      );
    });

    it('should throw NotFoundException for unknown variant', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(service.updateStock('unknown', 10)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getLowStockAlerts() ───────────────────────────────────────────────────
  describe('getLowStockAlerts()', () => {
    it('should return items where stock is at or below lowStock threshold', async () => {
      prisma.inventory.findMany.mockResolvedValue([mockInventory({ stock: 3 })]);

      const result = await service.getLowStockAlerts();

      expect(result).toHaveLength(1);
    });
  });

  // ─── findByProduct() ───────────────────────────────────────────────────────
  describe('findByProduct()', () => {
    it('should return all inventory records for a product', async () => {
      prisma.inventory.findMany.mockResolvedValue([mockInventory()]);

      const result = await service.findByProduct('prod-123');

      expect(result).toHaveLength(1);
      expect(prisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            variant: { productId: 'prod-123' },
          }),
        }),
      );
    });
  });

  // ─── bulkUpdate() ──────────────────────────────────────────────────────────
  describe('bulkUpdate()', () => {
    it('should update multiple variants in parallel', async () => {
      prisma.inventory.findUnique.mockResolvedValue(mockInventory());
      prisma.inventory.update.mockResolvedValue(mockInventory({ stock: 100 }));

      const updates = [
        { variantId: 'variant-1', stock: 100 },
        { variantId: 'variant-2', stock: 50 },
      ];

      const result = await service.bulkUpdate(updates);

      expect(prisma.inventory.update).toHaveBeenCalledTimes(2);
      expect(result.updated).toBe(2);
    });
  });
});
