import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import type { JwtPayload } from './strategies/jwt.strategy';
import { UserRole } from '../../common/constants/roles.constant';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        role: UserRole.CUSTOMER,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    // Update last login
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // If 2FA enabled, return partial token requiring TOTP verification
    if (user.isTwoFAEnabled) {
      const tempToken = uuidv4();
      await this.redis.set(`2fa:pending:${tempToken}`, user.id, 300); // 5 min
      return { requires2FA: true, tempToken };
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const { password: _, twoFASecret: __, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    let user = await this.prisma.user.findUnique({ where: { email: googleUser.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.avatar,
          googleId: googleUser.googleId,
          isVerified: true,
          role: UserRole.CUSTOMER,
        },
      });
    } else if (!user.googleId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens };
  }

  // ─── OTP ──────────────────────────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.prisma.otpVerification.create({
      data: { phone: dto.phone, otp, purpose: 'login', expiresAt },
    });

    // TODO: Integrate MSG91 here
    // await this.msg91Service.sendOtp(dto.phone, otp);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: dto.phone,
        otp: dto.otp,
        purpose: 'login',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException('Invalid or expired OTP');

    await this.prisma.otpVerification.update({ where: { id: record.id }, data: { isUsed: true } });

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: dto.phone, name: 'User', email: `${dto.phone}@otp.temp`, isVerified: true },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: { id: user.id, name: user.name, role: user.role }, ...tokens };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!record || record.isRevoked || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { isRevoked: true } });

    const tokens = await this.generateTokens(record.user.id, record.user.email, record.user.role);
    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'If the email exists, a reset link has been sent' }; // don't reveal existence

    const token = uuidv4();
    await this.redis.set(`reset:${token}`, user.id, 3600); // 1 hour

    // TODO: send email via Resend
    // await this.emailService.sendPasswordReset(user.email, token);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await this.redis.get<string>(`reset:${dto.token}`);
    if (!userId) throw new BadRequestException('Invalid or expired reset token');

    const hashed = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    await this.redis.del(`reset:${dto.token}`);

    // Revoke all existing refresh tokens
    await this.prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });

    return { message: 'Password reset successfully' };
  }

  // ─── 2FA / TOTP ──────────────────────────────────────────────────────────

  async enable2FA(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = speakeasy.generateSecret({
      name: `${this.configService.get('TOTP_APP_NAME')} (${user.email})`,
      length: 20,
    });

    await this.prisma.user.update({ where: { id: userId }, data: { twoFASecret: secret.base32 } });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCode };
  }

  async confirm2FA(userId: string, token: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFASecret) throw new BadRequestException('2FA not initialized');

    const valid = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Invalid TOTP token');
    await this.prisma.user.update({ where: { id: userId }, data: { isTwoFAEnabled: true } });
    return { message: '2FA enabled successfully' };
  }

  async verify2FA(tempToken: string, totpToken: string) {
    const userId = await this.redis.get<string>(`2fa:pending:${tempToken}`);
    if (!userId) throw new UnauthorizedException('Invalid or expired 2FA session');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = speakeasy.totp.verify({
      secret: user.twoFASecret!,
      encoding: 'base32',
      token: totpToken,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Invalid TOTP token');
    await this.redis.del(`2fa:pending:${tempToken}`);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
