import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum OrganizationType {
  POLICE = 'POLICE',
  AMBULANCE = 'AMBULANCE',
  FIRE = 'FIRE',
  LGU = 'LGU',
  OCD = 'OCD',
  COAST_GUARD = 'COAST_GUARD',
  BARANGAY = 'BARANGAY',
  PRIVATE = 'PRIVATE',
}

export enum OrganizationLevel {
  NATIONAL = 'NATIONAL',
  REGIONAL = 'REGIONAL',
  PROVINCIAL = 'PROVINCIAL',
  CITY = 'CITY',
  MUNICIPAL = 'MUNICIPAL',
  BARANGAY = 'BARANGAY',
}

function emptyToUndefined() {
  return Transform(({ value }) => (value === '' ? undefined : value));
}

export class CreateOrganizationDto {
  // user id
  @ApiProperty({ example: 'CITIZEN202603180123' })
  @IsString()
  citizen_id: string;

  @ApiProperty({ example: 'National Police' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false, example: 'PNP' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  short_name?: string;

  @ApiProperty({ example: 'PNP-001' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ enum: OrganizationType, example: 'POLICE' })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @ApiProperty({ enum: OrganizationLevel, example: 'NATIONAL' })
  @IsEnum(OrganizationLevel)
  level: OrganizationLevel;

  @ApiProperty({ required: false, example: 'NCR' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiProperty({ required: false, example: 'Metro Manila' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiProperty({ required: false, example: 'Quezon City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ required: false, example: 'Barangay 1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barangay?: string;

  @ApiProperty({ required: false, example: '123 Main St, Quezon City' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: '+6321234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ required: false, example: 'https://pnp.gov.ph' })
  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class AssignUserToOrganizationDto {
  @ApiProperty({ example: 'CITIZEN202603180123' })
  @IsString()
  citizen_id: string;

  @ApiProperty({ example: 'uuid-of-organization' })
  @IsString()
  organization_id: string;
}
