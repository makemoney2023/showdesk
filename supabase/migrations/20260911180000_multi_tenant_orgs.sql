-- Multi-tenant clubs: organizations, memberships, per-club state, and RLS.
-- Existing Blacksage data is assigned to the seeded blacksage org.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT organizations_slug_length CHECK (char_length(slug) BETWEEN 2 AND 48)
);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'secretary', 'steward')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX memberships_user_id_idx ON public.memberships (user_id);
CREATE INDEX memberships_org_id_idx ON public.memberships (org_id);

CREATE TABLE public.org_state (
  org_id uuid PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
  active_show_id text REFERENCES public.shows (id) ON DELETE SET NULL,
  store_lock_owner text,
  store_lock_until timestamptz
);

INSERT INTO public.organizations (id, name, slug, invite_code)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Blacksage Kennels',
  'blacksage',
  'BLACKSAGE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
);

ALTER TABLE public.shows
  ADD COLUMN org_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.shows
SET org_id = '11111111-1111-4111-8111-111111111111'
WHERE org_id IS NULL;

ALTER TABLE public.shows
  ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX shows_org_id_idx ON public.shows (org_id);

INSERT INTO public.org_state (org_id, active_show_id)
SELECT '11111111-1111-4111-8111-111111111111', active_show_id
FROM public.app_state
WHERE id = 1;

INSERT INTO public.memberships (org_id, user_id, role)
SELECT
  '11111111-1111-4111-8111-111111111111',
  id,
  'secretary'
FROM auth.users
ON CONFLICT (org_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id
  FROM public.memberships
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_org_member(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND org_id = check_org_id
  );
$$;

CREATE OR REPLACE FUNCTION private.is_org_desk_admin(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND org_id = check_org_id
      AND role IN ('owner', 'secretary')
  );
$$;

REVOKE ALL ON FUNCTION private.user_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_org_desk_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.user_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_desk_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.show_belongs_to_member(check_show_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shows s
    WHERE s.id = check_show_id
      AND private.is_org_member(s.org_id)
  );
$$;

REVOKE ALL ON FUNCTION private.show_belongs_to_member(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.show_belongs_to_member(text) TO authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organizations FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.memberships FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.org_state FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.organizations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.org_state TO authenticated;

CREATE POLICY organizations_select_member ON public.organizations
  FOR SELECT TO authenticated
  USING (private.is_org_member(id));

CREATE POLICY organizations_insert_authenticated ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY organizations_update_admin ON public.organizations
  FOR UPDATE TO authenticated
  USING (private.is_org_desk_admin(id))
  WITH CHECK (private.is_org_desk_admin(id));

CREATE POLICY memberships_select_own ON public.memberships
  FOR SELECT TO authenticated
  USING (private.is_org_member(org_id) OR user_id = auth.uid());

CREATE POLICY memberships_insert_self ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY org_state_member_all ON public.org_state
  FOR ALL TO authenticated
  USING (private.is_org_member(org_id))
  WITH CHECK (private.is_org_member(org_id));

DROP POLICY shows_authenticated_select ON public.shows;
DROP POLICY shows_authenticated_insert ON public.shows;
DROP POLICY shows_authenticated_update ON public.shows;
DROP POLICY shows_authenticated_delete ON public.shows;

CREATE POLICY shows_member_select ON public.shows
  FOR SELECT TO authenticated
  USING (private.is_org_member(org_id));
CREATE POLICY shows_member_insert ON public.shows
  FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(org_id));
CREATE POLICY shows_member_update ON public.shows
  FOR UPDATE TO authenticated
  USING (private.is_org_member(org_id))
  WITH CHECK (private.is_org_member(org_id));
CREATE POLICY shows_member_delete ON public.shows
  FOR DELETE TO authenticated
  USING (private.is_org_desk_admin(org_id));

DROP POLICY entries_authenticated_select ON public.entries;
DROP POLICY entries_authenticated_insert ON public.entries;
DROP POLICY entries_authenticated_update ON public.entries;
DROP POLICY entries_authenticated_delete ON public.entries;

CREATE POLICY entries_member_select ON public.entries
  FOR SELECT TO authenticated
  USING (private.show_belongs_to_member(show_id));
CREATE POLICY entries_member_insert ON public.entries
  FOR INSERT TO authenticated
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY entries_member_update ON public.entries
  FOR UPDATE TO authenticated
  USING (private.show_belongs_to_member(show_id))
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY entries_member_delete ON public.entries
  FOR DELETE TO authenticated
  USING (private.show_belongs_to_member(show_id));

DROP POLICY critiques_authenticated_select ON public.critiques;
DROP POLICY critiques_authenticated_insert ON public.critiques;
DROP POLICY critiques_authenticated_update ON public.critiques;
DROP POLICY critiques_authenticated_delete ON public.critiques;

CREATE POLICY critiques_member_select ON public.critiques
  FOR SELECT TO authenticated
  USING (private.show_belongs_to_member(show_id));
CREATE POLICY critiques_member_insert ON public.critiques
  FOR INSERT TO authenticated
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY critiques_member_update ON public.critiques
  FOR UPDATE TO authenticated
  USING (private.show_belongs_to_member(show_id))
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY critiques_member_delete ON public.critiques
  FOR DELETE TO authenticated
  USING (private.show_belongs_to_member(show_id));

DROP POLICY placements_authenticated_select ON public.placements;
DROP POLICY placements_authenticated_insert ON public.placements;
DROP POLICY placements_authenticated_update ON public.placements;
DROP POLICY placements_authenticated_delete ON public.placements;

CREATE POLICY placements_member_select ON public.placements
  FOR SELECT TO authenticated
  USING (private.show_belongs_to_member(show_id));
CREATE POLICY placements_member_insert ON public.placements
  FOR INSERT TO authenticated
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY placements_member_update ON public.placements
  FOR UPDATE TO authenticated
  USING (private.show_belongs_to_member(show_id))
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY placements_member_delete ON public.placements
  FOR DELETE TO authenticated
  USING (private.show_belongs_to_member(show_id));

DROP POLICY se_evaluations_authenticated_select ON public.se_evaluations;
DROP POLICY se_evaluations_authenticated_insert ON public.se_evaluations;
DROP POLICY se_evaluations_authenticated_update ON public.se_evaluations;
DROP POLICY se_evaluations_authenticated_delete ON public.se_evaluations;

CREATE POLICY se_evaluations_member_select ON public.se_evaluations
  FOR SELECT TO authenticated
  USING (private.show_belongs_to_member(show_id));
CREATE POLICY se_evaluations_member_insert ON public.se_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY se_evaluations_member_update ON public.se_evaluations
  FOR UPDATE TO authenticated
  USING (private.show_belongs_to_member(show_id))
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY se_evaluations_member_delete ON public.se_evaluations
  FOR DELETE TO authenticated
  USING (private.show_belongs_to_member(show_id));

DROP POLICY dog_documents_authenticated_select ON public.dog_documents;
DROP POLICY dog_documents_authenticated_insert ON public.dog_documents;
DROP POLICY dog_documents_authenticated_update ON public.dog_documents;
DROP POLICY dog_documents_authenticated_delete ON public.dog_documents;

CREATE POLICY dog_documents_member_select ON public.dog_documents
  FOR SELECT TO authenticated
  USING (private.show_belongs_to_member(show_id));
CREATE POLICY dog_documents_member_insert ON public.dog_documents
  FOR INSERT TO authenticated
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY dog_documents_member_update ON public.dog_documents
  FOR UPDATE TO authenticated
  USING (private.show_belongs_to_member(show_id))
  WITH CHECK (private.show_belongs_to_member(show_id));
CREATE POLICY dog_documents_member_delete ON public.dog_documents
  FOR DELETE TO authenticated
  USING (private.show_belongs_to_member(show_id));

-- Storage objects live at {show_id}/... — restrict to shows the user can see.
DROP POLICY critique_audio_authenticated_insert ON storage.objects;
DROP POLICY critique_audio_authenticated_select ON storage.objects;
DROP POLICY critique_audio_authenticated_update ON storage.objects;
DROP POLICY critique_audio_authenticated_delete ON storage.objects;

CREATE POLICY critique_audio_member_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'critique-audio'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY critique_audio_member_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'critique-audio'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY critique_audio_member_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'critique-audio'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'critique-audio'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY critique_audio_member_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'critique-audio'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );

DROP POLICY dog_photos_authenticated_insert ON storage.objects;
DROP POLICY dog_photos_authenticated_select ON storage.objects;
DROP POLICY dog_photos_authenticated_update ON storage.objects;
DROP POLICY dog_photos_authenticated_delete ON storage.objects;

CREATE POLICY dog_photos_member_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dog-photos'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY dog_photos_member_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dog-photos'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY dog_photos_member_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dog-photos'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'dog-photos'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY dog_photos_member_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'dog-photos'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );

DROP POLICY dog_documents_storage_insert ON storage.objects;
DROP POLICY dog_documents_storage_select ON storage.objects;
DROP POLICY dog_documents_storage_update ON storage.objects;
DROP POLICY dog_documents_storage_delete ON storage.objects;

CREATE POLICY dog_documents_storage_member_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dog-documents'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY dog_documents_storage_member_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dog-documents'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY dog_documents_storage_member_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dog-documents'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'dog-documents'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );
CREATE POLICY dog_documents_storage_member_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'dog-documents'
    AND private.show_belongs_to_member((storage.foldername(name))[1])
  );

CREATE OR REPLACE FUNCTION public.join_org_by_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE invite_code = upper(trim(p_code));

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'invalid invite code';
  END IF;

  INSERT INTO public.memberships (org_id, user_id, role)
  VALUES (v_org_id, auth.uid(), 'secretary')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  INSERT INTO public.org_state (org_id)
  VALUES (v_org_id)
  ON CONFLICT (org_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_org_by_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_org_by_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.lookup_org_by_slug(p_slug text)
RETURNS TABLE (id uuid, name text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.slug
  FROM public.organizations o
  WHERE o.slug = lower(trim(p_slug));
$$;

REVOKE ALL ON FUNCTION public.lookup_org_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_org_by_slug(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.acquire_org_store_lock(
  p_org_id uuid,
  p_owner text,
  p_ttl_ms integer
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.org_state (org_id)
  VALUES (p_org_id)
  ON CONFLICT (org_id) DO NOTHING;

  UPDATE public.org_state
  SET store_lock_owner = p_owner,
      store_lock_until = now() + make_interval(secs => p_ttl_ms / 1000.0)
  WHERE org_id = p_org_id
    AND (
      store_lock_owner IS NULL
      OR store_lock_until IS NULL
      OR store_lock_until < now()
      OR store_lock_owner = p_owner
    );
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_org_store_lock(
  p_org_id uuid,
  p_owner text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.org_state
  SET store_lock_owner = NULL,
      store_lock_until = NULL
  WHERE org_id = p_org_id
    AND store_lock_owner = p_owner;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_org_store_lock(uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_org_store_lock(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acquire_org_store_lock(uuid, text, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_org_store_lock(uuid, text)
  TO authenticated, service_role;
