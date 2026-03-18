import { OrganizationType, OrganizationLevel } from './dto.types';

export type { OrganizationType, OrganizationLevel };

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
