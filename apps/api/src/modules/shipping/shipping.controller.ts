import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/constants/roles.constant';

class ShippingRatesDto {
  @ApiProperty() @IsString() pickupPostcode: string;
  @ApiProperty() @IsString() deliveryPostcode: string;
  @ApiProperty() @IsNumber() weight: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cod?: boolean;
}

@ApiTags('Shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('rates')
  @ApiOperation({ summary: 'Get real-time shipping rates from Shiprocket' })
  getShippingRates(@Body() dto: ShippingRatesDto) {
    return this.shippingService.getShippingRates(dto);
  }

  @Get('track/:awb')
  @ApiOperation({ summary: 'Track shipment by AWB code' })
  trackShipment(@Param('awb') awb: string) {
    return this.shippingService.trackShipment(awb);
  }

  @Post('create/:orderId')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Create shipment on Shiprocket for an order' })
  createShipment(@Param('orderId') orderId: string, @Body() orderData: any) {
    return this.shippingService.createShipment(orderId, orderData);
  }

  @Post('cancel')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Cancel shipments by AWB codes' })
  cancelShipment(@Body() body: { awbCodes: string[] }) {
    return this.shippingService.cancelShipment(body.awbCodes);
  }
}
