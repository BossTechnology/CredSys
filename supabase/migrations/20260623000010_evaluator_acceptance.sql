-- Manual evaluator assignment + accept/decline
-- Adds an acceptance gate that is independent of the workflow status enum.

ALTER TABLE accreditation_requests
  ADD COLUMN IF NOT EXISTS acceptance_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS evaluator_decline_reason TEXT;

-- Backfill: any request already past the unassigned state must NOT show the
-- accept/decline panel, so mark existing in-flight/terminal requests accepted.
UPDATE accreditation_requests
   SET acceptance_status = 'accepted'
 WHERE status <> 'pending_evaluator_assignment';
