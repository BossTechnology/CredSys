-- CredSys Initial Schema — Part 1 Foundation
-- Supabase PostgreSQL with RLS

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('startup', 'evaluator', 'accelerator', 'admin');

CREATE TYPE accreditation_status AS ENUM (
  'draft',
  'submitted',
  'assigned',
  'interview',
  'implementing',
  'verifying',
  'accredited',
  'rejected',
  'expired'
);

CREATE TYPE competition_status AS ENUM ('draft', 'active', 'scoring', 'completed');

CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed');

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'startup',
  org_name TEXT NOT NULL,
  email TEXT NOT NULL,
  industry TEXT,
  country TEXT,
  website TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Startup profiles are auto-activated
CREATE OR REPLACE FUNCTION activate_startup_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.role = 'startup' THEN
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activate_startup
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION activate_startup_profile();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_role_active ON profiles(role, is_active);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- ACCREDITATION REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS accreditation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status accreditation_status NOT NULL DEFAULT 'submitted',

  -- Startup info snapshot
  startup_name TEXT NOT NULL,
  startup_email TEXT NOT NULL,
  startup_org_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'other',
  stage TEXT,
  country TEXT,
  website TEXT,
  description TEXT,
  problem TEXT,
  traction TEXT,
  demo_url TEXT,
  pitch_deck_url TEXT,
  team_size INT,
  additional_notes TEXT,

  -- Credential
  unique_code TEXT UNIQUE,
  accredited_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Tracking
  deadline TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON accreditation_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_requests_startup_id ON accreditation_requests(startup_id);
CREATE INDEX idx_requests_evaluator_id ON accreditation_requests(evaluator_id);
CREATE INDEX idx_requests_status ON accreditation_requests(status);
CREATE INDEX idx_requests_unassigned ON accreditation_requests(status, evaluator_id)
  WHERE evaluator_id IS NULL AND status = 'submitted';

-- RLS
ALTER TABLE accreditation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Startups can read own requests"
  ON accreditation_requests FOR SELECT
  USING (auth.uid() = startup_id);

CREATE POLICY "Startups can create requests"
  ON accreditation_requests FOR INSERT
  WITH CHECK (auth.uid() = startup_id);

CREATE POLICY "Evaluators can read their assignments"
  ON accreditation_requests FOR SELECT
  USING (auth.uid() = evaluator_id);

CREATE POLICY "Evaluators can update their assignments"
  ON accreditation_requests FOR UPDATE
  USING (auth.uid() = evaluator_id);

CREATE POLICY "Admins can manage all requests"
  ON accreditation_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- COMPETITIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  status competition_status NOT NULL DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active competitions"
  ON competitions FOR SELECT
  USING (status IN ('active', 'completed'));

CREATE POLICY "Admins can manage competitions"
  ON competitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- COMPETITION ENTRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS competition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  score NUMERIC(5,2),
  rank INT,
  submitted_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(competition_id, startup_id)
);

CREATE INDEX idx_entries_competition ON competition_entries(competition_id);
CREATE INDEX idx_entries_startup ON competition_entries(startup_id);

ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Startups can read own entries"
  ON competition_entries FOR SELECT
  USING (auth.uid() = startup_id);

CREATE POLICY "Evaluators can read/update their entries"
  ON competition_entries FOR SELECT
  USING (auth.uid() = evaluator_id);

CREATE POLICY "Evaluators can update scoring"
  ON competition_entries FOR UPDATE
  USING (auth.uid() = evaluator_id);

CREATE POLICY "Admins manage all entries"
  ON competition_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- EMAIL LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  template_code TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status email_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email logs"
  ON email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service role can insert (from server actions)
CREATE POLICY "Service role can insert logs"
  ON email_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- GRANT API ACCESS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON accreditation_requests TO authenticated;
GRANT SELECT ON competitions TO authenticated;
GRANT SELECT, INSERT ON competition_entries TO authenticated;
