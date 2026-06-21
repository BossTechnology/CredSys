-- Add rich BLIPS / ADDIS data columns to accreditation_requests
-- These replace the simple boolean-flag columns with full chassis-compatible structures.

ALTER TABLE accreditation_requests
  ADD COLUMN IF NOT EXISTS blips_data JSONB,
  ADD COLUMN IF NOT EXISTS addis_data JSONB;
