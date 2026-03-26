-- RPC function to move selected estimate sections (rooms) to another draft estimate

DROP FUNCTION IF EXISTS move_estimate_sections(BIGINT, BIGINT, BIGINT[]);

CREATE OR REPLACE FUNCTION move_estimate_sections(
  p_source_estimate_id BIGINT,
  p_target_estimate_id BIGINT,
  p_selected_section_ids BIGINT[]
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_source_estimate estimates%ROWTYPE;
  v_target_estimate estimates%ROWTYPE;

  v_source_task RECORD;
  v_new_task_id BIGINT;
  v_moved_rows BIGINT;

  v_source_selected_section_ids BIGINT[];
  v_new_task_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_target_tasks_order BIGINT[];
  v_source_tasks_order BIGINT[];
  v_remaining_section_ids BIGINT[];
BEGIN
  IF p_selected_section_ids IS NULL OR array_length(p_selected_section_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No sections selected to move';
  END IF;

  IF p_source_estimate_id = p_target_estimate_id THEN
    RAISE EXCEPTION 'Source and target estimates must be different';
  END IF;

  SELECT *
  INTO v_source_estimate
  FROM estimates
  WHERE estimate_id = p_source_estimate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source estimate not found: %', p_source_estimate_id;
  END IF;

  SELECT *
  INTO v_target_estimate
  FROM estimates
  WHERE estimate_id = p_target_estimate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target estimate not found: %', p_target_estimate_id;
  END IF;

  IF v_target_estimate.status <> 'draft' THEN
    RAISE EXCEPTION 'Target estimate must have draft status';
  END IF;

  SELECT array_agg(es.est_section_id)
  INTO v_source_selected_section_ids
  FROM estimate_sections es
  JOIN estimate_tasks et ON et.est_task_id = es.est_task_id
  WHERE et.estimate_id = p_source_estimate_id
    AND es.est_section_id = ANY(p_selected_section_ids);

  IF array_length(v_source_selected_section_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No selected sections belong to source estimate %', p_source_estimate_id;
  END IF;

  FOR v_source_task IN
    SELECT et.*,
      COALESCE(array_position(v_source_estimate.tasks_order, et.est_task_id), 99999) AS task_order_rank
    FROM estimate_tasks et
    WHERE et.estimate_id = p_source_estimate_id
      AND EXISTS (
        SELECT 1
        FROM estimate_sections es
        WHERE es.est_task_id = et.est_task_id
          AND es.est_section_id = ANY(v_source_selected_section_ids)
      )
    ORDER BY task_order_rank, et.est_task_id
  LOOP
    INSERT INTO estimate_tasks (
      estimate_id,
      est_task_name
    )
    VALUES (
      p_target_estimate_id,
      v_source_task.est_task_name
    )
    RETURNING est_task_id INTO v_new_task_id;

    v_new_task_ids := v_new_task_ids || v_new_task_id;

    DELETE FROM estimate_sections
    WHERE est_task_id = v_new_task_id;

    UPDATE estimate_sections
    SET est_task_id = v_new_task_id
    WHERE est_task_id = v_source_task.est_task_id
      AND est_section_id = ANY(v_source_selected_section_ids);

    GET DIAGNOSTICS v_moved_rows = ROW_COUNT;

    IF v_moved_rows = 0 THEN
      RAISE EXCEPTION 'Failed to move selected sections from task %', v_source_task.est_task_id;
    END IF;

    UPDATE estimate_tasks
    SET sections_order = (
      SELECT array_agg(es.est_section_id ORDER BY COALESCE(array_position(v_source_task.sections_order, es.est_section_id), 99999), es.est_section_id)
      FROM estimate_sections es
      WHERE es.est_task_id = v_new_task_id
    )
    WHERE est_task_id = v_new_task_id;

    SELECT array_agg(es.est_section_id ORDER BY COALESCE(array_position(v_source_task.sections_order, es.est_section_id), 99999), es.est_section_id)
    INTO v_remaining_section_ids
    FROM estimate_sections es
    WHERE es.est_task_id = v_source_task.est_task_id;

    IF array_length(v_remaining_section_ids, 1) IS NULL THEN
      DELETE FROM estimate_tasks
      WHERE est_task_id = v_source_task.est_task_id;
    ELSE
      UPDATE estimate_tasks
      SET sections_order = v_remaining_section_ids
      WHERE est_task_id = v_source_task.est_task_id;
    END IF;
  END LOOP;

  SELECT array_agg(et.est_task_id ORDER BY
    CASE
      WHEN array_position(v_target_estimate.tasks_order, et.est_task_id) IS NOT NULL
        THEN array_position(v_target_estimate.tasks_order, et.est_task_id)
      WHEN array_position(v_new_task_ids, et.est_task_id) IS NOT NULL
        THEN 100000 + array_position(v_new_task_ids, et.est_task_id)
      ELSE 200000 + et.est_task_id
    END,
    et.est_task_id
  )
  INTO v_target_tasks_order
  FROM estimate_tasks et
  WHERE et.estimate_id = p_target_estimate_id;

  SELECT array_agg(et.est_task_id ORDER BY
    COALESCE(array_position(v_source_estimate.tasks_order, et.est_task_id), 99999),
    et.est_task_id
  )
  INTO v_source_tasks_order
  FROM estimate_tasks et
  WHERE et.estimate_id = p_source_estimate_id;

  UPDATE estimates
  SET tasks_order = v_target_tasks_order,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE estimate_id = p_target_estimate_id;

  UPDATE estimates
  SET tasks_order = v_source_tasks_order,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE estimate_id = p_source_estimate_id;

  RETURN array_length(v_source_selected_section_ids, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION move_estimate_sections(BIGINT, BIGINT, BIGINT[]) TO authenticated;

COMMENT ON FUNCTION move_estimate_sections IS 'Moves selected sections from a source estimate to a target draft estimate by creating corresponding tasks in the target and preserving section order.';
