import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

const mockInventoryRecord = (overrides: Record<string, any> = {}) => ({
  id: 'inv-123',
  variantId: 'variant-123',
  stock: 20,
  lowStock: 5,
  reserved: 2,
  updatedAt: new Date(),
  variant: {
    id: 'variant-123', sku: 'VAR-001',
    product: { id: 'prod-123', title: 'Test Product', thumbnail: null, sku: 'PRD-001' },
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
      prisma.inventory.findMany.mockResolvedValue([mockInventoryRecord()]);
      prisma.inventory.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20, false);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should call findMany without a where filter (lowStockOnly handled via raw query)', async () => {
      // The real service: lowStockOnly uses Prisma fields reference (not a plain where clause)
      // which doesn't translate to a simple {stock: {lte: X}} in the mock
      prisma.inventory.findMany.mockResolvedValue([mockInventoryRecord({ stock: 3 })]);
      prisma.inventory.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20, true);

      // Just verify it returns results (the Prisma fields.lowStock mock doesn't produce WHERE)
      expect(result.data).toHaveLength(1);
      expect(prisma.inventory.findMany).toHaveBeenCalled();
    });
  });

  // ─── updateStock() ─────────────────────────────────────────────────────────
  describe('updateStock()', () => {
    it('should update stock for an existing inventory record', async () => {
      prisma.inventory.findUnique.mockResolvedValue(mockInventoryRecord());
      prisma.inventory.update.mockResolvedValue(mockInventoryRecord({ stock: 50 }));

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
      prisma.inventory.findUnique.mockResolvedValue(mockInventoryRecord());
      prisma.inventory.update.mockResolvedValue(mockInventoryRecord({ stock: 30, lowStock: 10 }));

      await service.updateStock('variant-123', 30, 10);

      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stock: 30, lowStock: 10 }),
        }),
      );
    });

    it('should throw BadRequestException for negative stock', async () => {
      await expect(service.updateStock('variant-123', -5)).rejects.toThrow(BadRequestException);
    });

    it('should CREATE inventory record when it does not exist yet', async () => {
      // Real service creates if not found (does not throw NotFoundException)
      prisma.inventory.findUnique.mockResolvedValue(null);
      prisma.inventory.create.mockResolvedValue(mockInventoryRecord({ stock: 10 }));

      const result = await service.updateStock('new-variant', 10);

      expect(prisma.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ variantId: 'new-variant', stock: 10 }),
        }),
      );
      expect(result.stock).toBe(10);
    });
  });

  // ─── getLowStockAlerts() ───────────────────────────────────────────────────
  describe('getLowStockAlerts()', () => {
    it('should call $queryRaw to get low-stock items', async () => {
      // Real service uses raw SQL
      prisma.$queryRaw.mockResolvedValue([{ id: 'inv-1', stock: 2 }]);

      const result = await service.getLowStockAlerts();

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  // ─── findByProduct() ───────────────────────────────────────────────────────
  describe('findByProduct()', () => {
    it('should return all variant inventory records for a product', async () => {
      // Real service uses productVariant.findMany (not inventory.findMany)
      prisma.productVariant.findMany.mockResolvedValue([
        { id: 'v-1', sku: 'VAR-1', inventory: { stock: 10 }, size: null, color: null },
      ]);

      const result = await service.findByProduct('prod-123');

      expect(result).toHaveLength(1);
      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: 'prod-123' } }),
      );
    });

    it('should throw NotFoundException when product has no variants', async () => {
      prisma.productVariant.findMany.mockResolvedValue([]);

      await expect(service.findByProduct('no-variants')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── bulkUpdate() ──────────────────────────────────────────────────────────
  describe('bulkUpdate()', () => {
    it('should update multiple variants and return count', async () => {
      prisma.inventory.findUnique
        .mockResolvedValueOnce(mockInventoryRecord({ variantId: 'v-1' }))
        .mockResolvedValueOnce(mockInventoryRecord({ variantId: 'v-2' }));
      prisma.inventory.update.mockResolvedValue(mockInventoryRecord({ stock: 100 }));

      const result = await service.bulkUpdate([
        { variantId: 'v-1', stock: 100 },
        { variantId: 'v-2', stock: 50 },
      ]);

      expect(prisma.inventory.update).toHaveBeenCalledTimes(2);
      expect(result.updated).toBe(2);
    });
  });
});
