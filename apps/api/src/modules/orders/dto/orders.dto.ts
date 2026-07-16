import { IsString, IsOptional, IsEnum, IsInt, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OrderStatus {
  PENDING = 'PENDING', CONFIRMED = 'CONFIRMED', PACKED = 'PACKED',
  SHIPPED = 'SHIPPED', OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED', RETURNED = 'RETURNED', REFUNDED = 'REFUNDED',
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Delivery address ID' }) @IsString() addressId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingZoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status: OrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() cancelledReason?: string;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() limit?: number = 20;
  @ApiPropertyOptional({ enum: OrderStatus }) @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string; // order number
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() dateFrom?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() dateTo?: Date;
}
