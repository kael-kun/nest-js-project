import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DispatchStatusEnum {
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE = 'EN_ROUTE',
  ON_SCENE = 'ON_SCENE',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export class RespondToIncidentDto {
  @ApiProperty({
    required: false,
    example: 'Responding from Station 5',
    description: 'Optional notes from the responder',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDispatchStatusDto {
  @ApiProperty({ enum: DispatchStatusEnum, example: 'EN_ROUTE' })
  @IsEnum(DispatchStatusEnum)
  status!: DispatchStatusEnum;

  @ApiProperty({ required: false, example: 'Arriving in 5 minutes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class LocationUpdateDto {
  @ApiProperty({ example: 14.5995 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 120.9842 })
  @IsNumber()
  longitude!: number;

  @ApiProperty({ required: false, example: 5.0, description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty({ required: false, example: 90.0, description: 'Heading in degrees' })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiProperty({ required: false, example: 30.5, description: 'Speed in km/h' })
  @IsOptional()
  @IsNumber()
  speed?: number;
}
