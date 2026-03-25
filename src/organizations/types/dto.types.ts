import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  IsArray,
  IsUUID,
  IsEmail,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

export enum OrgMemberRole {
  RESPONDER = 'RESPONDER',
  DISPATCHER = 'DISPATCHER',
  ORG_ADMIN = 'ORG_ADMIN',
}

export enum OrgMemberStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  DECLINED = 'DECLINED',
  SUSPENDED = 'SUSPENDED',
}

export enum ResponderStatus {
  AVAILABLE = 'AVAILABLE',
  EN_ROUTE = 'EN_ROUTE',
  ON_SCENE = 'ON_SCENE',
  OFF_DUTY = 'OFF_DUTY',
  BUSY = 'BUSY',
}

export class CreateOrganizationDto {
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

  @ApiProperty({
    required: false,
    example: ['RESPONDER', 'DISPATCHER'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_roles?: string[];

  @ApiProperty({
    required: false,
    example: ['PATROL_OFFICER', 'DETECTIVE'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_responder_types?: string[];

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

export class ResponderDetailDto {
  @ApiProperty({ example: 'Badge Number' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'PNP-12345' })
  @IsString()
  description: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ enum: OrgMemberRole, example: 'RESPONDER' })
  @IsEnum(OrgMemberRole)
  org_role: OrgMemberRole;

  @ApiProperty({
    required: false,
    example: 'PATROL_OFFICER',
  })
  @IsOptional()
  @IsString()
  responder_type?: string;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  preferred_km?: number;

  @ApiProperty({
    required: false,
    example: [
      { title: 'Badge Number', description: 'PNP-12345' },
      { title: 'Rank', description: 'Sergeant' },
    ],
    type: [ResponderDetailDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponderDetailDto)
  responder_details?: ResponderDetailDto[];
}

export class UpdateMemberDto {
  @ApiProperty({ enum: OrgMemberStatus, example: 'ACTIVE' })
  @IsOptional()
  @IsEnum(OrgMemberStatus)
  status?: OrgMemberStatus;

  @ApiProperty({ required: false, example: 'Violation of policies' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false, example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  preferred_km?: number;

  @ApiProperty({
    required: false,
    example: [
      { title: 'Badge Number', description: 'PNP-12345' },
      { title: 'Rank', description: 'Sergeant' },
    ],
    type: [ResponderDetailDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponderDetailDto)
  responder_details?: ResponderDetailDto[];
}

export class AcceptInviteDto {
  @ApiProperty({ enum: OrgMemberStatus, example: 'ACTIVE' })
  @IsEnum(OrgMemberStatus)
  status: OrgMemberStatus;
}

export class SuspendMemberDto {
  @ApiProperty({ example: 'Violation of policies' })
  @IsString()
  reason: string;
}

export class AssignUserToOrganizationDto {
  @ApiProperty({ example: 'CITIZEN202603180123' })
  @IsString()
  citizen_id: string;

  @ApiProperty({ example: 'uuid-of-organization' })
  @IsString()
  organization_id: string;
}
