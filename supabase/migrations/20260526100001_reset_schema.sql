-- CredSys Phase 0 — Reset old schema
-- Run this BEFORE 003_tables.sql

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Startups can read own requests" ON accreditation_requests;
DROP POLICY IF EXISTS "Startups can create requests" ON accreditation_requests;
DROP POLICY IF EXISTS "Evaluators can read their assignments" ON accreditation_requests;
DROP POLICY IF EXISTS "Evaluators can update their assignments" ON accreditation_requests;
DROP POLICY IF EXISTS "Admins can manage all requests" ON accreditation_requests;
DROP POLICY IF EXISTS "Anyone can read active competitions" ON competitions;
DROP POLICY IF EXISTS "Admins can manage competitions" ON competitions;
DROP POLICY IF EXISTS "Startups can read own entries" ON competition_entries;
DROP POLICY IF EXISTS "Evaluators can read/update their entries" ON competition_entries;
DROP POLICY IF EXISTS "Evaluators can update scoring" ON competition_entries;
DROP POLICY IF EXISTS "Admins manage all entries" ON competition_entries;
DROP POLICY IF EXISTS "Admins can read email logs" ON email_logs;
DROP POLICY IF EXISTS "Service role can insert logs" ON email_logs;

-- Drop old triggers
DROP TRIGGER IF EXISTS trg_activate_startup ON profiles;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS trg_requests_updated_at ON accreditation_requests;
DROP TRIGGER IF EXISTS trg_competitions_updated_at ON competitions;

-- Drop old functions
DROP FUNCTION IF EXISTS activate_startup_profile();
DROP FUNCTION IF EXISTS set_updated_at();

-- Drop old tables (order matters for FK constraints)
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS competition_entries CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS accreditation_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop old enum types
DROP TYPE IF EXISTS accreditation_status CASCADE;
DROP TYPE IF EXISTS competition_status CASCADE;
DROP TYPE IF EXISTS email_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
