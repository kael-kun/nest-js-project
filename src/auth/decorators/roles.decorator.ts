import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/types/user.types';

export type RoleType = UserRole | 'OWNER';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
