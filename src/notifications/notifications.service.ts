import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Notification } from './types/notification.types';
import {
  CreateNotificationDto,
  NotificationFiltersDto,
  NotificationListResponse,
} from './types/dto.types';

@Injectable()
export class NotificationsService {
  constructor(private supabase: SupabaseService) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const { data, error } = await this.supabase.client
      .from('notifications')
      .insert({
        user_id: dto.user_id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data ?? {},
        priority: dto.priority ?? 'normal',
        action_url: dto.action_url,
        action_required: dto.action_required ?? false,
        expires_at: dto.expires_at,
      })
      .select()
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to create notification',
      );
    }

    return data;
  }

  async createBulk(
    notifications: CreateNotificationDto[],
  ): Promise<Notification[]> {
    const { data, error } = await this.supabase.client
      .from('notifications')
      .insert(
        notifications.map((n) => ({
          user_id: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data ?? {},
          priority: n.priority ?? 'normal',
          action_url: n.action_url,
          action_required: n.action_required ?? false,
          expires_at: n.expires_at,
        })),
      )
      .select();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to create notifications',
      );
    }

    return data;
  }

  async findByUser(
    userId: string,
    filters: NotificationFiltersDto,
  ): Promise<NotificationListResponse> {
    const safeLimit = Math.min(filters.limit ?? 10, 100);
    const safePage = Math.max(filters.page ?? 1, 1);
    const offset = (safePage - 1) * safeLimit;

    let query = this.supabase.client
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (filters.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { count, error: countError } = await query;

    if (countError) {
      return {
        notifications: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error || !data) {
      return {
        notifications: [],
        total: count ?? 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }

    const totalPages = Math.ceil((count ?? 0) / safeLimit);

    return {
      notifications: data,
      total: count ?? 0,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  async findById(id: string, userId: string): Promise<Notification> {
    const { data, error } = await this.supabase.client
      .from('notifications')
      .select('*')
      .eq('notification_id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Notification not found');
    }

    return data;
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const { data, error } = await this.supabase.client
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('notification_id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Notification not found');
    }

    return data;
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const { count, error } = await this.supabase.client
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { count: count ?? 0 };
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('notifications')
      .delete()
      .eq('notification_id', id)
      .eq('user_id', userId);

    if (error) {
      throw new NotFoundException('Notification not found');
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  async deleteExpired(): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .neq('expires_at', null);

    if (error) {
      return 0;
    }

    return count ?? 0;
  }
}
