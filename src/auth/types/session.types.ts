export interface Session {
  id: string;
  user_id: string;
  refresh_token: string;
  ip_address?: string;
  is_revoked: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface SessionResponse {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface CreateSessionDto {
  user_id: string;
  refresh_token: string;
  ip_address?: string;
  expires_at: Date;
}
