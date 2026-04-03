-- RPC function to duplicate an estimate and selected sections into a new estimate version

DROP FUNCTION IF EXISTS duplicate_estimate(BIGINT, BIGINT[]);

CREATE OR REPLACE FUNCTION duplicate_estimate(
  p_source_estimate_id BIGINT,
  p_selected_section_ids BIGINT[] DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_source_estimate estimates%ROWTYPE;
  v_new_estimate_id BIGINT;
  v_new_version NUMERIC;

  v_source_task RECORD;
  v_source_section RECORD;
  v_source_accessory RECORD;

  v_new_task_id BIGINT;
  v_new_section_id BIGINT;
  v_source_item_id BIGINT;
  v_new_item_id BIGINT;

  v_new_task_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_new_section_ids BIGINT[];
  v_old_cabinet_ids BIGINT[];
  v_new_cabinet_ids BIGINT[];
  v_new_length_ids BIGINT[];
  v_new_accessory_ids BIGINT[];
  v_new_other_ids BIGINT[];

  v_mapped_cabinet_id BIGINT;
  v_cabinet_pos INTEGER;

  v_section_columns TEXT;
  v_section_select_columns TEXT;
  v_sql TEXT;
BEGIN
  SELECT *
  INTO v_source_estimate
  FROM estimates
  WHERE estimate_id = p_source_estimate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source estimate not found: %', p_source_estimate_id;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_new_version
  FROM estimates
  WHERE est_project_id = v_source_estimate.est_project_id;

  INSERT INTO estimates (
    is_current,
    est_project_id,
    version,
    created_by,
    updated_by,
    updated_at,
    status,
    notes,
    tasks_order,
    default_cabinet_style_id,
    default_box_mat,
    default_face_mat,
    default_drawer_box_mat,
    default_hinge_id,
    default_slide_id,
    default_door_pull_id,
    default_drawer_pull_id,
    default_include_door_pulls,
    default_include_drawer_pulls,
    default_face_finish,
    default_box_finish,
    default_door_inside_molding,
    default_door_outside_molding,
    default_drawer_inside_molding,
    default_drawer_outside_molding,
    default_door_style,
    default_drawer_front_style,
    default_profit,
    default_commission,
    default_discount,
    line_items,
    default_service_price_overrides,
    parts_included,
    services_included,
    default_door_panel_mod_id,
    default_drawer_panel_mod_id,
    custom_notes,
    finalized_on,
    price_overrides,
    archived_at,
    default_horizontal_grain
  )
  VALUES (
    TRUE,
    v_source_estimate.est_project_id,
    v_new_version,
    auth.uid(),
    auth.uid(),
    NOW(),
    'draft',
    v_source_estimate.notes,
    NULL,
    v_source_estimate.default_cabinet_style_id,
    v_source_estimate.default_box_mat,
    v_source_estimate.default_face_mat,
    v_source_estimate.default_drawer_box_mat,
    v_source_estimate.default_hinge_id,
    v_source_estimate.default_slide_id,
    v_source_estimate.default_door_pull_id,
    v_source_estimate.default_drawer_pull_id,
    v_source_estimate.default_include_door_pulls,
    v_source_estimate.default_include_drawer_pulls,
    v_source_estimate.default_face_finish,
    v_source_estimate.default_box_finish,
    v_source_estimate.default_door_inside_molding,
    v_source_estimate.default_door_outside_molding,
    v_source_estimate.default_drawer_inside_molding,
    v_source_estimate.default_drawer_outside_molding,
    v_source_estimate.default_door_style,
    v_source_estimate.default_drawer_front_style,
    v_source_estimate.default_profit,
    v_source_estimate.default_commission,
    v_source_estimate.default_discount,
    COALESCE(v_source_estimate.line_items, '[]'::jsonb),
    v_source_estimate.default_service_price_overrides,
    v_source_estimate.parts_included,
    v_source_estimate.services_included,
    v_source_estimate.default_door_panel_mod_id,
    v_source_estimate.default_drawer_panel_mod_id,
    v_source_estimate.custom_notes,
    NULL,
    COALESCE(v_source_estimate.price_overrides, '{}'::jsonb),
    NULL,
    v_source_estimate.default_horizontal_grain
  )
  RETURNING estimate_id INTO v_new_estimate_id;

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
      'other_order'
    );

  FOR v_source_task IN
    SELECT et.*
    FROM estimate_tasks et
    WHERE et.estimate_id = p_source_estimate_id
    ORDER BY COALESCE(array_position(v_source_estimate.tasks_order, et.est_task_id), 99999), et.est_task_id
  LOOP
    v_new_task_id := NULL;

    FOR v_source_section IN
      SELECT es.*
      FROM estimate_sections es
      WHERE es.est_task_id = v_source_task.est_task_id
        AND (
          p_selected_section_ids IS NULL
          OR es.est_section_id = ANY(p_selected_section_ids)
        )
      ORDER BY COALESCE(array_position(v_source_task.sections_order, es.est_section_id), 99999), es.est_section_id
    LOOP
      IF v_new_task_id IS NULL THEN
        INSERT INTO estimate_tasks (
          estimate_id,
          est_task_name
        )
        VALUES (
          v_new_estimate_id,
          v_source_task.est_task_name
        )
        RETURNING est_task_id INTO v_new_task_id;

        v_new_task_ids := v_new_task_ids || v_new_task_id;

        DELETE FROM estimate_sections
        WHERE est_task_id = v_new_task_id;

        v_new_section_ids := ARRAY[]::BIGINT[];
      END IF;

      v_sql := format(
        'INSERT INTO estimate_sections (est_task_id, %s) ' ||
        'SELECT %L, %s FROM estimate_sections s WHERE s.est_section_id = %L ' ||
        'RETURNING est_section_id',
        v_section_columns,
        v_new_task_id,
        v_section_select_columns,
        v_source_section.est_section_id
      );

      EXECUTE v_sql INTO v_new_section_id;

      v_new_section_ids := v_new_section_ids || v_new_section_id;
      v_old_cabinet_ids := ARRAY[]::BIGINT[];
      v_new_cabinet_ids := ARRAY[]::BIGINT[];
      v_new_length_ids := ARRAY[]::BIGINT[];
      v_new_accessory_ids := ARRAY[]::BIGINT[];
      v_new_other_ids := ARRAY[]::BIGINT[];

      FOR v_source_item_id IN
        SELECT ec.id
        FROM estimate_cabinets ec
        WHERE ec.est_section_id = v_source_section.est_section_id
        ORDER BY COALESCE(array_position(v_source_section.cabinets_order, ec.id), 99999), ec.id
      LOOP
        SELECT duplicate_section_item('estimate_cabinets', v_source_item_id, v_new_section_id)
        INTO v_new_item_id;

        v_old_cabinet_ids := v_old_cabinet_ids || v_source_item_id;
        v_new_cabinet_ids := v_new_cabinet_ids || v_new_item_id;
      END LOOP;

      FOR v_source_item_id IN
        SELECT el.id
        FROM estimate_lengths el
        WHERE el.est_section_id = v_source_section.est_section_id
        ORDER BY COALESCE(array_position(v_source_section.lengths_order, el.id), 99999), el.id
      LOOP
        SELECT duplicate_section_item('estimate_lengths', v_source_item_id, v_new_section_id)
        INTO v_new_item_id;

        v_new_length_ids := v_new_length_ids || v_new_item_id;
      END LOOP;

      FOR v_source_accessory IN
        SELECT ea.id, ea.est_cabinet_id
        FROM estimate_accessories ea
        WHERE ea.est_section_id = v_source_section.est_section_id
        ORDER BY COALESCE(array_position(v_source_section.accessories_order, ea.id), 99999), ea.id
      LOOP
        SELECT duplicate_section_item('estimate_accessories', v_source_accessory.id, v_new_section_id)
        INTO v_new_item_id;

        IF v_source_accessory.est_cabinet_id IS NOT NULL THEN
          v_cabinet_pos := array_position(v_old_cabinet_ids, v_source_accessory.est_cabinet_id);

          IF v_cabinet_pos IS NOT NULL THEN
            v_mapped_cabinet_id := v_new_cabinet_ids[v_cabinet_pos];

            UPDATE estimate_accessories
            SET est_cabinet_id = v_mapped_cabinet_id
            WHERE id = v_new_item_id;
          ELSE
            UPDATE estimate_accessories
            SET est_cabinet_id = NULL
            WHERE id = v_new_item_id;
          END IF;
        END IF;

        v_new_accessory_ids := v_new_accessory_ids || v_new_item_id;
      END LOOP;

      FOR v_source_item_id IN
        SELECT eo.id
        FROM estimate_other eo
        WHERE eo.est_section_id = v_source_section.est_section_id
        ORDER BY COALESCE(array_position(v_source_section.other_order, eo.id), 99999), eo.id
      LOOP
        SELECT duplicate_section_item('estimate_other', v_source_item_id, v_new_section_id)
        INTO v_new_item_id;

        v_new_other_ids := v_new_other_ids || v_new_item_id;
      END LOOP;

      UPDATE estimate_sections
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
    END LOOP;

    IF v_new_task_id IS NOT NULL THEN
      UPDATE estimate_tasks
      SET sections_order = CASE
        WHEN array_length(v_new_section_ids, 1) IS NULL THEN NULL
        ELSE v_new_section_ids
      END
      WHERE est_task_id = v_new_task_id;
    END IF;
  END LOOP;

  IF array_length(v_new_task_ids, 1) IS NULL THEN
    DELETE FROM estimates WHERE estimate_id = v_new_estimate_id;
    RAISE EXCEPTION 'No sections found to duplicate for estimate %', p_source_estimate_id;
  END IF;

  UPDATE estimates
  SET tasks_order = v_new_task_ids
  WHERE estimate_id = v_new_estimate_id;

  UPDATE estimates
  SET is_current = FALSE
  WHERE est_project_id = v_source_estimate.est_project_id
    AND estimate_id <> v_new_estimate_id;

  RETURN v_new_estimate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION duplicate_estimate(BIGINT, BIGINT[]) TO authenticated;

COMMENT ON FUNCTION duplicate_estimate IS 'Duplicates an estimate into a new version. Optionally filters to selected section IDs while preserving task/section hierarchy and item order.';
