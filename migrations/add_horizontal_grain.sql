-- =====================================================
-- Migration: Add horizontal_grain columns
-- Purpose: Add default_horizontal_grain to teams and estimates,
--          and horizontal_grain to estimate_sections.
--          Follows the same three-tier pattern as door_outside_molding.
-- =====================================================

-- Part 1: Teams table (NOT NULL, defaults to false)
ALTER TABLE public.teams
ADD COLUMN default_horizontal_grain boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.teams.default_horizontal_grain IS 'Team-level default for horizontal grain direction';

-- Part 2: Estimates table (NULLABLE, falls back to team default)
ALTER TABLE public.estimates
ADD COLUMN default_horizontal_grain boolean NULL;

COMMENT ON COLUMN public.estimates.default_horizontal_grain IS 'Estimate-specific default for horizontal grain (NULL = use team default)';

-- Part 3: Estimate sections table (NULLABLE, falls back to estimate/team default)
ALTER TABLE public.estimate_sections
ADD COLUMN horizontal_grain boolean NULL;

COMMENT ON COLUMN public.estimate_sections.horizontal_grain IS 'Section-specific horizontal grain (NULL = use estimate/team default)';
