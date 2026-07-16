import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { createPrismaMock, mockUser } from '../../common/test/mocks';

const mockAddress = (overrides: Record<string, any> = {}) => ({
  id: 'addr-123', userId: 'user-123',
  type: 'HOME', isDefault: true,
  fullName: 'Test User', phone: '+919876543210',
  line1: '123 Test St', line2: null,
  city: 'Mumbai', state: 'Maharashtra',
  pincode: '400001', country: 'India', landmark: null,
  createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getMe() ───────────────────────────────────────────────────────────────
  describe('getMe()', () => {
    it('should return user profile without sensitive fields', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-123', name: 'Test', email: 'test@test.com', phone: null,
        avatar: null, role: 'CUSTOMER', isVerified: true, isTwoFAEnabled: false,
        lastLoginAt: null, createdAt: new Date(), addresses: [],
      });

      const result = await service.getMe('user-123');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('twoFASecret');
      expect(result.id).toBe('user-123');
    });
  });

  // ─── updateMe() ────────────────────────────────────────────────────────────
  describe('updateMe()', () => {
    it('should update user name and phone', async () => {
      const updated = {
        id: 'user-123', name: 'New Name',
        email: 'test@test.com', phone: '+919000000001', avatar: null,
      };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.updateMe('user-123', { name: 'New Name', phone: '+919000000001' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
      expect(result.name).toBe('New Name');
    });
  });

  // ─── deleteMe() ────────────────────────────────────────────────────────────
  describe('deleteMe()', () => {
    it('should deactivate the user account', async () => {
      prisma.user.update.mockResolvedValue({});

      const result = await service.deleteMe('user-123');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
        }),
      );
      expect(result.message).toBe('Account deactivated');
    });
  });

  // ─── findAll() ─────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated users', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser()]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by search term across name and email', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'alice');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.objectContaining({ contains: 'alice' }) }),
            ]),
          }),
        }),
      );
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('should return user with recent orders', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser(), orders: [] });
      const result = await service.findOne('user-123');
      expect(result.id).toBe('user-123');
    });

    it('should throw NotFoundException for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateRole() ──────────────────────────────────────────────────────────
  describe('updateRole()', () => {
    it('should update user role', async () => {
      prisma.user.update.mockResolvedValue(mockUser({ role: 'MANAGER' }));

      const result = await service.updateRole('user-123', { role: 'MANAGER' as any });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: 'MANAGER' } }),
      );
    });
  });

  // ─── getAddresses() ────────────────────────────────────────────────────────
  describe('getAddresses()', () => {
    it('should return all addresses ordered by isDefault desc', async () => {
      prisma.address.findMany.mockResolvedValue([mockAddress()]);

      const result = await service.getAddresses('user-123');

      expect(result).toHaveLength(1);
      expect(prisma.address.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { isDefault: 'desc' },
      });
    });
  });

  // ─── createAddress() ───────────────────────────────────────────────────────
  describe('createAddress()', () => {
    it('should create a new address', async () => {
      prisma.address.create.mockResolvedValue(mockAddress());

      const dto = {
        fullName: 'Test', phone: '+91900', line1: '123 St',
        city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
        type: 'HOME' as any,
      };
      const result = await service.createAddress('user-123', dto);

      expect(prisma.address.create).toHaveBeenCalled();
      expect(result.city).toBe('Mumbai');
    });

    it('should clear old default before setting new default', async () => {
      prisma.address.updateMany.mockResolvedValue({ count: 1 });
      prisma.address.create.mockResolvedValue(mockAddress({ isDefault: true }));

      await service.createAddress('user-123', {
        fullName: 'Test', phone: '+91900', line1: 'St', city: 'Delhi',
        state: 'Delhi', pincode: '110001', isDefault: true,
      } as any);

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' }, data: { isDefault: false },
      });
    });
  });

  // ─── updateAddress() ───────────────────────────────────────────────────────
  describe('updateAddress()', () => {
    it('should update an address', async () => {
      prisma.address.findFirst.mockResolvedValue(mockAddress());
      prisma.address.update.mockResolvedValue(mockAddress({ city: 'Pune' }));

      const result = await service.updateAddress('user-123', 'addr-123', { city: 'Pune' } as any);
      expect(result.city).toBe('Pune');
    });

    it('should throw NotFoundException if address not found', async () => {
      prisma.address.findFirst.mockResolvedValue(null);
      await expect(
        service.updateAddress('user-123', 'unknown', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteAddress() ───────────────────────────────────────────────────────
  describe('deleteAddress()', () => {
    it('should delete an address', async () => {
      prisma.address.findFirst.mockResolvedValue(mockAddress());
      prisma.address.delete.mockResolvedValue({});

      const result = await service.deleteAddress('user-123', 'addr-123');

      expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: 'addr-123' } });
      expect(result.message).toBe('Address deleted');
    });

    it('should throw NotFoundException if address not found or wrong user', async () => {
      prisma.address.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteAddress('user-123', 'unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
