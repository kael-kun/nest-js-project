import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CloudflareService } from '../r2_bucket/cloudflare.service';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserResponse,
  UserListResponse,
  EmergencyContact,
  UserRole,
  RoleResponse,
  UserOrganizationMembership,
} from './types/user.types';
import { OrganizationResponse } from '../organizations/types/organization.types';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateEmergencyContactDto,
} from './types/dto.types';

const USER_FIELDS =
  'id,phone,email,password_hash,first_name,last_name,profile_image_url,is_verified,is_active,last_login_at,created_at,updated_at';

@Injectable()
export class UsersService {
  constructor(
    private supabase: SupabaseService,
    private cloudflare: CloudflareService,
  ) {}

  private async getUserRoles(userId: string): Promise<RoleResponse[]> {
    const { data, error } = await this.supabase.client
      .from('user_roles')
      .select('role_id, roles:roles(id, name)')
      .eq('user_id', userId);

    if (error || !data) {
      return [];
    }

    return data
      .map((item: any) => ({
        id: item.roles?.id,
        name: item.roles?.name,
      }))
      .filter((item: RoleResponse) => item.id && item.name);
  }

  private async setUserRoles(userId: string, roleName: string): Promise<void> {
    const { data: roleData } = await this.supabase.client
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleData) {
      await this.supabase.client.from('user_roles').insert({
        user_id: userId,
        role_id: roleData.id,
      });
    }
  }

  async updateUserRoles(userRoleId: string, roleId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('user_roles')
      .update({ role_id: roleId })
      .eq('id', userRoleId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private async enrichUserWithRoles(user: User): Promise<User> {
    const roles = await this.getUserRoles(user.id);
    return { ...user, roles } as User;
  }

  private async enrichUserWithAll(user: User): Promise<User> {
    const roles = await this.getUserRoles(user.id);
    const emergency_contacts = await this.getEmergencyContacts(user.id);
    const organizations = await this.getUserOrganizations(user.id);
    return { ...user, roles, emergency_contacts, organizations } as User;
  }

  private async getUserOrganizations(
    userId: string,
  ): Promise<UserOrganizationMembership[]> {
    const { data, error } = await this.supabase.client
      .from('organization_members')
      .select(
        'id,organization_id,org_type,org_role,responder_type,status,responder_status,is_available,location,created_at,organization:organizations(id,name,short_name,code,type,level,parent_organization_id,region,province,city,barangay,is_active)',
      )
      .eq('user_id', userId);

    if (error || !data) {
      return [];
    }

    return data as UserOrganizationMembership[];
  }

  private async enrichUsersWithRoles(users: any[]): Promise<User[]> {
    return Promise.all(
      users.map(async (user) => this.enrichUserWithRoles(user)),
    );
  }

  private async enrichUsersWithAll(users: any[]): Promise<User[]> {
    return Promise.all(users.map(async (user) => this.enrichUserWithAll(user)));
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await this.supabase.client
      .from('users')
      .select(USER_FIELDS)
      .eq('email', email)
      .single<User | null>();

    if (error || !data) {
      return undefined;
    }

    return this.enrichUserWithAll(data);
  }

  async findById(id: string): Promise<User | undefined> {
    const { data, error } = await this.supabase.client
      .from('users')
      .select(USER_FIELDS)
      .eq('id', id)
      .single<User | null>();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    return this.enrichUserWithAll(data);
  }

  async create(
    createUserDto: CreateUserDto,
    file?: Express.Multer.File,
  ): Promise<UserResponse> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const password_hash = await bcrypt.hash(createUserDto.password, 10);

    let profileImageUrl: string | null = null;
    if (file) {
      const uploadResult = await this.cloudflare.uploadFile(file, 'profiles');
      profileImageUrl = uploadResult.url;
    }

    const { data, error } = await this.supabase.client
      .from('users')
      .insert({
        phone: createUserDto.phone,
        email: createUserDto.email,
        password_hash,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        profile_image_url: profileImageUrl,
      })
      .select(USER_FIELDS)
      .single<User | null>();

    if (error || !data) {
      throw new BadRequestException(error?.message);
    }

    const userId = data.id;
    const roleName = 'CITIZEN';
    await this.setUserRoles(userId, roleName);

    const user = await this.enrichUserWithAll(data);

    return this.toUserResponse(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ): Promise<UserResponse> {
    const { data: existing } = await this.supabase.client
      .from('users')
      .select(USER_FIELDS)
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    let profileImageUrl = existing.profile_image_url;

    if (file) {
      if (existing.profile_image_url) {
        const oldKey = this.cloudflare.getKeyFromUrl(
          existing.profile_image_url,
        );
        await this.cloudflare.deleteFile(oldKey);
      }
      const uploadResult = await this.cloudflare.uploadFile(file, 'profiles');
      profileImageUrl = uploadResult.url;
    }

    const { data, error } = await this.supabase.client
      .from('users')
      .update({
        phone: updateUserDto.phone ?? existing.phone,
        first_name: updateUserDto.first_name ?? existing.first_name,
        last_name: updateUserDto.last_name ?? existing.last_name,
        profile_image_url: profileImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(USER_FIELDS)
      .single<User | null>();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update user');
    }

    const user = await this.enrichUserWithAll(data);
    return this.toUserResponse(user);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<UserListResponse> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const { count, error: countError } = await this.supabase.client
      .from('users')
      .select(USER_FIELDS, { count: 'exact', head: true });

    if (countError || !count) {
      return {
        users: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }

    const { data, error } = await this.supabase.client
      .from('users')
      .select(USER_FIELDS)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error || !data) {
      return {
        users: [],
        total: count,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      };
    }

    const users = await this.enrichUsersWithAll(data);
    const totalPages = Math.ceil(count / safeLimit);

    return {
      users: users.map((user) => this.toUserResponse(user)),
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    const { data, error } = await this.supabase.client
      .from('emergency_contacts')
      .select('id,name,phone,relationship,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data;
  }

  async addEmergencyContact(
    userId: string,
    dto: CreateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    const { data, error } = await this.supabase.client
      .from('emergency_contacts')
      .insert({
        user_id: userId,
        name: dto.name,
        phone: dto.phone,
        relationship: dto.relationship,
      })
      .select('id,user_id,name,phone,relationship,created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to add emergency contact');
    }

    return data;
  }

  async removeEmergencyContact(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('emergency_contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateMemberLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const { data: membership, error: checkError } = await this.supabase.client
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['INVITED', 'ACTIVE'])
      .single();

    if (checkError || !membership) {
      throw new NotFoundException('Organization membership not found');
    }

    const { error } = await this.supabase.client
      .from('organization_members')
      .update({
        location: `SRID=4326;POINT(${longitude} ${latitude})`,
      })
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException(
        `Failed to update location: ${error.message}`,
      );
    }
  }

  private toUserResponse(user: User): UserResponse {
    const { password_hash, ...response } = user;
    return response as UserResponse;
  }
}
