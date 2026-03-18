import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AddUserRoleDto } from './dto/user-roles.dto';

@Injectable()
export class UserRolesService {
  constructor(private supabase: SupabaseService) {}

  async addRole(dto: AddUserRoleDto) {
    const { data: existingUser } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('id', dto.user_id)
      .single();

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const { data: existingRole } = await this.supabase.client
      .from('roles')
      .select('id, name')
      .eq('id', dto.role_id)
      .single();

    if (!existingRole) {
      throw new BadRequestException('Role not found');
    }

    const { data: existingUserRole } = await this.supabase.client
      .from('user_roles')
      .select('id')
      .eq('user_id', dto.user_id)
      .eq('role_id', dto.role_id)
      .single();

    if (existingUserRole) {
      throw new BadRequestException('User already has this role');
    }

    const { data, error } = await this.supabase.client
      .from('user_roles')
      .insert({
        user_id: dto.user_id,
        role_id: dto.role_id,
      })
      .select('id, user_id, role_id, created_at')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      ...data,
      role_name: existingRole.name,
    };
  }

  async removeRole(userRoleId: string) {
    const { error } = await this.supabase.client
      .from('user_roles')
      .delete()
      .eq('id', userRoleId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Role removed successfully' };
  }
}
