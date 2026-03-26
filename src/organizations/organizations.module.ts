import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { OrgAdminGuard } from '../auth/guards/org-admin.guard';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgAdminGuard],
  exports: [OrganizationsService, OrgAdminGuard],
})
export class OrganizationsModule {}
