CREATE TABLE public.investors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name          text NOT NULL,
  email             text NOT NULL UNIQUE,
  contact_person    text,
  phone_whatsapp    text,
  website           text,
  investment_focus  text,
  country           text,
  description       text,
  is_active         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investors_service_all" ON public.investors USING (true) WITH CHECK (true);
