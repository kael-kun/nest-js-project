CREATE TYPE user_role AS ENUM (
'CITIZEN',
'DISPATCHER',
'FIRST_AIDER',
'RESPONDER',
'ORGANIZATION',
'ADMIN',
'ORG_ADMIN'
);

CREATE TABLE roles (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name user_role UNIQUE NOT NULL,
description TEXT,
created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
created_at TIMESTAMP DEFAULT NOW(),
UNIQUE(user_id, role_id)
);

-- Seed roles
INSERT INTO roles (name, description) VALUES
('CITIZEN', 'Regular user'),
('DISPATCHER', 'Emergency dispatcher'),
('RESPONDER', 'Emergency responder'),
('FIRST_AIDER', 'First aid responder'),
('ORG_ADMIN', 'Organization administrator'),
('ADMIN', 'System administrator');

-- Assign default CITIZEN role to existing users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE r.name = 'CITIZEN';

CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
citizen_id VARCHAR(20) UNIQUE,
phone VARCHAR(15) UNIQUE NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
first_name VARCHAR(100) NOT NULL,
last_name VARCHAR(100) NOT NULL,
profile_image_url TEXT,
is_verified BOOLEAN DEFAULT FALSE,
is_active BOOLEAN DEFAULT TRUE,
last_login_at TIMESTAMP,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE emergency_contacts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
name VARCHAR(150) NOT NULL,
phone VARCHAR(15) NOT NULL,
relationship VARCHAR(50),
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
refresh_token TEXT NOT NULL,
ip_address VARCHAR(50),
is_revoked BOOLEAN DEFAULT FALSE,
expires_at TIMESTAMP NOT NULL,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

-- /////////ORGANIZATION/////////////

CREATE TYPE organization_type AS ENUM (
'POLICE',
'AMBULANCE',
'FIRE',
'LGU',
'OCD',
'COAST_GUARD',
'BARANGAY',
'PRIVATE'
);

CREATE TYPE organization_level AS ENUM (
'NATIONAL',
'REGIONAL',
'PROVINCIAL',
'CITY',
'MUNICIPAL',
'BARANGAY'
);

CREATE TABLE organizations (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name VARCHAR(255) NOT NULL,
short_name VARCHAR(50),
code VARCHAR(50) UNIQUE NOT NULL,
type organization_type NOT NULL,
level organization_level NOT NULL,
parent_organization_id UUID REFERENCES organizations(id),
allowed_roles org_member_role_enum[] NOT NULL DEFAULT '{}',
allowed_responder_types text[] NOT NULL DEFAULT '{}',
region VARCHAR(100),
province VARCHAR(100),
city VARCHAR(100),
barangay VARCHAR(100),
address TEXT,
phone VARCHAR(20),
website TEXT,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization member enums
CREATE TYPE org_member_role_enum AS ENUM ('RESPONDER', 'DISPATCHER', 'ORG_ADMIN');
CREATE TYPE org_member_status_enum AS ENUM ('INVITED', 'ACTIVE', 'DECLINED', 'SUSPENDED');

-- Valid responder_type values (per organization type):
-- POLICE : PATROL_OFFICER, DETECTIVE, SWAT, K9_OFFICER, TRAFFIC_OFFICER
-- FIRE : FIREFIGHTER, FIRE_INVESTIGATOR, HAZMAT_SPECIALIST, RESCUE_TECHNICIAN
-- AMBULANCE : PARAMEDIC, EMT, NURSE, DOCTOR
-- COAST_GUARD : RESCUE_SWIMMER, BOAT_OPERATOR, AVIATION_RESCUE, MARITIME_OFFICER
-- BARANGAY : TANOD, HEALTH_WORKER, DISASTER_VOLUNTEER
-- LGU : DISASTER_COORDINATOR, RELIEF_COORDINATOR, HEALTH_OFFICER
-- OCD : DISASTER_COORDINATOR, EMERGENCY_MANAGER, LOGISTICS_OFFICER
-- PRIVATE : SECURITY_OFFICER, FIRST_AIDER, SAFETY_OFFICER
-- Any org : FIRST_AIDER (cross-org: Red Cross, BHWs, trained volunteers)

CREATE TABLE organization_members (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
org_type organization_type NOT NULL,
org_role org_member_role_enum NOT NULL,
responder_type text,
status org_member_status_enum NOT NULL DEFAULT 'INVITED',
invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
reason TEXT,
location geography(Point, 4326) not null,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
CONSTRAINT uq_organization_members UNIQUE (user_id, organization_id),
CONSTRAINT chk_responder_type CHECK (
responder_type IS NULL OR responder_type IN (
'PATROL_OFFICER', 'DETECTIVE', 'SWAT', 'K9_OFFICER', 'TRAFFIC_OFFICER',
'FIREFIGHTER', 'FIRE_INVESTIGATOR', 'HAZMAT_SPECIALIST', 'RESCUE_TECHNICIAN',
'PARAMEDIC', 'EMT', 'NURSE', 'DOCTOR',
'RESCUE_SWIMMER', 'BOAT_OPERATOR', 'AVIATION_RESCUE', 'MARITIME_OFFICER',
'TANOD', 'HEALTH_WORKER', 'DISASTER_VOLUNTEER',
'DISASTER_COORDINATOR', 'RELIEF_COORDINATOR', 'HEALTH_OFFICER',
'EMERGENCY_MANAGER', 'LOGISTICS_OFFICER',
'SECURITY_OFFICER', 'FIRST_AIDER', 'SAFETY_OFFICER'
)
)
);

-- ///////// INCIDENTS ////////////////

create type incident_type as enum (
'MEDICAL',
'FIRE',
'POLICE',
'TRAFFIC',
'DISASTER',
'OTHER'
);

create type incident_status as enum (
'WAITING_FOR_RESPONSE',
'ACCEPTED',
'EN_ROUTE',
'ON_SCENE',
'RESOLVED',
'CANCELLED',
'FALSE_REPORT'
);

create type priority_level as enum (
'LOW',
'MEDIUM',
'HIGH',
'CRITICAL'
);

create table incidents (
incident_id text primary key,

type incident_type not null,
priority priority_level not null default 'MEDIUM',
status incident_status not null default 'WAITING_FOR_RESPONSE',
image_url TEXT,

location geography(Point, 4326) not null,

title text not null,
description text,
address TEXT,
landmark TEXT,

reporter_id uuid references users(id) on delete set null,

scene_commander_id uuid references users(id) on delete set null,

reported_at timestamptz default now(),
accepted_at timestamptz,
en_route_at timestamptz,
arrived_at timestamptz,
onscene_at timestamptz,
canceled_at timestamptz,
false_report_at timestamptz,
resolved_at timestamptz,

is_silent boolean default false,
is_anonymous boolean default false,
is_verified boolean default false,
false_report_count integer default 0,

created_at timestamptz default now(),
updated_at timestamptz default now()
);

///// notification

CREATE TABLE public.notifications (
notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

user_id UUID NOT NULL REFERENCES users(id),

type VARCHAR(50) NOT NULL,
title VARCHAR(200) NOT NULL,
message TEXT NOT NULL,

data JSONB DEFAULT '{}'::jsonb,
is_read BOOLEAN DEFAULT FALSE,
priority VARCHAR(20) DEFAULT 'normal',

action_url TEXT,
action_required BOOLEAN DEFAULT FALSE,

expires_at TIMESTAMP WITH TIME ZONE,

created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
read_at TIMESTAMP WITH TIME ZONE,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

/// organization confi///

CREATE TABLE org_configs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id UUID NOT NULL REFERENCES organizations(id),
role VARCHAR(50) NOT NULL,
kilometer_radius integer default 3,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

////// get nearby incidentt for responder ////

CREATE OR REPLACE FUNCTION get_nearby_incidents_for_user(
target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
incidents JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_effective_user_id UUID;
v_member_location GEOGRAPHY(Point, 4326);
v_org_id UUID;
v_role VARCHAR(50);
v_radius_km INTEGER;
BEGIN
-- 1. Determine User ID
IF target_user_id IS NOT NULL THEN
v_effective_user_id := target_user_id;
ELSE
v_effective_user_id := auth.uid();
END IF;

IF v_effective_user_id IS NULL THEN
RAISE EXCEPTION 'User ID is required or must be authenticated';
END IF;

-- 2. Get Member Context (Location, Org, Role)
SELECT om.location, om.organization_id, om.org_role::VARCHAR
INTO v_member_location, v_org_id, v_role
FROM organization_members om
WHERE om.user_id = v_effective_user_id
LIMIT 1;

IF v_member_location IS NULL THEN
incidents := '[]'::jsonb;
RETURN NEXT;
RETURN;
END IF;

-- 3. Get Configured Radius
SELECT oc.kilometer_radius
INTO v_radius_km
FROM org_configs oc
WHERE oc.organization_id = v_org_id
AND oc.role = v_role
LIMIT 1;

IF v_radius_km IS NULL THEN
v_radius_km := 5; -- Default fallback
END IF;

-- 4. Build and Return JSON
RETURN QUERY
SELECT jsonb_agg(incident_data ORDER BY distance_meters ASC)
FROM (
SELECT
jsonb_build_object(
'incident_id', i.incident_id,
'type', i.type,
'priority', i.priority,
'status', i.status,

        -- Nested Location Object with Coordinates
        'location', jsonb_build_object(
          'address', i.address,
          'landmark', i.landmark,
          'coordinates', jsonb_build_object(
            'lat', ST_Y(i.location::geometry), -- Extract Latitude
            'lng', ST_X(i.location::geometry)  -- Extract Longitude
          )
        ),

        'title', i.title,
        'description', i.description,
        'reporter_id', i.reporter_id,
        'image_url', i.image_url,
        'reported_at', i.reported_at,

        -- Dynamic Status Logs Array (Fixed to exclude nulls)
        'status_logs', (
          SELECT jsonb_agg(entry)
          FROM (
            VALUES
              (CASE WHEN i.reported_at IS NOT NULL THEN jsonb_build_object('status', 'WAITING_FOR_RESPONSE', 'timestamp', i.reported_at) END),
              (CASE WHEN i.accepted_at IS NOT NULL THEN jsonb_build_object('status', 'ACCEPTED', 'timestamp', i.accepted_at) END),
              (CASE WHEN i.en_route_at IS NOT NULL THEN jsonb_build_object('status', 'EN_ROUTE', 'timestamp', i.en_route_at) END),
              (CASE WHEN i.arrived_at IS NOT NULL THEN jsonb_build_object('status', 'ON_SCENE', 'timestamp', i.arrived_at) END),
              (CASE WHEN i.canceled_at IS NOT NULL THEN jsonb_build_object('status', 'CANCELLED', 'timestamp', i.canceled_at) END),
              (CASE WHEN i.false_report_at IS NOT NULL THEN jsonb_build_object('status', 'FALSE_REPORT', 'timestamp', i.false_report_at) END),
              (CASE WHEN i.resolved_at IS NOT NULL THEN jsonb_build_object('status', 'RESOLVED', 'timestamp', i.resolved_at) END)
          ) AS t(entry)
          WHERE t.entry IS NOT NULL
        ),

        'is_silent', i.is_silent,
        'is_anonymous', i.is_anonymous,
        'is_verified', i.is_verified,
        'false_report_count', i.false_report_count,
        'created_at', i.created_at
      ) AS incident_data,
      ST_Distance(i.location, v_member_location) AS distance_meters
    FROM
      incidents i
    WHERE
      i.status NOT IN ('RESOLVED', 'FALSE_REPORT')
      AND ST_DWithin(i.location, v_member_location, v_radius_km * 1000)

) AS subquery;

END;

$$
;
$$
