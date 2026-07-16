import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../common/utils/helpers.util';
import { IsString, IsInt, IsOptional, Min, Max, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) rating: number;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() images?: string[];
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const { skip, take } = getPaginationParams(page, limit);
    const where = { productId, isApproved: true };

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.review.count({ where }),
    ]);

    // Calculate rating distribution
    const ratingDist = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true },
      _count: { id: true },
    });

    return {
      ...buildPaginatedResponse(data, total, page, limit),
      ratingDistribution: ratingDist,
    };
  }

  async createReview(productId: string, userId: string, dto: CreateReviewDto) {
    // Verify purchase
    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: { in: ['DELIVERED'] } },
      },
    });

    const existing = await this.prisma.review.findUnique({ where: { productId_userId: { productId, userId } } });
    if (existing) throw new ConflictException('You have already reviewed this product');

    const review = await this.prisma.review.create({
      data: {
        productId, userId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        images: dto.images ?? [],
        isVerified: !!hasPurchased,
        isApproved: false, // requires admin approval
      },
      include: { user: { select: { name: true, avatar: true } } },
    });

    // Update product rating
    await this.updateProductRating(productId);

    return review;
  }

  async deleteReview(reviewId: string, userId: string, isAdmin = false) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.userId !== userId) throw new BadRequestException('Not authorized');

    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.updateProductRating(review.productId);
    return { message: 'Review deleted' };
  }

  async approveReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    const updated = await this.prisma.review.update({ where: { id: reviewId }, data: { isApproved: true } });
    await this.updateProductRating(review.productId);
    return updated;
  }

  async getPendingReviews(page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { isApproved: false },
        include: { user: { select: { name: true, email: true } }, product: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      this.prisma.review.count({ where: { isApproved: false } }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  private async updateProductRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: { ratingAvg: agg._avg.rating ?? 0, reviewCount: agg._count.id },
    });
  }
}
