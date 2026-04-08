import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { CloudflareR2Module } from '../r2_bucket/cloudflareR2.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [CloudflareR2Module, EventsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}