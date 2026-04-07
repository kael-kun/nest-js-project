import { IncidentType, IncidentStatus, PriorityLevel } from '../../incidents/types/dto.types';

export interface StatusLogEntry {
  status: IncidentStatus;
  timestamp: string;
}

export interface NearbyIncidentLocation {
  address: string;
  landmark: string;
}

export interface NearbyIncident {
  incident_id: string;
  type: IncidentType;
  priority: PriorityLevel;
  status: IncidentStatus;
  location: NearbyIncidentLocation;
  title: string;
  description: string;
  reporter_id: string;
  image_url: string;
  reported_at: string;
  status_logs: StatusLogEntry[];
  is_silent: boolean;
  is_anonymous: boolean;
  is_verified: boolean;
  false_report_count: number;
  created_at: string;
}

export interface NearbyIncidentsResponse {
  incidents: NearbyIncident[];
}
