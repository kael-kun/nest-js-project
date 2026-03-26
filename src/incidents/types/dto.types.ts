import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

function emptyToUndefined() {
  return Transform(({ value }) => (value === '' ? undefined : value));
}

export enum IncidentType {
  MEDICAL = 'MEDICAL',
  FIRE = 'FIRE',
  POLICE = 'POLICE',
  TRAFFIC = 'TRAFFIC',
  DISASTER = 'DISASTER',
  OTHER = 'OTHER',
}

export enum IncidentStatus {
  RECEIVED = 'RECEIVED',
  DISPATCHED = 'DISPATCHED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  EN_ROUTE = 'EN_ROUTE',
  ON_SCENE = 'ON_SCENE',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
  FALSE_REPORT = 'FALSE_REPORT',
  CLOSED = 'CLOSED',
}

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateIncidentDto {
  @ApiProperty({ enum: IncidentType, example: 'MEDICAL' })
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({ enum: PriorityLevel, example: 'MEDIUM' })
  @IsEnum(PriorityLevel)
  priority: PriorityLevel;

  @ApiProperty({ example: 'Car accident on Highway 1' })
  @IsString()
  @IsString()
  title: string;

  @ApiProperty({ required: false, example: 'Two vehicles collided, one driver injured' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 14.5995 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 120.9842 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  is_silent?: boolean;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  is_anonymous?: boolean;

  @ApiProperty({
    required: false,
    type: 'file',
    format: 'binary',
    description: 'Incident image file',
  })
  @IsOptional()
  file?: Express.Multer.File;
}

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {}

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: IncidentStatus, example: 'DISPATCHED' })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @ApiProperty({ required: false, example: 'uuid-of-commander' })
  @IsOptional()
  @IsUUID()
  scene_commander_id?: string;
}

export class IncidentFiltersDto {
  @ApiProperty({ required: false, enum: IncidentType })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @ApiProperty({ required: false, enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiProperty({ required: false, enum: PriorityLevel })
  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}