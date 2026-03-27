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
