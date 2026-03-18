import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../users/types/user.types';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with userId, username, and roles from valid payload', async () => {
      const payload = {
        sub: 'user-uuid-123',
        username: 'test@example.com',
        roles: ['CITIZEN', 'ADMIN'] as UserRole[],
      };

      const result = await strategy.validate(payload as any);

      expect(result).toEqual({
        userId: 'user-uuid-123',
        username: 'test@example.com',
        roles: ['CITIZEN', 'ADMIN'],
      });
    });

    it('should return empty roles array when roles are not provided in payload', async () => {
      const payload = {
        sub: 'user-uuid-123',
        username: 'test@example.com',
        roles: [] as UserRole[],
      };

      const result = await strategy.validate(payload as any);

      expect(result).toEqual({
        userId: 'user-uuid-123',
        username: 'test@example.com',
        roles: [],
      });
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      const payload = {
        username: 'test@example.com',
        roles: ['CITIZEN'] as UserRole[],
      };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when sub is empty', async () => {
      const payload = {
        sub: '',
        username: 'test@example.com',
        roles: ['CITIZEN'] as UserRole[],
      };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
