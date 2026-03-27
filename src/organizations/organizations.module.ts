import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { OrgAdminGuard } from '../auth/guards/org-admin.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgAdminGuard],
  exports: [OrganizationsService, OrgAdminGuard],
})
export class OrganizationsModule {}
