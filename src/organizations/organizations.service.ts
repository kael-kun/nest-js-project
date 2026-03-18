import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  Organization,
  OrganizationResponse,
  OrganizationListResponse,
} from './types/organization.types';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './types/dto.types';

const ORGANIZATION_FIELDS =
  'id,name,short_name,code,type,level,region,province,city,barangay,address,phone,website,is_active,created_at,updated_at';

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

    const { data: userdata, error: userDataError } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('citizen_id', createOrganizationDto.citizen_id)
      .single();

    if (userDataError || !userdata) {
      throw new NotFoundException('User not found');
    }

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
      })
      .select(ORGANIZATION_FIELDS)
      .single<Organization | null>();

    if (error || !data) {
      throw new ConflictException(
        error?.message || 'Failed to create organization',
      );
    }

    const { error: userError } = await this.supabase.client
      .from('user_organizations')
      .insert({
        citizen_id: createOrganizationDto.citizen_id,
        organization_id: data.id,
      });

    if (userError) {
      throw new ConflictException(userError.message);
    }

    const { data: roles, error: roleError } = await this.supabase.client
      .from('roles')
      .select('id')
      .eq('name', 'ORGANIZATION')
      .single();

    if (roleError) {
      throw new ConflictException(roleError.message);
    }

    const { error: userRoleError } = await this.supabase.client
      .from('user_roles')
      .insert({
        user_id: userdata.id,
        role_id: roles?.id,
      });

    if (userRoleError) {
      throw new ConflictException(userRoleError.message);
    }

    return this.toResponse(data);
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

  async getUserOrganizations(
    citizenId: string,
  ): Promise<OrganizationResponse[]> {
    const { data, error } = await this.supabase.client
      .from('user_organizations')
      .select('organization_id, organizations:organizations(*)')
      .eq('citizen_id', citizenId)
      .eq('is_active', true);

    if (error || !data) {
      return [];
    }

    return data
      .map((item: any) => this.toResponse(item.organizations))
      .filter((org) => org.id);
  }

  private toResponse(org: Organization): OrganizationResponse {
    return org as OrganizationResponse;
  }
}
