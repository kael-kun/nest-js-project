import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleType } from '../decorators/roles.decorator';
import { UserRole } from '../../users/types/user.types';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params?.id;

    return this.checkPermission(user, resourceId, requiredRoles);
  }

  private async checkPermission(
    user: { userId: string; roles: UserRole[] },
    resourceId: string,
    requiredRoles: RoleType[],
  ): Promise<boolean> {
    if (!user || !user.roles) {
      return false;
    }

    if (user.roles.includes('ADMIN')) {
      return true;
    }

    for (const role of requiredRoles) {
      if (role === 'OWNER' && resourceId && user.userId === resourceId) {
        return true;
      }

      if (role === 'ORG_ADMIN') {
        const { data } = await this.supabase.client
          .from('organization_members')
          .select('id')
          .eq('user_id', user.userId)
          .eq('org_role', 'ORG_ADMIN')
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle();
        if (data) return true;
        continue;
      }

      if (role !== 'OWNER' && user.roles.includes(role)) {
        return true;
      }
    }

    return false;
  }
}
