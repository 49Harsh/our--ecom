import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles.constant';

@ApiTags('Analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '[Admin] Get dashboard overview: revenue, orders, customers, products' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('revenue')
  @ApiOperation({ summary: '[Admin] Get revenue chart data by period' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'] })
  getRevenueChart(@Query('period') period?: 'week' | 'month' | 'year') {
    return this.analyticsService.getRevenueChart(period ?? 'month');
  }

  @Get('products/best-selling')
  @ApiOperation({ summary: '[Admin] Get best selling products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getBestSelling(@Query('limit') limit?: number) {
    return this.analyticsService.getBestSellingProducts(limit ?? 10);
  }

  @Get('orders/by-status')
  @ApiOperation({ summary: '[Admin] Get order counts grouped by status' })
  getOrdersByStatus() {
    return this.analyticsService.getOrdersByStatus();
  }

  @Get('customers/top')
  @ApiOperation({ summary: '[Admin] Get top customers by order count' })
  getTopCustomers(@Query('limit') limit?: number) {
    return this.analyticsService.getTopCustomers(limit ?? 10);
  }

  @Get('inventory')
  @ApiOperation({ summary: '[Admin] Get full inventory report with low stock flags' })
  getInventoryReport() {
    return this.analyticsService.getInventoryReport();
  }

  @Get('conversion')
  @ApiOperation({ summary: '[Admin] Get conversion rate and average order value' })
  getConversionMetrics() {
    return this.analyticsService.getConversionMetrics();
  }
}
