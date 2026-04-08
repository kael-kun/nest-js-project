import { IsString, MinLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Refresh token for obtaining new access tokens',
  })
  refresh_token!: string;

  @ApiProperty({
    example: '2026-03-19T10:15:00.000Z',
    description: 'Access token expiry timestamp (ISO 8601)',
  })
  expires_at!: string;

  @ApiProperty({ description: 'User information' })
  user!: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    roles: { name: string }[];
  };
}

export class RefreshResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'New JWT access token',
  })
  access_token!: string;

  @ApiProperty({
    example: '2026-03-19T10:15:00.000Z',
    description: 'Access token expiry timestamp (ISO 8601)',
  })
  expires_at!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message!: string;
}
