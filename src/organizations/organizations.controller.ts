import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  RevokeMemberDto,
  PromoteMemberDto,
  CreateDispatcherDto,
  InitialOrgAdminDto,
  OrganizationDto,
  OrganizationListDto,
  MemberWithUserDto,
  OrganizationType,
  OrganizationLevel,
  UpdateOrgConfigsDto,
} from './types/dto.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrgAdminGuard } from '../auth/guards/org-admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('organizations')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ─── Organization CRUD ───────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all organizations',
    description:
      'Returns a paginated list of active organizations. Filterable by type and level. Requires authentication.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page, max 100 (default: 10)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: OrganizationType,
    description: 'Filter by organization type',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: OrganizationLevel,
    description: 'Filter by organization level',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of organizations',
    type: OrganizationListDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: OrganizationType,
    @Query('level') level?: OrganizationLevel,
  ) {
    return this.organizationsService.findAll(page, limit, type, level);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get organization by ID',
    description:
      'Returns the full details of a single organization. Public endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: OrganizationDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create organization',
    description:
      'Creates a new organization. Requires System ADMIN role. ' +
      'The admin must set allowed_roles (which member roles the org may grant) and ' +
      'allowed_responder_types (which responder types may be assigned to RESPONDER members at invite time). ' +
      'allowed_responder_types must be a non-empty subset of the valid types for the org type, ' +
      'and is required when allowed_roles includes RESPONDER. ' +
      'Optionally include initial_admin with an existing user_id to appoint them as the first ORG_ADMIN atomically.',
  })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error — including invalid allowed_responder_types for org type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN role required' })
  @ApiResponse({ status: 404, description: 'initial_admin user_id not found' })
  @ApiResponse({
    status: 409,
    description:
      'Organization code already exists, or user already has an active membership',
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.organizationsService.create(
      createOrganizationDto,
      req.user.userId,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update organization',
    description:
      'Partially updates an organization. All fields are optional. ' +
      'System ADMIN may update any field including structural fields: ' +
      'type, code, allowed_roles, and allowed_responder_types. ' +
      'ORG_ADMIN of this organization may update profile fields only ' +
      '(name, address, phone, website, etc.). ' +
      'When allowed_responder_types is updated, it must remain a valid subset of the ceiling for the org type.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: OrganizationDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — ORG_ADMIN of this org or System ADMIN required',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate organization',
    description:
      'Soft-deletes an organization by setting is_active = false. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 204, description: 'Organization deactivated' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN role required' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  // ─── Membership endpoints ────────────────────────────────────────────────────

  @Post(':id/members/invite')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Invite user to organization',
    description:
      'Sends a membership invitation to a registered user. ' +
      "org_role must be in this organization's allowed_roles. " +
      'When inviting a RESPONDER, responder_type is required and must be in ' +
      "this organization's allowed_responder_types (set by System Admin at org creation). " +
      'Only ORG_ADMIN of this organization or System ADMIN may invite. ' +
      'The invitation enters INVITED status until the citizen accepts or declines.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: InviteMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Invitation created',
    type: MemberWithUserDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Role not in org allowed_roles, or user is deactivated',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — ORG_ADMIN of this org or System ADMIN required',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization or target user not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'User already has an INVITED or ACTIVE membership in this organization',
  })
  async inviteMember(
    @Param('id') orgId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.organizationsService.inviteMember(orgId, dto, req.user.userId);
  }

  @Delete(':id/members/:memberId/invite')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel a pending invitation',
    description:
      'Deletes an INVITED membership record. Only works while the invitation is still pending — ' +
      'once accepted (ACTIVE) use revoke or kick instead. ' +
      'Requires ORG_ADMIN of this organization or System ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Membership UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({ status: 204, description: 'Invitation cancelled' })
  @ApiResponse({
    status: 400,
    description: 'Membership is not in INVITED status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — ORG_ADMIN of this org or System ADMIN required',
  })
  @ApiResponse({
    status: 404,
    description: 'Membership not found in this organization',
  })
  async cancelInvitation(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationsService.cancelInvitation(orgId, memberId);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List organization members',
    description:
      'Returns all members of the organization, optionally filtered by status. ' +
      'Requires ORG_ADMIN of this organization or System ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['INVITED', 'ACTIVE', 'DECLINED', 'SUSPENDED'],
    description: 'Filter by membership status. Omit to return all statuses.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of members with user details',
    type: [MemberWithUserDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — ORG_ADMIN of this org or System ADMIN required',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getMembers(
    @Param('id') orgId: string,
    @Query('status') status?: string,
  ) {
    return this.organizationsService.getMembers(orgId, status as any);
  }

  @Put(':id/members/:memberId/revoke')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke organization membership',
    description:
      'Sets a membership status to SUSPENDED, effectively revoking access. ' +
      'An optional reason can be provided. ' +
      'Requires ORG_ADMIN of this organization or System ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Membership UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({ type: RevokeMemberDto })
  @ApiResponse({ status: 200, description: 'Membership revoked successfully' })
  @ApiResponse({ status: 400, description: 'Membership is already suspended' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — ORG_ADMIN of this org or System ADMIN required',
  })
  @ApiResponse({
    status: 404,
    description: 'Membership not found in this organization',
  })
  async revokeMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: RevokeMemberDto,
  ) {
    return this.organizationsService.revokeMember(orgId, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Kick (permanently remove) a member',
    description:
      'Hard-deletes the membership record. Unlike revoke (which suspends and preserves history), ' +
      'kick completely removes the member — they can be re-invited from scratch. ' +
      'Requires ORG_ADMIN of this organization or System ADMIN. ' +
      'Cannot be used to remove an ORG_ADMIN — use DELETE /:id/admins/:memberId (System ADMIN only) instead.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Membership UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden — ORG_ADMIN of this org or System ADMIN required; or target member is an ORG_ADMIN (use DELETE /:id/admins/:memberId instead)',
  })
  @ApiResponse({
    status: 404,
    description: 'Membership not found in this organization',
  })
  async kickMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationsService.kickMember(orgId, memberId);
  }

  @Put(':id/members/:memberId/promote')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Promote a member to DISPATCHER or ORG_ADMIN',
    description:
      'Changes the org_role of an ACTIVE member. Only ORG_ADMIN of this organization ' +
      'or System ADMIN may promote. Responder_type is cleared on promotion since ' +
      'DISPATCHER and ORG_ADMIN members do not field-respond to incidents.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Membership UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({ type: PromoteMemberDto })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  @ApiResponse({
    status: 400,
    description: 'Member is not ACTIVE or already has that role',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — ORG_ADMIN of this org required',
  })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async promoteMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: PromoteMemberDto,
  ) {
    return this.organizationsService.promoteMember(orgId, memberId, dto);
  }

  // ─── ORG_ADMIN management (System ADMIN only) ────────────────────────────────

  @Post(':id/admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Appoint an existing user as ORG_ADMIN',
    description:
      'Creates an ACTIVE ORG_ADMIN membership for an existing registered user. ' +
      'The user must be active and must not already have an INVITED or ACTIVE membership in this organization. ' +
      'System ADMIN only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: InitialOrgAdminDto })
  @ApiResponse({
    status: 201,
    description: 'ORG_ADMIN membership created',
    type: MemberWithUserDto,
  })
  @ApiResponse({ status: 400, description: 'User is deactivated' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN role required' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  @ApiResponse({
    status: 409,
    description:
      'User already has an active or pending membership in this organization',
  })
  async addOrgAdmin(
    @Param('id') orgId: string,
    @Body() dto: InitialOrgAdminDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.organizationsService.addOrgAdmin(
      orgId,
      dto.user_id,
      req.user.userId,
    );
  }

  @Delete(':id/admins/:memberId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an ORG_ADMIN membership',
    description:
      'Hard-deletes an ORG_ADMIN membership record. ' +
      'Only works on memberships where org_role is ORG_ADMIN — use kick for other roles. ' +
      'System ADMIN only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Membership UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({ status: 204, description: 'ORG_ADMIN membership removed' })
  @ApiResponse({ status: 400, description: 'Membership is not an ORG_ADMIN' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN role required' })
  @ApiResponse({
    status: 404,
    description: 'Membership not found in this organization',
  })
  async removeOrgAdmin(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationsService.removeOrgAdmin(orgId, memberId);
  }

  @Post(':id/staff/dispatcher')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a Dispatcher staff account',
    description:
      'Creates a new user with the DISPATCHER system role and immediately adds them ' +
      'as an ACTIVE DISPATCHER member of this organization. Only ORG_ADMIN of this ' +
      'organization or System ADMIN may use this endpoint. This is distinct from the ' +
      'invite flow — the account is created directly, not invited.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: CreateDispatcherDto })
  @ApiResponse({
    status: 201,
    description: 'Dispatcher account created and added to org',
    type: MemberWithUserDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — ORG_ADMIN of this org required',
  })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async createDispatcherStaff(
    @Param('id') orgId: string,
    @Body() dto: CreateDispatcherDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.organizationsService.createDispatcherStaff(
      orgId,
      dto,
      req.user.userId,
    );
  }

  @Post(':id/sub-organizations')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a sub-organization',
    description:
      'Creates a new organization as a child of this one. The parent_organization_id ' +
      'is automatically set from the path parameter. ' +
      'allowed_roles and allowed_responder_types must be provided and are validated against ' +
      'the ceiling for the chosen org type — same rules as POST /organizations. ' +
      'Supports the optional initial_admin field to appoint an existing user as the first ORG_ADMIN atomically. ' +
      'Only ORG_ADMIN of the parent org or System ADMIN may use this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Parent organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 201,
    description: 'Sub-organization created',
    type: OrganizationDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error — including invalid allowed_responder_types for org type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — ORG_ADMIN of parent org required',
  })
  @ApiResponse({
    status: 404,
    description:
      'Parent organization not found, or initial_admin user_id not found',
  })
  @ApiResponse({ status: 409, description: 'Organization code already exists' })
  async createSubOrganization(
    @Param('id') parentOrgId: string,
    @Body() dto: CreateOrganizationDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.organizationsService.createSubOrganization(
      parentOrgId,
      dto,
      req.user.userId,
    );
  }

  @Get(':id/sub-organizations')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List sub-organizations',
    description:
      'Returns all active direct children of this organization. Public endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Parent organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of sub-organizations',
    type: [OrganizationDto],
  })
  @ApiResponse({ status: 404, description: 'Parent organization not found' })
  async getSubOrganizations(@Param('id') parentOrgId: string) {
    return this.organizationsService.getSubOrganizations(parentOrgId);
  }

  @Get(':id/configs')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get organization configs',
    description: 'Returns all org_configs for this organization.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of org configs',
  })
  async getConfigs(@Param('id') orgId: string) {
    return this.organizationsService.getConfigs(orgId);
  }

  @Put(':id/configs')
  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update organization configs',
    description: 'Updates kilometer_radius for RESPONDER and/or DISPATCHER roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateOrgConfigsDto })
  @ApiResponse({
    status: 200,
    description: 'Updated org configs',
  })
  async updateConfigs(
    @Param('id') orgId: string,
    @Body() dto: UpdateOrgConfigsDto,
  ) {
    return this.organizationsService.updateConfigs(orgId, dto.configs);
  }
}
