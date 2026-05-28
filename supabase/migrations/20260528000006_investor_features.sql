-- Extend UserRole enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'investor';

-- investor_watchlist
CREATE TABLE public.investor_watchlist (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id              uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  startup_id               uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  added_at                 timestamptz NOT NULL DEFAULT now(),
  notify_on_accredited     boolean NOT NULL DEFAULT true,
  notify_on_evaluator_assigned boolean NOT NULL DEFAULT false,
  notify_on_status_change  boolean NOT NULL DEFAULT false,
  UNIQUE(investor_id, startup_id)
);
ALTER TABLE public.investor_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist_service_all" ON public.investor_watchlist USING (true) WITH CHECK (true);

-- accreditation_sponsorships
CREATE TABLE public.accreditation_sponsorships (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_type              text NOT NULL CHECK (sponsor_type IN ('investor', 'accelerator')),
  sponsor_investor_id       uuid REFERENCES public.investors(id) ON DELETE SET NULL,
  sponsor_accelerator_id    uuid REFERENCES public.accelerators(id) ON DELETE SET NULL,
  billing_contact_name      text NOT NULL,
  billing_contact_email     text NOT NULL,
  billing_contact_phone     text,
  billing_contact_address   text,
  startup_id                uuid REFERENCES public.startups(id) ON DELETE SET NULL,
  startup_name_input        text NOT NULL,
  startup_email_input       text NOT NULL,
  accreditation_request_id  uuid REFERENCES public.accreditation_requests(id) ON DELETE SET NULL,
  status                    text NOT NULL DEFAULT 'pending_startup_acceptance'
                              CHECK (status IN ('pending_startup_acceptance','accepted','declined','cancelled','completed')),
  accepted_at               timestamptz,
  declined_at               timestamptz,
  completed_at              timestamptz,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accreditation_sponsorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sponsorships_service_all" ON public.accreditation_sponsorships USING (true) WITH CHECK (true);
