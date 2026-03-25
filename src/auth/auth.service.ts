import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/types/user.types';
import { SessionsService } from './sessions.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private sessionsService: SessionsService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !(await this.validatePassword(user, loginDto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const refreshToken = randomUUID();
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setUTCDate(refreshTokenExpiry.getUTCDate() + 7);

    await this.sessionsService.create({
      user_id: user.id,
      refresh_token: refreshToken,
      ip_address: ipAddress,
      expires_at: refreshTokenExpiry,
    });

    const roleNames = user.roles.map((r) => r.name);

    const payload = { sub: user.id, username: user.email, roles: roleNames };
    const accessToken = this.jwtService.sign(payload);

    await this.usersService.updateLastLogin(user.id);

    const ACCESS_TOKEN_EXPIRY = 900;
    const accessTokenExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY * 1000);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessTokenExpiry.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        roles: user.roles.map((r) => ({ name: r.name })),
      },
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const session = await this.sessionsService.validateSession(
      refreshTokenDto.refresh_token,
    );

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(session.user_id);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const roleNames = user.roles.map((r) => r.name);
    const payload = { sub: user.id, username: user.email, roles: roleNames };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      expires_in: 900,
    };
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    const session = await this.sessionsService.findByRefreshToken(
      refreshTokenDto.refresh_token,
    );

    if (session) {
      await this.sessionsService.revokeSession(session.id);
    }

    return { message: 'Logged out successfully' };
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.usersService.findById(userId);
    return user ?? null;
  }
}
