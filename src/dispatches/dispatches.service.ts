import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IncidentsService } from '../incidents/incidents.service';
import { IncidentGateway } from '../events/incident.gateway';
import {
  Dispatch,
  DispatchResponse,
  DispatchStatus,
} from './types/dispatch.types';
import {
  RespondToIncidentDto,
  UpdateDispatchStatusDto,
  DispatchStatusEnum,
} from './types/dto.types';
import { IncidentStatus } from '../incidents/types/dto.types';

const DISPATCH_FIELDS =
  'id,incident_id,responder_id,dispatcher_id,organization_id,status,notes,assigned_at,accepted_at,en_route_at,on_scene_at,completed_at,declined_at,cancelled_at,created_at,updated_at';

@Injectable()
export class DispatchesService {
  constructor(
    private supabase: SupabaseService,
    private incidentsService: IncidentsService,
    private incidentGateway: IncidentGateway,
  ) {}

  /**
   * Responder accepts an incident.
   * Creates a dispatch record, sets scene_commander_id on the incident,
   * and updates incident status to ACCEPTED.
   */
  async respondToIncident(
    incidentId: string,
    responderId: string,
    dto: RespondToIncidentDto,
  ): Promise<DispatchResponse> {
    // Verify incident exists and is still waiting
    const incident = await this.incidentsService.findById(incidentId);

    if (incident.status !== IncidentStatus.WAITING_FOR_RESPONSE) {
      throw new ConflictException(
        `Incident is already ${incident.status} and cannot be accepted`,
      );
    }

    // Get responder's organization membership
    const { data: orgMember, error: orgError } = await this.supabase.client
      .from('organization_members')
      .select('id,organization_id,org_role,status')
      .eq('user_id', responderId)
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    if (orgError || !orgMember) {
      throw new BadRequestException(
        'Responder is not an active member of any organization',
      );
    }

    // Check if this responder already has an active dispatch for this incident
    const { data: existingDispatch } = await this.supabase.client
      .from('dispatches')
      .select('id,status')
      .eq('incident_id', incidentId)
      .eq('responder_id', responderId)
      .in('status', ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE'])
      .limit(1)
      .single();

    if (existingDispatch) {
      throw new ConflictException(
        'You already have an active dispatch for this incident',
      );
    }

    const now = new Date().toISOString();

    // Create dispatch record
    const { data: dispatch, error: dispatchError } =
      await this.supabase.client
        .from('dispatches')
        .insert({
          incident_id: incidentId,
          responder_id: responderId,
          organization_id: orgMember.organization_id,
          status: 'ACCEPTED',
          notes: dto.notes ?? null,
          assigned_at: now,
          accepted_at: now,
        })
        .select(DISPATCH_FIELDS)
        .single<Dispatch>();

    if (dispatchError || !dispatch) {
      throw new BadRequestException(
        dispatchError?.message || 'Failed to create dispatch',
      );
    }

    // Update incident: set scene_commander_id and status to ACCEPTED
    await this.supabase.client
      .from('incidents')
      .update({
        status: IncidentStatus.ACCEPTED,
        scene_commander_id: responderId,
        accepted_at: now,
        updated_at: now,
      })
      .eq('incident_id', incidentId);

    // Mark responder as unavailable
    await this.supabase.client
      .from('organization_members')
      .update({ is_available: false })
      .eq('user_id', responderId);

    // Broadcast status update to org room
    this.incidentGateway.broadcastIncidentStatusUpdate(
      incidentId,
      IncidentStatus.ACCEPTED,
      orgMember.organization_id,
    );

    return this.toResponse(dispatch);
  }

  async updateDispatchStatus(
    dispatchId: string,
    responderId: string,
    dto: UpdateDispatchStatusDto,
  ): Promise<DispatchResponse> {
    const { data: existing, error: fetchError } = await this.supabase.client
      .from('dispatches')
      .select(DISPATCH_FIELDS)
      .eq('id', dispatchId)
      .single<Dispatch>();

    if (fetchError || !existing) {
      throw new NotFoundException('Dispatch not found');
    }

    if (existing.responder_id !== responderId) {
      throw new BadRequestException(
        'You are not the assigned responder for this dispatch',
      );
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: dto.status,
      updated_at: now,
    };

    if (dto.notes !== undefined) updates.notes = dto.notes;

    // Set the relevant timestamp
    switch (dto.status) {
      case DispatchStatusEnum.EN_ROUTE:
        updates.en_route_at = now;
        break;
      case DispatchStatusEnum.ON_SCENE:
        updates.on_scene_at = now;
        break;
      case DispatchStatusEnum.COMPLETED:
        updates.completed_at = now;
        break;
      case DispatchStatusEnum.DECLINED:
        updates.declined_at = now;
        break;
      case DispatchStatusEnum.CANCELLED:
        updates.cancelled_at = now;
        break;
    }

    const { data, error } = await this.supabase.client
      .from('dispatches')
      .update(updates)
      .eq('id', dispatchId)
      .select(DISPATCH_FIELDS)
      .single<Dispatch>();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to update dispatch status',
      );
    }

    // Mirror terminal statuses to the incident
    const incidentStatusMap: Partial<Record<DispatchStatusEnum, IncidentStatus>> = {
      [DispatchStatusEnum.EN_ROUTE]: IncidentStatus.EN_ROUTE,
      [DispatchStatusEnum.ON_SCENE]: IncidentStatus.ON_SCENE,
      [DispatchStatusEnum.COMPLETED]: IncidentStatus.RESOLVED,
    };

    const mappedIncidentStatus = incidentStatusMap[dto.status];
    if (mappedIncidentStatus) {
      await this.supabase.client
        .from('incidents')
        .update({
          status: mappedIncidentStatus,
          updated_at: now,
          ...(mappedIncidentStatus === IncidentStatus.EN_ROUTE && {
            en_route_at: now,
          }),
          ...(mappedIncidentStatus === IncidentStatus.ON_SCENE && {
            arrived_at: now,
          }),
          ...(mappedIncidentStatus === IncidentStatus.RESOLVED && {
            resolved_at: now,
          }),
        })
        .eq('incident_id', existing.incident_id);

      // Broadcast to org
      this.incidentGateway.broadcastIncidentStatusUpdate(
        existing.incident_id,
        mappedIncidentStatus,
        existing.organization_id,
      );
    }

    // Free up responder when dispatch ends
    if (
      dto.status === DispatchStatusEnum.COMPLETED ||
      dto.status === DispatchStatusEnum.DECLINED ||
      dto.status === DispatchStatusEnum.CANCELLED
    ) {
      void this.supabase.client
        .from('organization_members')
        .update({ is_available: true })
        .eq('user_id', responderId);
    }

    return this.toResponse(data);
  }

  async getMyDispatches(
    responderId: string,
    page = 1,
    limit = 10,
  ): Promise<{ dispatches: DispatchResponse[]; total: number; page: number; limit: number }> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const { count } = await this.supabase.client
      .from('dispatches')
      .select('id', { count: 'exact', head: true })
      .eq('responder_id', responderId);

    const { data, error } = await this.supabase.client
      .from('dispatches')
      .select(DISPATCH_FIELDS)
      .eq('responder_id', responderId)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error || !data) {
      return { dispatches: [], total: 0, page: safePage, limit: safeLimit };
    }

    return {
      dispatches: data.map((d) => this.toResponse(d as Dispatch)),
      total: count ?? 0,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getDispatchByIncident(incidentId: string): Promise<DispatchResponse[]> {
    const { data, error } = await this.supabase.client
      .from('dispatches')
      .select(DISPATCH_FIELDS)
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((d) => this.toResponse(d as Dispatch));
  }

  async persistLocationUpdate(
    incidentId: string,
    userId: string,
    userType: 'RESPONDER' | 'REPORTER',
    latitude: number,
    longitude: number,
    accuracy?: number,
    heading?: number,
    speed?: number,
  ): Promise<void> {
    const location = `SRID=4326;POINT(${longitude} ${latitude})`;

    await this.supabase.client.from('location_updates').insert({
      incident_id: incidentId,
      user_id: userId,
      user_type: userType,
      location,
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
    });
  }

  private toResponse(dispatch: Dispatch): DispatchResponse {
    return {
      id: dispatch.id,
      incident_id: dispatch.incident_id,
      responder_id: dispatch.responder_id,
      dispatcher_id: dispatch.dispatcher_id,
      organization_id: dispatch.organization_id,
      status: dispatch.status,
      notes: dispatch.notes,
      assigned_at: dispatch.assigned_at,
      accepted_at: dispatch.accepted_at,
      en_route_at: dispatch.en_route_at,
      on_scene_at: dispatch.on_scene_at,
      completed_at: dispatch.completed_at,
      declined_at: dispatch.declined_at,
      cancelled_at: dispatch.cancelled_at,
      created_at: dispatch.created_at,
      updated_at: dispatch.updated_at,
    };
  }
}
