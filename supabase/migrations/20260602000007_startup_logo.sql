-- Add logo_url to startups so startups can display their logo on the
-- public Verified Credential page.
ALTER TABLE startups ADD COLUMN IF NOT EXISTS logo_url TEXT;
