import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleType } from '../decorators/roles.decorator';
import { UserRole } from '../../users/types/user.types';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

  private checkPermission(
    user: { userId: string; roles: UserRole[] },
    resourceId: string,
    requiredRoles: RoleType[],
  ): boolean {
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

      if (role !== 'OWNER' && user.roles.includes(role)) {
        return true;
      }
    }

    return false;
  }
}
