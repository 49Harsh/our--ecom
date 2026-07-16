import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto, OrderQueryDto } from './dto/orders.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/roles.constant';

@ApiTags('Orders')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── Customer Routes ──────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my orders (paginated)' })
  findMyOrders(@CurrentUser('id') userId: string, @Query() query: OrderQueryDto) {
    return this.ordersService.findMyOrders(userId, query);
  }

  @Get('my/:id')
  @ApiOperation({ summary: 'Get my order detail' })
  findMyOrder(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Patch('my/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel my order (PENDING/CONFIRMED only)' })
  cancelOrder(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, userId);
  }

  // ─── Admin Routes ─────────────────────────────────────────────────────────

  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] List all orders with filters' })
  findAllAdmin(@Query() query: OrderQueryDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Get order statistics by status' })
  getStats() {
    return this.ordersService.getStats();
  }

  @Get('admin/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Get any order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch('admin/:id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Update order status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
