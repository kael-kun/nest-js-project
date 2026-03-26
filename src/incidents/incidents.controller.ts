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
  @Get('/reporter')
  @ApiOperation({ summary: 'Get incidents by reporter' })
  @ApiResponse({
    status: 200,
    description: 'List of incidents reported by user',
  })
  async findByReporter(
    @CurrentUserId() userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.incidentsService.findByReporter(userId, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/reporter/:userId')
  @ApiOperation({
    summary: 'Get all reported incidents of a specific user',
    description:
      'Returns a paginated list of all emergency incidents reported by the specified user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID of the user whose reported incidents to retrieve',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Items per page, max 100 (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of incidents reported by the specified user',
    schema: {
      example: {
        incidents: [
          {
            incident_id: 'EMG-20260326-0001',
            type: 'MEDICAL',
            priority: 'HIGH',
            status: 'WAITING_FOR_RESPONSE',
            location: { type: 'Point', coordinates: [120.9842, 14.5995] },
            title: 'Car accident on Highway 1',
            description: 'Two vehicles collided, one driver injured',
            address: '123 Main Street, Quezon City',
            landmark: 'Near Mercury Drug Store',
            reporter_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            image_url: null,
            reported_at: '2026-03-26T08:00:00.000Z',
            is_silent: false,
            is_anonymous: false,
            is_verified: false,
            false_report_count: 0,
            created_at: '2026-03-26T08:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findReportedByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.incidentsService.findByReporter(userId, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/commander')
  @ApiOperation({ summary: 'Get incidents by scene commander' })
  @ApiResponse({
    status: 200,
    description: 'List of incidents managed by user',
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
  @ApiResponse({ status: 200, description: 'Incident details' })
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
