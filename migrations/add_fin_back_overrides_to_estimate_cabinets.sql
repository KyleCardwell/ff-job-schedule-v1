ALTER TABLE estimate_cabinets
  ADD COLUMN IF NOT EXISTS fin_back_mat bigint,
  ADD COLUMN IF NOT EXISTS fin_back_finish bigint[],
  ADD COLUMN IF NOT EXISTS fin_back_panel_mod bigint;

COMMENT ON COLUMN estimate_cabinets.fin_back_mat IS 'Material override for finished back panel. NULL = inherit section face_mat.';
COMMENT ON COLUMN estimate_cabinets.fin_back_finish IS 'Finish override for finished back panel. NULL = inherit section face_finish. Empty array = explicit None (unfinished).';
COMMENT ON COLUMN estimate_cabinets.fin_back_panel_mod IS 'Panel mod override for finished back panel. NULL = inherit section default door_panel_mod_id.';
