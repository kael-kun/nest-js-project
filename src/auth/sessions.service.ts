import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  Session,
  SessionResponse,
  CreateSessionDto,
} from './types/session.types';

const SESSION_FIELDS =
  'id,user_id,refresh_token,ip_address,is_revoked,expires_at,created_at,updated_at';

@Injectable()
export class SessionsService {
  constructor(private supabase: SupabaseService) {}

  async create(dto: CreateSessionDto): Promise<SessionResponse> {
    const { data, error } = await this.supabase.client
      .from('sessions')
      .insert({
        user_id: dto.user_id,
        refresh_token: dto.refresh_token,
        ip_address: dto.ip_address,
        expires_at: dto.expires_at.toISOString(),
      })
      .select('id,user_id,expires_at,created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create session');
    }

    return data;
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const { data, error } = await this.supabase.client
      .from('sessions')
      .select(SESSION_FIELDS)
      .eq('refresh_token', refreshToken)
      .eq('is_revoked', false)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async validateSession(refreshToken: string): Promise<Session | null> {
    const session = await this.findByRefreshToken(refreshToken);

    if (!session) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (expiresAt < now) {
      return null;
    }

    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('sessions')
      .update({ is_revoked: true, updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('sessions')
      .update({ is_revoked: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_revoked', false);

    if (error) {
      throw new Error(error.message);
    }
  }
}
