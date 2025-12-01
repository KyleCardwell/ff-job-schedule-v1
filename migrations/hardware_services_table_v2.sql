-- Create hardware_services junction table (IMPROVED VERSION)
-- Uses separate foreign key columns for better data integrity

CREATE TABLE IF NOT EXISTS hardware_services (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  
  -- Separate columns for each hardware type with foreign keys
  hardware_hinges_id BIGINT REFERENCES hardware_hinges(id) ON DELETE CASCADE,
  hardware_pulls_id BIGINT REFERENCES hardware_pulls(id) ON DELETE CASCADE,
  hardware_slides_id BIGINT REFERENCES hardware_slides(id) ON DELETE CASCADE,
  
  team_service_id BIGINT NOT NULL REFERENCES team_services(id) ON DELETE CASCADE,
  time_per_unit DECIMAL(10, 4) NOT NULL DEFAULT 0 CHECK (time_per_unit >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure exactly ONE hardware reference is set (exclusive arc constraint)
  CONSTRAINT hardware_services_one_hardware_check CHECK (
    (hardware_hinges_id IS NOT NULL)::int +
    (hardware_pulls_id IS NOT NULL)::int +
    (hardware_slides_id IS NOT NULL)::int = 1
  ),
  
  -- Ensure unique combination (only one of these will be non-null due to check above)
  CONSTRAINT hardware_services_unique_combination UNIQUE (
    hardware_hinges_id,
    hardware_pulls_id, 
    hardware_slides_id,
    team_service_id
  )
);
