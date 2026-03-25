import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRolesService } from './user-roles.service';
import { UsersService } from '../users/users.service';
import { AddUserRoleDto, UpdateUserRolesDto } from './dto/user-roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('user-roles')
@Controller('user-roles')
@UseGuards(JwtAuthGuard, OwnershipGuard)
@ApiBearerAuth()
export class UserRolesController {
  constructor(
    private readonly userRolesService: UserRolesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a role to a user' })
  @ApiResponse({ status: 201, description: 'Role added successfully' })
  @ApiResponse({
    status: 400,
    description: 'User or role not found or already exists',
  })
  async addRole(@Body() dto: AddUserRoleDto) {
    return this.userRolesService.addRole(dto);
  }

  @Put('roles/:userRoleId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user role by user role id' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async updateUserRole(
    @Param('userRoleId') userRoleId: string,
    @Body() body: UpdateUserRolesDto,
  ) {
    await this.usersService.updateUserRoles(userRoleId, body.role_id);
    return { message: 'Role updated successfully' };
  }

  @Delete('roles/:userRoleId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  async removeRole(@Param('userRoleId') userRoleId: string) {
    return this.userRolesService.removeRole(userRoleId);
  }
}
