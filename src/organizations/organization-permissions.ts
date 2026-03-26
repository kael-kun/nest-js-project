import { OrganizationType } from './types/dto.types';
import { OrgMemberRole, ResponderType } from './types/organization.types';

/**
 * Defines which org_roles can be granted within each organization type.
 */
export const ORG_ALLOWED_ROLES: Record<OrganizationType, OrgMemberRole[]> = {
  [OrganizationType.POLICE]:      ['RESPONDER', 'DISPATCHER'],
  [OrganizationType.AMBULANCE]:   ['RESPONDER', 'DISPATCHER'],
  [OrganizationType.FIRE]:        ['RESPONDER', 'DISPATCHER'],
  [OrganizationType.COAST_GUARD]: ['RESPONDER', 'DISPATCHER'],
  [OrganizationType.PRIVATE]:     ['RESPONDER', 'DISPATCHER'],
  [OrganizationType.LGU]:         ['RESPONDER', 'DISPATCHER'],
  [OrganizationType.OCD]:         ['RESPONDER', 'DISPATCHER'],
  [OrganizationType.BARANGAY]:    ['RESPONDER', 'DISPATCHER'],
};

/**
 * Valid responder_type values per organization type.
 * Stored as-is at invite time; the portal UI scopes the options shown to the dispatcher.
 * For PRIVATE orgs, a value is required. For all others it is optional.
 * FIRST_AIDER may be used in any org for Red Cross chapters or BHW volunteers.
 */
export const VALID_RESPONDER_TYPES: Record<OrganizationType, ResponderType[]> = {
  [OrganizationType.POLICE]:      ['PATROL_OFFICER', 'DETECTIVE', 'SWAT', 'K9_OFFICER', 'TRAFFIC_OFFICER', 'FIRST_AIDER'],
  [OrganizationType.FIRE]:        ['FIREFIGHTER', 'FIRE_INVESTIGATOR', 'HAZMAT_SPECIALIST', 'RESCUE_TECHNICIAN', 'FIRST_AIDER'],
  [OrganizationType.AMBULANCE]:   ['PARAMEDIC', 'EMT', 'NURSE', 'DOCTOR', 'FIRST_AIDER'],
  [OrganizationType.COAST_GUARD]: ['RESCUE_SWIMMER', 'BOAT_OPERATOR', 'AVIATION_RESCUE', 'MARITIME_OFFICER', 'FIRST_AIDER'],
  [OrganizationType.BARANGAY]:    ['TANOD', 'HEALTH_WORKER', 'DISASTER_VOLUNTEER', 'FIRST_AIDER'],
  [OrganizationType.LGU]:         ['DISASTER_COORDINATOR', 'RELIEF_COORDINATOR', 'HEALTH_OFFICER', 'FIRST_AIDER'],
  [OrganizationType.OCD]:         ['DISASTER_COORDINATOR', 'EMERGENCY_MANAGER', 'LOGISTICS_OFFICER', 'FIRST_AIDER'],
  [OrganizationType.PRIVATE]:     ['SECURITY_OFFICER', 'FIRST_AIDER', 'SAFETY_OFFICER'],
};

export function isRoleAllowedForOrgType(
  orgType: OrganizationType,
  role: OrgMemberRole,
): boolean {
  return ORG_ALLOWED_ROLES[orgType]?.includes(role) ?? false;
}

/**
 * Validates that all supplied responder types are within the ceiling for the org type.
 * Returns an array of invalid values (empty = all valid).
 */
export function validateResponderTypeSubset(
  orgType: OrganizationType,
  responderTypes: ResponderType[],
): ResponderType[] {
  const ceiling = VALID_RESPONDER_TYPES[orgType] ?? [];
  return responderTypes.filter(r => !ceiling.includes(r));
}
