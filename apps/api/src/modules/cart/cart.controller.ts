import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Headers, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, ApplyCouponDto, MergeCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiHeader({ name: 'X-Guest-ID', required: false, description: 'Guest cart identifier (UUID)' })
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private resolveIds(userId?: string, guestHeader?: string): [string | undefined, string | undefined] {
    return [userId || undefined, !userId ? guestHeader : undefined];
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get current cart (works for guest and authenticated users)' })
  getCart(
    @CurrentUser('id') userId: string,
    @Headers('x-guest-id') guestId: string,
  ) {
    const [uid, gid] = this.resolveIds(userId, guestId);
    return this.cartService.getCart(uid, gid);
  }

  @Post('add')
  @Public()
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser('id') userId: string,
    @Headers('x-guest-id') guestId: string,
  ) {
    const [uid, gid] = this.resolveIds(userId, guestId);
    return this.cartService.addItem(dto, uid, gid);
  }

  @Patch('items/:itemId')
  @Public()
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser('id') userId: string,
    @Headers('x-guest-id') guestId: string,
  ) {
    const [uid, gid] = this.resolveIds(userId, guestId);
    return this.cartService.updateItem(itemId, dto, uid, gid);
  }

  @Delete('items/:itemId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Headers('x-guest-id') guestId: string,
  ) {
    const [uid, gid] = this.resolveIds(userId, guestId);
    return this.cartService.removeItem(itemId, uid, gid);
  }

  @Delete('clear')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from cart' })
  clearCart(
    @CurrentUser('id') userId: string,
    @Headers('x-guest-id') guestId: string,
  ) {
    const [uid, gid] = this.resolveIds(userId, guestId);
    return this.cartService.clearCart(uid, gid);
  }

  @Post('coupon')
  @Public()
  @ApiOperation({ summary: 'Apply a coupon to cart' })
  applyCoupon(
    @Body() dto: ApplyCouponDto,
    @CurrentUser('id') userId: string,
    @Headers('x-guest-id') guestId: string,
  ) {
    const [uid, gid] = this.resolveIds(userId, guestId);
    return this.cartService.applyCoupon(dto, uid, gid);
  }

  @Delete('coupon')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove applied coupon from cart' })
  removeCoupon(
    @CurrentUser('id') userId: string,
    @Headers('x-guest-id') guestId: string,
  ) {
    const [uid, gid] = this.resolveIds(userId, guestId);
    return this.cartService.removeCoupon(uid, gid);
  }

  @Post('merge')
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge guest cart into user cart (call after login)' })
  mergeCart(@Body() dto: MergeCartDto, @CurrentUser('id') userId: string) {
    return this.cartService.mergeGuestCart(dto.guestId, userId);
  }
}
