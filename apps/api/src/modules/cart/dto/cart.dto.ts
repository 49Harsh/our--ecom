import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty() @IsString() variantId: string;
  @ApiProperty({ default: 1 }) @IsInt() @Min(1) @Type(() => Number) quantity: number = 1;
}

export class UpdateCartItemDto {
  @ApiProperty() @IsInt() @Min(1) @Type(() => Number) quantity: number;
}

export class ApplyCouponDto {
  @ApiProperty() @IsString() code: string;
}

export class MergeCartDto {
  @ApiProperty({ description: 'Guest cart ID to merge into user cart' })
  @IsString()
  guestId: string;
}
