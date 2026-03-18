import { Module } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { UserRolesController } from './user-roles.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [UserRolesService],
  controllers: [UserRolesController],
  exports: [UserRolesService],
})
export class UserRolesModule {}
