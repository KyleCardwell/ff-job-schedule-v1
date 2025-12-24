-- Migration: Add shop-built accessory support
-- Date: 2025-12-24
-- Description: Adds columns and constraints to support shop-built accessories that match room materials

-- Add new columns to accessories_catalog
ALTER TABLE public.accessories_catalog
  ADD COLUMN IF NOT EXISTS matches_room_material boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS material_waste_factor numeric(4, 2) DEFAULT 1.25,
--   ADD COLUMN IF NOT EXISTS notes text;

-- Update the type constraint to include shop_built
ALTER TABLE public.accessories_catalog 
  DROP CONSTRAINT IF EXISTS accessories_catalog_type_check;

ALTER TABLE public.accessories_catalog
  ADD CONSTRAINT accessories_catalog_type_check 
  CHECK (
    type = ANY (ARRAY[
      'glass'::text,
      'insert'::text,
      'hardware'::text,
      'shop_built'::text,
      'organizer'::text,
      'other'::text
    ])
  );

-- Update calculation_type constraint to include volume
ALTER TABLE public.accessories_catalog 
  DROP CONSTRAINT IF EXISTS accessories_catalog_calculation_type_check;

ALTER TABLE public.accessories_catalog
  ADD CONSTRAINT accessories_catalog_calculation_type_check 
  CHECK (
    calculation_type = ANY (ARRAY[
      'area'::text,
      'length'::text,
      'unit'::text,
      'perimeter'::text,
      'volume'::text
    ])
  );

-- Add comments for documentation
-- COMMENT ON COLUMN public.accessories_catalog.matches_room_material IS 
--   'When true, material cost is calculated using section face_mat and finish multipliers are applied to labor';
-- COMMENT ON COLUMN public.accessories_catalog.material_waste_factor IS 
--   'Waste factor for material calculation (default 1.25 = 25% waste)';
-- COMMENT ON COLUMN public.accessories_catalog.notes IS 
--   'Optional notes about the accessory item for internal reference';

-- Create index for filtering shop-built items
-- CREATE INDEX IF NOT EXISTS idx_accessories_catalog_matches_room_material 
--   ON public.accessories_catalog (matches_room_material) 
--   WHERE matches_room_material = true;
