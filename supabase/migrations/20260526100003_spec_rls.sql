-- CredSys Phase 0 — Row Level Security
-- Based on PrebuiltAssets/migrations/002_rls.sql

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role::TEXT FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_startup_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT entity_id FROM user_profiles
  WHERE user_id = auth.uid() AND role = 'startup' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_evaluator_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT entity_id FROM user_profiles
  WHERE user_id = auth.uid() AND role = 'evaluator' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_accelerator_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT entity_id FROM user_profiles
  WHERE user_id = auth.uid() AND role = 'accelerator' LIMIT 1;
$$;

-- ============================================================
-- Enable RLS
-- ============================================================

ALTER TABLE startups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluators             ENABLE ROW LEVEL SECURITY;
ALTER TABLE accelerators           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_setup_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_startups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_evaluators ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cred_pages             ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- startups
-- ============================================================

CREATE POLICY "startups: own read"
  ON startups FOR SELECT
  USING (id = get_startup_id());

CREATE POLICY "startups: own update"
  ON startups FOR UPDATE
  USING (id = get_startup_id());

CREATE POLICY "startups: evaluator read"
  ON startups FOR SELECT
  USING (get_user_role() = 'evaluator');

CREATE POLICY "startups: accelerator read"
  ON startups FOR SELECT
  USING (get_user_role() = 'accelerator');

CREATE POLICY "startups: admin all"
  ON startups FOR ALL
  USING (get_user_role() = 'admin');

-- Service role bypass handled by Supabase automatically

-- ============================================================
-- evaluators
-- ============================================================

CREATE POLICY "evaluators: own read/update"
  ON evaluators FOR SELECT
  USING (id = get_evaluator_id());

CREATE POLICY "evaluators: own update"
  ON evaluators FOR UPDATE
  USING (id = get_evaluator_id());

CREATE POLICY "evaluators: admin all"
  ON evaluators FOR ALL
  USING (get_user_role() = 'admin');

-- ============================================================
-- accelerators
-- ============================================================

CREATE POLICY "accelerators: own read/update"
  ON accelerators FOR SELECT
  USING (id = get_accelerator_id());

CREATE POLICY "accelerators: own update"
  ON accelerators FOR UPDATE
  USING (id = get_accelerator_id());

CREATE POLICY "accelerators: admin all"
  ON accelerators FOR ALL
  USING (get_user_role() = 'admin');

-- ============================================================
-- user_profiles
-- ============================================================

CREATE POLICY "user_profiles: read own"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_profiles: insert own"
  ON user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles: admin all"
  ON user_profiles FOR ALL
  USING (get_user_role() = 'admin');

-- ============================================================
-- account_setup_tokens
-- ============================================================

-- Only service role can insert tokens (server-side intake)
-- Authenticated users can read token by value (to claim it)
CREATE POLICY "setup_tokens: read by email"
  ON account_setup_tokens FOR SELECT
  USING (true);  -- token value is secret; service role manages inserts

-- ============================================================
-- competitions
-- ============================================================

CREATE POLICY "competitions: public read active"
  ON competitions FOR SELECT
  USING (status IN ('active', 'scoring', 'completed'));

CREATE POLICY "competitions: draft read admin/accelerator"
  ON competitions FOR SELECT
  USING (
    status = 'draft' AND get_user_role() IN ('admin', 'accelerator')
  );

CREATE POLICY "competitions: admin all"
  ON competitions FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "competitions: accelerator insert"
  ON competitions FOR INSERT
  WITH CHECK (get_user_role() = 'accelerator');

-- ============================================================
-- accreditation_requests
-- ============================================================

CREATE POLICY "requests: startup read own"
  ON accreditation_requests FOR SELECT
  USING (startup_id = get_startup_id());

CREATE POLICY "requests: startup insert"
  ON accreditation_requests FOR INSERT
  WITH CHECK (startup_id = get_startup_id());

CREATE POLICY "requests: evaluator read assigned"
  ON accreditation_requests FOR SELECT
  USING (evaluator_id = get_evaluator_id());

CREATE POLICY "requests: evaluator update assigned"
  ON accreditation_requests FOR UPDATE
  USING (evaluator_id = get_evaluator_id());

CREATE POLICY "requests: accelerator read competition"
  ON accreditation_requests FOR SELECT
  USING (
    get_user_role() = 'accelerator' AND
    competition_id IN (
      SELECT id FROM competitions WHERE accelerator_id = get_accelerator_id()
    )
  );

CREATE POLICY "requests: admin all"
  ON accreditation_requests FOR ALL
  USING (get_user_role() = 'admin');

-- ============================================================
-- competition_startups
-- ============================================================

CREATE POLICY "comp_startups: startup read own"
  ON competition_startups FOR SELECT
  USING (startup_id = get_startup_id());

CREATE POLICY "comp_startups: startup insert"
  ON competition_startups FOR INSERT
  WITH CHECK (startup_id = get_startup_id());

CREATE POLICY "comp_startups: evaluator read"
  ON competition_startups FOR SELECT
  USING (get_user_role() = 'evaluator');

CREATE POLICY "comp_startups: accelerator read own competition"
  ON competition_startups FOR SELECT
  USING (
    competition_id IN (
      SELECT id FROM competitions WHERE accelerator_id = get_accelerator_id()
    )
  );

CREATE POLICY "comp_startups: admin all"
  ON competition_startups FOR ALL
  USING (get_user_role() = 'admin');

-- ============================================================
-- competition_evaluators
-- ============================================================

CREATE POLICY "comp_evaluators: evaluator read own"
  ON competition_evaluators FOR SELECT
  USING (evaluator_id = get_evaluator_id());

CREATE POLICY "comp_evaluators: admin all"
  ON competition_evaluators FOR ALL
  USING (get_user_role() = 'admin');

-- ============================================================
-- competition_scores
-- ============================================================

CREATE POLICY "scores: evaluator read/insert own"
  ON competition_scores FOR SELECT
  USING (evaluator_id = get_evaluator_id());

CREATE POLICY "scores: evaluator insert"
  ON competition_scores FOR INSERT
  WITH CHECK (evaluator_id = get_evaluator_id());

CREATE POLICY "scores: startup read own"
  ON competition_scores FOR SELECT
  USING (startup_id = get_startup_id());

CREATE POLICY "scores: accelerator read competition"
  ON competition_scores FOR SELECT
  USING (
    competition_id IN (
      SELECT id FROM competitions WHERE accelerator_id = get_accelerator_id()
    )
  );

CREATE POLICY "scores: admin all"
  ON competition_scores FOR ALL
  USING (get_user_role() = 'admin');

-- ============================================================
-- cred_pages (public)
-- ============================================================

CREATE POLICY "cred_pages: public read active"
  ON cred_pages FOR SELECT
  USING (is_active = true);

CREATE POLICY "cred_pages: startup read own"
  ON cred_pages FOR SELECT
  USING (startup_id = get_startup_id());

CREATE POLICY "cred_pages: admin all"
  ON cred_pages FOR ALL
  USING (get_user_role() = 'admin');
