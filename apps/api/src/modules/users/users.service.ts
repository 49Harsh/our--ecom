import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, UpdateUserRoleDto, CreateAddressDto, UpdateAddressDto } from './dto/users.dto';
import { getPaginationParams, buildPaginatedResponse } from '../../common/utils/helpers.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Profile ──────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, avatar: true,
        role: true, isVerified: true, isTwoFAEnabled: true, lastLoginAt: true, createdAt: true,
        addresses: true,
      },
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    });
  }

  async deleteMe(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: false, deletedAt: new Date() } });
    return { message: 'Account deactivated' };
  }

  // ─── Admin: User Management ───────────────────────────────────────────────

  async findAll(page = 1, limit = 20, search?: string) {
    const { skip, take } = getPaginationParams(page, limit);
    const where = search
      ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } }, { name: { contains: search, mode: 'insensitive' as const } }] }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, orders: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRole(id: string, dto: UpdateUserRoleDto) {
    return this.prisma.user.update({ where: { id }, data: { role: dto.role } });
  }

  async deactivateUser(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { message: 'Address deleted' };
  }
}
