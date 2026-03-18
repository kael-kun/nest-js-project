export type UserRole = 'CITIZEN' | 'DISPATCHER' | 'RESPONDER' | 'ADMIN';

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
  user_id: string;
  name: string;
  phone: string;
  relationship?: string;
  created_at: string;
}
