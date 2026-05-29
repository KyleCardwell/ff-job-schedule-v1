-- RPC function to create a new revision of an estimate section for change tracking

DROP FUNCTION IF EXISTS public.revise_section(BIGINT);

CREATE OR REPLACE FUNCTION public.revise_section(
  p_section_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_source_section estimate_sections%ROWTYPE;
  v_source_accessory RECORD;

  v_new_section_id BIGINT;
  v_next_revision INTEGER;
  v_source_item_id BIGINT;
  v_new_item_id BIGINT;

  v_old_cabinet_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_new_cabinet_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_new_length_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_new_accessory_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_new_other_ids BIGINT[] := ARRAY[]::BIGINT[];

  v_mapped_cabinet_id BIGINT;
  v_cabinet_pos INTEGER;

  v_section_columns TEXT;
  v_section_select_columns TEXT;
  v_sql TEXT;
BEGIN
  SELECT *
  INTO v_source_section
  FROM public.estimate_sections
  WHERE est_section_id = p_section_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source section not found: %', p_section_id;
  END IF;

  SELECT COALESCE(MAX(revision), 0) + 1
  INTO v_next_revision
  FROM public.estimate_sections
  WHERE section_lineage_id = v_source_section.section_lineage_id;

  SELECT
    string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position),
    string_agg(
      CASE
        WHEN column_name = 'scheduled_task_id' THEN 'NULL'
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

  v_sql := format(
    'INSERT INTO public.estimate_sections (est_task_id, section_lineage_id, revision, %s) ' ||
    'SELECT %L, %L, %L, %s FROM public.estimate_sections s WHERE s.est_section_id = %L ' ||
    'RETURNING est_section_id',
    v_section_columns,
    v_source_section.est_task_id,
    v_source_section.section_lineage_id,
    v_next_revision,
    v_section_select_columns,
    p_section_id
  );

  EXECUTE v_sql INTO v_new_section_id;

  FOR v_source_item_id IN
    SELECT ec.id
    FROM public.estimate_cabinets ec
    WHERE ec.est_section_id = p_section_id
    ORDER BY COALESCE(array_position(v_source_section.cabinets_order, ec.id), 99999), ec.id
  LOOP
    SELECT public.duplicate_section_item('estimate_cabinets', v_source_item_id, v_new_section_id)
    INTO v_new_item_id;

    v_old_cabinet_ids := v_old_cabinet_ids || v_source_item_id;
    v_new_cabinet_ids := v_new_cabinet_ids || v_new_item_id;
  END LOOP;

  FOR v_source_item_id IN
    SELECT el.id
    FROM public.estimate_lengths el
    WHERE el.est_section_id = p_section_id
    ORDER BY COALESCE(array_position(v_source_section.lengths_order, el.id), 99999), el.id
  LOOP
    SELECT public.duplicate_section_item('estimate_lengths', v_source_item_id, v_new_section_id)
    INTO v_new_item_id;

    v_new_length_ids := v_new_length_ids || v_new_item_id;
  END LOOP;

  FOR v_source_accessory IN
    SELECT ea.id, ea.est_cabinet_id
    FROM public.estimate_accessories ea
    WHERE ea.est_section_id = p_section_id
    ORDER BY COALESCE(array_position(v_source_section.accessories_order, ea.id), 99999), ea.id
  LOOP
    SELECT public.duplicate_section_item('estimate_accessories', v_source_accessory.id, v_new_section_id)
    INTO v_new_item_id;

    IF v_source_accessory.est_cabinet_id IS NOT NULL THEN
      v_cabinet_pos := array_position(v_old_cabinet_ids, v_source_accessory.est_cabinet_id);

      IF v_cabinet_pos IS NOT NULL THEN
        v_mapped_cabinet_id := v_new_cabinet_ids[v_cabinet_pos];

        UPDATE public.estimate_accessories
        SET est_cabinet_id = v_mapped_cabinet_id
        WHERE id = v_new_item_id;
      ELSE
        UPDATE public.estimate_accessories
        SET est_cabinet_id = NULL
        WHERE id = v_new_item_id;
      END IF;
    END IF;

    v_new_accessory_ids := v_new_accessory_ids || v_new_item_id;
  END LOOP;

  FOR v_source_item_id IN
    SELECT eo.id
    FROM public.estimate_other eo
    WHERE eo.est_section_id = p_section_id
    ORDER BY COALESCE(array_position(v_source_section.other_order, eo.id), 99999), eo.id
  LOOP
    SELECT public.duplicate_section_item('estimate_other', v_source_item_id, v_new_section_id)
    INTO v_new_item_id;

    v_new_other_ids := v_new_other_ids || v_new_item_id;
  END LOOP;

  UPDATE public.estimate_sections
  SET
    cabinets_order = CASE
      WHEN array_length(v_new_cabinet_ids, 1) IS NULL THEN NULL
      ELSE v_new_cabinet_ids
    END,
    lengths_order = CASE
      WHEN array_length(v_new_length_ids, 1) IS NULL THEN NULL
      ELSE v_new_length_ids
    END,
    accessories_order = CASE
      WHEN array_length(v_new_accessory_ids, 1) IS NULL THEN NULL
      ELSE v_new_accessory_ids
    END,
    other_order = CASE
      WHEN array_length(v_new_other_ids, 1) IS NULL THEN NULL
      ELSE v_new_other_ids
    END
  WHERE est_section_id = v_new_section_id;

  UPDATE public.estimate_tasks
  SET sections_order = CASE
    WHEN array_position(sections_order, p_section_id) IS NULL THEN sections_order
    ELSE array_replace(sections_order, p_section_id, v_new_section_id)
  END
  WHERE est_task_id = v_source_section.est_task_id;

  RETURN v_new_section_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revise_section(BIGINT) TO authenticated;

COMMENT ON FUNCTION public.revise_section(BIGINT) IS 'Creates a new revision of an estimate section for change tracking. Prior revisions remain stored but become inactive by being replaced in the parent task sections_order.';
