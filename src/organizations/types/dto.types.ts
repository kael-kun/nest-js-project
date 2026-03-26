import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsArray,
  IsEmail,
  ArrayMinSize,
  ArrayUnique,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

export enum OrgMemberRoleEnum {
  RESPONDER  = 'RESPONDER',
  DISPATCHER = 'DISPATCHER',
  ORG_ADMIN  = 'ORG_ADMIN',
}

export enum ResponderTypeEnum {
  // POLICE org
  PATROL_OFFICER     = 'PATROL_OFFICER',
  DETECTIVE          = 'DETECTIVE',
  SWAT               = 'SWAT',
  K9_OFFICER         = 'K9_OFFICER',
  TRAFFIC_OFFICER    = 'TRAFFIC_OFFICER',
  // FIRE org
  FIREFIGHTER        = 'FIREFIGHTER',
  FIRE_INVESTIGATOR  = 'FIRE_INVESTIGATOR',
  HAZMAT_SPECIALIST  = 'HAZMAT_SPECIALIST',
  RESCUE_TECHNICIAN  = 'RESCUE_TECHNICIAN',
  // AMBULANCE org
  PARAMEDIC          = 'PARAMEDIC',
  EMT                = 'EMT',
  NURSE              = 'NURSE',
  DOCTOR             = 'DOCTOR',
  // COAST_GUARD org
  RESCUE_SWIMMER     = 'RESCUE_SWIMMER',
  BOAT_OPERATOR      = 'BOAT_OPERATOR',
  AVIATION_RESCUE    = 'AVIATION_RESCUE',
  MARITIME_OFFICER   = 'MARITIME_OFFICER',
  // BARANGAY org
  TANOD              = 'TANOD',
  HEALTH_WORKER      = 'HEALTH_WORKER',
  DISASTER_VOLUNTEER = 'DISASTER_VOLUNTEER',
  // LGU org
  DISASTER_COORDINATOR = 'DISASTER_COORDINATOR',
  RELIEF_COORDINATOR   = 'RELIEF_COORDINATOR',
  HEALTH_OFFICER       = 'HEALTH_OFFICER',
  // OCD org (DISASTER_COORDINATOR shared with LGU)
  EMERGENCY_MANAGER  = 'EMERGENCY_MANAGER',
  LOGISTICS_OFFICER  = 'LOGISTICS_OFFICER',
  // PRIVATE org
  SECURITY_OFFICER   = 'SECURITY_OFFICER',
  FIRST_AIDER        = 'FIRST_AIDER',
  SAFETY_OFFICER     = 'SAFETY_OFFICER',
}


export class InitialOrgAdminDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of an existing user to appoint as the first ORG_ADMIN. The user must be active.',
  })
  @IsUUID()
  user_id: string;
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

  @ApiProperty({
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the parent organization. Omit for top-level organizations.',
  })
  @IsOptional()
  @IsUUID()
  parent_organization_id?: string;

  @ApiProperty({
    enum: OrgMemberRoleEnum,
    isArray: true,
    example: ['RESPONDER', 'DISPATCHER'],
    description:
      'Roles this organization is allowed to grant to its members. ' +
      'Must be a non-empty subset of what the org type permits: ' +
      'POLICE/AMBULANCE/FIRE/COAST_GUARD/PRIVATE → [RESPONDER, DISPATCHER]; ' +
      'LGU/OCD/BARANGAY → [DISPATCHER] only.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(OrgMemberRoleEnum, { each: true })
  allowed_roles: OrgMemberRoleEnum[];

  @ApiProperty({
    enum: ResponderTypeEnum,
    isArray: true,
    example: ['PATROL_OFFICER', 'DETECTIVE', 'TRAFFIC_OFFICER'],
    description:
      'Responder types this organization is permitted to assign to its RESPONDER members. ' +
      'Set by System Admin at creation — must be a non-empty subset of the valid types for the org type. ' +
      'Required when allowed_roles includes RESPONDER. ' +
      'ORG_ADMIN may only invite with responder_type values from this list.',
  })
  @IsArray()
  @ArrayUnique()
  @IsEnum(ResponderTypeEnum, { each: true })
  allowed_responder_types: ResponderTypeEnum[];

  @ApiPropertyOptional({
    type: () => InitialOrgAdminDto,
    description:
      'Optional: appoint an existing user as the first ORG_ADMIN of this organization. ' +
      'Provide the user_id of an active registered user — they are granted ACTIVE ORG_ADMIN membership immediately. ' +
      'Omit if you plan to appoint the ORG_ADMIN separately via the invite or promote endpoints.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialOrgAdminDto)
  initial_admin?: InitialOrgAdminDto;
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

export class InviteMemberDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the user to invite',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    enum: [OrgMemberRoleEnum.RESPONDER, OrgMemberRoleEnum.DISPATCHER],
    example: 'RESPONDER',
    description:
      'Role to grant within the organization. ' +
      'Only RESPONDER and DISPATCHER can be invited. ' +
      'ORG_ADMIN is granted via the promote endpoint only.',
  })
  @IsEnum([OrgMemberRoleEnum.RESPONDER, OrgMemberRoleEnum.DISPATCHER])
  org_role: OrgMemberRoleEnum.RESPONDER | OrgMemberRoleEnum.DISPATCHER;

  @ApiProperty({
    enum: ResponderTypeEnum,
    example: 'PARAMEDIC',
    required: false,
    nullable: true,
    description:
      'Specific responder role within the organization. Optional for all org types; ' +
      'required for PRIVATE organizations. ' +
      'Valid values are scoped per org type — ' +
      'POLICE: PATROL_OFFICER, DETECTIVE, SWAT, K9_OFFICER, TRAFFIC_OFFICER; ' +
      'FIRE: FIREFIGHTER, FIRE_INVESTIGATOR, HAZMAT_SPECIALIST, RESCUE_TECHNICIAN; ' +
      'AMBULANCE: PARAMEDIC, EMT, NURSE, DOCTOR; ' +
      'COAST_GUARD: RESCUE_SWIMMER, BOAT_OPERATOR, AVIATION_RESCUE, MARITIME_OFFICER; ' +
      'BARANGAY: TANOD, HEALTH_WORKER, DISASTER_VOLUNTEER; ' +
      'LGU: DISASTER_COORDINATOR, RELIEF_COORDINATOR, HEALTH_OFFICER; ' +
      'OCD: DISASTER_COORDINATOR, EMERGENCY_MANAGER, LOGISTICS_OFFICER; ' +
      'PRIVATE: SECURITY_OFFICER, FIRST_AIDER, SAFETY_OFFICER. ' +
      'Use FIRST_AIDER in any org for Red Cross chapters or BHW volunteers.',
  })
  @IsOptional()
  @IsEnum(ResponderTypeEnum)
  responder_type?: ResponderTypeEnum;
}

export class RevokeMemberDto {
  @ApiProperty({
    required: false,
    example: 'Violated code of conduct',
    description: 'Optional reason for revocation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PromoteMemberDto {
  @ApiProperty({
    enum: [OrgMemberRoleEnum.DISPATCHER, OrgMemberRoleEnum.ORG_ADMIN],
    example: 'ORG_ADMIN',
    description:
      'New org-level role for this member. Only DISPATCHER and ORG_ADMIN ' +
      'are valid promotion targets — RESPONDER cannot be promoted to via this endpoint.',
  })
  @IsEnum([OrgMemberRoleEnum.DISPATCHER, OrgMemberRoleEnum.ORG_ADMIN])
  org_role: OrgMemberRoleEnum.DISPATCHER | OrgMemberRoleEnum.ORG_ADMIN;
}

export class CreateDispatcherDto {
  @ApiProperty({ example: 'Juan', description: 'First name' })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'dela Cruz', description: 'Last name' })
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({ example: 'dispatcher@pnp.gov.ph', description: 'Login email for the dispatcher account' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+639171234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    example: 'TemporaryPass123!',
    description: 'Temporary password — dispatcher must change on first login',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}

// ─── Response DTOs (Swagger schema classes) ───────────────────────────────────

export class OrganizationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Philippine National Police' })
  name: string;

  @ApiPropertyOptional({ example: 'PNP' })
  short_name?: string;

  @ApiProperty({ example: 'PNP-001' })
  code: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.POLICE })
  type: OrganizationType;

  @ApiProperty({ enum: OrganizationLevel, example: OrganizationLevel.NATIONAL })
  level: OrganizationLevel;

  @ApiPropertyOptional({ example: 'NCR' })
  region?: string;

  @ApiPropertyOptional({ example: 'Metro Manila' })
  province?: string;

  @ApiPropertyOptional({ example: 'Quezon City' })
  city?: string;

  @ApiPropertyOptional({ example: 'Barangay Holy Spirit' })
  barangay?: string;

  @ApiPropertyOptional({ example: 'Camp Crame, Quezon City' })
  address?: string;

  @ApiPropertyOptional({ example: '+6328-723-0401' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://pnp.gov.ph' })
  website?: string;

  @ApiProperty({
    enum: OrgMemberRoleEnum,
    isArray: true,
    example: ['RESPONDER', 'DISPATCHER'],
    description: 'Roles this organization is permitted to grant to its members',
  })
  allowed_roles: OrgMemberRoleEnum[];

  @ApiProperty({
    enum: ResponderTypeEnum,
    isArray: true,
    example: ['PATROL_OFFICER', 'DETECTIVE', 'TRAFFIC_OFFICER'],
    description: 'Responder types this organization is permitted to assign — set by System Admin',
  })
  allowed_responder_types: ResponderTypeEnum[];

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
    description: 'Parent organization UUID. Null for top-level organizations.',
  })
  parent_organization_id?: string;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '2026-03-19T08:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: 12, description: 'Number of ACTIVE members in this organization' })
  member_count: number;
}

export class OrganizationListDto {
  @ApiProperty({ type: [OrganizationDto] })
  organizations: OrganizationDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class MemberUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'juan@example.com' })
  email: string;

  @ApiProperty({ example: 'Juan' })
  first_name: string;

  @ApiProperty({ example: 'dela Cruz' })
  last_name: string;

  @ApiPropertyOptional({ example: '+639171234567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/profiles/juan.jpg' })
  profile_image_url?: string;
}

export class MemberWithUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  user_id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  organization_id: string;

  @ApiProperty({ enum: OrgMemberRoleEnum, example: OrgMemberRoleEnum.RESPONDER })
  org_role: OrgMemberRoleEnum;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.POLICE })
  org_type: OrganizationType;

  @ApiPropertyOptional({
    enum: ResponderTypeEnum,
    example: ResponderTypeEnum.PATROL_OFFICER,
    nullable: true,
    description:
      'Specific responder role stored at invite time. Scoped per organization type ' +
      '(e.g., PATROL_OFFICER for POLICE, PARAMEDIC for AMBULANCE). ' +
      'Null for DISPATCHER and ORG_ADMIN members.',
  })
  responder_type: ResponderTypeEnum | null;

  @ApiProperty({
    enum: ['INVITED', 'ACTIVE', 'DECLINED', 'SUSPENDED'],
    example: 'INVITED',
  })
  status: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440003',
    description: 'User ID of the person who sent the invite',
  })
  invited_by?: string;

  @ApiPropertyOptional({ example: 'Violated code of conduct' })
  reason?: string;

  @ApiProperty({ example: '2026-03-19T08:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2026-03-19T08:00:00.000Z' })
  updated_at: string;

  @ApiProperty({ type: MemberUserDto })
  user: MemberUserDto;
}
