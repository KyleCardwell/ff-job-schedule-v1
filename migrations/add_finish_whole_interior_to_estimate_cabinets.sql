ALTER TABLE estimate_cabinets
  ADD COLUMN IF NOT EXISTS finish_whole_interior boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN estimate_cabinets.finish_whole_interior IS 'When true, fin_back material/finish overrides apply to whole interior + back; panel mod remains back-only.';
