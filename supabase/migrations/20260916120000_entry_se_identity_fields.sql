-- SE catalog identity fields highlighted on the official TNRK evaluation form.
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS sire_reg text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dam_reg text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS handler text NOT NULL DEFAULT '';
