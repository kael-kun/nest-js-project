import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DispatchesService } from './dispatches.service';
import {
  RespondToIncidentDto,
  UpdateDispatchStatusDto,
} from './types/dto.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('dispatches')
@Controller('dispatches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DispatchesController {
  constructor(private readonly dispatchesService: DispatchesService) {}

  /**
   * Responder accepts and responds to an incident.
   * Creates a dispatch record, assigns the responder as scene commander,
   * and updates the incident status to ACCEPTED.
   */
  @Post('incident/:incidentId/respond')
  @Roles('RESPONDER', 'ORG_ADMIN')
  @ApiOperation({
    summary: 'Respond to an incident',
    description:
      'Called by a responder to accept an incident. Creates a dispatch, assigns the responder as scene commander, and sets incident status to ACCEPTED. ' +
      'After calling this, both the responder and the reporter should join the WebSocket room ' +
      '`incident:{incidentId}:tracking` on the `/responder` namespace to share real-time location.',
  })
  @ApiParam({ name: 'incidentId', example: 'EMG-20260413-0001' })
  @ApiResponse({
    status: 201,
    description: 'Dispatch created. Responder is now assigned to the incident.',
    schema: {
      properties: {
        id: { type: 'string', example: 'uuid' },
        incident_id: { type: 'string', example: 'EMG-20260413-0001' },
        responder_id: { type: 'string', example: 'uuid' },
        organization_id: { type: 'string', example: 'uuid' },
        status: { type: 'string', example: 'ACCEPTED' },
        assigned_at: { type: 'string', example: '2026-04-13T08:00:00Z' },
        accepted_at: { type: 'string', example: '2026-04-13T08:00:00Z' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Incident already has a responder or not available' })
  @ApiResponse({ status: 400, description: 'Responder is not in an active organization' })
  async respondToIncident(
    @Param('incidentId') incidentId: string,
    @CurrentUserId() userId: string,
    @Body() dto: RespondToIncidentDto,
  ) {
    return this.dispatchesService.respondToIncident(incidentId, userId, dto);
  }

  /**
   * Update the status of an existing dispatch.
   */
  @Patch(':id/status')
  @Roles('RESPONDER', 'ORG_ADMIN')
  @ApiOperation({
    summary: 'Update dispatch status',
    description:
      'Update dispatch status to EN_ROUTE, ON_SCENE, COMPLETED, DECLINED, or CANCELLED. ' +
      'Mirrored to the incident when applicable (EN_ROUTE → incident EN_ROUTE, ' +
      'ON_SCENE → incident ON_SCENE, COMPLETED → incident RESOLVED).',
  })
  @ApiParam({ name: 'id', description: 'Dispatch UUID' })
  @ApiResponse({ status: 200, description: 'Dispatch status updated' })
  @ApiResponse({ status: 404, description: 'Dispatch not found' })
  @ApiResponse({ status: 400, description: 'Not the assigned responder' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.updateDispatchStatus(id, userId, dto);
  }

  /**
   * Get all dispatches assigned to the authenticated responder.
   */
  @Get('me')
  @Roles('RESPONDER', 'ORG_ADMIN')
  @ApiOperation({ summary: "Get authenticated responder's dispatches" })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'List of dispatches' })
  async getMyDispatches(
    @CurrentUserId() userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.dispatchesService.getMyDispatches(userId, page, limit);
  }

  /**
   * Get all dispatches for a specific incident.
   */
  @Get('incident/:incidentId')
  @Roles('RESPONDER', 'DISPATCHER', 'ORG_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get all dispatches for an incident' })
  @ApiParam({ name: 'incidentId', example: 'EMG-20260413-0001' })
  @ApiResponse({ status: 200, description: 'List of dispatches for the incident' })
  async getDispatchByIncident(@Param('incidentId') incidentId: string) {
    return this.dispatchesService.getDispatchByIncident(incidentId);
  }
}
