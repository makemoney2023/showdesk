-- Store write lease lock.
--
-- sbUpdateStore is a read → mutate → apply cycle over PostgREST, which cannot
-- hold a session/advisory lock across calls. Concurrent desk + ringside writes
-- could each read the same snapshot and lose updates. These functions give the
-- app an atomic, self-expiring lease on the app_state singleton so writers
-- serialize; a crashed writer's lease expires on its own.

ALTER TABLE public.app_state
  ADD COLUMN store_lock_owner text,
  ADD COLUMN store_lock_until timestamptz;

CREATE OR REPLACE FUNCTION public.acquire_store_lock(
  p_owner text,
  p_ttl_ms integer
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- The UPDATE takes a row lock, so concurrent callers serialize here and
  -- exactly one of them matches the WHERE clause when the lease is free,
  -- expired, or already held by the same owner (re-entry).
  UPDATE public.app_state
  SET store_lock_owner = p_owner,
      store_lock_until = now() + make_interval(secs => p_ttl_ms / 1000.0)
  WHERE id = 1
    AND (
      store_lock_owner IS NULL
      OR store_lock_until IS NULL
      OR store_lock_until < now()
      OR store_lock_owner = p_owner
    );
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_store_lock(p_owner text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.app_state
  SET store_lock_owner = NULL,
      store_lock_until = NULL
  WHERE id = 1
    AND store_lock_owner = p_owner;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_store_lock(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_store_lock(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.acquire_store_lock(text, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_store_lock(text)
  TO authenticated, service_role;
