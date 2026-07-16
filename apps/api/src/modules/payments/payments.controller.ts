import {
  Controller, Post, Get, Body, Param, Req, Headers,
  UseGuards, HttpCode, HttpStatus, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/roles.constant';

class CreatePaymentOrderDto {
  @ApiProperty() @IsString() orderId: string;
}

class VerifyPaymentDto {
  @ApiProperty() @IsString() orderId: string;
  @ApiProperty() @IsString() razorpayOrderId: string;
  @ApiProperty() @IsString() razorpayPaymentId: string;
  @ApiProperty() @IsString() razorpaySignature: string;
  @ApiPropertyOptional() @IsOptional() @IsString() method?: string;
}

class RefundDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) amount?: number;
}

@ApiTags('Payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create Razorpay order for payment initiation' })
  createOrder(@Body() dto: CreatePaymentOrderDto, @CurrentUser('id') userId: string) {
    return this.paymentsService.createRazorpayOrder(dto.orderId, userId);
  }

  @Post('verify')
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature and confirm order' })
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook endpoint (do not call directly)' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
    return this.paymentsService.handleWebhook(rawBody, signature);
  }

  @Post('refund/:orderId')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Initiate refund for an order' })
  refund(@Param('orderId') orderId: string, @Body() dto: RefundDto) {
    return this.paymentsService.refundPayment(orderId, dto.amount);
  }

  @Get(':orderId')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get payment details for an order' })
  getPayment(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrder(orderId);
  }
}
