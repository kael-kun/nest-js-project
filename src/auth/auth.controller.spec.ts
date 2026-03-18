import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockLoginResponse = {
    access_token: 'access_token_mock',
    refresh_token: 'refresh_token_mock',
    expires_in: 900,
    user: {
      id: 'user-uuid-123',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      roles: [{ name: 'CITIZEN' }],
    },
  };

  const mockRefreshResponse = {
    access_token: 'new_access_token_mock',
    expires_in: 900,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens and user on successful login', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const mockRequest = { ip: '127.0.0.1', connection: {} };
      authService.login.mockResolvedValue(mockLoginResponse as any);

      const result = await controller.login(
        loginDto,
        mockRequest as any,
        '127.0.0.1',
      );

      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1');
      expect(result).toEqual(mockLoginResponse);
    });

    it('should use request ip when available', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const mockRequest = { ip: '192.168.1.1', connection: {} };
      authService.login.mockResolvedValue(mockLoginResponse as any);

      await controller.login(loginDto, mockRequest as any, '127.0.0.1');

      expect(authService.login).toHaveBeenCalledWith(loginDto, '192.168.1.1');
    });
  });

  describe('refresh', () => {
    it('should return new access token on valid refresh token', async () => {
      const refreshTokenDto = { refresh_token: 'valid-refresh-token' };
      authService.refresh.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refresh).toHaveBeenCalledWith(refreshTokenDto);
      expect(result).toEqual(mockRefreshResponse);
    });
  });

  describe('logout', () => {
    it('should return success message on successful logout', async () => {
      const refreshTokenDto = { refresh_token: 'refresh-token' };
      authService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const result = await controller.logout(refreshTokenDto);

      expect(authService.logout).toHaveBeenCalledWith(refreshTokenDto);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
