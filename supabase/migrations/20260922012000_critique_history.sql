CREATE TABLE IF NOT EXISTS public.critique_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  critique_id text NOT NULL,
  show_id text NOT NULL,
  entry_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  snapshot jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS critique_history_critique_recorded_idx
  ON public.critique_history (critique_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS critique_history_entry_recorded_idx
  ON public.critique_history (show_id, entry_id, recorded_at DESC);

ALTER TABLE public.critique_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read critique history"
  ON public.critique_history;
CREATE POLICY "authenticated read critique history"
  ON public.critique_history
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.critique_history FROM anon;
GRANT SELECT ON public.critique_history TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_critique_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved public.critiques;
BEGIN
  IF TG_OP = 'INSERT' THEN
    saved := NEW;
  ELSE
    saved := OLD;
  END IF;
  INSERT INTO public.critique_history (
    critique_id,
    show_id,
    entry_id,
    action,
    snapshot
  )
  VALUES (
    saved.id,
    saved.show_id,
    saved.entry_id,
    lower(TG_OP),
    to_jsonb(saved)
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS archive_critique_changes ON public.critiques;
CREATE TRIGGER archive_critique_changes
AFTER INSERT OR UPDATE OR DELETE ON public.critiques
FOR EACH ROW EXECUTE FUNCTION public.archive_critique_change();
