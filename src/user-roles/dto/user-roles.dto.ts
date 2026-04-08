import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUserRoleDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsString()
  user_id!: string;

  @ApiProperty({ example: 'uuid-of-role' })
  @IsString()
  role_id!: string;
}

export class CreateUserRolesDto {
  @ApiProperty({ example: 'uuid-of-role' })
  @IsString()
  role_id!: string;
}

export class UpdateUserRolesDto {
  @ApiProperty({ example: 'uuid-of-role' })
  @IsString()
  role_id!: string;
}

export class RoleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'ADMIN' })
  name!: string;

  @ApiProperty({ example: 'System Administrator' })
  description!: string;
}
