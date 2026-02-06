-- RPC function to duplicate an estimate section'sitem (cabinet, length, accessory, or other)
-- This function can be extended later for duplicating sections, tasks, and estimates

CREATE OR REPLACE FUNCTION duplicate_section_item(
  p_table_name TEXT,
  p_item_id BIGINT,
  p_target_section_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id BIGINT;
  v_sql TEXT;
  v_columns TEXT;
  v_select_columns TEXT;
BEGIN
  -- Validate table name for security
  IF p_table_name NOT IN ('estimate_cabinets', 'estimate_accessories', 'estimate_lengths', 'estimate_other') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  -- Get all columns except id, created_at, updated_at, and est_section_id
  -- We'll set est_section_id to the target section
  SELECT 
    string_agg(column_name, ', ' ORDER BY ordinal_position),
    string_agg(
      CASE 
        WHEN column_name = 'est_section_id' THEN p_target_section_id::TEXT
        ELSE column_name 
      END, 
      ', ' 
      ORDER BY ordinal_position
    )
  INTO v_columns, v_select_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table_name
    AND column_name NOT IN ('id', 'created_at', 'updated_at');

  -- Build and execute dynamic SQL to duplicate the item
  v_sql := format(
    'INSERT INTO %I (%s) SELECT %s FROM %I WHERE id = %L RETURNING id',
    p_table_name,
    v_columns,
    v_select_columns,
    p_table_name,
    p_item_id
  );

  EXECUTE v_sql INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION duplicate_section_item(TEXT, BIGINT, BIGINT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION duplicate_section_item IS 'Duplicates an estimate section item (cabinet, length, accessory, or other) to a target section. Returns the new item ID.';
