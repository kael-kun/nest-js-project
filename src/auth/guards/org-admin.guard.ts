import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * OrgAdminGuard — ensures the requesting user is an active ORG_ADMIN
 * in the organization identified by the :id route parameter.
 *
 * System ADMINs (global role) bypass this guard — they manage org structure
 * globally but do not need an org membership to do so.
 *
 * Must be placed AFTER JwtAuthGuard so req.user is populated.
 */
@Injectable()
export class OrgAdminGuard implements CanActivate {
  private readonly logger = new Logger(OrgAdminGuard.name);

  constructor(private supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string; roles: string[] };
    const orgId: string = request.params?.id;

    if (!user || !orgId) {
      throw new ForbiddenException('Access denied');
    }

    // System ADMIN bypasses org-scoped membership check
    if (user.roles?.includes('ADMIN')) {
      return true;
    }

    const { data, error } = await this.supabase.client
      .from('organization_members')
      .select('id')
      .eq('user_id', user.userId)
      .eq('organization_id', orgId)
      .eq('org_role', 'ORG_ADMIN')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error || !data) {
      this.logger.debug(
        `OrgAdminGuard: user ${user.userId} denied on org ${orgId}`,
      );
      throw new ForbiddenException(
        'You must be an ORG_ADMIN of this organization',
      );
    }

    return true;
  }
}
