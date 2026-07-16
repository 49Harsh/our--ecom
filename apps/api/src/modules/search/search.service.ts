import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MeiliSearch, { Index, SearchParams } from 'meilisearch';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProductSearchDoc {
  id: string;
  title: string;
  slug: string;
  description: string;
  brand?: string;
  gender: string;
  categoryId: string;
  categoryName: string;
  price: number;
  discountPrice?: number;
  thumbnail?: string;
  tags: string[];
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  ratingAvg: number;
  soldCount: number;
  availableSizes: string[];
  availableColors: string[];
  status: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;
  private index: Index<ProductSearchDoc>;
  private readonly INDEX_NAME = 'products';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.client = new MeiliSearch({
      host: this.configService.get('MEILISEARCH_HOST', 'http://localhost:7700'),
      apiKey: this.configService.get('MEILISEARCH_API_KEY'),
    });
    this.index = this.client.index<ProductSearchDoc>(this.INDEX_NAME);
  }

  async onModuleInit() {
    try {
      await this.configureIndex();
      this.logger.log('Meilisearch index configured successfully');
    } catch (err) {
      this.logger.warn('Meilisearch not reachable. Search may be degraded.');
    }
  }

  private async configureIndex() {
    await this.client.createIndex(this.INDEX_NAME, { primaryKey: 'id' }).catch(() => null);
    await this.index.updateSettings({
      searchableAttributes: ['title', 'description', 'brand', 'tags', 'categoryName'],
      filterableAttributes: ['categoryId', 'gender', 'brand', 'price', 'discountPrice', 'isFeatured', 'isTrending', 'isNewArrival', 'status', 'availableSizes', 'availableColors'],
      sortableAttributes: ['price', 'discountPrice', 'ratingAvg', 'soldCount'],
      typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    });
  }

  // ─── Index a product ──────────────────────────────────────────────────────
  async indexProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        variants: { include: { size: true, color: true } },
      },
    });
    if (!product || product.status !== 'ACTIVE') {
      await this.removeProduct(productId);
      return;
    }

    const doc: ProductSearchDoc = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      brand: product.brand ?? undefined,
      gender: product.gender,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      price: Number(product.price),
      discountPrice: product.discountPrice ? Number(product.discountPrice) : undefined,
      thumbnail: product.thumbnail ?? undefined,
      tags: product.tags,
      isFeatured: product.isFeatured,
      isTrending: product.isTrending,
      isNewArrival: product.isNewArrival,
      ratingAvg: Number(product.ratingAvg),
      soldCount: product.soldCount,
      availableSizes: [...new Set(product.variants.filter(v => v.size).map(v => v.size!.name))],
      availableColors: [...new Set(product.variants.filter(v => v.color).map(v => v.color!.name))],
      status: product.status,
    };

    await this.index.addDocuments([doc]);
  }

  async removeProduct(productId: string) {
    await this.index.deleteDocument(productId).catch(() => null);
  }

  // ─── Search ───────────────────────────────────────────────────────────────
  async search(query: {
    q?: string;
    category?: string;
    gender?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    size?: string;
    color?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      q = '', category, gender, brand, minPrice, maxPrice,
      size, color, sort = 'newest', page = 1, limit = 20,
    } = query;

    const filters: string[] = ['status = "ACTIVE"'];
    if (category) filters.push(`categoryId = "${category}"`);
    if (gender) filters.push(`gender = "${gender}"`);
    if (brand) filters.push(`brand = "${brand}"`);
    if (minPrice !== undefined) filters.push(`price >= ${minPrice}`);
    if (maxPrice !== undefined) filters.push(`price <= ${maxPrice}`);
    if (size) filters.push(`availableSizes = "${size}"`);
    if (color) filters.push(`availableColors = "${color}"`);

    const sortMap: Record<string, string[]> = {
      newest: [],
      price_asc: ['price:asc'],
      price_desc: ['price:desc'],
      popular: ['soldCount:desc'],
      rating: ['ratingAvg:desc'],
    };

    const searchParams: SearchParams = {
      filter: filters.join(' AND '),
      sort: sortMap[sort] || [],
      limit,
      offset: (page - 1) * limit,
      attributesToHighlight: ['title', 'description'],
    };

    try {
      const result = await this.index.search(q, searchParams);
      return {
        success: true,
        data: result.hits,
        meta: {
          total: result.estimatedTotalHits ?? result.hits.length,
          page,
          limit,
          query: q,
          processingTimeMs: result.processingTimeMs,
        },
      };
    } catch {
      // Fallback to Prisma if Meilisearch is down
      return this.prismaFallbackSearch(q, page, limit);
    }
  }

  // ─── Autocomplete ─────────────────────────────────────────────────────────
  async suggestions(q: string) {
    if (!q || q.length < 2) return { suggestions: [] };
    try {
      const result = await this.index.search(q, { limit: 8, attributesToRetrieve: ['title', 'slug', 'thumbnail'] });
      return { suggestions: result.hits };
    } catch {
      return { suggestions: [] };
    }
  }

  // ─── Bulk index all products ───────────────────────────────────────────────
  async reindexAll() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: { category: true, variants: { include: { size: true, color: true } } },
    });

    const docs: ProductSearchDoc[] = products.map(p => ({
      id: p.id, title: p.title, slug: p.slug, description: p.description,
      brand: p.brand ?? undefined, gender: p.gender, categoryId: p.categoryId,
      categoryName: p.category.name, price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
      thumbnail: p.thumbnail ?? undefined, tags: p.tags, isFeatured: p.isFeatured,
      isTrending: p.isTrending, isNewArrival: p.isNewArrival,
      ratingAvg: Number(p.ratingAvg), soldCount: p.soldCount,
      availableSizes: [...new Set(p.variants.filter(v => v.size).map(v => v.size!.name))],
      availableColors: [...new Set(p.variants.filter(v => v.color).map(v => v.color!.name))],
      status: p.status,
    }));

    await this.index.addDocuments(docs);
    return { indexed: docs.length };
  }

  private async prismaFallbackSearch(q: string, page: number, limit: number) {
    const { skip, take } = { skip: (page - 1) * limit, take: limit };
    const data = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE', deletedAt: null,
        OR: [{ title: { contains: q, mode: 'insensitive' } }, { brand: { contains: q, mode: 'insensitive' } }],
      },
      select: { id: true, title: true, slug: true, price: true, discountPrice: true, thumbnail: true },
      skip, take,
    });
    return { success: true, data, meta: { total: data.length, page, limit, query: q }, fallback: true };
  }
}
