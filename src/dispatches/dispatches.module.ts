import { Module } from '@nestjs/common';
import { DispatchesController } from './dispatches.controller';
import { DispatchesService } from './dispatches.service';
import { IncidentsModule } from '../incidents/incidents.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [IncidentsModule, EventsModule],
  controllers: [DispatchesController],
  providers: [DispatchesService],
  exports: [DispatchesService],
})
export class DispatchesModule {}
