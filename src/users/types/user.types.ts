import {
  OrganizationResponse,
  OrganizationType,
  OrganizationLevel,
} from '../../organizations/types/organization.types';
import {
  OrgMemberRole,
  OrgMemberStatus,
  ResponderStatus,
} from '../../organizations/types/dto.types';

export type UserRole =
  | 'CITIZEN'
  | 'DISPATCHER'
  | 'RESPONDER'
  | 'ADMIN'
  | 'ORG_ADMIN'
  | 'FIRST_AIDER';

export interface Role {
  id: string;
  name: UserRole;
  description?: string;
  created_at: string;
}

export interface RoleResponse {
  id: string;
  name: UserRole;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  role?: Role;
  created_at: string;
}

export interface User {
  id: string;
  phone: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  roles: RoleResponse[];
  emergency_contacts: EmergencyContact[];
  organizations: UserOrganizationMembership[];
  profile_image_url?: string;
  is_verified: boolean;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  id: string;
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: RoleResponse[];
  emergency_contacts: EmergencyContact[];
  organizations: UserOrganizationMembership[];
  profile_image_url?: string;
  is_verified: boolean;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  created_at: string;
}

export interface UserOrganizationMembership {
  id: string;
  organization_id: string;
  org_type: OrganizationType;
  org_role: OrgMemberRole;
  responder_type?: string;
  status: OrgMemberStatus;
  responder_status?: ResponderStatus;
  is_available?: boolean;
  location?: { type: string; coordinates: [number, number] };
  created_at: string;
  organization: {
    id: string;
    name: string;
    short_name?: string;
    code: string;
    type: OrganizationType;
    level: OrganizationLevel;
    parent_organization_id?: string;
    region?: string;
    province?: string;
    city?: string;
    barangay?: string;
    is_active: boolean;
  }[];
}
