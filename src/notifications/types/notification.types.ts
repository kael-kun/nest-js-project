export interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url: string | null;
  action_required: boolean;
  expires_at: string | null;
  created_at: string;
  read_at: string | null;
  updated_at: string;
}

export interface NotificationResponse extends Omit<Notification, 'user_id'> {}