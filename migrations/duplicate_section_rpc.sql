-- RPC function to duplicate an entire section with all its items
-- Duplicates cabinets, lengths, accessories, and other items

-- Drop the old function signature if it exists
DROP FUNCTION IF EXISTS duplicate_section(BIGINT, BIGINT, TEXT);

CREATE OR REPLACE FUNCTION duplicate_section(
  p_source_section_id BIGINT,
  p_target_task_id BIGINT,
  p_section_name TEXT DEFAULT NULL,
  p_target_section_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_section_id BIGINT;
  v_source_section RECORD;
  v_item_id BIGINT;
  v_new_item_id BIGINT;
BEGIN
  -- Get the source section data
  SELECT * INTO v_source_section
  FROM estimate_sections
  WHERE est_section_id = p_source_section_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source section not found: %', p_source_section_id;
  END IF;

  -- Use existing section if provided, otherwise create a new one
  IF p_target_section_id IS NOT NULL THEN
    v_new_section_id := p_target_section_id;
    
    -- Update the existing section with new name and add_hours if provided
    UPDATE estimate_sections
    SET 
      section_name = COALESCE(p_section_name, v_source_section.section_name),
      add_hours = v_source_section.add_hours
    WHERE est_section_id = v_new_section_id;
  ELSE
    -- Create a new section
    INSERT INTO estimate_sections (
      est_task_id,
      section_name,
      add_hours
    ) VALUES (
      p_target_task_id,
      COALESCE(p_section_name, v_source_section.section_name),
      v_source_section.add_hours
    )
    RETURNING est_section_id INTO v_new_section_id;
  END IF;

  -- Duplicate all cabinets using the duplicate_section_item RPC
  FOR v_item_id IN
    SELECT id FROM estimate_cabinets
    WHERE est_section_id = p_source_section_id
    ORDER BY id
  LOOP
    SELECT duplicate_section_item('estimate_cabinets', v_item_id, v_new_section_id)
    INTO v_new_item_id;
  END LOOP;

  -- Duplicate all lengths using the duplicate_section_item RPC
  FOR v_item_id IN
    SELECT id FROM estimate_lengths
    WHERE est_section_id = p_source_section_id
    ORDER BY id
  LOOP
    SELECT duplicate_section_item('estimate_lengths', v_item_id, v_new_section_id)
    INTO v_new_item_id;
  END LOOP;

  -- Duplicate all accessories using the duplicate_section_item RPC
  FOR v_item_id IN
    SELECT id FROM estimate_accessories
    WHERE est_section_id = p_source_section_id
    ORDER BY id
  LOOP
    SELECT duplicate_section_item('estimate_accessories', v_item_id, v_new_section_id)
    INTO v_new_item_id;
  END LOOP;

  -- Duplicate all other items using the duplicate_section_item RPC
  FOR v_item_id IN
    SELECT id FROM estimate_other
    WHERE est_section_id = p_source_section_id
    ORDER BY id
  LOOP
    SELECT duplicate_section_item('estimate_other', v_item_id, v_new_section_id)
    INTO v_new_item_id;
  END LOOP;

  -- Note: The database trigger will handle populating the order arrays
  -- as each item is inserted by duplicate_section_item

  RETURN v_new_section_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION duplicate_section(BIGINT, BIGINT, TEXT, BIGINT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION duplicate_section IS 'Duplicates an entire section with all its items (cabinets, lengths, accessories, other) to a target task. Optionally accepts a new section name and target section ID (to use existing section created by trigger).';
