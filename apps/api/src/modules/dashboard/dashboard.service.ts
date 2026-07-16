import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsBoolean, IsOptional, IsInt, IsUrl, IsDate, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateHeroBannerDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subtitle?: string;
  @ApiProperty() @IsUrl() image: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() mobileImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() link?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaText?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
}

export class UpdateHeroBannerDto extends PartialType(CreateHeroBannerDto) {}

export enum SectionType {
  HERO = 'HERO', FEATURED_PRODUCTS = 'FEATURED_PRODUCTS', NEW_ARRIVALS = 'NEW_ARRIVALS',
  TRENDING = 'TRENDING', BEST_SELLERS = 'BEST_SELLERS', CATEGORIES = 'CATEGORIES',
  COLLECTIONS = 'COLLECTIONS', NEWSLETTER = 'NEWSLETTER', REVIEWS = 'REVIEWS', CUSTOM = 'CUSTOM',
}

export class CreateHomepageSectionDto {
  @ApiProperty({ enum: SectionType }) @IsEnum(SectionType) type: SectionType;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() data?: Record<string, unknown>;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateHomepageSectionDto extends PartialType(CreateHomepageSectionDto) {}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Hero Banners ─────────────────────────────────────────────────────────
  async getHeroBanners(activeOnly = false) {
    const where: Record<string, unknown> = {};
    if (activeOnly) {
      where.isActive = true;
      const now = new Date();
      where.OR = [
        { startDate: null }, { startDate: { lte: now } },
      ];
    }
    return this.prisma.heroBanner.findMany({ where, orderBy: { sortOrder: 'asc' } });
  }

  async createHeroBanner(dto: CreateHeroBannerDto) {
    return this.prisma.heroBanner.create({ data: dto });
  }

  async updateHeroBanner(id: string, dto: UpdateHeroBannerDto) {
    await this.prisma.heroBanner.findUniqueOrThrow({ where: { id } });
    return this.prisma.heroBanner.update({ where: { id }, data: dto });
  }

  async deleteHeroBanner(id: string) {
    await this.prisma.heroBanner.findUniqueOrThrow({ where: { id } });
    await this.prisma.heroBanner.delete({ where: { id } });
    return { message: 'Hero banner deleted' };
  }

  // ─── Homepage Sections ────────────────────────────────────────────────────
  async getHomepageSections(activeOnly = false) {
    return this.prisma.homepageSection.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createHomepageSection(dto: CreateHomepageSectionDto) {
    return this.prisma.homepageSection.create({ data: dto as any });
  }

  async updateHomepageSection(id: string, dto: UpdateHomepageSectionDto) {
    await this.prisma.homepageSection.findUniqueOrThrow({ where: { id } });
    return this.prisma.homepageSection.update({ where: { id }, data: dto as any });
  }

  async deleteHomepageSection(id: string) {
    await this.prisma.homepageSection.findUniqueOrThrow({ where: { id } });
    await this.prisma.homepageSection.delete({ where: { id } });
    return { message: 'Section deleted' };
  }

  // ─── Activity Logs ────────────────────────────────────────────────────────
  async getActivityLogs(page = 1, limit = 50, userId?: string, entity?: string) {
    const { skip, take } = { skip: (page - 1) * limit, take: limit };
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async logActivity(userId: string | null, action: string, entity: string, entityId?: string, newData?: unknown, oldData?: unknown) {
    return this.prisma.activityLog.create({
      data: { userId, action, entity, entityId, newData: newData as any, oldData: oldData as any },
    });
  }
}
