-- The catalog contains three independent events: Friday Standard Evaluation,
-- Saturday conformation, and Sunday conformation. The same dog may have a
-- different armband on each day, so a placement pool is day + class + sex.

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS event_kind text,
  ADD COLUMN IF NOT EXISTS competition_day date,
  ADD COLUMN IF NOT EXISTS catalog_class text;

ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_event_kind_check;
ALTER TABLE public.entries
  ADD CONSTRAINT entries_event_kind_check
  CHECK (event_kind IS NULL OR event_kind IN ('se', 'conformation'));

-- Backfill the authoritative Summer 2026 catalog by armband. Generated show
-- ids are deliberately avoided; the published show name is the stable key.
WITH catalog AS (
  SELECT
    entry.show_id,
    entry.id,
    entry.armband,
    CASE
      WHEN entry.armband = ANY (ARRAY['1','2','3','4']) THEN 'se'
      ELSE 'conformation'
    END AS event_kind,
    CASE
      WHEN entry.armband = ANY (ARRAY['1','2','3','4']) THEN DATE '2026-09-04'
      WHEN entry.armband = ANY (ARRAY[
        '5','11','12','13','17','18','19','20','21','24','27','28','29',
        '32','33','38','41','42','45','46','49','50','51','55','56','58',
        '60','62','63','65','67','71'
      ]) THEN DATE '2026-09-05'
      WHEN entry.armband = ANY (ARRAY[
        '6','7','8','9','10','14','15','16','22','23','25','26','30','31',
        '34','35','36','37','39','40','43','44','47','48','52','53','54',
        '57','59','61','64','66','68','69','70'
      ]) THEN DATE '2026-09-06'
      ELSE NULL
    END AS competition_day,
    CASE
      WHEN entry.armband = ANY (ARRAY['1','2','3','4'])
        THEN 'standard-evaluation'
      WHEN entry.armband = ANY (ARRAY['40','41','42','43','44','49','50','52','53','54','55'])
        THEN 'puppy-i'
      WHEN entry.armband = ANY (ARRAY['45','46','47','48','56','60','68','69','70','71'])
        THEN 'puppy-ii'
      WHEN entry.armband = ANY (ARRAY['66','67'])
        THEN 'puppy-iii'
      WHEN entry.armband = ANY (ARRAY['57','59','61','62','63','64','65'])
        THEN 'youth-i'
      WHEN entry.armband = ANY (ARRAY['30','37','39','51','58'])
        THEN 'youth-ii'
      WHEN entry.armband = ANY (ARRAY['5','6','7','8','9','10','11','12','13','15','16','17','18','38'])
        THEN 'open'
      WHEN entry.armband = ANY (ARRAY['14','19','20','21','34','35','36'])
        THEN 'champion'
      WHEN entry.armband = ANY (ARRAY['22','29','31','32','33'])
        THEN 'working'
      WHEN entry.armband = ANY (ARRAY['23','24','25','26','27','28'])
        THEN 'veteran'
      ELSE NULL
    END AS catalog_class
  FROM public.entries AS entry
  JOIN public.shows AS show ON show.id = entry.show_id
  WHERE show.name = 'TNRK Sieger Show 2026'
)
UPDATE public.entries AS entry
SET event_kind = catalog.event_kind,
    competition_day = catalog.competition_day,
    catalog_class = catalog.catalog_class
FROM catalog
WHERE entry.id = catalog.id;

DO $$
DECLARE
  unmapped integer;
BEGIN
  SELECT count(*) INTO unmapped
  FROM public.entries AS entry
  JOIN public.shows AS show ON show.id = entry.show_id
  WHERE show.name = 'TNRK Sieger Show 2026'
    AND (
      entry.event_kind IS NULL OR
      entry.competition_day IS NULL OR
      entry.catalog_class IS NULL
    );
  IF unmapped > 0 THEN
    RAISE EXCEPTION 'Summer 2026 catalog has % unmapped entries', unmapped;
  END IF;
END;
$$;

ALTER TABLE public.placements
  ADD COLUMN IF NOT EXISTS competition_day date,
  ADD COLUMN IF NOT EXISTS catalog_class text;

UPDATE public.placements AS placement
SET competition_day = entry.competition_day,
    catalog_class = entry.catalog_class
FROM public.entries AS entry
WHERE entry.id = placement.entry_id;

-- Canonicalize every placement from its entry. This remains compatible with
-- the previous app, which does not send the new columns.
CREATE OR REPLACE FUNCTION public.sync_placement_division()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  entry_kind text;
BEGIN
  SELECT
    entry.show_id,
    entry.class_id,
    entry.sex,
    entry.competition_day,
    entry.catalog_class,
    entry.event_kind
  INTO
    NEW.show_id,
    NEW.class_id,
    NEW.sex,
    NEW.competition_day,
    NEW.catalog_class,
    entry_kind
  FROM public.entries AS entry
  WHERE entry.id = NEW.entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown placement entry: %', NEW.entry_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF entry_kind <> 'conformation' THEN
    RAISE EXCEPTION 'Placements require a conformation entry: %', NEW.entry_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.competition_day IS NULL OR NEW.catalog_class IS NULL THEN
    RAISE EXCEPTION 'Entry is missing catalog day/class: %', NEW.entry_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_placement_division() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_placement_division()
  FROM anon, authenticated;

DROP TRIGGER IF EXISTS placements_sync_division ON public.placements;
CREATE TRIGGER placements_sync_division
BEFORE INSERT OR UPDATE OF
  entry_id, show_id, class_id, sex, competition_day, catalog_class
ON public.placements
FOR EACH ROW
EXECUTE FUNCTION public.sync_placement_division();

ALTER TABLE public.placements
  ALTER COLUMN competition_day SET NOT NULL,
  ALTER COLUMN catalog_class SET NOT NULL;

DROP INDEX IF EXISTS public.placements_division_place_unique;
CREATE UNIQUE INDEX placements_day_division_place_unique
  ON public.placements (
    show_id,
    competition_day,
    catalog_class,
    sex,
    placement
  );

COMMENT ON COLUMN public.entries.event_kind IS
  'Catalog event: Standard Evaluation or conformation';
COMMENT ON COLUMN public.entries.competition_day IS
  'Published catalog date for this armband entry';
COMMENT ON COLUMN public.entries.catalog_class IS
  'Exact published class; includes Puppy III separately from Youth I';
