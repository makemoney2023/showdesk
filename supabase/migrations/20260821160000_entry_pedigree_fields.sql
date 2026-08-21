-- Catalog pedigree / SE seed fields on roster entries
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS sire text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dam text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS breeder text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hd_ed_jlpp text NOT NULL DEFAULT '';
