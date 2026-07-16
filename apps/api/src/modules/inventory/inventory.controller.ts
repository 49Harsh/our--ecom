import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles.constant';
import { InventoryService } from './inventory.service';

class UpdateStockDto {
  @ApiProperty() @IsInt() @Min(0) stock: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) lowStock?: number;
}

class BulkUpdateStockDto {
  @ApiProperty({ type: () => [Object] })
  @IsArray()
  updates: { variantId: string; stock: number }[];
}

@ApiTags('Inventory')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] List all inventory with variant info' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
  findAll(
    @Query('page') @Type(() => Number) page?: number,
    @Query('limit') @Type(() => Number) limit?: number,
    @Query('lowStockOnly') lowStockOnly?: boolean,
  ) {
    return this.inventoryService.findAll(page, limit, lowStockOnly);
  }

  @Get('alerts')
  @ApiOperation({ summary: '[Admin] Get low stock alerts' })
  getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  @Get(':productId')
  @ApiOperation({ summary: '[Admin] Get inventory for a product (all variants)' })
  findByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }

  @Patch('variant/:variantId')
  @ApiOperation({ summary: '[Admin] Update stock for a specific variant' })
  updateStock(@Param('variantId') variantId: string, @Body() dto: UpdateStockDto) {
    return this.inventoryService.updateStock(variantId, dto.stock, dto.lowStock);
  }

  @Patch('bulk')
  @ApiOperation({ summary: '[Admin] Bulk update stock for multiple variants' })
  bulkUpdate(@Body() dto: BulkUpdateStockDto) {
    return this.inventoryService.bulkUpdate(dto.updates);
  }
}
