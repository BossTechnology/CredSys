-- ============================================================
-- Phase 7 — Deadline Tracking
-- Adds e10_sent flag so the cron job won't send duplicate
-- deadline-warning emails for the same request.
-- ============================================================

ALTER TABLE accreditation_requests
  ADD COLUMN IF NOT EXISTS e10_sent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN accreditation_requests.e10_sent
  IS 'True once the deadline-warning email (E10) has been dispatched for this request.';
