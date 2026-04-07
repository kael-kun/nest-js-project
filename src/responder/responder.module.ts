import { Module } from '@nestjs/common';
import { ResponderController } from './responder.controller';
import { ResponderService } from './responder.service';

@Module({
  controllers: [ResponderController],
  providers: [ResponderService],
  exports: [ResponderService],
})
export class ResponderModule {}
