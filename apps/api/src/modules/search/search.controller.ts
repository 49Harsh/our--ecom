import { Controller, Get, Post, Query, UseGuards, HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe, Optional } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles.constant';

@ApiTags('Search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search products with full filter and sort' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false })
  @ApiQuery({ name: 'color', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'price_asc', 'price_desc', 'popular', 'rating'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('gender') gender?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('size') size?: string,
    @Query('color') color?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search({
      q,
      category,
      gender,
      brand,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      size,
      color,
      sort,
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('suggestions')
  @Public()
  @ApiOperation({ summary: 'Get autocomplete suggestions' })
  @ApiQuery({ name: 'q', required: true })
  suggestions(@Query('q') q: string) {
    return this.searchService.suggestions(q);
  }

  @Post('reindex')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Trigger full product reindex in Meilisearch' })
  reindexAll() {
    return this.searchService.reindexAll();
  }
}
