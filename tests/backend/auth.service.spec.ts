import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/modules/auth/auth.service';
import { PrismaService } from 'src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;
  let jwtService: typeof mockJwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      prisma.user.count.mockResolvedValue(0);
      prisma.user.create.mockResolvedValue({
        id: 'user-id-123',
        email: dto.email,
        fullName: dto.fullName,
        role: 'ADMIN',
      });
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.register(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(prisma.user.count).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          passwordHash: 'hashedPassword',
          fullName: dto.fullName,
          role: 'ADMIN',
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id-123',
        email: dto.email,
        role: 'ADMIN',
      });
      expect(result).toEqual({
        user: {
          id: 'user-id-123',
          email: dto.email,
          fullName: dto.fullName,
          role: 'ADMIN',
        },
        accessToken: 'mock-jwt-token',
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
      };

      prisma.user.findUnique.mockResolvedValue({ id: 'some-id' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id-123',
        email: dto.email,
        passwordHash: 'hashedPassword',
        fullName: 'Test User',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        avatarUrl: 'some-avatar',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password, 'hashedPassword');
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
          role: mockUser.role,
          avatarUrl: mockUser.avatarUrl,
        },
        accessToken: 'mock-jwt-token',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const dto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-id-123',
        email: dto.email,
        passwordHash: 'hashedPassword',
        status: 'ACTIVE',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user status is not ACTIVE', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id-123',
        email: dto.email,
        passwordHash: 'hashedPassword',
        status: 'INACTIVE',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
