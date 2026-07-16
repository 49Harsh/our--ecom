import { Controller, Get, Post, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wishlist')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get my wishlist' })
  getWishlist(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add product to wishlist' })
  add(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove product from wishlist' })
  remove(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }

  @Get(':productId/check')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  check(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.wishlistService.isInWishlist(userId, productId);
  }
}
