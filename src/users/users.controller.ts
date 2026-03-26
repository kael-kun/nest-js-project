import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateEmergencyContactDto,
  UpdateLocationDto,
  UserSearchResultDto,
} from './types/dto.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileValidationPipe } from '../r2_bucket/pipes/file-validation.pipe';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('search')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search users by name, email, or phone',
    description:
      'Case-insensitive partial match across first_name, last_name, email, and phone. ' +
      'Returns up to 20 results with minimal profile info. ' +
      'Intended for use when inviting members to an organization.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search term',
    example: 'juan',
  })
  @ApiQuery({
    name: 'org_id',
    required: false,
    description:
      'When provided, each result includes is_member indicating whether the user already has an INVITED or ACTIVE membership in this org.',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching users',
    type: [UserSearchResultDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Query('q') q: string = '', @Query('org_id') orgId?: string) {
    return this.usersService.search(q, orgId);
  }

  @Post()
  @UseGuards()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
  ) {
    return this.usersService.create(createUserDto, file);
  }
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('ADMIN')
  @Get()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.findAll(page, limit);
  }
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('ADMIN', 'OWNER')
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    const { password_hash, ...response } = user;
    return response;
  }
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('ADMIN', 'OWNER')
  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile(new FileValidationPipe()) file?: Express.Multer.File,
  ) {
    return this.usersService.update(id, updateUserDto, file);
  }
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate user account (admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('ADMIN', 'DISPATCHER', 'RESPONDER', 'OWNER')
  @Get(':id/emergency-contacts')
  @ApiOperation({ summary: 'Get emergency contacts for a user' })
  @ApiResponse({ status: 200, description: 'List of emergency contacts' })
  async getEmergencyContacts(@Param('id') userId: string) {
    return this.usersService.getEmergencyContacts(userId);
  }
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('ADMIN', 'DISPATCHER', 'RESPONDER', 'OWNER')
  @Post(':id/emergency-contacts')
  @ApiOperation({ summary: 'Add emergency contact' })
  @ApiResponse({ status: 201, description: 'Emergency contact added' })
  async addEmergencyContact(
    @Param('id') userId: string,
    @Body() dto: CreateEmergencyContactDto,
  ) {
    return this.usersService.addEmergencyContact(userId, dto);
  }
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('ADMIN', 'DISPATCHER', 'RESPONDER', 'OWNER')
  @Delete(':id/emergency-contacts/:contactId')
  @ApiOperation({ summary: 'Remove emergency contact' })
  @ApiResponse({ status: 200, description: 'Emergency contact removed' })
  async removeEmergencyContact(
    @Param('id') userId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.usersService.removeEmergencyContact(contactId, userId);
  }
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('ADMIN', 'DISPATCHER', 'RESPONDER', 'OWNER')
  @Patch(':id/location')
  @ApiOperation({ summary: 'Update member location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async updateMemberLocation(
    @Param('id') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    await this.usersService.updateMemberLocation(
      userId,
      dto.latitude,
      dto.longitude,
    );
    return { message: 'Location updated successfully' };
  }
}
