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
  v_section_columns TEXT;
  v_section_select_columns TEXT;
  v_sql TEXT;
BEGIN
  -- Get the source section data
  SELECT * INTO v_source_section
  FROM estimate_sections
  WHERE est_section_id = p_source_section_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source section not found: %', p_source_section_id;
  END IF;

  SELECT
    string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position),
    string_agg(
      CASE
        WHEN column_name = 'section_name'
          THEN format('COALESCE(%L, s.section_name)', p_section_name)
        ELSE format('s.%I', column_name)
      END,
      ', ' ORDER BY ordinal_position
    )
  INTO v_section_columns, v_section_select_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'estimate_sections'
    AND column_name NOT IN (
      'est_section_id',
      'est_task_id',
      'created_at',
      'updated_at',
      'cabinets_order',
      'lengths_order',
      'accessories_order',
      'other_order',
      'section_lineage_id',
      'revision'
    );

  -- Use existing section if provided, otherwise create a new one
  IF p_target_section_id IS NOT NULL THEN
    v_new_section_id := p_target_section_id;

    -- Copy all section-level fields from source into the existing target section
    v_sql := format(
      'UPDATE estimate_sections dst ' ||
      'SET (%s) = (' ||
      '  SELECT %s FROM estimate_sections s WHERE s.est_section_id = %L' ||
      ') ' ||
      'WHERE dst.est_section_id = %L',
      v_section_columns,
      v_section_select_columns,
      p_source_section_id,
      v_new_section_id
    );

    EXECUTE v_sql;
  ELSE
    -- Create a new section
    v_sql := format(
      'INSERT INTO estimate_sections (est_task_id, %s) ' ||
      'SELECT %L, %s FROM estimate_sections s WHERE s.est_section_id = %L ' ||
      'RETURNING est_section_id',
      v_section_columns,
      p_target_task_id,
      v_section_select_columns,
      p_source_section_id
    );

    EXECUTE v_sql INTO v_new_section_id;
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
