import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsObject,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ example: 'incident_assigned' })
  @IsString()
  @MaxLength(50)
  type!: string;

  @ApiProperty({ example: 'New Incident Assigned' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'You have been assigned to incident EMG-20260326-0001' })
  @IsString()
  message!: string;

  @ApiProperty({ required: false, example: { incident_id: 'EMG-20260326-0001' } })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ enum: ['low', 'normal', 'high', 'urgent'], required: false, default: 'normal' })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @ApiProperty({ required: false, example: '/incidents/EMG-20260326-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  action_url?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  action_required?: boolean;

  @ApiProperty({ required: false, example: '2026-03-27T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

export class UpdateNotificationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_read?: boolean;
}

export class NotificationFiltersDto {
  @ApiProperty({ required: false, description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  is_read?: boolean;

  @ApiProperty({ required: false, description: 'Filter by type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  limit?: number = 10;
}

export class NotificationListResponse {
  notifications!: any[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}