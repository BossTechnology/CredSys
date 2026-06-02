-- Storage bucket for startup logos (public, 2 MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'startup-logos',
  'startup-logos',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Any authenticated user can upload
CREATE POLICY "authenticated can upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'startup-logos');

-- Authenticated users can replace their own logos
CREATE POLICY "authenticated can update logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'startup-logos');

-- Public read
CREATE POLICY "public can view logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'startup-logos');
