import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProductDto, UpdateProductDto, CreateVariantDto, UpdateVariantDto,
  ProductQueryDto, ProductSort,
} from './dto/products.dto';
import {
  generateSlug, generateSKU, getPaginationParams, buildPaginatedResponse,
} from '../../common/utils/helpers.util';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const slug = dto.slug || generateSlug(dto.title);
    const sku = dto.sku || generateSKU('PRD');

    const [slugExists, skuExists] = await Promise.all([
      this.prisma.product.findUnique({ where: { slug } }),
      this.prisma.product.findUnique({ where: { sku } }),
    ]);
    if (slugExists) throw new ConflictException(`Slug "${slug}" already exists`);
    if (skuExists) throw new ConflictException(`SKU "${sku}" already exists`);

    return this.prisma.product.create({
      data: { ...dto, slug, sku },
      include: { category: true, images: true },
    });
  }

  async findAll(query: ProductQueryDto) {
    const {
      page = 1, limit = 20, category, brand, gender, minPrice, maxPrice,
      isFeatured, isTrending, isNewArrival, isBestSeller, status, search, sort,
      color, size,
    } = query;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      status: status || 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (category) {
      const cat = await this.prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (gender) where.gender = gender;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (isTrending !== undefined) where.isTrending = isTrending;
    if (isNewArrival !== undefined) where.isNewArrival = isNewArrival;
    if (isBestSeller !== undefined) where.isBestSeller = isBestSeller;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) (where.price as Prisma.DecimalFilter).gte = minPrice;
      if (maxPrice !== undefined) (where.price as Prisma.DecimalFilter).lte = maxPrice;
    }

    if (color || size) {
      where.variants = {
        some: {
          isActive: true,
          ...(color && { color: { name: { contains: color, mode: 'insensitive' } } }),
          ...(size && { size: { name: { contains: size, mode: 'insensitive' } } }),
        },
      };
    }

    const orderBy = this.buildOrderBy(sort);

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          _count: { select: { reviews: true } },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          include: {
            size: true,
            color: true,
            inventory: { select: { stock: true, lowStock: true } },
          },
        },
        reviews: {
          where: { isApproved: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, avatar: true } } },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    // Increment view count async (fire & forget)
    this.prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.slug && dto.slug !== product.slug) {
      const exists = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
      if (exists) throw new ConflictException(`Slug "${dto.slug}" already exists`);
    }

    return this.prisma.product.update({ where: { id }, data: dto, include: { category: true, images: true } });
  }

  async delete(id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } });
    return { message: 'Product archived successfully' };
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    const sku = dto.sku || generateSKU('VAR');
    const skuExists = await this.prisma.productVariant.findUnique({ where: { sku } });
    if (skuExists) throw new ConflictException(`SKU "${sku}" already exists`);

    const variant = await this.prisma.productVariant.create({
      data: { productId, sku, ...dto },
      include: { size: true, color: true },
    });

    // Auto-create inventory record
    await this.prisma.inventory.create({
      data: { variantId: variant.id, stock: dto.stock ?? 0 },
    });

    return variant;
  }

  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException('Variant not found');

    const { stock, ...variantData } = dto;

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: variantData,
      include: { size: true, color: true, inventory: true },
    });

    if (stock !== undefined) {
      await this.prisma.inventory.upsert({
        where: { variantId },
        update: { stock },
        create: { variantId, stock },
      });
    }

    return updated;
  }

  async addImages(productId: string, imageUrls: string[]) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.productImage.count({ where: { productId } });

    const images = await this.prisma.productImage.createMany({
      data: imageUrls.map((url, i) => ({ productId, url, sortOrder: existing + i })),
    });

    if (imageUrls[0] && !product.thumbnail) {
      await this.prisma.product.update({ where: { id: productId }, data: { thumbnail: imageUrls[0] } });
    }

    return { created: images.count };
  }

  private buildOrderBy(sort?: ProductSort): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case ProductSort.PRICE_ASC: return { price: 'asc' };
      case ProductSort.PRICE_DESC: return { price: 'desc' };
      case ProductSort.POPULAR: return { soldCount: 'desc' };
      case ProductSort.RATING: return { ratingAvg: 'desc' };
      case ProductSort.NEWEST:
      default: return { createdAt: 'desc' };
    }
  }
}
