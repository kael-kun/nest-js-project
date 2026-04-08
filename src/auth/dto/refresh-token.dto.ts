import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'uuid-string' })
  @IsString()
  refresh_token!: string;
}
