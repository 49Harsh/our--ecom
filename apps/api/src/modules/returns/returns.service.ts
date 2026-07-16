import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../common/utils/helpers.util';

export enum ReturnStatus {
  REQUESTED = 'REQUESTED', APPROVED = 'APPROVED', REJECTED = 'REJECTED',
  PICKED_UP = 'PICKED_UP', INSPECTED = 'INSPECTED', REFUNDED = 'REFUNDED',
}

export class CreateReturnDto {
  @ApiProperty() @IsString() reason: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() images?: string[];
}

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ReturnStatus }) @IsEnum(ReturnStatus) status: ReturnStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() adminNotes?: string;
}

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReturn(orderId: string, userId: string, dto: CreateReturnDto) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'DELIVERED') throw new BadRequestException('Only delivered orders can be returned');

    const existing = await this.prisma.return.findFirst({ where: { orderId, userId } });
    if (existing) throw new BadRequestException('Return request already exists for this order');

    return this.prisma.return.create({
      data: { orderId, userId, reason: dto.reason, description: dto.description, images: dto.images ?? [] },
    });
  }

  async findAllAdmin(page = 1, limit = 20, status?: ReturnStatus) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.return.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          order: { select: { orderNumber: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      this.prisma.return.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async updateStatus(id: string, dto: UpdateReturnStatusDto) {
    const ret = await this.prisma.return.findUnique({ where: { id } });
    if (!ret) throw new NotFoundException('Return not found');

    const updateData: Record<string, unknown> = { status: dto.status };
    if (dto.adminNotes) updateData.adminNotes = dto.adminNotes;
    if (dto.status === ReturnStatus.REFUNDED) updateData.resolvedAt = new Date();

    return this.prisma.return.update({ where: { id }, data: updateData });
  }

  async getMyReturns(userId: string) {
    return this.prisma.return.findMany({
      where: { userId },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
