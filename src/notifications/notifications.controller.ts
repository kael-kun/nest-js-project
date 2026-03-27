import {
  Controller,
  Get,
  Patch,
  Delete,
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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationDto, NotificationFiltersDto } from './types/dto.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'page', required: false, default: 1 })
  @ApiQuery({ name: 'limit', required: false, default: 10 })
  @ApiQuery({ name: 'is_read', required: false, description: 'Filter by read status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'priority', required: false, enum: ['low', 'normal', 'high', 'urgent'] })
  @ApiResponse({
    status: 200,
    description: 'List of notifications',
    schema: {
      example: {
        notifications: [
          {
            notification_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            type: 'incident_assigned',
            title: 'New Incident Assigned',
            message: 'You have been assigned to incident EMG-20260326-0001',
            data: { incident_id: 'EMG-20260326-0001' },
            is_read: false,
            priority: 'high',
            action_url: '/incidents/EMG-20260326-0001',
            action_required: true,
            expires_at: null,
            created_at: '2026-03-26T10:00:00.000Z',
            read_at: null,
            updated_at: '2026-03-26T10:00:00.000Z',
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
  async findAll(
    @CurrentUserId() userId: string,
    @Query() filters: NotificationFiltersDto,
  ) {
    return this.notificationsService.findByUser(userId, filters);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count', schema: { example: { count: 5 } } })
  async getUnreadCount(@CurrentUserId() userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.notificationsService.findById(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read', schema: { example: { count: 5 } } })
  async markAllAsRead(@CurrentUserId() userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    await this.notificationsService.delete(id, userId);
    return { message: 'Notification deleted successfully' };
  }
}