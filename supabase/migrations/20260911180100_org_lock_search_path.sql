-- Harden multi-tenant helpers: fixed search_path on lock RPCs, and stop
-- exposing club directory as an anonymous SECURITY DEFINER function.
-- Branded login now looks up slugs with the service-role client.

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

REVOKE ALL ON FUNCTION public.lookup_org_by_slug(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_org_by_slug(text) TO service_role;
