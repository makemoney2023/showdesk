-- Club approval gate for the public results archive.
ALTER TABLE public.shows
  ADD COLUMN IF NOT EXISTS results_published_at timestamptz;

COMMENT ON COLUMN public.shows.results_published_at IS
  'When set, approved critiques and placements for this show are visible on public /results pages.';
