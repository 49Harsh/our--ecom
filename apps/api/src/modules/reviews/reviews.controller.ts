import {
  Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService, CreateReviewDto } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/roles.constant';

@ApiTags('Reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @Public()
  @ApiOperation({ summary: 'Get approved reviews for a product' })
  getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getProductReviews(productId, page, limit);
  }

  @Post('product/:productId')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a review for a product' })
  createReview(
    @Param('productId') productId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(productId, userId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own review' })
  deleteReview(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.reviewsService.deleteReview(id, userId);
  }

  @Get('admin/pending')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] List pending (unapproved) reviews' })
  getPendingReviews(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.reviewsService.getPendingReviews(page, limit);
  }

  @Patch('admin/:id/approve')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Approve a review' })
  approveReview(@Param('id') id: string) {
    return this.reviewsService.approveReview(id);
  }

  @Delete('admin/:id')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Delete any review' })
  adminDeleteReview(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.reviewsService.deleteReview(id, userId, true);
  }
}
