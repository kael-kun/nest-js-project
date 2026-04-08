import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ResponderService } from './responder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';

@ApiTags('responder')
@Controller('responder')
@ApiBearerAuth()
export class ResponderController {
  constructor(private readonly responderService: ResponderService) {}

  @UseGuards(JwtAuthGuard)
  @Roles('RESPONDER', 'DISPATCHER', 'ORG_ADMIN')
  @Get('nearby-incidents')
  @ApiOperation({
    summary: 'Get nearby incidents for the authenticated responder',
  })
  @ApiResponse({
    status: 200,
    description:
      "List of nearby incidents within the responder's configured radius",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNearbyIncidents(@CurrentUserId() userId: string) {
    return this.responderService.getNearbyIncidents(userId);
  }
}
