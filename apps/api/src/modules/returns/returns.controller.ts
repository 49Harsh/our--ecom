import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReturnsService, CreateReturnDto, UpdateReturnStatusDto, ReturnStatus } from './returns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/roles.constant';

@ApiTags('Returns')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my return requests' })
  getMyReturns(@CurrentUser('id') userId: string) {
    return this.returnsService.getMyReturns(userId);
  }

  @Post(':orderId')
  @ApiOperation({ summary: 'Create return request for an order' })
  createReturn(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.createReturn(orderId, userId, dto);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] List all return requests' })
  findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ReturnStatus,
  ) {
    return this.returnsService.findAllAdmin(page, limit, status);
  }

  @Patch('admin/:id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Admin] Update return request status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReturnStatusDto) {
    return this.returnsService.updateStatus(id, dto);
  }
}
