import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { IncidentGateway } from './incident.gateway';

@Module({
  imports: [JwtModule],
  providers: [EventsGateway, IncidentGateway],
  exports: [EventsGateway, IncidentGateway],
})
export class EventsModule {}
