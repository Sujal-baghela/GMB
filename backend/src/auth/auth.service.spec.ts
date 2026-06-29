import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConflictError, UnauthorizedError } from '@common/exceptions/api.exception';

const mockUser = {
  id: 'user-id-1',
  email: 'test@example.com',
  password: '$argon2id$hashedpassword',
  firstName: 'John',
  lastName: 'Doe',
  avatar: null,
  passwordHash: null,
  bio: null,
  phone: null,
  emailVerified: null,
  emailVerificationToken: null,
  passwordResetToken: null,
  passwordResetExpiry: null,
  isActive: true,
  lastLoginAt: null,
  lastActivityAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as any;

const mockSession = {
  id: 'session-id-1',
  userId: mockUser.id,
  token: 'session-token',
  refreshToken: 'refresh-token',
  userAgent: null,
  ipAddress: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  isRevoked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    oAuthAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRATION: '24h',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({ ...mockUser, email: registerDto.email } as any);
      jest.spyOn(prisma.session, 'create').mockResolvedValue(mockSession);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictError if email already exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      await expect(service.register(registerDto)).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should login successfully with valid credentials', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser);
      jest.spyOn(prisma.session, 'create').mockResolvedValue(mockSession);

      // Mock password verification to return true
      jest.mock('@common/utils/password.helper', () => ({
        PasswordHelper: { verify: jest.fn().mockResolvedValue(true) },
      }));

      const result = await service.login(loginDto);
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedError if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedError with invalid token', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token') as never);
      await expect(service.refreshToken({ refreshToken: 'invalid' })).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user with organizationUsers', async () => {
      const userWithOrgs = { ...mockUser, organizationUsers: [] };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithOrgs as any);

      const result = await service.getCurrentUser(mockUser.id);
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedError if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(service.getCurrentUser('nonexistent')).rejects.toThrow(UnauthorizedError);
    });
  });
});