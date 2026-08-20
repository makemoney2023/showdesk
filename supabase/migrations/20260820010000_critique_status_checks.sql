-- Align critique status / delivery_status with TypeScript unions.
ALTER TABLE public.critiques
  DROP CONSTRAINT IF EXISTS critiques_status_check;
ALTER TABLE public.critiques
  ADD CONSTRAINT critiques_status_check
  CHECK (status IN ('PROCESSING', 'PENDING_REVIEW', 'APPROVED', 'ERROR'));

ALTER TABLE public.critiques
  DROP CONSTRAINT IF EXISTS critiques_delivery_status_check;
ALTER TABLE public.critiques
  ADD CONSTRAINT critiques_delivery_status_check
  CHECK (delivery_status IN ('pending', 'sent', 'failed', 'blocked'));
