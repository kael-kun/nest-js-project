import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IncidentsService } from './incidents.service';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  UpdateIncidentStatusDto,
  IncidentFiltersDto,
} from './types/dto.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { FileValidationPipe } from '../r2_bucket/pipes/file-validation.pipe';

@ApiTags('incidents')
@Controller('incidents')
@ApiBearerAuth()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'DISPATCHER', 'RESPONDER', 'ORG_ADMIN')
  @Get('/citizen')
  @ApiOperation({ summary: 'Get incidents by citizen' })
  @ApiResponse({
    status: 200,
    description: 'List of incidents reported by citizen',
  })
  async findByReporter(
    @CurrentUserId() userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.incidentsService.findByReporter(userId, page, limit);
  }

  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findReportedByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.incidentsService.findByReporter(userId, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/responder')
  @ApiOperation({ summary: 'Get incidents by responder' })
  @ApiResponse({
    status: 200,
    description: 'List of incidents managed by responder',
  })
  async findBySceneCommander(
    @CurrentUserId() userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.incidentsService.findBySceneCommander(userId, page, limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('CITIZEN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new incident' })
  @ApiResponse({ status: 201, description: 'Incident created successfully' })
  async create(
    @Body() createIncidentDto: CreateIncidentDto,
    @CurrentUserId() userId: string,
    @UploadedFile(new FileValidationPipe()) file?: Express.Multer.File,
  ) {
    return this.incidentsService.create(createIncidentDto, userId, file);
  }

  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Roles('OWNER', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'ORG_ADMIN')
  @Get()
  @ApiOperation({ summary: 'Get all incidents' })
  @ApiResponse({ status: 200, description: 'List of incidents' })
  async findAll(@Query() filters: IncidentFiltersDto) {
    return this.incidentsService.findAll(
      filters.type,
      filters.status,
      filters.priority,
      filters.page,
      filters.limit,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get incident by ID' })
  @ApiResponse({
    status: 200,
    description: 'Incident details',
    schema: {
      properties: {
        incident_id: { type: 'string', example: 'EMG-20260327-0001' },
        type: { type: 'string', example: 'MEDICAL' },
        priority: { type: 'string', example: 'HIGH' },
        status: { type: 'string', example: 'WAITING_FOR_RESPONSE' },
        location: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              example: '123 Main Street, Quezon City',
            },
            coordinates: {
              type: 'object',
              properties: {
                lat: { type: 'number', example: 14.5995 },
                lng: { type: 'number', example: 120.9842 },
              },
            },
            landmark: { type: 'string', example: 'Near Mercury Drug Store' },
          },
        },
        title: { type: 'string', example: 'Car accident on Highway 1' },
        description: {
          type: 'string',
          example: 'Two vehicles collided, one driver injured',
        },
        reporter_id: { type: 'string', example: 'uuid-of-reporter' },
        scene_commander_id: { type: 'string', example: 'uuid-of-commander' },
        image_url: {
          type: 'string',
          example: 'https://cdn.example.com/incidents/image.jpg',
        },
        reported_at: { type: 'string', example: '2026-03-27T08:00:00.000Z' },
        is_silent: { type: 'boolean', example: false },
        is_anonymous: { type: 'boolean', example: false },
        is_verified: { type: 'boolean', example: false },
        false_report_count: { type: 'number', example: 0 },
        created_at: { type: 'string', example: '2026-03-27T08:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'DISPATCHER', 'RESPONDER', 'ORG_ADMIN')
  @Put(':id')
  @ApiOperation({ summary: 'Update incident' })
  @ApiResponse({ status: 200, description: 'Incident updated successfully' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async update(
    @Param('id') id: string,
    @Body() updateIncidentDto: UpdateIncidentDto,
  ) {
    return this.incidentsService.update(id, updateIncidentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'DISPATCHER', 'RESPONDER', 'ORG_ADMIN')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update incident status' })
  @ApiResponse({ status: 200, description: 'Incident status updated' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateIncidentStatusDto,
  ) {
    return this.incidentsService.updateStatus(id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel incident' })
  @ApiResponse({ status: 200, description: 'Incident cancelled' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async remove(@Param('id') id: string) {
    return this.incidentsService.remove(id);
  }
}
