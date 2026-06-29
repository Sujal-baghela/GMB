import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { PasswordHelper } from '@common/utils/password.helper';
import { UnauthorizedError, ConflictError } from '@common/exceptions/api.exception';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await PasswordHelper.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const tokens = await this.generateTokensWithSession(user);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordValid = await PasswordHelper.verify(dto.password, user.password || '');
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokensWithSession(user);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async logout(userId: string, authorizationHeader: string) {
    const token = this.extractTokenFromHeader(authorizationHeader);
    if (!token) {
      throw new BadRequestException('No authorization token provided');
    }

    const session = await this.prisma.session.findFirst({
      where: { userId, token },
    });

    if (!session) {
      throw new UnauthorizedError('Session not found');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
      });

      const session = await this.prisma.session.findFirst({
        where: {
          userId: payload.sub,
          refreshToken: dto.refreshToken,
          isRevoked: false,
        },
      });

      if (!session) {
        throw new UnauthorizedError('Session not found or has been revoked');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      await this.prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });

      const tokens = await this.generateTokensWithSession(user);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async googleLogin(googleUser: any) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          avatar: googleUser.avatar,
        },
      });
    }

    // FIX: correct Prisma casing oAuthAccount not oauthAccount
    const existingOAuthAccount = await this.prisma.oAuthAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'GOOGLE',
      },
    });

    if (existingOAuthAccount) {
      await this.prisma.oAuthAccount.update({
        where: { id: existingOAuthAccount.id },
        data: {
          providerAccountId: googleUser.googleId,
          accessToken: googleUser.accessToken,
          refreshToken: googleUser.refreshToken,
        },
      });
    } else {
      await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: googleUser.googleId,
          accessToken: googleUser.accessToken,
          refreshToken: googleUser.refreshToken,
        },
      });
    }

    const tokens = await this.generateTokensWithSession(user);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizationUsers: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      organizationUsers: user.organizationUsers,
    };
  }

  private async generateTokensWithSession(user: any) {
    const jwtPayload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '24h',
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const refreshToken = this.jwtService.sign(jwtPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
    });

    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private extractTokenFromHeader(authorizationHeader: string): string | null {
    if (!authorizationHeader) return null;
    const parts = authorizationHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }
}