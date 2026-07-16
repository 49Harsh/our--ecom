import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { createPrismaMock, mockProduct } from '../../common/test/mocks';

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
      prisma.product.create.mockResolvedValue(mockProduct());

      const dto = {
        title: 'Test T-Shirt',
        description: 'Great tee',
        categoryId: 'cat-123',
        gender: 'UNISEX' as any,
        price: 999,
      };

      const result = await service.create(dto);

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
    it('should return paginated products with no filters', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct()]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should filter by featured flag', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ isFeatured: true });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isFeatured: true }),
        }),
      );
    });

    it('should filter by gender', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct({ gender: 'MALE' })]);
      prisma.product.count.mockResolvedValue(1);

      await service.findAll({ gender: 'MALE' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gender: 'MALE' }),
        }),
      );
    });

    it('should filter by price range', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ minPrice: 500, maxPrice: 1500 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 500, lte: 1500 },
          }),
        }),
      );
    });

    it('should apply search across title and brand', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

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

    it('should sort by price ascending', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ sort: 'price_asc' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({ price: 'asc' }),
        }),
      );
    });

    it('should sort by newest (createdAt desc) by default', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ sort: 'newest' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({ createdAt: 'desc' }),
        }),
      );
    });
  });

  // ─── findBySlug() ──────────────────────────────────────────────────────────
  describe('findBySlug()', () => {
    it('should return full product details by slug', async () => {
      const fullProduct = {
        ...mockProduct(),
        category: { id: 'cat-123', name: 'Men', slug: 'men' },
        images: [],
        variants: [],
        reviews: [],
      };
      prisma.product.findUnique.mockResolvedValue(fullProduct);
      prisma.product.update.mockResolvedValue(fullProduct);

      const result = await service.findBySlug('test-t-shirt');

      expect(result).toHaveProperty('category');
      expect(result.slug).toBe('test-t-shirt');
    });

    it('should throw NotFoundException for unknown slug', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent-slug')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update() ──────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should update product fields', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct());
      prisma.product.update.mockResolvedValue(mockProduct({ title: 'Updated Title' }));

      const result = await service.update('product-123', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException for unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update('unknown', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delete() ──────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should soft-delete product (set deletedAt)', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct());
      prisma.product.update.mockResolvedValue({ ...mockProduct(), deletedAt: new Date() });

      const result = await service.delete('product-123');

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-123' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException for unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.delete('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createVariant() ───────────────────────────────────────────────────────
  describe('createVariant()', () => {
    it('should create a variant and associated inventory record', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct());
      prisma.productVariant.create.mockResolvedValue({
        id: 'variant-123',
        productId: 'product-123',
        sku: 'VAR-ABC123',
        inventory: { id: 'inv-123', stock: 0 },
      });

      const result = await service.createVariant('product-123', {
        sizeId: 'size-1',
        colorId: 'color-1',
      });

      expect(result.id).toBe('variant-123');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createVariant('unknown', { sizeId: 'size-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── incrementViewCount() ──────────────────────────────────────────────────
  describe('incrementViewCount()', () => {
    it('should increment viewCount atomically', async () => {
      prisma.product.update.mockResolvedValue({ ...mockProduct(), viewCount: 201 });

      await service.incrementViewCount('product-123');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: { viewCount: { increment: 1 } },
      });
    });
  });

  // ─── addImages() ───────────────────────────────────────────────────────────
  describe('addImages()', () => {
    it('should create product image records', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct());
      prisma.productImage.createMany.mockResolvedValue({ count: 2 });

      await service.addImages('product-123', ['url1.jpg', 'url2.jpg']);

      expect(prisma.productImage.createMany).toHaveBeenCalledWith({
        data: [
          { productId: 'product-123', url: 'url1.jpg', sortOrder: 0 },
          { productId: 'product-123', url: 'url2.jpg', sortOrder: 1 },
        ],
      });
    });

    it('should throw NotFoundException for unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addImages('unknown', ['url.jpg'])).rejects.toThrow(NotFoundException);
    });
  });
});
