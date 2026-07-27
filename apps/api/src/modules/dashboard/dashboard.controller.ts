import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  DashboardService,
  CreateHeroBannerDto, UpdateHeroBannerDto,
  CreateHomepageSectionDto, UpdateHomepageSectionDto,
} from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/constants/roles.constant';

@ApiTags('Dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── Hero Banners ─────────────────────────────────────────────────────────

  @Get('hero-banners')
  @Public()
  @ApiOperation({ summary: 'Get active hero banners (public)' })
  getActiveBanners() {
    return this.dashboardService.getHeroBanners(true);
  }

  @Get('hero-banners/admin')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Get all hero banners' })
  getAllBanners() {
    return this.dashboardService.getHeroBanners(false);
  }

  @Post('hero-banners')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Create hero banner' })
  createBanner(@Body() dto: CreateHeroBannerDto) {
    return this.dashboardService.createHeroBanner(dto);
  }

  @Patch('hero-banners/:id')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Update hero banner' })
  updateBanner(@Param('id') id: string, @Body() dto: UpdateHeroBannerDto) {
    return this.dashboardService.updateHeroBanner(id, dto);
  }

  @Delete('hero-banners/:id')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Delete hero banner' })
  deleteBanner(@Param('id') id: string) {
    return this.dashboardService.deleteHeroBanner(id);
  }

  // ─── Homepage Sections ────────────────────────────────────────────────────

  @Get('sections')
  @Public()
  @ApiOperation({ summary: 'Get active homepage sections (public)' })
  getActiveSections() {
    return this.dashboardService.getHomepageSections(true);
  }

  @Get('sections/admin')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Get all homepage sections' })
  getAllSections() {
    return this.dashboardService.getHomepageSections(false);
  }

  @Post('sections')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Create homepage section' })
  createSection(@Body() dto: CreateHomepageSectionDto) {
    return this.dashboardService.createHomepageSection(dto);
  }

  @Patch('sections/:id')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Update homepage section' })
  updateSection(@Param('id') id: string, @Body() dto: UpdateHomepageSectionDto) {
    return this.dashboardService.updateHomepageSection(id, dto);
  }

  @Delete('sections/:id')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Delete homepage section' })
  deleteSection(@Param('id') id: string) {
    return this.dashboardService.deleteHomepageSection(id);
  }

  // ─── Activity Logs ────────────────────────────────────────────────────────

  @Get('logs')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get activity/audit logs' })
  getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
  ) {
    return this.dashboardService.getActivityLogs(page, limit, userId, entity);
  }

  // ─── Stats & Analytics ────────────────────────────────────────────────────

  @Get('stats')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Get dashboard stats (totals, status counts, changes)' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('revenue')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Get revenue trend by period (7d|30d|90d|1y)' })
  getRevenue(@Query('period') period?: string) {
    return this.dashboardService.getRevenue(period);
  }

  @Get('top-products')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Get top selling products' })
  getTopProducts(@Query('limit') limit?: string) {
    return this.dashboardService.getTopProducts(limit ? Number(limit) : 10);
  }

  @Get('recent-orders')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Get recent orders' })
  getRecentOrders(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentOrders(limit ? Number(limit) : 10);
  }
}