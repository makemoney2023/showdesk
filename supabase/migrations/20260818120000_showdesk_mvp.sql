-- Show Desk MVP store (Approach 1 + A1 authenticated CRUD)
-- Project: emiwbvbytmfbonbnemli

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.shows (
  id text PRIMARY KEY,
  name text NOT NULL,
  date text NOT NULL,
  venue text NOT NULL,
  judge text NOT NULL,
  rulebook text NOT NULL CHECK (rulebook IN ('adrk', 'usrc', 'rkna', 'other')),
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_state (
  id integer PRIMARY KEY CHECK (id = 1),
  active_show_id text REFERENCES public.shows (id) ON DELETE SET NULL
);

CREATE TABLE public.entries (
  id text PRIMARY KEY,
  show_id text NOT NULL REFERENCES public.shows (id) ON DELETE CASCADE,
  armband text NOT NULL,
  dog_name text NOT NULL,
  zb_number text NOT NULL,
  wt text NOT NULL,
  owner text NOT NULL,
  email text NOT NULL,
  sex text NOT NULL CHECK (sex IN ('R', 'H')),
  class_id text NOT NULL
);

CREATE TABLE public.critiques (
  id text PRIMARY KEY,
  show_id text NOT NULL REFERENCES public.shows (id) ON DELETE CASCADE,
  entry_id text NOT NULL REFERENCES public.entries (id) ON DELETE CASCADE,
  status text NOT NULL,
  transcript text NOT NULL,
  draft jsonb NOT NULL,
  audio_path text,
  delivery_status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE TABLE public.placements (
  id text PRIMARY KEY,
  show_id text NOT NULL REFERENCES public.shows (id) ON DELETE CASCADE,
  entry_id text NOT NULL REFERENCES public.entries (id) ON DELETE CASCADE,
  class_id text NOT NULL,
  placement integer NOT NULL CHECK (placement BETWEEN 1 AND 4),
  UNIQUE (show_id, entry_id)
);

CREATE TABLE public.se_evaluations (
  id text PRIMARY KEY,
  show_id text NOT NULL REFERENCES public.shows (id) ON DELETE CASCADE,
  entry_id text NOT NULL REFERENCES public.entries (id) ON DELETE CASCADE,
  form jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (show_id, entry_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX entries_show_id_idx ON public.entries (show_id);
CREATE INDEX critiques_show_id_idx ON public.critiques (show_id);
CREATE INDEX critiques_show_id_entry_id_idx ON public.critiques (show_id, entry_id);
CREATE INDEX placements_show_id_idx ON public.placements (show_id);
CREATE INDEX se_evaluations_show_id_idx ON public.se_evaluations (show_id);

-- ---------------------------------------------------------------------------
-- Seed singleton app_state
-- ---------------------------------------------------------------------------

INSERT INTO public.app_state (id, active_show_id) VALUES (1, NULL);

-- ---------------------------------------------------------------------------
-- RLS: A1 authenticated full CRUD; no anon access
-- ---------------------------------------------------------------------------

ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.se_evaluations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.shows FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.app_state FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.entries FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.critiques FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.placements FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.se_evaluations FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.critiques TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.placements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.se_evaluations TO authenticated;

CREATE POLICY shows_authenticated_select ON public.shows
  FOR SELECT TO authenticated USING (true);
CREATE POLICY shows_authenticated_insert ON public.shows
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY shows_authenticated_update ON public.shows
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY shows_authenticated_delete ON public.shows
  FOR DELETE TO authenticated USING (true);

CREATE POLICY app_state_authenticated_select ON public.app_state
  FOR SELECT TO authenticated USING (true);
CREATE POLICY app_state_authenticated_insert ON public.app_state
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY app_state_authenticated_update ON public.app_state
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY app_state_authenticated_delete ON public.app_state
  FOR DELETE TO authenticated USING (true);

CREATE POLICY entries_authenticated_select ON public.entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY entries_authenticated_insert ON public.entries
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY entries_authenticated_update ON public.entries
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY entries_authenticated_delete ON public.entries
  FOR DELETE TO authenticated USING (true);

CREATE POLICY critiques_authenticated_select ON public.critiques
  FOR SELECT TO authenticated USING (true);
CREATE POLICY critiques_authenticated_insert ON public.critiques
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY critiques_authenticated_update ON public.critiques
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY critiques_authenticated_delete ON public.critiques
  FOR DELETE TO authenticated USING (true);

CREATE POLICY placements_authenticated_select ON public.placements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY placements_authenticated_insert ON public.placements
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY placements_authenticated_update ON public.placements
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY placements_authenticated_delete ON public.placements
  FOR DELETE TO authenticated USING (true);

CREATE POLICY se_evaluations_authenticated_select ON public.se_evaluations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY se_evaluations_authenticated_insert ON public.se_evaluations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY se_evaluations_authenticated_update ON public.se_evaluations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY se_evaluations_authenticated_delete ON public.se_evaluations
  FOR DELETE TO authenticated USING (true);
