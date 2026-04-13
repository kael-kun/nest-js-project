import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { IncidentsModule } from './incidents/incidents.module';
import { EventsModule } from './events/events.module';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { CloudflareR2Module } from './r2_bucket/cloudflareR2.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ResponderModule } from './responder/responder.module';
import { DispatchesModule } from './dispatches/dispatches.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    SupabaseModule,
    CloudflareR2Module,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    IncidentsModule,
    UserRolesModule,
    EventsModule,
    NotificationsModule,
    ResponderModule,
    DispatchesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
