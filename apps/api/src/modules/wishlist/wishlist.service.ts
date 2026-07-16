import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true, title: true, slug: true, price: true, discountPrice: true,
            thumbnail: true, ratingAvg: true, reviewCount: true, status: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE' } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlist.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) throw new ConflictException('Product already in wishlist');

    return this.prisma.wishlist.create({ data: { userId, productId } });
  }

  async removeFromWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findUnique({ where: { userId_productId: { userId, productId } } });
    if (!item) throw new NotFoundException('Product not in wishlist');
    await this.prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } });
    return { message: 'Removed from wishlist' };
  }

  async isInWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findUnique({ where: { userId_productId: { userId, productId } } });
    return { inWishlist: !!item };
  }
}
