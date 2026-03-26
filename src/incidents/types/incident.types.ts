import { IncidentType, IncidentStatus, PriorityLevel } from './dto.types';

export type { IncidentType, IncidentStatus, PriorityLevel };

export interface Incident {
  incident_id: string;
  type: IncidentType;
  priority: PriorityLevel;
  status: IncidentStatus;
  location: string;
  title: string;
  description?: string;
  address?: string;
  landmark?: string;
  reporter_id?: string;
  scene_commander_id?: string;
  image_url?: string;
  reported_at: string;
  dispatched_at?: string;
  en_route_at?: string;
  arrived_at?: string;
  resolved_at?: string;
  closed_at?: string;
  is_silent: boolean;
  is_anonymous: boolean;
  is_verified: boolean;
  false_report_count: number;
  created_at: string;
  updated_at: string;
}

export interface IncidentResponderInfo {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  organization?: {
    id: string;
    name: string;
    short_name?: string;
    code: string;
  };
  org_role?: string;
  responder_type?: string;
}

export interface SceneCommanderOrgMember {
  id: string;
  user_id: string;
  organization_id: string;
  org_type: string;
  org_role: string;
  responder_type?: string;
  status: string;
  invited_by?: string;
  reason?: string;
  organization?: {
    id: string;
    name: string;
    short_name?: string;
    code: string;
  };
}

export interface IncidentResponse {
  incident_id: string;
  type: IncidentType;
  priority: PriorityLevel;
  status: IncidentStatus;
  location?: { type: string; coordinates: [number, number] };
  title: string;
  description?: string;
  address?: string;
  landmark?: string;
  reporter_id?: string;
  reporter?: IncidentResponderInfo;
  scene_commander_id?: string;
  scene_commander?: IncidentResponderInfo;
  scene_commander_org_member?: SceneCommanderOrgMember;
  image_url?: string;
  reported_at: string;
  dispatched_at?: string;
  en_route_at?: string;
  arrived_at?: string;
  resolved_at?: string;
  closed_at?: string;
  is_silent: boolean;
  is_anonymous: boolean;
  is_verified: boolean;
  false_report_count: number;
  created_at: string;
}

export interface IncidentListResponse {
  incidents: IncidentResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
