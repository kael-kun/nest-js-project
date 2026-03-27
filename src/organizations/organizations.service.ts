import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  Organization,
  OrganizationResponse,
  OrganizationListResponse,
  MemberWithUserResponse,
  OrgMemberStatus,
} from './types/organization.types';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  RevokeMemberDto,
  PromoteMemberDto,
  CreateDispatcherDto,
  InitialOrgAdminDto,
} from './types/dto.types';
import {
  ORG_ALLOWED_ROLES,
  VALID_RESPONDER_TYPES,
  validateResponderTypeSubset,
} from './organization-permissions';
import * as bcrypt from 'bcrypt';

const ORGANIZATION_FIELDS =
  'id,name,short_name,code,type,level,region,province,city,barangay,address,phone,website,allowed_roles,allowed_responder_types,parent_organization_id,is_active,created_at,updated_at';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private supabase: SupabaseService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    type?: import('./types/dto.types').OrganizationType,
    level?: import('./types/dto.types').OrganizationLevel,
  ): Promise<OrganizationListResponse> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    let countQuery = this.supabase.client
      .from('organizations')
      .select(ORGANIZATION_FIELDS, { count: 'exact', head: true })
      .eq('is_active', true);

    if (type) countQuery = countQuery.eq('type', type);
    if (level) countQuery = countQuery.eq('level', level);

    const { count, error: countError } = await countQuery;

    if (countError || !count) {
      return {
        organizations: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }

    let query = this.supabase.client
      .from('organizations')
      .select(ORGANIZATION_FIELDS)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (type) query = query.eq('type', type);
    if (level) query = query.eq('level', level);

    const { data, error } = await query;

    if (error || !data) {
      return {
        organizations: [],
        total: count,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      };
    }

    const orgIds = data.map((org) => org.id);
    const countsMap = await this.fetchMemberCountsMap(orgIds);

    return {
      organizations: data.map((org) =>
        this.toResponse(org, countsMap.get(org.id) ?? 0),
      ),
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    };
  }

  async findById(id: string): Promise<OrganizationResponse> {
    const { data, error } = await this.supabase.client
      .from('organizations')
      .select(ORGANIZATION_FIELDS)
      .eq('id', id)
      .single<Organization | null>();

    if (error || !data) {
      throw new NotFoundException('Organization not found');
    }

    const countsMap = await this.fetchMemberCountsMap([data.id]);
    return this.toResponse(data, countsMap.get(data.id) ?? 0);
  }

  async findByCode(code: string): Promise<Organization | undefined> {
    const { data, error } = await this.supabase.client
      .from('organizations')
      .select(ORGANIZATION_FIELDS)
      .eq('code', code)
      .single<Organization | null>();

    if (error || !data) {
      return undefined;
    }

    return data;
  }

  private validateAllowedRoles(
    orgType: import('./types/dto.types').OrganizationType,
    roles: string[],
  ): void {
    const ceiling = ORG_ALLOWED_ROLES[orgType];
    const invalid = roles.filter((r) => !ceiling.includes(r as any));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Role(s) "${invalid.join(', ')}" are not permitted for org type "${orgType}". ` +
          `Allowed: ${ceiling.join(', ')}`,
      );
    }
  }

  async create(
    createOrganizationDto: CreateOrganizationDto,
    createdBy?: string,
  ): Promise<OrganizationResponse> {
    const existing = await this.findByCode(createOrganizationDto.code);
    if (existing) {
      throw new ConflictException('Organization code already exists');
    }

    this.validateAllowedRoles(
      createOrganizationDto.type,
      createOrganizationDto.allowed_roles,
    );

    if (
      createOrganizationDto.allowed_roles.includes('RESPONDER' as any) &&
      createOrganizationDto.allowed_responder_types.length === 0
    ) {
      throw new BadRequestException(
        'allowed_responder_types must not be empty when allowed_roles includes RESPONDER',
      );
    }

    const invalidResponderTypes = validateResponderTypeSubset(
      createOrganizationDto.type,
      createOrganizationDto.allowed_responder_types as any,
    );
    if (invalidResponderTypes.length > 0) {
      throw new BadRequestException(
        `Responder type(s) "${invalidResponderTypes.join(', ')}" are not valid for org type "${createOrganizationDto.type}". ` +
          `Allowed: ${(VALID_RESPONDER_TYPES[createOrganizationDto.type] ?? []).join(', ')}`,
      );
    }

    this.logger.log(`Creating organization: ${createOrganizationDto.code}`);

    const { data, error } = await this.supabase.client
      .from('organizations')
      .insert({
        name: createOrganizationDto.name,
        short_name: createOrganizationDto.short_name,
        code: createOrganizationDto.code,
        type: createOrganizationDto.type,
        level: createOrganizationDto.level,
        region: createOrganizationDto.region,
        province: createOrganizationDto.province,
        city: createOrganizationDto.city,
        barangay: createOrganizationDto.barangay,
        address: createOrganizationDto.address,
        phone: createOrganizationDto.phone,
        website: createOrganizationDto.website,
        allowed_roles: createOrganizationDto.allowed_roles,
        allowed_responder_types: createOrganizationDto.allowed_responder_types,
        parent_organization_id:
          createOrganizationDto.parent_organization_id ?? null,
      })
      .select(ORGANIZATION_FIELDS)
      .single<Organization | null>();

    if (error || !data) {
      throw new ConflictException(
        error?.message || 'Failed to create organization',
      );
    }

    this.logger.log(`Organization created: ${data.id}`);

    await this.createDefaultConfigs(data.id);

    if (createOrganizationDto.initial_admin) {
      await this.createInitialOrgAdmin(
        data.id,
        data.type as import('./types/dto.types').OrganizationType,
        createOrganizationDto.initial_admin,
        createdBy,
      );
    }

    const countsMap = await this.fetchMemberCountsMap([data.id]);
    return this.toResponse(data, countsMap.get(data.id) ?? 0);
  }

  private async createInitialOrgAdmin(
    orgId: string,
    orgType: import('./types/dto.types').OrganizationType,
    dto: InitialOrgAdminDto,
    createdBy?: string,
  ): Promise<void> {
    const { data: user } = await this.supabase.client
      .from('users')
      .select('id,is_active')
      .eq('id', dto.user_id)
      .maybeSingle();

    if (!user) {
      throw new NotFoundException(`User ${dto.user_id} not found`);
    }

    if (!user.is_active) {
      throw new BadRequestException(
        'Cannot appoint a deactivated user as ORG_ADMIN',
      );
    }

    const { error: memberError } = await this.supabase.client
      .from('organization_members')
      .insert({
        user_id: dto.user_id,
        organization_id: orgId,
        org_type: orgType,
        org_role: 'ORG_ADMIN',
        responder_type: null,
        status: 'ACTIVE',
        invited_by: createdBy ?? null,
      });

    if (memberError) {
      throw new ConflictException(
        `Failed to assign ORG_ADMIN membership: ${memberError.message}`,
      );
    }

    this.logger.log(
      `Appointed user ${dto.user_id} as initial ORG_ADMIN for org ${orgId}`,
    );
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const existing = await this.findById(id);

    const resolvedType = updateOrganizationDto.type ?? existing.type;
    const resolvedRoles =
      updateOrganizationDto.allowed_roles ?? existing.allowed_roles;
    const resolvedResponderTypes =
      updateOrganizationDto.allowed_responder_types ??
      existing.allowed_responder_types;

    if (updateOrganizationDto.type || updateOrganizationDto.allowed_roles) {
      this.validateAllowedRoles(resolvedType, resolvedRoles);
    }

    if (
      updateOrganizationDto.type ||
      updateOrganizationDto.allowed_responder_types
    ) {
      if (
        resolvedRoles.includes('RESPONDER' as any) &&
        resolvedResponderTypes.length === 0
      ) {
        throw new BadRequestException(
          'allowed_responder_types must not be empty when allowed_roles includes RESPONDER',
        );
      }
      const invalid = validateResponderTypeSubset(
        resolvedType,
        resolvedResponderTypes as any,
      );
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Responder type(s) "${invalid.join(', ')}" are not valid for org type "${resolvedType}". ` +
            `Allowed: ${(VALID_RESPONDER_TYPES[resolvedType] ?? []).join(', ')}`,
        );
      }
    }

    const { data, error } = await this.supabase.client
      .from('organizations')
      .update({
        name: updateOrganizationDto.name ?? existing.name,
        short_name: updateOrganizationDto.short_name ?? existing.short_name,
        code: updateOrganizationDto.code ?? existing.code,
        type: resolvedType,
        level: updateOrganizationDto.level ?? existing.level,
        region: updateOrganizationDto.region ?? existing.region,
        province: updateOrganizationDto.province ?? existing.province,
        city: updateOrganizationDto.city ?? existing.city,
        barangay: updateOrganizationDto.barangay ?? existing.barangay,
        address: updateOrganizationDto.address ?? existing.address,
        phone: updateOrganizationDto.phone ?? existing.phone,
        website: updateOrganizationDto.website ?? existing.website,
        allowed_roles: resolvedRoles,
        allowed_responder_types: resolvedResponderTypes,
        parent_organization_id:
          updateOrganizationDto.parent_organization_id !== undefined
            ? (updateOrganizationDto.parent_organization_id ?? null)
            : (existing.parent_organization_id ?? null),
        is_active: updateOrganizationDto.is_active ?? existing.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(ORGANIZATION_FIELDS)
      .single<Organization | null>();

    if (error || !data) {
      throw new ConflictException(
        error?.message || 'Failed to update organization',
      );
    }

    const countsMap = await this.fetchMemberCountsMap([data.id]);
    return this.toResponse(data, countsMap.get(data.id) ?? 0);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('organizations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new ConflictException(error.message);
    }
  }

  async inviteMember(
    orgId: string,
    dto: InviteMemberDto,
    invitedBy: string,
  ): Promise<MemberWithUserResponse> {
    const org = await this.findById(orgId);

    if (!org.allowed_roles.includes(dto.org_role as any)) {
      throw new BadRequestException(
        `Role "${dto.org_role}" is not in this organization's allowed roles. ` +
          `Allowed: ${org.allowed_roles.join(', ')}`,
      );
    }

    // Check user exists
    const { data: user, error: userError } = await this.supabase.client
      .from('users')
      .select('id,email,first_name,last_name,phone,profile_image_url,is_active')
      .eq('id', dto.user_id)
      .single();

    if (userError || !user) {
      throw new NotFoundException('User not found');
    }

    if (!user.is_active) {
      throw new BadRequestException('Cannot invite a deactivated user');
    }

    // Check not already a member (INVITED or ACTIVE)
    const { data: existing } = await this.supabase.client
      .from('organization_members')
      .select('id,status')
      .eq('user_id', dto.user_id)
      .eq('organization_id', orgId)
      .in('status', ['INVITED', 'ACTIVE'])
      .maybeSingle();

    if (existing) {
      throw new ConflictException(
        `User already has a "${existing.status}" membership in this organization`,
      );
    }

    let responderType:
      | import('./types/organization.types').ResponderType
      | null = null;
    if (dto.org_role === 'RESPONDER') {
      const allowedTypes = org.allowed_responder_types ?? [];

      if (!dto.responder_type) {
        throw new BadRequestException(
          `responder_type is required when inviting a RESPONDER. ` +
            `Allowed values for this organization: ${allowedTypes.join(', ')}`,
        );
      }

      if (!allowedTypes.includes(dto.responder_type as any)) {
        throw new BadRequestException(
          `responder_type "${dto.responder_type}" is not permitted for this organization. ` +
            `Allowed values: ${allowedTypes.join(', ')}`,
        );
      }

      responderType = dto.responder_type as any;
    }

    const { data, error } = await this.supabase.client
      .from('organization_members')
      .insert({
        user_id: dto.user_id,
        organization_id: orgId,
        org_type: org.type,
        org_role: dto.org_role,
        responder_type: responderType,
        status: 'INVITED' as OrgMemberStatus,
        invited_by: invitedBy,
      })
      .select(
        'id,user_id,organization_id,org_role,org_type,responder_type,status,invited_by,reason,created_at,updated_at',
      )
      .single();

    if (error || !data) {
      throw new ConflictException(error?.message || 'Failed to invite member');
    }

    this.logger.log(
      `Invited user ${dto.user_id} to org ${orgId} as ${dto.org_role}` +
        (responderType ? ` (${responderType} responder)` : ''),
    );

    const { data: inviter } = await this.supabase.client
      .from('users')
      .select('first_name,last_name')
      .eq('id', invitedBy)
      .single();

    const inviterName = inviter
      ? `${inviter.first_name} ${inviter.last_name}`
      : 'An administrator';

    await this.notificationsService.create({
      user_id: dto.user_id,
      type: 'organization_invite',
      title: `You have been invited to join ${org.name}`,
      message: `${inviterName} has invited you to join ${org.name} as ${dto.org_role}${responderType ? ` (${responderType})` : ''}`,
      data: {
        organization_id: orgId,
        organization_name: org.name,
        org_role: dto.org_role,
        responder_type: responderType,
        invite_id: data.id,
      },
      action_required: true,
      action_url: `/organizations/${orgId}`,
      priority: 'normal',
    });

    return {
      ...data,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        profile_image_url: user.profile_image_url,
      },
    };
  }

  async getMembers(
    orgId: string,
    status?: OrgMemberStatus,
  ): Promise<MemberWithUserResponse[]> {
    // log orgId and status for debugging
    this.logger.debug(
      `Fetching members for org ${orgId} with status ${status ?? 'ANY'}`,
    );
    await this.findById(orgId); // ensure org exists

    let query = this.supabase.client
      .from('organization_members')
      .select(
        'id,user_id,organization_id,org_role,org_type,responder_type,status,invited_by,reason,created_at,updated_at,user:users!organization_members_user_id_fkey(id,email,first_name,last_name,phone,profile_image_url)',
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Failed to fetch members: ${error.message}`,
      );
    }

    if (!data) return [];

    return data
      .filter((item: any) => item.user?.id)
      .map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        organization_id: item.organization_id,
        org_role: item.org_role,
        org_type: item.org_type,
        responder_type: item.responder_type,
        status: item.status,
        invited_by: item.invited_by,
        reason: item.reason,
        created_at: item.created_at,
        updated_at: item.updated_at,
        user: {
          id: item.user.id,
          email: item.user.email,
          first_name: item.user.first_name,
          last_name: item.user.last_name,
          phone: item.user.phone,
          profile_image_url: item.user.profile_image_url,
        },
      }));
  }

  async revokeMember(
    orgId: string,
    memberId: string,
    dto: RevokeMemberDto,
  ): Promise<void> {
    await this.findById(orgId); // ensure org exists

    const { data: member } = await this.supabase.client
      .from('organization_members')
      .select('id,status')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!member) {
      throw new NotFoundException('Membership not found');
    }

    if (member.status === 'SUSPENDED') {
      throw new BadRequestException('Membership is already revoked');
    }

    const { error } = await this.supabase.client
      .from('organization_members')
      .update({
        status: 'SUSPENDED' as OrgMemberStatus,
        reason: dto.reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) {
      throw new ConflictException(
        `Failed to revoke membership: ${error.message}`,
      );
    }

    this.logger.log(`Revoked membership ${memberId} in org ${orgId}`);
  }

  async cancelInvitation(orgId: string, memberId: string): Promise<void> {
    await this.findById(orgId);

    const { data: member } = await this.supabase.client
      .from('organization_members')
      .select('id,status')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!member) {
      throw new NotFoundException('Membership not found');
    }

    if (member.status !== 'INVITED') {
      throw new BadRequestException(
        `Cannot cancel — membership status is "${member.status}", not INVITED`,
      );
    }

    const { error } = await this.supabase.client
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to cancel invitation: ${error.message}`,
      );
    }

    this.logger.log(`Cancelled invitation ${memberId} in org ${orgId}`);
  }

  async kickMember(orgId: string, memberId: string): Promise<void> {
    await this.findById(orgId); // ensure org exists

    const { data: member } = await this.supabase.client
      .from('organization_members')
      .select('id,status,org_role')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!member) {
      throw new NotFoundException('Membership not found');
    }

    if (member.org_role === 'ORG_ADMIN') {
      throw new ForbiddenException(
        'Cannot kick an ORG_ADMIN via this endpoint. Use DELETE /:id/admins/:memberId (System ADMIN only).',
      );
    }

    const { error } = await this.supabase.client
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to kick member: ${error.message}`,
      );
    }

    this.logger.log(`Kicked membership ${memberId} from org ${orgId}`);
  }

  async promoteMember(
    orgId: string,
    memberId: string,
    dto: PromoteMemberDto,
  ): Promise<void> {
    const org = await this.findById(orgId);

    // ORG_ADMIN is always promotable; DISPATCHER must be in org's allowed_roles
    if (
      dto.org_role !== 'ORG_ADMIN' &&
      !org.allowed_roles.includes(dto.org_role as any)
    ) {
      throw new BadRequestException(
        `Role "${dto.org_role}" is not in this organization's allowed roles`,
      );
    }

    const { data: member } = await this.supabase.client
      .from('organization_members')
      .select('id,org_role,status')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!member) {
      throw new NotFoundException('Membership not found');
    }

    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('Can only promote an ACTIVE member');
    }

    if (member.org_role === dto.org_role) {
      throw new BadRequestException(
        `Member already has the ${dto.org_role} role`,
      );
    }

    const { error } = await this.supabase.client
      .from('organization_members')
      .update({
        org_role: dto.org_role,
        // DISPATCHER/ORG_ADMIN members don't respond to incidents
        responder_type: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) {
      throw new ConflictException(
        `Failed to update member role: ${error.message}`,
      );
    }

    this.logger.log(
      `Promoted membership ${memberId} in org ${orgId} to ${dto.org_role}`,
    );
  }

  async createDispatcherStaff(
    orgId: string,
    dto: CreateDispatcherDto,
    createdBy: string,
  ): Promise<MemberWithUserResponse> {
    const org = await this.findById(orgId);

    // Check email not already taken
    const { data: existing } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    // Create user
    const { data: user, error: userError } = await this.supabase.client
      .from('users')
      .insert({
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        phone: dto.phone ?? null,
        password_hash,
      })
      .select('id,email,first_name,last_name,phone,profile_image_url')
      .single();

    if (userError || !user) {
      throw new ConflictException(
        userError?.message || 'Failed to create dispatcher account',
      );
    }

    // Assign DISPATCHER system role
    const { data: roleData } = await this.supabase.client
      .from('roles')
      .select('id')
      .eq('name', 'DISPATCHER')
      .single();

    if (roleData) {
      await this.supabase.client
        .from('user_roles')
        .insert({ user_id: user.id, role_id: roleData.id });
    }

    // Add as ACTIVE DISPATCHER member of this org
    const { data: membership, error: memberError } = await this.supabase.client
      .from('organization_members')
      .insert({
        user_id: user.id,
        organization_id: orgId,
        org_type: org.type,
        org_role: 'DISPATCHER',
        responder_type: null,
        status: 'ACTIVE',
        invited_by: createdBy,
      })
      .select(
        'id,user_id,organization_id,org_role,org_type,responder_type,status,invited_by,reason,created_at,updated_at',
      )
      .single();

    if (memberError || !membership) {
      // Roll back user on failure
      await this.supabase.client.from('users').delete().eq('id', user.id);
      throw new ConflictException(
        memberError?.message || 'Failed to create dispatcher membership',
      );
    }

    this.logger.log(`Created dispatcher staff ${user.id} in org ${orgId}`);

    return {
      ...membership,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        profile_image_url: user.profile_image_url,
      },
    };
  }

  async addOrgAdmin(
    orgId: string,
    userId: string,
    addedBy: string,
  ): Promise<MemberWithUserResponse> {
    const org = await this.findById(orgId);

    const { data: user } = await this.supabase.client
      .from('users')
      .select('id,email,first_name,last_name,phone,profile_image_url,is_active')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.is_active) {
      throw new BadRequestException(
        'Cannot appoint a deactivated user as ORG_ADMIN',
      );
    }

    const { data: existing } = await this.supabase.client
      .from('organization_members')
      .select('id,status,org_role')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .in('status', ['INVITED', 'ACTIVE'])
      .maybeSingle();

    if (existing) {
      if (existing.org_role === 'ORG_ADMIN' && existing.status === 'ACTIVE') {
        throw new ConflictException(
          'User is already an ORG_ADMIN of this organization',
        );
      }
      throw new ConflictException(
        `User already has a "${existing.status}" "${existing.org_role}" membership in this organization`,
      );
    }

    const { data: membership, error } = await this.supabase.client
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: orgId,
        org_type: org.type,
        org_role: 'ORG_ADMIN',
        responder_type: null,
        status: 'ACTIVE',
        invited_by: addedBy,
      })
      .select(
        'id,user_id,organization_id,org_role,org_type,responder_type,status,invited_by,reason,created_at,updated_at',
      )
      .single();

    if (error || !membership) {
      throw new ConflictException(
        error?.message || 'Failed to appoint ORG_ADMIN',
      );
    }

    this.logger.log(`Appointed user ${userId} as ORG_ADMIN for org ${orgId}`);

    return {
      ...membership,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        profile_image_url: user.profile_image_url,
      },
    };
  }

  async removeOrgAdmin(orgId: string, memberId: string): Promise<void> {
    await this.findById(orgId);

    const { data: member } = await this.supabase.client
      .from('organization_members')
      .select('id,org_role,status')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!member) {
      throw new NotFoundException('Membership not found in this organization');
    }

    if (member.org_role !== 'ORG_ADMIN') {
      throw new BadRequestException(
        `Membership is not an ORG_ADMIN — current role is "${member.org_role}"`,
      );
    }

    const { error } = await this.supabase.client
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to remove ORG_ADMIN: ${error.message}`,
      );
    }

    this.logger.log(
      `Removed ORG_ADMIN membership ${memberId} from org ${orgId}`,
    );
  }

  async createSubOrganization(
    parentOrgId: string,
    dto: CreateOrganizationDto,
    createdBy?: string,
  ): Promise<OrganizationResponse> {
    await this.findById(parentOrgId); // ensure parent exists

    // Force parent link regardless of what dto.parent_organization_id says
    return this.create(
      { ...dto, parent_organization_id: parentOrgId },
      createdBy,
    );
  }

  async getSubOrganizations(
    parentOrgId: string,
  ): Promise<OrganizationResponse[]> {
    await this.findById(parentOrgId);

    const { data, error } = await this.supabase.client
      .from('organizations')
      .select(ORGANIZATION_FIELDS)
      .eq('parent_organization_id', parentOrgId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    const countsMap = await this.fetchMemberCountsMap(data.map((o) => o.id));
    return data.map((org) => this.toResponse(org, countsMap.get(org.id) ?? 0));
  }

  private async fetchMemberCountsMap(
    orgIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>(orgIds.map((id) => [id, 0]));
    if (orgIds.length === 0) return map;

    const { data } = await this.supabase.client
      .from('organization_members')
      .select('organization_id')
      .eq('status', 'ACTIVE')
      .in('organization_id', orgIds);

    for (const row of data ?? []) {
      map.set(row.organization_id, (map.get(row.organization_id) ?? 0) + 1);
    }
    return map;
  }

  private toResponse(org: Organization, memberCount = 0): OrganizationResponse {
    return { ...org, member_count: memberCount } as OrganizationResponse;
  }

  private async createDefaultConfigs(organizationId: string): Promise<void> {
    const { error } = await this.supabase.client.from('org_configs').insert([
      { organization_id: organizationId, role: 'RESPONDER', kilometer_radius: 3 },
      { organization_id: organizationId, role: 'DISPATCHER', kilometer_radius: 3 },
    ]);

    if (error) {
      this.logger.error(`Failed to create default configs for org ${organizationId}: ${error.message}`);
    }
  }

  async getConfigs(organizationId: string): Promise<import('./types/organization.types').OrgConfig[]> {
    await this.findById(organizationId);

    const { data, error } = await this.supabase.client
      .from('org_configs')
      .select('*')
      .eq('organization_id', organizationId);

    if (error || !data) {
      return [];
    }

    return data;
  }

  async updateConfigs(
    organizationId: string,
    configs: { role: 'RESPONDER' | 'DISPATCHER'; kilometer_radius: number }[],
  ): Promise<import('./types/organization.types').OrgConfig[]> {
    await this.findById(organizationId);

    for (const config of configs) {
      const { error } = await this.supabase.client.from('org_configs').upsert(
        {
          organization_id: organizationId,
          role: config.role,
          kilometer_radius: config.kilometer_radius,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,role' },
      );

      if (error) {
        throw new BadRequestException(`Failed to update config for role ${config.role}: ${error.message}`);
      }
    }

    return this.getConfigs(organizationId);
  }
}
