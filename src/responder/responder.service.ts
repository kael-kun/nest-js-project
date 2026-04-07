import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NearbyIncident, NearbyIncidentsResponse } from './types/responder.types';

@Injectable()
export class ResponderService {
  constructor(private supabase: SupabaseService) {}

  async getNearbyIncidents(userId: string): Promise<NearbyIncidentsResponse> {
    const { data, error } = await this.supabase.client
      .rpc('get_nearby_incidents_for_user', { target_user_id: userId });

    if (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch nearby incidents',
      );
    }

    if (!data || data.length === 0 || !data[0]?.incidents) {
      return { incidents: [] };
    }

    const incidents = data[0].incidents as unknown as NearbyIncident[];

    return { incidents };
  }
}
