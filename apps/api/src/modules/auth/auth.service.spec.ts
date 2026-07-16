import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { createPrismaMock, createRedisMock, createJwtMock, createConfigMock, mockUser } from '../../common/test/mocks';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-token') }));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let redis: ReturnType<typeof createRedisMock>;
  let jwtService: ReturnType<typeof createJwtMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    redis = createRedisMock();
    jwtService = createJwtMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: createConfigMock() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Register ──────────────────────────────────────────────────────────────
  describe('register()', () => {
    it('should register a new user and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$hashed');
      prisma.user.create.mockResolvedValue({
        id: 'user-123', name: 'Alice', email: 'alice@example.com', role: 'CUSTOMER',
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Password@123',
        phone: '+919876543210',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password@123', 12);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('alice@example.com');
    });

    it('should throw ConflictException if email already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());

      await expect(
        service.register({ name: 'Alice', email: 'test@example.com', password: 'Password@123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('should return tokens for valid credentials', async () => {
      const user = mockUser();
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'test@example.com', password: 'Password@123' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'Password@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deactivated account', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser({ isActive: false }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'Password@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tempToken when 2FA is enabled', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser({ isTwoFAEnabled: true }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});
      redis.set.mockResolvedValue('OK');

      const result = await service.login({ email: 'test@example.com', password: 'Password@123' });

      expect(result).toHaveProperty('requires2FA', true);
      expect(result).toHaveProperty('tempToken');
      expect(redis.set).toHaveBeenCalledWith('2fa:pending:mock-uuid-token', 'user-123', 300);
    });
  });

  // ─── Refresh Tokens ────────────────────────────────────────────────────────
  describe('refreshTokens()', () => {
    it('should rotate refresh token and return new tokens', async () => {
      const user = mockUser();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        user,
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isRevoked: true } }),
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 86400000), // expired
        user: mockUser(),
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser(),
      });

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('unknown-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Logout ────────────────────────────────────────────────────────────────
  describe('logout()', () => {
    it('should revoke the refresh token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('some-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
        data: { isRevoked: true },
      });
      expect(result.message).toBe('Logged out successfully');
    });
  });

  // ─── Forgot Password ───────────────────────────────────────────────────────
  describe('forgotPassword()', () => {
    it('should create a reset token in Redis for existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());
      redis.set.mockResolvedValue('OK');

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(redis.set).toHaveBeenCalledWith('reset:mock-uuid-token', 'user-123', 3600);
      expect(result.message).toContain('If the email exists');
    });

    it('should return safe response even for non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nobody@example.com' });

      expect(redis.set).not.toHaveBeenCalled();
      expect(result.message).toContain('If the email exists');
    });
  });

  // ─── Reset Password ────────────────────────────────────────────────────────
  describe('resetPassword()', () => {
    it('should reset password when token is valid', async () => {
      redis.get.mockResolvedValue('user-123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$newhashed');
      prisma.user.update.mockResolvedValue({});
      redis.del.mockResolvedValue(1);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.resetPassword({ token: 'valid-reset-token', password: 'NewPassword@123' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: '$2a$newhashed' },
      });
      expect(result.message).toBe('Password reset successfully');
    });

    it('should throw BadRequestException for invalid/expired reset token', async () => {
      redis.get.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid-token', password: 'NewPassword@123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Send OTP ──────────────────────────────────────────────────────────────
  describe('sendOtp()', () => {
    it('should create OTP record in DB and return success', async () => {
      prisma.otpVerification.create.mockResolvedValue({ id: 'otp-123' });

      const result = await service.sendOtp({ phone: '+919876543210' });

      expect(prisma.otpVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: '+919876543210', purpose: 'login' }),
        }),
      );
      expect(result.message).toBe('OTP sent successfully');
    });
  });

  // ─── Verify OTP ────────────────────────────────────────────────────────────
  describe('verifyOtp()', () => {
    it('should return tokens when OTP is valid', async () => {
      const user = mockUser();
      prisma.otpVerification.findFirst.mockResolvedValue({ id: 'otp-123' });
      prisma.otpVerification.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verifyOtp({ phone: '+919876543210', otp: '123456' });

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ phone: '+919876543210', otp: '999999' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
