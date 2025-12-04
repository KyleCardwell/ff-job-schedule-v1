-- =====================================================
-- Migration: Add default columns to teams and estimates tables
-- Purpose: Implement three-tier defaults system (Team → Estimate → Section)
-- =====================================================

-- =====================================================
-- Part 1: Add default columns to TEAMS table
-- These columns are NOT NULL with sensible defaults
-- =====================================================

-- Add cabinet style (required, defaults to a common style - adjust ID as needed)
ALTER TABLE public.teams
ADD COLUMN default_cabinet_style_id bigint NOT NULL DEFAULT 1,
ADD CONSTRAINT teams_default_cabinet_style_id_fkey 
  FOREIGN KEY (default_cabinet_style_id) 
  REFERENCES cabinet_styles (id) 
  ON UPDATE CASCADE;

-- Add material columns (adjust defaults to match your common material IDs)
ALTER TABLE public.teams
ADD COLUMN default_box_mat bigint NOT NULL DEFAULT 1,
ADD COLUMN default_face_mat bigint NOT NULL DEFAULT 1,
ADD COLUMN default_drawer_box_mat bigint NOT NULL DEFAULT 1,
ADD CONSTRAINT teams_default_box_mat_fkey 
  FOREIGN KEY (default_box_mat) 
  REFERENCES wood_catalog (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT teams_default_face_mat_fkey 
  FOREIGN KEY (default_face_mat) 
  REFERENCES wood_catalog (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT teams_default_drawer_box_mat_fkey 
  FOREIGN KEY (default_drawer_box_mat) 
  REFERENCES drawer_wood_catalog (id) 
  ON UPDATE CASCADE;

-- Add hardware columns (adjust defaults to match your common hardware IDs)
ALTER TABLE public.teams
ADD COLUMN default_hinge_id bigint NOT NULL DEFAULT 1,
ADD COLUMN default_slide_id bigint NOT NULL DEFAULT 1,
ADD COLUMN default_door_pull_id bigint NOT NULL DEFAULT 1,
ADD COLUMN default_drawer_pull_id bigint NOT NULL DEFAULT 1,
ADD CONSTRAINT teams_default_hinge_id_fkey 
  FOREIGN KEY (default_hinge_id) 
  REFERENCES hardware_hinges (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT teams_default_slide_id_fkey 
  FOREIGN KEY (default_slide_id) 
  REFERENCES hardware_slides (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT teams_default_door_pull_id_fkey 
  FOREIGN KEY (default_door_pull_id) 
  REFERENCES hardware_pulls (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT teams_default_drawer_pull_id_fkey 
  FOREIGN KEY (default_drawer_pull_id) 
  REFERENCES hardware_pulls (id) 
  ON UPDATE CASCADE;

-- Add finish arrays (empty arrays as default, teams should set these)
ALTER TABLE public.teams
ADD COLUMN default_face_finish bigint[] NOT NULL DEFAULT '{}',
ADD COLUMN default_box_finish bigint[] NOT NULL DEFAULT '{}';

-- Add boolean flags for molding and reeded panels
ALTER TABLE public.teams
ADD COLUMN default_door_inside_molding boolean NOT NULL DEFAULT false,
ADD COLUMN default_door_outside_molding boolean NOT NULL DEFAULT false,
ADD COLUMN default_drawer_inside_molding boolean NOT NULL DEFAULT false,
ADD COLUMN default_drawer_outside_molding boolean NOT NULL DEFAULT false,
ADD COLUMN default_door_reeded_panel boolean NOT NULL DEFAULT false,
ADD COLUMN default_drawer_reeded_panel boolean NOT NULL DEFAULT false;

-- Add door and drawer style text fields
ALTER TABLE public.teams
ADD COLUMN default_door_style text NOT NULL DEFAULT 'slab_hardwood',
ADD COLUMN default_drawer_front_style text NOT NULL DEFAULT 'slab_hardwood';

COMMENT ON COLUMN public.teams.default_cabinet_style_id IS 'Default cabinet style for all estimates in this team';
COMMENT ON COLUMN public.teams.default_door_style IS 'Default door style (e.g., slab_hardwood, 5_piece_hardwood)';
COMMENT ON COLUMN public.teams.default_drawer_front_style IS 'Default drawer front style';

-- =====================================================
-- Part 2: Add default columns to ESTIMATES table
-- These columns are NULLABLE to allow fallback to team defaults
-- =====================================================

ALTER TABLE public.estimates
ADD COLUMN default_cabinet_style_id bigint NULL,
ADD COLUMN default_box_mat bigint NULL,
ADD COLUMN default_face_mat bigint NULL,
ADD COLUMN default_drawer_box_mat bigint NULL,
ADD COLUMN default_hinge_id bigint NULL,
ADD COLUMN default_slide_id bigint NULL,
ADD COLUMN default_door_pull_id bigint NULL,
ADD COLUMN default_drawer_pull_id bigint NULL,
ADD COLUMN default_face_finish bigint[] NULL,
ADD COLUMN default_box_finish bigint[] NULL,
ADD COLUMN default_door_inside_molding boolean NULL,
ADD COLUMN default_door_outside_molding boolean NULL,
ADD COLUMN default_drawer_inside_molding boolean NULL,
ADD COLUMN default_drawer_outside_molding boolean NULL,
ADD COLUMN default_door_reeded_panel boolean NULL,
ADD COLUMN default_drawer_reeded_panel boolean NULL,
ADD COLUMN default_door_style text NULL,
ADD COLUMN default_drawer_front_style text NULL;

-- Add foreign key constraints for estimates
ALTER TABLE public.estimates
ADD CONSTRAINT estimates_default_cabinet_style_id_fkey 
  FOREIGN KEY (default_cabinet_style_id) 
  REFERENCES cabinet_styles (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT estimates_default_box_mat_fkey 
  FOREIGN KEY (default_box_mat) 
  REFERENCES wood_catalog (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT estimates_default_face_mat_fkey 
  FOREIGN KEY (default_face_mat) 
  REFERENCES wood_catalog (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT estimates_default_drawer_box_mat_fkey 
  FOREIGN KEY (default_drawer_box_mat) 
  REFERENCES drawer_wood_catalog (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT estimates_default_hinge_id_fkey 
  FOREIGN KEY (default_hinge_id) 
  REFERENCES hardware_hinges (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT estimates_default_slide_id_fkey 
  FOREIGN KEY (default_slide_id) 
  REFERENCES hardware_slides (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT estimates_default_door_pull_id_fkey 
  FOREIGN KEY (default_door_pull_id) 
  REFERENCES hardware_pulls (id) 
  ON UPDATE CASCADE,
ADD CONSTRAINT estimates_default_drawer_pull_id_fkey 
  FOREIGN KEY (default_drawer_pull_id) 
  REFERENCES hardware_pulls (id) 
  ON UPDATE CASCADE;

COMMENT ON COLUMN public.estimates.default_cabinet_style_id IS 'Estimate-specific default cabinet style (NULL = use team default)';

-- =====================================================
-- Part 3: Data Migration (Optional)
-- Migrate existing estimates_default JSONB to new columns if needed
-- =====================================================

-- Example: If you want to migrate existing data from estimates_default JSONB
-- UPDATE public.teams
-- SET 
--   default_door_style = COALESCE((estimates_default->>'doorStyle')::text, default_door_style),
--   default_drawer_front_style = COALESCE((estimates_default->>'drawerFrontStyle')::text, default_drawer_front_style),
--   default_door_inside_molding = COALESCE((estimates_default->>'doorInsideMolding')::boolean, default_door_inside_molding),
--   default_door_outside_molding = COALESCE((estimates_default->>'doorOutsideMolding')::boolean, default_door_outside_molding),
--   default_drawer_inside_molding = COALESCE((estimates_default->>'drawerInsideMolding')::boolean, default_drawer_inside_molding),
--   default_drawer_outside_molding = COALESCE((estimates_default->>'drawerOutsideMolding')::boolean, default_drawer_outside_molding)
-- WHERE estimates_default IS NOT NULL;

-- =====================================================
-- Part 4: (Optional) Drop old estimates_default JSONB column once migration is complete
-- =====================================================
ALTER TABLE public.teams DROP COLUMN IF EXISTS estimates_default;
