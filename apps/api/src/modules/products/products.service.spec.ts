import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { createPrismaMock, mockProduct } from '../../common/test/mocks';
import { Gender, ProductSort, ProductStatus } from './dto/products.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create a product and auto-generate slug and SKU', async () => {
      prisma.product.findUnique.mockResolvedValue(null); // slug + sku unique checks
      prisma.product.create.mockResolvedValue({ ...mockProduct(), category: {}, images: [] });

      const result = await service.create({
        title: 'Test T-Shirt',
        description: 'Great tee',
        categoryId: 'cat-123',
        price: 999,
      });

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test T-Shirt',
            slug: expect.any(String),
            sku: expect.any(String),
          }),
        }),
      );
      expect(result.id).toBe('product-123');
    });
  });

  // ─── findAll() ─────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    beforeEach(() => {
      prisma.product.findMany.mockResolvedValue([mockProduct()]);
      prisma.product.count.mockResolvedValue(1);
    });

    it('should return paginated products with no filters', async () => {
      const result = await service.findAll({});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should filter by isFeatured flag', async () => {
      await service.findAll({ isFeatured: true });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isFeatured: true }),
        }),
      );
    });

    it('should filter by gender enum', async () => {
      await service.findAll({ gender: Gender.MALE });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gender: Gender.MALE }),
        }),
      );
    });

    it('should filter by price range', async () => {
      await service.findAll({ minPrice: 500, maxPrice: 1500 });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: expect.objectContaining({ gte: 500, lte: 1500 }),
          }),
        }),
      );
    });

    it('should apply search across title, brand, tags', async () => {
      await service.findAll({ search: 'tshirt' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: 'tshirt' }) }),
            ]),
          }),
        }),
      );
    });

    it('should sort by price ascending (ProductSort.PRICE_ASC)', async () => {
      await service.findAll({ sort: ProductSort.PRICE_ASC });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { price: 'asc' } }),
      );
    });

    it('should sort by price descending (ProductSort.PRICE_DESC)', async () => {
      await service.findAll({ sort: ProductSort.PRICE_DESC });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { price: 'desc' } }),
      );
    });

    it('should sort by newest (default / ProductSort.NEWEST)', async () => {
      await service.findAll({ sort: ProductSort.NEWEST });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should sort by popular (soldCount desc)', async () => {
      await service.findAll({ sort: ProductSort.POPULAR });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { soldCount: 'desc' } }),
      );
    });
  });

  // ─── findBySlug() ──────────────────────────────────────────────────────────
  describe('findBySlug()', () => {
    it('should return full product details', async () => {
      const full = { ...mockProduct(), category: {}, images: [], variants: [], reviews: [] };
      prisma.product.findFirst.mockResolvedValue(full);
      prisma.product.update.mockResolvedValue(full); // viewCount increment (fire & forget)

      const result = await service.findBySlug('test-t-shirt');
      expect(result).toHaveProperty('category');
    });

    it('should throw NotFoundException for unknown slug', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.findBySlug('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update() ──────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should update product fields', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct());
      prisma.product.update.mockResolvedValue({ ...mockProduct(), title: 'Updated', category: {}, images: [] });

      const result = await service.update('product-123', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('should throw NotFoundException for unknown product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.update('unknown', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delete() ──────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should soft-delete (set deletedAt + ARCHIVED) and return message', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct());
      prisma.product.update.mockResolvedValue({ ...mockProduct(), deletedAt: new Date(), status: 'ARCHIVED' });

      const result = await service.delete('product-123');

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date), status: 'ARCHIVED' }),
        }),
      );
      expect(result.message).toContain('archived');
    });

    it('should throw NotFoundException for unknown product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.delete('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createVariant() ───────────────────────────────────────────────────────
  describe('createVariant()', () => {
    it('should create variant and auto-create inventory record', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct());
      prisma.productVariant.findUnique.mockResolvedValue(null); // sku uniqueness
      prisma.productVariant.create.mockResolvedValue({
        id: 'variant-123', productId: 'product-123', sku: 'VAR-ABC',
        size: null, color: null,
      });
      prisma.inventory.create.mockResolvedValue({ id: 'inv-1', stock: 0 });

      const result = await service.createVariant('product-123', { sizeId: 'size-1' });
      expect(result.id).toBe('variant-123');
      expect(prisma.inventory.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.createVariant('unknown', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ─── addImages() ───────────────────────────────────────────────────────────
  describe('addImages()', () => {
    it('should create product image records with sort order', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct({ thumbnail: null }));
      prisma.productImage.count.mockResolvedValue(0);
      prisma.productImage.createMany.mockResolvedValue({ count: 2 });
      prisma.product.update.mockResolvedValue({});

      const result = await service.addImages('product-123', ['url1.jpg', 'url2.jpg']);

      expect(prisma.productImage.createMany).toHaveBeenCalledWith({
        data: [
          { productId: 'product-123', url: 'url1.jpg', sortOrder: 0 },
          { productId: 'product-123', url: 'url2.jpg', sortOrder: 1 },
        ],
      });
      expect(result.created).toBe(2);
    });

    it('should throw NotFoundException for unknown product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.addImages('unknown', ['url.jpg'])).rejects.toThrow(NotFoundException);
    });
  });
});
