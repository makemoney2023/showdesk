-- Link SE + Sat/Sun appearances of the same dog, add identity/health fields,
-- and store optional public clearance documents.

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS dog_id text,
  ADD COLUMN IF NOT EXISTS date_of_birth text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prefix_titles text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS suffix_titles text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS microchip text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS registration_club text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS co_owner text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS kennel_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS health jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.entries
SET date_of_birth = wt
WHERE date_of_birth = '' AND wt ~ '^\d{4}-\d{2}-\d{2}$';

-- Group existing rows that share a registration number, else keep one id per row.
UPDATE public.entries AS entry
SET dog_id = grouped.dog_id
FROM (
  SELECT
    id,
    CASE
      WHEN nullif(trim(zb_number), '') IS NOT NULL THEN
        'dog-' || show_id || '-' || lower(replace(trim(zb_number), ' ', ''))
      ELSE id
    END AS dog_id
  FROM public.entries
) AS grouped
WHERE entry.id = grouped.id
  AND entry.dog_id IS NULL;

CREATE INDEX IF NOT EXISTS entries_show_id_dog_id_idx
  ON public.entries (show_id, dog_id);

CREATE TABLE IF NOT EXISTS public.dog_documents (
  id text PRIMARY KEY,
  show_id text NOT NULL REFERENCES public.shows (id) ON DELETE CASCADE,
  dog_id text NOT NULL,
  path text NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dog_documents_show_id_dog_id_idx
  ON public.dog_documents (show_id, dog_id);

ALTER TABLE public.dog_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.dog_documents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dog_documents TO authenticated;

CREATE POLICY dog_documents_authenticated_select ON public.dog_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY dog_documents_authenticated_insert ON public.dog_documents
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY dog_documents_authenticated_update ON public.dog_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY dog_documents_authenticated_delete ON public.dog_documents
  FOR DELETE TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('dog-documents', 'dog-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY dog_documents_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dog-documents');
CREATE POLICY dog_documents_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dog-documents');
CREATE POLICY dog_documents_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'dog-documents')
  WITH CHECK (bucket_id = 'dog-documents');
CREATE POLICY dog_documents_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'dog-documents');
