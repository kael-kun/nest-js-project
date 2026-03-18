import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUserRoleDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsString()
  user_id: string;

  @ApiProperty({ example: 'uuid-of-role' })
  @IsString()
  role_id: string;
}

export class CreateUserRolesDto {
  @ApiProperty({ example: 'uuid-of-role' })
  @IsString()
  role_id: string;
}

export class UpdateUserRolesDto {
  @ApiProperty({ example: 'uuid-of-role' })
  @IsString()
  role_id: string;
}
