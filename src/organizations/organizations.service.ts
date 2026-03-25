import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  Organization,
  OrganizationResponse,
  OrganizationListResponse,
  OrganizationMember,
  OrganizationMemberResponse,
  OrganizationMemberListResponse,
  UserMembership,
  UserMembershipListResponse,
} from './types/organization.types';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberDto,
  OrgMemberRole,
  OrgMemberStatus,
} from './types/dto.types';

const ORGANIZATION_FIELDS =
  'id,name,short_name,code,type,level,parent_organization_id,allowed_roles,allowed_responder_types,region,province,city,barangay,address,phone,website,is_active,created_at,updated_at';

const MEMBER_FIELDS =
  'id,user_id,organization_id,org_type,org_role,responder_type,status,responder_status,is_available,invited_by,reason,location,preferred_km,responder_details,created_at,updated_at';

@Injectable()
export class OrganizationsService {
  constructor(private supabase: SupabaseService) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<OrganizationListResponse> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const { count, error: countError } = await this.supabase.client
      .from('organizations')
      .select(ORGANIZATION_FIELDS, { count: 'exact', head: true });

    if (countError || !count) {
      return {
        organizations: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }

    const { data, error } = await this.supabase.client
      .from('organizations')
      .select(ORGANIZATION_FIELDS)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error || !data) {
      return {
        organizations: [],
        total: count,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      };
    }

    const organizations = data.map((org) => this.toResponse(org));
    const totalPages = Math.ceil(count / safeLimit);

    return {
      organizations,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages,
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

    return this.toResponse(data);
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

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const existing = await this.findByCode(createOrganizationDto.code);
    if (existing) {
      throw new ConflictException('Organization code already exists');
    }

    const defaultRoles = this.getDefaultRolesByType(createOrganizationDto.type);

    const { data, error } = await this.supabase.client
      .from('organizations')
      .insert({
        name: createOrganizationDto.name,
        short_name: createOrganizationDto.short_name,
        code: createOrganizationDto.code,
        type: createOrganizationDto.type,
        level: createOrganizationDto.level,
        allowed_roles: createOrganizationDto.allowed_roles || defaultRoles,
        allowed_responder_types:
          createOrganizationDto.allowed_responder_types || [],
        region: createOrganizationDto.region,
        province: createOrganizationDto.province,
        city: createOrganizationDto.city,
        barangay: createOrganizationDto.barangay,
        address: createOrganizationDto.address,
        phone: createOrganizationDto.phone,
        website: createOrganizationDto.website,
      })
      .select(ORGANIZATION_FIELDS)
      .single<Organization | null>();

    if (error || !data) {
      throw new ConflictException(
        error?.message || 'Failed to create organization',
      );
    }

    return this.toResponse(data);
  }

  private getDefaultRolesByType(type: string): string[] {
    const roleCeiling: Record<string, string[]> = {
      POLICE: ['RESPONDER', 'DISPATCHER'],
      AMBULANCE: ['RESPONDER', 'DISPATCHER'],
      FIRE: ['RESPONDER', 'DISPATCHER'],
      COAST_GUARD: ['RESPONDER', 'DISPATCHER'],
      PRIVATE: ['RESPONDER', 'DISPATCHER'],
      LGU: ['RESPONDER', 'DISPATCHER'],
      OCD: ['RESPONDER', 'DISPATCHER'],
      BARANGAY: ['RESPONDER', 'DISPATCHER'],
    };
    return roleCeiling[type] || ['RESPONDER', 'DISPATCHER'];
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const existing = await this.findById(id);

    const { data, error } = await this.supabase.client
      .from('organizations')
      .update({
        name: updateOrganizationDto.name ?? existing.name,
        short_name: updateOrganizationDto.short_name ?? existing.short_name,
        code: updateOrganizationDto.code ?? existing.code,
        type: updateOrganizationDto.type ?? existing.type,
        level: updateOrganizationDto.level ?? existing.level,
        allowed_roles:
          updateOrganizationDto.allowed_roles ?? existing.allowed_roles,
        allowed_responder_types:
          updateOrganizationDto.allowed_responder_types ??
          existing.allowed_responder_types,
        region: updateOrganizationDto.region ?? existing.region,
        province: updateOrganizationDto.province ?? existing.province,
        city: updateOrganizationDto.city ?? existing.city,
        barangay: updateOrganizationDto.barangay ?? existing.barangay,
        address: updateOrganizationDto.address ?? existing.address,
        phone: updateOrganizationDto.phone ?? existing.phone,
        website: updateOrganizationDto.website ?? existing.website,
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

    return this.toResponse(data);
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
    organizationId: string,
    userId: string,
    orgRole: OrgMemberRole,
    responderType?: string,
    preferredKm?: number,
    responderDetails?: { title: string; description: string }[],
  ): Promise<OrganizationMemberResponse> {
    const org = await this.findById(organizationId);

    if (!org.allowed_roles.includes(orgRole)) {
      throw new BadRequestException(
        `Role ${orgRole} is not allowed for this organization`,
      );
    }

    if (orgRole === OrgMemberRole.RESPONDER && responderType) {
      if (
        org.allowed_responder_types.length > 0 &&
        !org.allowed_responder_types.includes(responderType)
      ) {
        throw new BadRequestException(
          `Responder type ${responderType} is not allowed for this organization`,
        );
      }
    }

    const { data: existingMember } = await this.supabase.client
      .from('organization_members')
      .select('id, status')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .in('status', ['INVITED', 'ACTIVE'])
      .single();

    if (existingMember) {
      throw new ConflictException(
        'User is already a member or has pending invitation',
      );
    }

    const { data, error } = await this.supabase.client
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        org_type: org.type,
        org_role: orgRole,
        responder_type: responderType,
        status: OrgMemberStatus.INVITED,
        preferred_km: preferredKm ?? 0,
        responder_details: responderDetails ?? [],
      })
      .select(
        `${MEMBER_FIELDS},user:user_id(id,first_name,last_name,email,phone),organization:organization_id(id,name,short_name,code)`,
      )
      .single<OrganizationMember | null>();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to invite member',
      );
    }

    return this.toMemberResponse(data);
  }

  async acceptInvite(
    memberId: string,
    userId: string,
  ): Promise<OrganizationMemberResponse> {
    const member = await this.getMemberById(memberId);

    if (member.user_id !== userId) {
      throw new ForbiddenException(
        'You are not authorized to accept this invitation',
      );
    }

    if (member.status !== OrgMemberStatus.INVITED) {
      throw new BadRequestException('Invitation is not in INVITED status');
    }

    const { data, error } = await this.supabase.client
      .from('organization_members')
      .update({
        status: OrgMemberStatus.ACTIVE,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select(
        `${MEMBER_FIELDS},user:user_id(id,first_name,last_name,email,phone),organization:organization_id(id,name,short_name,code)`,
      )
      .single<OrganizationMember | null>();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to accept invitation',
      );
    }

    await this.addGlobalRole(userId, member.org_role);

    return this.toMemberResponse(data);
  }

  async declineInvite(memberId: string, userId: string): Promise<void> {
    const member = await this.getMemberById(memberId);

    if (member.user_id !== userId) {
      throw new ForbiddenException(
        'You are not authorized to decline this invitation',
      );
    }

    if (member.status !== OrgMemberStatus.INVITED) {
      throw new BadRequestException('Invitation is not in INVITED status');
    }

    const { error } = await this.supabase.client
      .from('organization_members')
      .update({
        status: OrgMemberStatus.DECLINED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) {
      throw new BadRequestException(
        error?.message || 'Failed to decline invitation',
      );
    }
  }

  async suspendMember(
    memberId: string,
    reason: string,
  ): Promise<OrganizationMemberResponse> {
    const { data, error } = await this.supabase.client
      .from('organization_members')
      .update({
        status: OrgMemberStatus.SUSPENDED,
        reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select(
        `${MEMBER_FIELDS},user:user_id(id,first_name,last_name,email,phone),organization:organization_id(id,name,short_name,code)`,
      )
      .single<OrganizationMember | null>();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to suspend member',
      );
    }

    return this.toMemberResponse(data);
  }

  async updateMember(
    memberId: string,
    updateDto: UpdateMemberDto,
  ): Promise<OrganizationMemberResponse> {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateDto.status === 'SUSPENDED' && updateDto.reason) {
      updates.status = OrgMemberStatus.SUSPENDED;
      updates.reason = updateDto.reason;
    } else if (updateDto.status) {
      updates.status = updateDto.status;
    }

    if (updateDto.preferred_km !== undefined) {
      updates.preferred_km = updateDto.preferred_km;
    }

    if (updateDto.responder_details !== undefined) {
      updates.responder_details = updateDto.responder_details;
    }

    const { data, error } = await this.supabase.client
      .from('organization_members')
      .update(updates)
      .eq('id', memberId)
      .select(
        `${MEMBER_FIELDS},user:user_id(id,first_name,last_name,email,phone),organization:organization_id(id,name,short_name,code)`,
      )
      .single<OrganizationMember | null>();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to update member',
      );
    }

    return this.toMemberResponse(data);
  }

  async removeMember(memberId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      throw new BadRequestException(
        error?.message || 'Failed to remove member',
      );
    }
  }

  async promoteToOrgAdmin(
    memberId: string,
  ): Promise<OrganizationMemberResponse> {
    const { data, error } = await this.supabase.client
      .from('organization_members')
      .update({
        org_role: OrgMemberRole.ORG_ADMIN,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select(
        `${MEMBER_FIELDS},user:user_id(id,first_name,last_name,email,phone),organization:organization_id(id,name,short_name,code)`,
      )
      .single<OrganizationMember | null>();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to promote member',
      );
    }

    return this.toMemberResponse(data);
  }

  async getOrgMembers(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<OrganizationMemberListResponse> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const { count, error: countError } = await this.supabase.client
      .from('organization_members')
      .select(MEMBER_FIELDS, { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['INVITED', 'ACTIVE']);

    if (countError || !count) {
      return {
        members: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }

    const { data, error } = await this.supabase.client
      .from('organization_members')
      .select(
        `${MEMBER_FIELDS},user:user_id(id,first_name,last_name,email,phone),organization:organization_id(id,name,short_name,code)`,
      )
      .eq('organization_id', organizationId)
      .in('status', ['INVITED', 'ACTIVE'])
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error || !data) {
      return {
        members: [],
        total: count,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      };
    }

    const members = data.map((m) => this.toMemberResponse(m));
    const totalPages = Math.ceil(count / safeLimit);

    return {
      members,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  private async getMemberById(memberId: string): Promise<OrganizationMember> {
    const { data, error } = await this.supabase.client
      .from('organization_members')
      .select(MEMBER_FIELDS)
      .eq('id', memberId)
      .single<OrganizationMember | null>();

    if (error || !data) {
      throw new NotFoundException('Member not found');
    }

    return data;
  }

  private async checkOrgAdminRole(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('org_role', OrgMemberRole.ORG_ADMIN)
      .eq('status', 'ACTIVE')
      .single();

    return !!data && !error;
  }

  private async addGlobalRole(
    userId: string,
    orgRole: OrgMemberRole,
  ): Promise<void> {
    const roleName =
      orgRole === OrgMemberRole.ORG_ADMIN ? 'ORG_ADMIN' : orgRole;

    const { data: roleData } = await this.supabase.client
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleData) {
      const { data: existing } = await this.supabase.client
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleData.id)
        .single();

      if (!existing) {
        await this.supabase.client.from('user_roles').insert({
          user_id: userId,
          role_id: roleData.id,
        });
      }
    }
  }

  private toResponse(org: Organization): OrganizationResponse {
    return org as OrganizationResponse;
  }

  private toMemberResponse(member: any): OrganizationMemberResponse {
    return {
      id: member.id,
      user_id: member.user_id,
      organization_id: member.organization_id,
      org_type: member.org_type,
      org_role: member.org_role,
      responder_type: member.responder_type,
      status: member.status,
      responder_status: member.responder_status,
      is_available: member.is_available,
      invited_by: member.invited_by,
      reason: member.reason,
      location: member.location,
      preferred_km: member.preferred_km,
      responder_details: member.responder_details,
      created_at: member.created_at,
      user: member.user,
      organization: member.organization,
    };
  }
}
