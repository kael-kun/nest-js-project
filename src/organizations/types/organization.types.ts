import {
  OrganizationType,
  OrganizationLevel,
  OrgMemberRole,
  OrgMemberStatus,
  ResponderStatus,
} from './dto.types';

export type { OrganizationType, OrganizationLevel };
export { OrgMemberRole, OrgMemberStatus, ResponderStatus };

export interface Organization {
  id: string;
  name: string;
  short_name?: string;
  code: string;
  type: OrganizationType;
  level: OrganizationLevel;
  parent_organization_id?: string;
  allowed_roles: string[];
  allowed_responder_types: string[];
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  address?: string;
  phone?: string;
  website?: string;
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
  parent_organization_id?: string;
  allowed_roles: string[];
  allowed_responder_types: string[];
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  address?: string;
  phone?: string;
  website?: string;
  is_active: boolean;
  created_at: string;
}

export interface OrganizationListResponse {
  organizations: OrganizationResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  org_type: OrganizationType;
  org_role: OrgMemberRole;
  responder_type?: string;
  status: OrgMemberStatus;
  responder_status?: ResponderStatus;
  is_available?: boolean;
  invited_by?: string;
  reason?: string;
  location?: { type: string; coordinates: [number, number] };
  preferred_km?: number;
  responder_details?: { title: string; description: string }[];
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  organization?: {
    id: string;
    name: string;
    short_name?: string;
    code: string;
  };
}

export interface OrganizationMemberResponse {
  id: string;
  user_id: string;
  organization_id: string;
  org_type: OrganizationType;
  org_role: OrgMemberRole;
  responder_type?: string;
  status: OrgMemberStatus;
  responder_status?: ResponderStatus;
  is_available?: boolean;
  invited_by?: string;
  reason?: string;
  location?: { type: string; coordinates: [number, number] };
  preferred_km?: number;
  responder_details?: { title: string; description: string }[];
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  organization?: {
    id: string;
    name: string;
    short_name?: string;
    code: string;
  };
}

export interface OrganizationMemberListResponse {
  members: OrganizationMemberResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserMembership {
  id: string;
  user_id: string;
  organization_id: string;
  org_type: OrganizationType;
  org_role: OrgMemberRole;
  responder_type?: string;
  status: OrgMemberStatus;
  responder_status?: ResponderStatus;
  is_available?: boolean;
  invited_by?: string;
  reason?: string;
  location?: { type: string; coordinates: [number, number] };
  created_at: string;
  organization: {
    id: string;
    name: string;
    short_name?: string;
    code: string;
    type: OrganizationType;
    level: OrganizationLevel;
  };
}

export interface UserMembershipListResponse {
  memberships: UserMembership[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
