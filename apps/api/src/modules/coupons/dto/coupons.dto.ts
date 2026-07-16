import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsDate, Min, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum CouponType { PERCENTAGE = 'PERCENTAGE', FIXED = 'FIXED', FREE_SHIPPING = 'FREE_SHIPPING' }

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20' }) @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: CouponType }) @IsEnum(CouponType) type: CouponType;
  @ApiProperty({ example: 20 }) @IsNumber() @Min(0) value: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) usageLimitPerUser?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class ValidateCouponDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsNumber() @Min(0) orderAmount: number;
}
