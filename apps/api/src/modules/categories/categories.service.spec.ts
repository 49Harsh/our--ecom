import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../common/test/mocks';

const mockCategory = (overrides: Record<string, any> = {}) => ({
  id: 'cat-123',
  name: 'Men T-Shirts',
  slug: 'men-t-shirts',
  description: null,
  image: null,
  parentId: null,
  isActive: true,
  sortOrder: 0,
  seoTitle: null,
  seoDesc: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { products: 0, children: 0 },
  ...overrides,
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create a category and auto-generate slug', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCategory());

      const result = await service.create({ name: 'Men T-Shirts' });

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Men T-Shirts', slug: 'men-t-shirts' }),
        }),
      );
      expect(result.slug).toBe('men-t-shirts');
    });

    it('should use provided slug if given', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCategory({ slug: 'custom-slug' }));

      await service.create({ name: 'Men T-Shirts', slug: 'custom-slug' });

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'custom-slug' }),
        }),
      );
    });

    it('should throw ConflictException if slug already exists', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory());

      await expect(service.create({ name: 'Men T-Shirts' })).rejects.toThrow(ConflictException);
    });
  });

  // ─── findAll() ─────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated categories', async () => {
      prisma.category.findMany.mockResolvedValue([mockCategory()]);
      prisma.category.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by search term', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      prisma.category.count.mockResolvedValue(0);

      await service.findAll({ search: 'nonexistent' });

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ contains: 'nonexistent' }),
          }),
        }),
      );
    });
  });

  // ─── findBySlug() ──────────────────────────────────────────────────────────
  describe('findBySlug()', () => {
    it('should return category by slug', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory());

      const result = await service.findBySlug('men-t-shirts');

      expect(prisma.category.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'men-t-shirts' } }),
      );
      expect(result.slug).toBe('men-t-shirts');
    });

    it('should throw NotFoundException for unknown slug', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('unknown-slug')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update() ──────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should update a category', async () => {
      const updated = mockCategory({ name: 'Updated Name' });
      prisma.category.findUnique.mockResolvedValue(mockCategory());
      prisma.category.update.mockResolvedValue(updated);

      const result = await service.update('cat-123', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for unknown ID', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('unknown-id', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updated slug is already taken', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(mockCategory({ slug: 'old-slug' })) // findUnique for ID
        .mockResolvedValueOnce(mockCategory({ slug: 'taken-slug' })); // findUnique for slug check

      await expect(
        service.update('cat-123', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── delete() ──────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should delete category with no products or children', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory({ _count: { products: 0, children: 0 } }));
      prisma.category.delete.mockResolvedValue({});

      const result = await service.delete('cat-123');

      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-123' } });
      expect(result.message).toContain('deleted');
    });

    it('should throw ConflictException if category has products', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory({ _count: { products: 5, children: 0 } }));

      await expect(service.delete('cat-123')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if category has children', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory({ _count: { products: 0, children: 3 } }));

      await expect(service.delete('cat-123')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for unknown ID', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.delete('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
