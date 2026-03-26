import { OrganizationType, OrganizationLevel } from './dto.types';

export type { OrganizationType, OrganizationLevel };

export type OrgMemberRole = 'RESPONDER' | 'DISPATCHER' | 'ORG_ADMIN';
export type OrgMemberStatus = 'INVITED' | 'ACTIVE' | 'DECLINED' | 'SUSPENDED';
export type ResponderType =
  // POLICE
  | 'PATROL_OFFICER'
  | 'DETECTIVE'
  | 'SWAT'
  | 'K9_OFFICER'
  | 'TRAFFIC_OFFICER'
  // FIRE
  | 'FIREFIGHTER'
  | 'FIRE_INVESTIGATOR'
  | 'HAZMAT_SPECIALIST'
  | 'RESCUE_TECHNICIAN'
  // AMBULANCE
  | 'PARAMEDIC'
  | 'EMT'
  | 'NURSE'
  | 'DOCTOR'
  // COAST_GUARD
  | 'RESCUE_SWIMMER'
  | 'BOAT_OPERATOR'
  | 'AVIATION_RESCUE'
  | 'MARITIME_OFFICER'
  // BARANGAY
  | 'TANOD'
  | 'HEALTH_WORKER'
  | 'DISASTER_VOLUNTEER'
  // LGU
  | 'DISASTER_COORDINATOR'
  | 'RELIEF_COORDINATOR'
  | 'HEALTH_OFFICER'
  // OCD
  | 'EMERGENCY_MANAGER'
  | 'LOGISTICS_OFFICER'
  // PRIVATE + cross-org
  | 'SECURITY_OFFICER'
  | 'FIRST_AIDER'
  | 'SAFETY_OFFICER';

export interface MembershipResponse {
  id: string;
  organization_id: string;
  organization: OrganizationResponse;
  org_role: OrgMemberRole;
  org_type: OrganizationType;
  responder_type: ResponderType | null;
  status: OrgMemberStatus;
  invited_by?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  short_name?: string;
  code: string;
  type: OrganizationType;
  level: OrganizationLevel;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  address?: string;
  phone?: string;
  website?: string;
  allowed_roles: OrgMemberRole[];
  allowed_responder_types: ResponderType[];
  parent_organization_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  short_name?: string;
  code: string;
  type: OrganizationType;
  level: OrganizationLevel;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  address?: string;
  phone?: string;
  website?: string;
  allowed_roles: OrgMemberRole[];
  allowed_responder_types: ResponderType[];
  parent_organization_id?: string;
  is_active: boolean;
  created_at: string;
  member_count: number;
}

export interface MemberWithUserResponse {
  id: string;
  user_id: string;
  organization_id: string;
  org_role: OrgMemberRole;
  org_type: string;
  responder_type: ResponderType | null;
  status: OrgMemberStatus;
  invited_by?: string;
  kilometer_radius?: number;
  reason?: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    profile_image_url?: string;
  };
}

export interface OrganizationListResponse {
  organizations: OrganizationResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
