-- Persist app-level judge lists on shows and per-critique judge attribution.
-- Do not rewrite 20260818120000_showdesk_mvp.sql.

ALTER TABLE public.shows
  ADD COLUMN judges jsonb;

ALTER TABLE public.critiques
  ADD COLUMN judge text;
