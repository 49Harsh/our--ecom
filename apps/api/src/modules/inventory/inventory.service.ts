import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../common/utils/helpers.util';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, lowStockOnly = false) {
    const { skip, take } = getPaginationParams(page, limit);

    const where = lowStockOnly
      ? { stock: { lte: this.prisma.inventory.fields.lowStock } }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.inventory.findMany({
        skip,
        take,
        include: {
          variant: {
            include: {
              product: { select: { id: true, title: true, thumbnail: true, sku: true } },
              size: true,
              color: true,
            },
          },
        },
        orderBy: { stock: 'asc' },
      }),
      this.prisma.inventory.count(),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findByProduct(productId: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      include: { inventory: true, size: true, color: true },
    });
    if (!variants.length) throw new NotFoundException('Product not found or has no variants');
    return variants;
  }

  async updateStock(variantId: string, stock: number, lowStock?: number) {
    if (stock < 0) throw new BadRequestException('Stock cannot be negative');

    const inventory = await this.prisma.inventory.findUnique({ where: { variantId } });
    if (!inventory) {
      // Create if not exists
      return this.prisma.inventory.create({
        data: { variantId, stock, lowStock: lowStock ?? 5 },
      });
    }

    return this.prisma.inventory.update({
      where: { variantId },
      data: { stock, ...(lowStock !== undefined && { lowStock }) },
    });
  }

  async getLowStockAlerts() {
    return this.prisma.$queryRaw`
      SELECT i.*, pv.sku, p.title, p.thumbnail
      FROM inventory i
      JOIN product_variants pv ON pv.id = i."variantId"
      JOIN products p ON p.id = pv."productId"
      WHERE i.stock <= i."lowStock"
      ORDER BY i.stock ASC
      LIMIT 50
    `;
  }

  async bulkUpdate(updates: { variantId: string; stock: number }[]) {
    const results = await Promise.all(
      updates.map(({ variantId, stock }) => this.updateStock(variantId, stock)),
    );
    return { updated: results.length };
  }
}
