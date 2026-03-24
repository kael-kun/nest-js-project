import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberDto,
} from './types/dto.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.organizationsService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new organization (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({ status: 409, description: 'Organization code already exists' })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUserId() userId: string,
  ) {
    return this.organizationsService.create(createOrganizationDto, userId);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an organization (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete an organization (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  async remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  @Get(':id/members')
  @Roles('ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({ status: 200, description: 'List of organization members' })
  async getOrgMembers(
    @Param('id') organizationId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.organizationsService.getOrgMembers(organizationId, page, limit);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Invite a user to the organization' })
  @ApiResponse({ status: 201, description: 'Member invited successfully' })
  @ApiResponse({
    status: 400,
    description: 'Role not allowed for organization',
  })
  async inviteMember(
    @Param('id') organizationId: string,
    @Body() inviteDto: InviteMemberDto,
  ) {
    return this.organizationsService.inviteMember(
      organizationId,
      inviteDto.user_id,
      inviteDto.org_role,
      inviteDto.responder_type,
    );
  }

  @Put('members/:memberId/accept')
  @ApiOperation({ summary: 'Accept organization invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  async acceptInvite(
    @Param('memberId') memberId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.organizationsService.acceptInvite(memberId, userId);
  }

  @Put('members/:memberId/decline')
  @ApiOperation({ summary: 'Decline organization invitation' })
  @ApiResponse({ status: 200, description: 'Invitation declined' })
  async declineInvite(
    @Param('memberId') memberId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.organizationsService.declineInvite(memberId, userId);
  }

  @Put('members/:memberId')
  @Roles('ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Update member status (suspend)' })
  @ApiResponse({ status: 200, description: 'Member updated' })
  async updateMember(
    @Param('memberId') memberId: string,
    @Body() updateDto: UpdateMemberDto,
  ) {
    return this.organizationsService.updateMember(memberId, updateDto);
  }

  @Delete('members/:memberId')
  @Roles('ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(@Param('memberId') memberId: string) {
    return this.organizationsService.removeMember(memberId);
  }

  @Post('members/:memberId/promote')
  @Roles('ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Promote member to ORG_ADMIN' })
  @ApiResponse({ status: 200, description: 'Member promoted' })
  async promoteMember(@Param('memberId') memberId: string) {
    return this.organizationsService.promoteToOrgAdmin(memberId);
  }
}
