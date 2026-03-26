import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CloudflareService } from '../r2_bucket/cloudflare.service';
import {
  Incident,
  IncidentResponse,
  IncidentListResponse,
  IncidentResponderInfo,
  SceneCommanderOrgMember,
} from './types/incident.types';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  UpdateIncidentStatusDto,
  IncidentStatus,
} from './types/dto.types';

const INCIDENT_FIELDS =
  'incident_id,type,priority,status,location,title,description,reporter_id,scene_commander_id,image_url,reported_at,dispatched_at,en_route_at,arrived_at,resolved_at,closed_at,is_silent,is_anonymous,is_verified,false_report_count,created_at,updated_at';

@Injectable()
export class IncidentsService {
  constructor(
    private supabase: SupabaseService,
    private cloudflare: CloudflareService,
  ) {}

  private generateIncidentId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `EMG-${dateStr}-${random}`;
  }

  private parseLocation(
    location: string,
  ): { type: string; coordinates: [number, number] } | null {
    if (!location) return null;
    const match = location.match(/POINT\(([^)]+)\)/);
    if (!match) return null;
    const [lon, lat] = match[1].split(' ').map(Number);
    return { type: 'Point', coordinates: [lon, lat] };
  }

  private buildLocation(lat: number, lon: number): string {
    return `SRID=4326;POINT(${lon} ${lat})`;
  }

  async create(
    createIncidentDto: CreateIncidentDto,
    reporterId: string,
    file?: Express.Multer.File,
  ): Promise<IncidentResponse> {
    const incidentId = this.generateIncidentId();

    let imageUrl: string | undefined;
    if (file) {
      const uploadResult = await this.cloudflare.uploadFile(file, 'incidents');
      imageUrl = uploadResult.url;
    }

    const location = this.buildLocation(
      createIncidentDto.latitude,
      createIncidentDto.longitude,
    );

    const { data, error } = await this.supabase.client
      .from('incidents')
      .insert({
        incident_id: incidentId,
        type: createIncidentDto.type,
        status: IncidentStatus.RECEIVED,
        location,
        title: createIncidentDto.title,
        description: createIncidentDto.description,
        reporter_id: reporterId,
        image_url: imageUrl,
        is_silent: createIncidentDto.is_silent ?? false,
        is_anonymous: createIncidentDto.is_anonymous ?? false,
        reported_at: new Date().toISOString(),
      })
      .select(INCIDENT_FIELDS)
      .single<Incident | null>();

    if (error || !data) {
      if (file && imageUrl) {
        const key = this.cloudflare.getKeyFromUrl(imageUrl);
        await this.cloudflare.deleteFile(key).catch(() => {});
      }
      throw new BadRequestException(
        error?.message || 'Failed to create incident',
      );
    }

    return this.toResponse(data);
  }

  async findAll(
    type?: string,
    status?: string,
    priority?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<IncidentListResponse> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    let query = this.supabase.client
      .from('incidents')
      .select(INCIDENT_FIELDS, { count: 'exact', head: true });

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);

    const { count, error: countError } = await query;

    if (countError || !count) {
      return {
        incidents: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }

    let dataQuery = this.supabase.client
      .from('incidents')
      .select(INCIDENT_FIELDS)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (type) dataQuery = dataQuery.eq('type', type);
    if (status) dataQuery = dataQuery.eq('status', status);
    if (priority) dataQuery = dataQuery.eq('priority', priority);

    const { data, error } = await dataQuery;

    if (error || !data) {
      return {
        incidents: [],
        total: count,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      };
    }

    const incidents = data.map((i) => this.toResponse(i));
    const totalPages = Math.ceil(count / safeLimit);

    return {
      incidents,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  async findById(incidentId: string): Promise<IncidentResponse> {
    const { data, error } = await this.supabase.client
      .from('incidents')
      .select(INCIDENT_FIELDS)
      .eq('incident_id', incidentId)
      .single<Incident | null>();

    if (error || !data) {
      throw new NotFoundException('Incident not found');
    }

    return this.toResponse(data);
  }

  async update(
    incidentId: string,
    updateIncidentDto: UpdateIncidentDto,
  ): Promise<IncidentResponse> {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateIncidentDto.title !== undefined)
      updates.title = updateIncidentDto.title;
    if (updateIncidentDto.description !== undefined)
      updates.description = updateIncidentDto.description;
    if (updateIncidentDto.type !== undefined)
      updates.type = updateIncidentDto.type;

    if (
      updateIncidentDto.latitude !== undefined &&
      updateIncidentDto.longitude !== undefined
    ) {
      updates.location = this.buildLocation(
        updateIncidentDto.latitude,
        updateIncidentDto.longitude,
      );
    }

    if (updateIncidentDto.is_silent !== undefined)
      updates.is_silent = updateIncidentDto.is_silent;
    if (updateIncidentDto.is_anonymous !== undefined)
      updates.is_anonymous = updateIncidentDto.is_anonymous;

    const { data, error } = await this.supabase.client
      .from('incidents')
      .update(updates)
      .eq('incident_id', incidentId)
      .select(INCIDENT_FIELDS)
      .single<Incident | null>();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to update incident',
      );
    }

    return this.toResponse(data);
  }

  async updateStatus(
    incidentId: string,
    updateDto: UpdateIncidentStatusDto,
  ): Promise<IncidentResponse> {
    const existing = await this.findById(incidentId);

    const updates: any = {
      status: updateDto.status,
      updated_at: new Date().toISOString(),
    };

    const now = new Date().toISOString();
    switch (updateDto.status) {
      case IncidentStatus.DISPATCHED:
        updates.dispatched_at = existing.dispatched_at || now;
        break;
      case IncidentStatus.EN_ROUTE:
        updates.en_route_at = existing.en_route_at || now;
        break;
      case IncidentStatus.ON_SCENE:
        updates.arrived_at = existing.arrived_at || now;
        break;
      case IncidentStatus.RESOLVED:
        updates.resolved_at = existing.resolved_at || now;
        break;
      case IncidentStatus.CLOSED:
        updates.closed_at = existing.closed_at || now;
        break;
    }

    if (updateDto.scene_commander_id !== undefined) {
      updates.scene_commander_id = updateDto.scene_commander_id;
    }

    const { data, error } = await this.supabase.client
      .from('incidents')
      .update(updates)
      .eq('incident_id', incidentId)
      .select(INCIDENT_FIELDS)
      .single<Incident | null>();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to update incident status',
      );
    }

    return this.toResponse(data);
  }

  async remove(incidentId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('incidents')
      .update({
        status: IncidentStatus.CANCELLED,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('incident_id', incidentId);

    if (error) {
      throw new BadRequestException(
        error?.message || 'Failed to cancel incident',
      );
    }
  }

  async findByReporter(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<IncidentListResponse> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const { count, error: countError } = await this.supabase.client
      .from('incidents')
      .select(INCIDENT_FIELDS, { count: 'exact', head: true })
      .eq('reporter_id', userId);
    if (countError || !count) {
      return {
        incidents: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }
    const { data, error } = await this.supabase.client
      .from('incidents')
      .select(INCIDENT_FIELDS)
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);
    if (error || !data) {
      return {
        incidents: [],
        total: count,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      };
    }

    const sceneCommanderIds = [
      ...new Set(
        data
          .map((i) => i.scene_commander_id)
          .filter((id): id is string => id !== null && id !== undefined),
      ),
    ];

    let orgMembersMap: Record<string, SceneCommanderOrgMember> = {};
    if (sceneCommanderIds.length > 0) {
      const { data: orgMembers } = await this.supabase.client
        .from('organization_members')
        .select(
          'id,user_id,organization_id,org_type,org_role,responder_type,status,invited_by,reason,organization:organization_id(id,name,short_name,code)',
        )
        .in('user_id', sceneCommanderIds);

      if (orgMembers) {
        orgMembersMap = orgMembers.reduce(
          (acc, member: any) => {
            const org = Array.isArray(member.organization)
              ? member.organization[0]
              : member.organization;
            acc[member.user_id] = {
              ...member,
              organization: org,
            } as SceneCommanderOrgMember;
            return acc;
          },
          {} as Record<string, SceneCommanderOrgMember>,
        );
      }
    }

    const incidents = data.map((i) =>
      this.toResponseWithRelations(i, orgMembersMap[i.scene_commander_id]),
    );
    const totalPages = Math.ceil(count / safeLimit);
    return {
      incidents,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }
  async findBySceneCommander(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<IncidentListResponse> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;
    const { count, error: countError } = await this.supabase.client
      .from('incidents')
      .select(INCIDENT_FIELDS, { count: 'exact', head: true })
      .eq('scene_commander_id', userId);
    if (countError || !count) {
      return {
        incidents: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }
    const { data, error } = await this.supabase.client
      .from('incidents')
      .select(INCIDENT_FIELDS)
      .eq('scene_commander_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);
    if (error || !data) {
      return {
        incidents: [],
        total: count,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      };
    }
    const incidents = data.map((i) => this.toResponseWithRelations(i));
    const totalPages = Math.ceil(count / safeLimit);
    return {
      incidents,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }
  private toResponse(incident: Incident): IncidentResponse {
    return {
      incident_id: incident.incident_id,
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      location: this.parseLocation(incident.location) ?? undefined,
      title: incident.title,
      description: incident.description,
      reporter_id: incident.reporter_id,
      scene_commander_id: incident.scene_commander_id,
      image_url: incident.image_url,
      reported_at: incident.reported_at,
      dispatched_at: incident.dispatched_at,
      en_route_at: incident.en_route_at,
      arrived_at: incident.arrived_at,
      resolved_at: incident.resolved_at,
      closed_at: incident.closed_at,
      is_silent: incident.is_silent,
      is_anonymous: incident.is_anonymous,
      is_verified: incident.is_verified,
      false_report_count: incident.false_report_count,
      created_at: incident.created_at,
    };
  }

  private buildResponderInfo(
    user: any,
    orgMember: any,
    org: any,
  ): IncidentResponderInfo | undefined {
    if (!user) return undefined;

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      organization: org
        ? {
            id: org.id,
            name: org.name,
            short_name: org.short_name,
            code: org.code,
          }
        : undefined,
      org_role: orgMember?.org_role,
      responder_type: orgMember?.responder_type,
    };
  }

  private toResponseWithRelations(
    incident: any,
    sceneCommanderOrgMember?: SceneCommanderOrgMember,
  ): IncidentResponse {
    const reporterOrgMember = Array.isArray(incident.reporter_org)
      ? incident.reporter_org[0]
      : incident.reporter_org;
    const commanderOrgMember = Array.isArray(incident.commander_org)
      ? incident.commander_org[0]
      : incident.commander_org;

    const reporter = incident.is_anonymous
      ? undefined
      : this.buildResponderInfo(
          incident.reporter,
          reporterOrgMember,
          reporterOrgMember?.organization,
        );

    const sceneCommander = this.buildResponderInfo(
      incident.scene_commander,
      commanderOrgMember,
      commanderOrgMember?.organization,
    );

    return {
      incident_id: incident.incident_id,
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      location: this.parseLocation(incident.location) ?? undefined,
      title: incident.title,
      description: incident.description,
      reporter_id: incident.reporter_id,
      reporter,
      scene_commander_id: incident.scene_commander_id,
      scene_commander: sceneCommander,
      scene_commander_org_member: sceneCommanderOrgMember,
      image_url: incident.image_url,
      reported_at: incident.reported_at,
      dispatched_at: incident.dispatched_at,
      en_route_at: incident.en_route_at,
      arrived_at: incident.arrived_at,
      resolved_at: incident.resolved_at,
      closed_at: incident.closed_at,
      is_silent: incident.is_silent,
      is_anonymous: incident.is_anonymous,
      is_verified: incident.is_verified,
      false_report_count: incident.false_report_count,
      created_at: incident.created_at,
    };
  }
}
