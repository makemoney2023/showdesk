-- Dog photos on roster entries (shared with SE form)
-- Object path: {show_id}/{entry_id}.{jpg|png|webp}

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS photo_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('dog-photos', 'dog-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY dog_photos_authenticated_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dog-photos');

CREATE POLICY dog_photos_authenticated_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dog-photos');

CREATE POLICY dog_photos_authenticated_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'dog-photos')
  WITH CHECK (bucket_id = 'dog-photos');

CREATE POLICY dog_photos_authenticated_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'dog-photos');
