-- RPC function to move an item to a different section
-- Simply updates the est_section_id field

CREATE OR REPLACE FUNCTION move_section_item(
  p_table_name TEXT,
  p_item_id BIGINT,
  p_target_section_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_sql TEXT;
  v_source_section_id BIGINT;
  v_order_column TEXT;
BEGIN
  -- Validate table name for security
  IF p_table_name NOT IN ('estimate_cabinets', 'estimate_accessories', 'estimate_lengths', 'estimate_other') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  -- Determine the order column name based on table
  v_order_column := CASE p_table_name
    WHEN 'estimate_cabinets' THEN 'cabinets_order'
    WHEN 'estimate_accessories' THEN 'accessories_order'
    WHEN 'estimate_lengths' THEN 'lengths_order'
    WHEN 'estimate_other' THEN 'other_order'
  END;

  -- Get the current section ID of the item
  v_sql := format('SELECT est_section_id FROM %I WHERE id = %L', p_table_name, p_item_id);
  EXECUTE v_sql INTO v_source_section_id;

  -- Remove item from source section's order array
  v_sql := format(
    'UPDATE estimate_sections SET %I = array_remove(%I, %L) WHERE est_section_id = %L',
    v_order_column,
    v_order_column,
    p_item_id,
    v_source_section_id
  );
  EXECUTE v_sql;

  -- Update the item's section ID
  v_sql := format(
    'UPDATE %I SET est_section_id = %L WHERE id = %L',
    p_table_name,
    p_target_section_id,
    p_item_id
  );
  EXECUTE v_sql;

  -- Add item to target section's order array
  v_sql := format(
    'UPDATE estimate_sections SET %I = COALESCE(%I, ARRAY[]::BIGINT[]) || %L::BIGINT WHERE est_section_id = %L',
    v_order_column,
    v_order_column,
    p_item_id,
    p_target_section_id
  );
  EXECUTE v_sql;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION move_section_item(TEXT, BIGINT, BIGINT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION move_section_item IS 'Moves an estimate section item to a different section by updating its est_section_id. The database trigger handles order array updates automatically.';
