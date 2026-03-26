import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { CloudflareR2Module } from '../r2_bucket/cloudflareR2.module';

@Module({
  imports: [CloudflareR2Module],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}