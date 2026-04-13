export type DispatchStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export interface Dispatch {
  id: string;
  incident_id: string;
  responder_id: string;
  dispatcher_id?: string;
  organization_id: string;
  status: DispatchStatus;
  notes?: string;
  assigned_at: string;
  accepted_at?: string;
  en_route_at?: string;
  on_scene_at?: string;
  completed_at?: string;
  declined_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DispatchResponse {
  id: string;
  incident_id: string;
  responder_id: string;
  dispatcher_id?: string;
  organization_id: string;
  status: DispatchStatus;
  notes?: string;
  assigned_at: string;
  accepted_at?: string;
  en_route_at?: string;
  on_scene_at?: string;
  completed_at?: string;
  declined_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationUpdate {
  id: string;
  incident_id: string;
  user_id: string;
  user_type: 'RESPONDER' | 'REPORTER';
  location: string;
  accuracy?: number;
  heading?: number;
  speed?: number;
  created_at: string;
}

export interface LocationUpdatePayload {
  user_id: string;
  user_type: 'RESPONDER' | 'REPORTER';
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}
