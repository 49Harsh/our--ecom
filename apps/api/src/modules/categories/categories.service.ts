import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from './dto/categories.dto';
import { generateSlug, getPaginationParams, buildPaginatedResponse } from '../../common/utils/helpers.util';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || generateSlug(dto.name);

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Category with slug "${slug}" already exists`);

    return this.prisma.category.create({
      data: { ...dto, slug },
      include: { parent: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findAll(query: CategoryQueryDto) {
    const { page = 1, limit = 20, search, parentId } = query;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Record<string, unknown> = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (parentId !== undefined) where.parentId = parentId || null;

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          children: { select: { id: true, name: true, slug: true, image: true }, where: { isActive: true } },
          _count: { select: { products: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      this.prisma.category.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException(`Slug "${dto.slug}" already taken`);
    }

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (category._count.products > 0) {
      throw new ConflictException('Cannot delete: category has products. Move them first.');
    }
    if (category._count.children > 0) {
      throw new ConflictException('Cannot delete: category has subcategories. Delete them first.');
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}
