-- Prevent duplicate accreditation_requests for the same startup (e.g. from a
-- double-clicked Submit on the apply form). Design: one accreditation_request
-- per startup, reused across status transitions — never recreated.

-- Clean up any pre-existing duplicates first (the constraint below would
-- otherwise fail to apply). For each startup_id with more than one request,
-- keep the one furthest along the workflow (ties broken by most recently
-- updated) and drop the rest.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY startup_id
      ORDER BY
        CASE status
          WHEN 'accredited'                 THEN 9
          WHEN 'verification_in_progress'   THEN 8
          WHEN 'ready_for_verification'     THEN 7
          WHEN 'implementation_in_progress' THEN 6
          WHEN 'chass1s_shared'             THEN 5
          WHEN 'meeting_scheduled'          THEN 4
          WHEN 'evaluator_assigned'         THEN 3
          WHEN 'pending_evaluator_assignment' THEN 2
          ELSE 1 -- rejected / expired
        END DESC,
        updated_at DESC
    ) AS rn
  FROM accreditation_requests
)
DELETE FROM accreditation_requests
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Idempotent: safe to re-run (e.g. if applied both via MCP and a later push).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accreditation_requests_startup_id_unique'
  ) THEN
    ALTER TABLE accreditation_requests
      ADD CONSTRAINT accreditation_requests_startup_id_unique UNIQUE (startup_id);
  END IF;
END $$;
