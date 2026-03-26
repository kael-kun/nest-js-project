import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

function emptyToUndefined() {
  return Transform(({ value }) => (value === '' ? undefined : value));
}

export enum UserRoleEnum {
  CITIZEN = 'CITIZEN',
  DISPATCHER = 'DISPATCHER',
  RESPONDER = 'RESPONDER',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {
  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({
    required: false,
    type: 'file',
    format: 'binary',
    description: 'Profile image file',
  })
  @IsOptional()
  file?: Express.Multer.File;
}

export class UpdateUserDto {
  @ApiProperty({ required: false, example: '+1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @emptyToUndefined()
  phone?: string;

  @ApiProperty({ required: false, example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  @emptyToUndefined()
  email?: string;

  @ApiProperty({ required: false, example: 'password123' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @emptyToUndefined()
  password?: string;

  @ApiProperty({ required: false, example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @emptyToUndefined()
  first_name?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @emptyToUndefined()
  last_name?: string;

  @ApiProperty({
    required: false,
    type: 'file',
    format: 'binary',
    description: 'Profile image file',
  })
  @IsOptional()
  file?: Express.Multer.File;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @emptyToUndefined()
  profile_image_url?: string;
}

export class CreateEmergencyContactDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'Wife' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationship?: string;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 14.5995 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 120.9842 })
  @IsNumber()
  longitude: number;
}

export class UpdateUserRolesDto {
  @ApiProperty({ example: 'uuid-of-role' })
  @IsString()
  role_id: string;
}

export class UserSearchResultDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Juan' })
  first_name: string;

  @ApiProperty({ example: 'dela Cruz' })
  last_name: string;

  @ApiProperty({ example: 'juan@example.com' })
  email: string;

  @ApiProperty({ example: '+639171234567', nullable: true })
  phone: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/profiles/juan.jpg',
    nullable: true,
  })
  profile_image_url: string | null;

  @ApiProperty({
    example: false,
    nullable: true,
    description:
      'Whether the user already has an INVITED or ACTIVE membership in the queried org. Null when org_id was not provided.',
  })
  is_member: boolean | null;
}
