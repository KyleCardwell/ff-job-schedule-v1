-- Add add_hours column to estimate_sections table
-- This column stores additional hours that can be added manually to the section
-- Format: { "service_id": hours, ... }
-- Example: { "2": 5.5, "3": 2.0, "4": 1.5 }

ALTER TABLE estimate_sections
ADD COLUMN add_hours JSONB DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN estimate_sections.add_hours IS 'Additional manual hours by service_id. Format: {"service_id": hours}';
