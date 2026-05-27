-- CredSys Phase 0 — Spec Schema
-- Based on PrebuiltAssets/migrations/001_tables.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('startup', 'evaluator', 'accelerator', 'admin');

CREATE TYPE accreditation_status AS ENUM (
  'pending_evaluator_assignment',
  'evaluator_assigned',
  'meeting_scheduled',
  'chass1s_shared',
  'implementation_in_progress',
  'ready_for_verification',
  'verification_in_progress',
  'accredited',
  'rejected',
  'expired'
);

CREATE TYPE competition_status AS ENUM ('draft', 'active', 'scoring', 'completed');

-- ============================================================
-- SHARED TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- ENTITY TABLES
-- ============================================================

CREATE TABLE startups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name    TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  industry    TEXT,
  country     TEXT,
  website     TEXT,
  description TEXT,
  stage       TEXT,
  team_size   INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_startups_updated_at
  BEFORE UPDATE ON startups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_startups_email ON startups(email);

-- ----

CREATE TABLE evaluators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name        TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  industry        TEXT,  -- primary specialization
  country         TEXT,
  website         TEXT,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_evaluators_updated_at
  BEFORE UPDATE ON evaluators
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_evaluators_active ON evaluators(is_active);
CREATE INDEX idx_evaluators_industry ON evaluators(industry);

-- ----

CREATE TABLE accelerators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name    TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  industry    TEXT,
  country     TEXT,
  website     TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_accelerators_updated_at
  BEFORE UPDATE ON accelerators
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- USER PROFILES (auth bridge)
-- ============================================================

CREATE TABLE user_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       user_role NOT NULL,
  entity_id  UUID NOT NULL,  -- FK to startups, evaluators, or accelerators
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_entity_id ON user_profiles(entity_id);

-- ============================================================
-- ACCOUNT SETUP TOKENS
-- ============================================================

CREATE TABLE account_setup_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT NOT NULL UNIQUE DEFAULT (gen_random_uuid()::text || gen_random_uuid()::text),
  email      TEXT NOT NULL,
  role       user_role NOT NULL,
  entity_id  UUID NOT NULL,
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_setup_tokens_token ON account_setup_tokens(token);
CREATE INDEX idx_setup_tokens_email ON account_setup_tokens(email);

-- ============================================================
-- COMPETITIONS
-- ============================================================

CREATE TABLE competitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  industry        TEXT,
  status          competition_status NOT NULL DEFAULT 'draft',
  start_date      DATE,
  end_date        DATE,
  accelerator_id  UUID REFERENCES accelerators(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_accelerator ON competitions(accelerator_id);

-- ============================================================
-- ACCREDITATION REQUESTS
-- ============================================================

CREATE TABLE accreditation_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id     UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  evaluator_id   UUID REFERENCES evaluators(id) ON DELETE SET NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  status         accreditation_status NOT NULL DEFAULT 'pending_evaluator_assignment',

  -- Startup snapshot at time of submission
  startup_name      TEXT NOT NULL,
  startup_email     TEXT NOT NULL,
  industry          TEXT NOT NULL DEFAULT 'other',
  stage             TEXT,
  country           TEXT,
  website           TEXT,
  description       TEXT,
  problem           TEXT,
  traction          TEXT,
  demo_url          TEXT,
  pitch_deck_url    TEXT,
  team_size         INT,
  additional_notes  TEXT,

  -- BLIPS / ADDIS verification (JSONB checkboxes)
  blips_verification  JSONB NOT NULL DEFAULT '{}',
  addis_verification  JSONB NOT NULL DEFAULT '{}',

  -- Credential
  unique_code   TEXT UNIQUE,
  accredited_at TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,

  -- Email tracking flags
  e4_sent BOOLEAN NOT NULL DEFAULT false,
  e5_sent BOOLEAN NOT NULL DEFAULT false,

  -- Admin/evaluator notes
  evaluator_notes  TEXT,
  rejection_reason TEXT,
  notes            TEXT,

  -- Deadline
  deadline TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON accreditation_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_requests_startup_id ON accreditation_requests(startup_id);
CREATE INDEX idx_requests_evaluator_id ON accreditation_requests(evaluator_id);
CREATE INDEX idx_requests_status ON accreditation_requests(status);
CREATE INDEX idx_requests_unassigned ON accreditation_requests(status, evaluator_id)
  WHERE evaluator_id IS NULL AND status = 'pending_evaluator_assignment';
CREATE INDEX idx_requests_competition ON accreditation_requests(competition_id);

-- ============================================================
-- COMPETITION STARTUPS
-- ============================================================

CREATE TABLE competition_startups (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id            UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  startup_id                UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  accreditation_request_id  UUID REFERENCES accreditation_requests(id) ON DELETE SET NULL,
  entered_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(competition_id, startup_id)
);

CREATE INDEX idx_comp_startups_competition ON competition_startups(competition_id);
CREATE INDEX idx_comp_startups_startup ON competition_startups(startup_id);

-- ============================================================
-- COMPETITION EVALUATORS
-- ============================================================

CREATE TABLE competition_evaluators (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  evaluator_id   UUID NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(competition_id, evaluator_id)
);

CREATE INDEX idx_comp_evaluators_competition ON competition_evaluators(competition_id);
CREATE INDEX idx_comp_evaluators_evaluator ON competition_evaluators(evaluator_id);

-- ============================================================
-- COMPETITION SCORES
-- ============================================================

CREATE TABLE competition_scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  startup_id     UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  evaluator_id   UUID NOT NULL REFERENCES evaluators(id),
  score          NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  notes          TEXT,
  scored_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(competition_id, startup_id, evaluator_id)
);

CREATE INDEX idx_scores_competition ON competition_scores(competition_id);
CREATE INDEX idx_scores_startup ON competition_scores(startup_id);

-- ============================================================
-- CRED PAGES (public credential pages)
-- ============================================================

CREATE TABLE cred_pages (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id               UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  accreditation_request_id UUID NOT NULL REFERENCES accreditation_requests(id),
  unique_code              TEXT NOT NULL UNIQUE,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  accredited_at            TIMESTAMPTZ NOT NULL,
  expires_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_cred_pages_updated_at
  BEFORE UPDATE ON cred_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_cred_pages_unique_code ON cred_pages(unique_code);
CREATE INDEX idx_cred_pages_startup ON cred_pages(startup_id);
CREATE INDEX idx_cred_pages_active ON cred_pages(is_active);

-- ============================================================
-- GRANTS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON startups TO authenticated;
GRANT SELECT, INSERT, UPDATE ON evaluators TO authenticated;
GRANT SELECT, INSERT, UPDATE ON accelerators TO authenticated;
GRANT SELECT, INSERT ON user_profiles TO authenticated;
GRANT SELECT, INSERT ON account_setup_tokens TO authenticated;
GRANT SELECT ON competitions TO authenticated;
GRANT SELECT, INSERT ON competition_startups TO authenticated;
GRANT SELECT ON competition_evaluators TO authenticated;
GRANT SELECT, INSERT, UPDATE ON accreditation_requests TO authenticated;
GRANT SELECT, INSERT ON competition_scores TO authenticated;
GRANT SELECT ON cred_pages TO anon, authenticated;
