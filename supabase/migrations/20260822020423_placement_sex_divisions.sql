-- A competition division is ADRK age class + sex. Keep both snapshots on a
-- placement so Postgres can enforce one Place 1–4 per division.
ALTER TABLE public.placements
  ADD COLUMN IF NOT EXISTS sex text;

CREATE OR REPLACE FUNCTION public.sync_placement_division()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  SELECT entry.show_id, entry.class_id, entry.sex
  INTO NEW.show_id, NEW.class_id, NEW.sex
  FROM public.entries AS entry
  WHERE entry.id = NEW.entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown placement entry: %', NEW.entry_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_placement_division() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_placement_division() FROM anon, authenticated;

DROP TRIGGER IF EXISTS placements_sync_division ON public.placements;
CREATE TRIGGER placements_sync_division
BEFORE INSERT OR UPDATE OF entry_id, show_id, class_id, sex
ON public.placements
FOR EACH ROW
EXECUTE FUNCTION public.sync_placement_division();

UPDATE public.placements AS placement
SET sex = entry.sex,
    class_id = entry.class_id,
    show_id = entry.show_id
FROM public.entries AS entry
WHERE entry.id = placement.entry_id;

ALTER TABLE public.placements
  DROP CONSTRAINT IF EXISTS placements_sex_check;
ALTER TABLE public.placements
  ADD CONSTRAINT placements_sex_check CHECK (sex IN ('R', 'H'));
ALTER TABLE public.placements
  ALTER COLUMN sex SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS placements_division_place_unique
  ON public.placements (show_id, class_id, sex, placement);

-- A dog moved to another class or sex must be placed again in that division.
CREATE OR REPLACE FUNCTION public.clear_placement_on_division_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.placements WHERE entry_id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_placement_on_division_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_placement_on_division_change()
  FROM anon, authenticated;

DROP TRIGGER IF EXISTS entries_clear_changed_division_placement
  ON public.entries;
CREATE TRIGGER entries_clear_changed_division_placement
AFTER UPDATE OF class_id, sex
ON public.entries
FOR EACH ROW
WHEN (OLD.class_id IS DISTINCT FROM NEW.class_id OR OLD.sex IS DISTINCT FROM NEW.sex)
EXECUTE FUNCTION public.clear_placement_on_division_change();
