import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto, ApplyCouponDto } from './dto/cart.dto';
import { roundMoney } from '../../common/utils/helpers.util';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Get Cart ─────────────────────────────────────────────────────────────
  async getCart(userId?: string, guestId?: string) {
    const cart = await this.findOrCreateCart(userId, guestId);
    return this.enrichCart(cart.id);
  }

  // ─── Add Item ─────────────────────────────────────────────────────────────
  async addItem(dto: AddToCartDto, userId?: string, guestId?: string) {
    const cart = await this.findOrCreateCart(userId, guestId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: dto.variantId, isActive: true },
      include: { inventory: true, product: { select: { status: true, title: true } } },
    });

    if (!variant) throw new NotFoundException('Product variant not found or inactive');
    if (variant.product.status !== 'ACTIVE') throw new BadRequestException('Product is not available');

    const availableStock = (variant.inventory?.stock ?? 0) - (variant.inventory?.reserved ?? 0);
    if (availableStock < dto.quantity) {
      throw new BadRequestException(`Only ${availableStock} items available in stock`);
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (newQty > availableStock) throw new BadRequestException(`Only ${availableStock} items available`);
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, variantId: dto.variantId, quantity: dto.quantity },
      });
    }

    return this.enrichCart(cart.id);
  }

  // ─── Update Item ──────────────────────────────────────────────────────────
  async updateItem(itemId: string, dto: UpdateCartItemDto, userId?: string, guestId?: string) {
    const cart = await this.findCart(userId, guestId);
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: { include: { inventory: true } } } });
    if (!item) throw new NotFoundException('Cart item not found');

    const available = (item.variant.inventory?.stock ?? 0) - (item.variant.inventory?.reserved ?? 0);
    if (dto.quantity > available) throw new BadRequestException(`Only ${available} available`);

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
    return this.enrichCart(cart.id);
  }

  // ─── Remove Item ──────────────────────────────────────────────────────────
  async removeItem(itemId: string, userId?: string, guestId?: string) {
    const cart = await this.findCart(userId, guestId);
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.enrichCart(cart.id);
  }

  // ─── Clear Cart ───────────────────────────────────────────────────────────
  async clearCart(userId?: string, guestId?: string) {
    const cart = await this.findCart(userId, guestId);
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    }
    return { message: 'Cart cleared' };
  }

  // ─── Apply Coupon ─────────────────────────────────────────────────────────
  async applyCoupon(dto: ApplyCouponDto, userId?: string, guestId?: string) {
    const cart = await this.findOrCreateCart(userId, guestId);
    const enriched = await this.enrichCart(cart.id);

    const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.code.toUpperCase() } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.startDate && coupon.startDate > new Date()) throw new BadRequestException('Coupon not yet valid');
    if (coupon.endDate && coupon.endDate < new Date()) throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');
    if (coupon.minOrderAmount && enriched.totals.subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount is ₹${coupon.minOrderAmount}`);
    }

    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    return this.enrichCart(cart.id);
  }

  // ─── Remove Coupon ────────────────────────────────────────────────────────
  async removeCoupon(userId?: string, guestId?: string) {
    const cart = await this.findCart(userId, guestId);
    if (cart) await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    return cart ? this.enrichCart(cart.id) : { items: [], totals: null };
  }

  // ─── Merge Guest → User ───────────────────────────────────────────────────
  async mergeGuestCart(guestId: string, userId: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { guestId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) return { message: 'Nothing to merge' };

    const userCart = await this.findOrCreateCart(userId);

    for (const item of guestCart.items) {
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
      });

      if (existing) {
        await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + item.quantity } });
      } else {
        await this.prisma.cartItem.create({ data: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity } });
      }
    }

    // Delete guest cart
    await this.prisma.cart.delete({ where: { id: guestCart.id } });
    return this.enrichCart(userCart.id);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async findCart(userId?: string, guestId?: string) {
    if (userId) return this.prisma.cart.findUnique({ where: { userId } });
    if (guestId) return this.prisma.cart.findUnique({ where: { guestId } });
    return null;
  }

  private async findOrCreateCart(userId?: string, guestId?: string) {
    if (userId) {
      return this.prisma.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    }
    if (guestId) {
      return this.prisma.cart.upsert({
        where: { guestId },
        update: {},
        create: { guestId },
      });
    }
    throw new BadRequestException('User or guest ID required');
  }

  private async enrichCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        coupon: true,
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    thumbnail: true,
                    status: true,
                    price: true,
                    discountPrice: true,
                  },
                },
                size: true,
                color: true,
                inventory: { select: { stock: true } },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!cart) return { items: [], totals: this.calcTotals([], null) };

    const totals = this.calcTotals(cart.items, cart.coupon as Parameters<typeof this.calcTotals>[1]);
    return { ...cart, totals };
  }

  private calcTotals(
    items: { quantity: number; variant: { price: any; discountPrice: any; product: any } }[],
    coupon: { type: string; value: any; maxDiscount: any } | null,
  ) {
    const subtotal = items.reduce((sum, item) => {
      const price = Number(
        item.variant.discountPrice ??
        item.variant.price ??
        item.variant.product?.discountPrice ??
        item.variant.product?.price ??
        0
      );
      return sum + price * item.quantity;
    }, 0);

    let discount = 0;
    if (coupon) {
      if (coupon.type === 'PERCENTAGE') {
        discount = (subtotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
      } else if (coupon.type === 'FIXED') {
        discount = Math.min(Number(coupon.value), subtotal);
      }
    }

    const discountedSubtotal = subtotal - discount;
    const shipping = discountedSubtotal >= 999 || coupon?.type === 'FREE_SHIPPING' ? 0 : 99;
    const gst = roundMoney(discountedSubtotal * 0.05);
    const total = roundMoney(discountedSubtotal + shipping + gst);

    return { subtotal: roundMoney(subtotal), discount: roundMoney(discount), shipping, gst, total, itemCount: items.length };
  }
}
