-- Add include_door_pulls and include_drawer_pulls boolean columns
-- to estimate_sections and estimates tables.
--
-- Semantics:
--   NULL  = inherit from parent (section → estimate → team default behavior = include)
--   FALSE = explicitly exclude pulls (user chose "None")
--   TRUE  is never written; NULL already means "include"
--
-- Teams table does NOT get these columns because team defaults
-- always require a pull selection.

-- estimate_sections
ALTER TABLE estimate_sections
  ADD COLUMN IF NOT EXISTS include_door_pulls BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS include_drawer_pulls BOOLEAN DEFAULT NULL;

-- estimates (estimate-level defaults)
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS default_include_door_pulls BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_include_drawer_pulls BOOLEAN DEFAULT NULL;
