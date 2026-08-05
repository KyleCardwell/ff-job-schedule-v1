-- Read and atomically redistribute non-hours cost rows across completed tasks.

DROP FUNCTION IF EXISTS get_project_cost_distribution_data(BIGINT);

CREATE OR REPLACE FUNCTION get_project_cost_distribution_data(
  p_project_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_team_id UUID;
  v_tasks JSONB;
BEGIN
  SELECT p.team_id
  INTO v_team_id
  FROM projects p
  WHERE p.project_id = p_project_id
    AND EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.team_id = p.team_id
        AND tm.user_id = auth.uid()
    );

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Project % not found or not accessible', p_project_id;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'taskId', t.task_id,
        'taskNumber', t.task_number,
        'taskName', t.task_name,
        'financialsUpdatedAt', pf.financials_updated_at,
        'sections', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', section.key,
                'name', COALESCE(NULLIF(section.value->>'name', ''), section.key),
                'estimate', COALESCE(NULLIF(section.value->>'estimate', '')::NUMERIC, 0),
                'actualCost', COALESCE(NULLIF(section.value->>'actual_cost', '')::NUMERIC, 0),
                'rows',
                  CASE
                    WHEN jsonb_typeof(COALESCE(section.value->'data', '[]'::JSONB)) = 'array'
                    THEN COALESCE(section.value->'data', '[]'::JSONB)
                    ELSE '[]'::JSONB
                  END
              )
              ORDER BY section.key
            )
            FROM jsonb_each(COALESCE(pf.financial_data, '{}'::JSONB)) AS section(key, value)
            WHERE section.key NOT IN (
              'hours',
              'addToSubtotal',
              'profit',
              'commission',
              'discount',
              'rounding',
              'addToTotal'
            )
              AND jsonb_typeof(section.value) = 'object'
          ),
          '[]'::JSONB
        )
      )
      ORDER BY t.task_created_at, t.task_id
    ),
    '[]'::JSONB
  )
  INTO v_tasks
  FROM tasks t
  LEFT JOIN project_financials pf ON pf.task_id = t.task_id
  WHERE t.project_id = p_project_id
    AND t.task_completed_at IS NOT NULL;

  RETURN jsonb_build_object(
    'projectId', p_project_id,
    'tasks', v_tasks
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_project_cost_distribution_data(BIGINT) TO authenticated;

COMMENT ON FUNCTION get_project_cost_distribution_data IS
'Returns completed-task section rows for non-hours categories so users can preview and redistribute existing costs.';


DROP FUNCTION IF EXISTS apply_project_cost_distribution(BIGINT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION apply_project_cost_distribution(
  p_project_id BIGINT,
  p_category_id TEXT,
  p_task_updates JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_team_id UUID;
  v_task_update JSONB;
  v_task_id_text TEXT;
  v_task_id BIGINT;
  v_expected_updated_at TIMESTAMPTZ;
  v_financial_record RECORD;
  v_financial_data JSONB;
  v_section JSONB;
  v_section_name TEXT;
  v_section_estimate NUMERIC;
  v_updated_section JSONB;
  v_rows JSONB;
  v_sanitized_rows JSONB;
  v_row JSONB;
  v_actual_cost NUMERIC;
  v_selected_task_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_update_count INTEGER := 0;
  v_row_count INTEGER := 0;
BEGIN
  IF COALESCE(p_project_id, 0) <= 0 THEN
    RAISE EXCEPTION 'A valid project is required';
  END IF;

  IF COALESCE(TRIM(p_category_id), '') = '' THEN
    RAISE EXCEPTION 'Category is required';
  END IF;

  IF LOWER(TRIM(p_category_id)) IN (
    'hours',
    'addtosubtotal',
    'profit',
    'commission',
    'discount',
    'rounding',
    'addtototal'
  ) THEN
    RAISE EXCEPTION 'Category % is not supported for cost distribution', p_category_id;
  END IF;

  IF jsonb_typeof(COALESCE(p_task_updates, '[]'::JSONB)) <> 'array' THEN
    RAISE EXCEPTION 'Task updates must be an array';
  END IF;

  IF jsonb_array_length(COALESCE(p_task_updates, '[]'::JSONB)) < 2 THEN
    RAISE EXCEPTION 'At least two task updates are required';
  END IF;

  SELECT p.team_id
  INTO v_team_id
  FROM projects p
  WHERE p.project_id = p_project_id
    AND EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.team_id = p.team_id
        AND tm.user_id = auth.uid()
    );

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Project % not found or not accessible', p_project_id;
  END IF;

  FOR v_task_update IN
    SELECT value
    FROM jsonb_array_elements(p_task_updates)
  LOOP
    v_task_id_text := NULLIF(v_task_update->>'taskId', '');
    IF v_task_id_text IS NULL OR v_task_id_text !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Each task update requires a valid taskId';
    END IF;

    v_task_id := v_task_id_text::BIGINT;
    IF array_position(v_selected_task_ids, v_task_id) IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate task update for task %', v_task_id;
    END IF;
    v_selected_task_ids := v_selected_task_ids || v_task_id;

    IF NOT EXISTS (
      SELECT 1
      FROM tasks t
      WHERE t.task_id = v_task_id
        AND t.project_id = p_project_id
        AND t.task_completed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Task % is not a completed task in project %', v_task_id, p_project_id;
    END IF;
  END LOOP;

  -- Lock in a consistent order to prevent partial overlap during concurrent saves.
  PERFORM pf.financials_id
  FROM project_financials pf
  WHERE pf.task_id = ANY(v_selected_task_ids)
    AND pf.team_id = v_team_id
  ORDER BY pf.task_id
  FOR UPDATE;

  FOR v_task_update IN
    SELECT value
    FROM jsonb_array_elements(p_task_updates)
  LOOP
    v_task_id := (v_task_update->>'taskId')::BIGINT;
    v_expected_updated_at := NULLIF(
      v_task_update->>'expectedFinancialsUpdatedAt',
      ''
    )::TIMESTAMPTZ;

    SELECT
      pf.financials_id,
      pf.financials_updated_at,
      COALESCE(pf.financial_data, '{}'::JSONB) AS financial_data
    INTO v_financial_record
    FROM project_financials pf
    WHERE pf.task_id = v_task_id
      AND pf.team_id = v_team_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Financial record not found for task %', v_task_id;
    END IF;

    IF v_expected_updated_at IS NULL
      OR v_financial_record.financials_updated_at IS DISTINCT FROM v_expected_updated_at
    THEN
      RAISE EXCEPTION 'Costs changed for task % after the distribution data was loaded. Refresh and calculate again.', v_task_id;
    END IF;

    v_financial_data := v_financial_record.financial_data;
    v_section := COALESCE(v_financial_data->p_category_id, '{}'::JSONB);
    v_rows := COALESCE(v_task_update->'rows', '[]'::JSONB);

    IF jsonb_typeof(v_rows) <> 'array' THEN
      RAISE EXCEPTION 'Rows must be an array for task %', v_task_id;
    END IF;

    v_sanitized_rows := '[]'::JSONB;
    FOR v_row IN
      SELECT value
      FROM jsonb_array_elements(v_rows)
    LOOP
      v_sanitized_rows := v_sanitized_rows || jsonb_build_array(
        jsonb_strip_nulls(
          jsonb_build_object(
            'invoice', COALESCE(v_row->>'invoice', ''),
            'description', NULLIF(v_row->>'description', ''),
            'cost', COALESCE(NULLIF(v_row->>'cost', '')::NUMERIC, 0),
            'taxRate', COALESCE(NULLIF(v_row->>'taxRate', '')::NUMERIC, 0),
            'costExpression', NULLIF(v_row->>'costExpression', ''),
            'taxRateExpression', NULLIF(v_row->>'taxRateExpression', ''),
            'taxAmountExpression', NULLIF(v_row->>'taxAmountExpression', '')
          )
        )
      );
    END LOOP;

    SELECT COALESCE(
      SUM(
        COALESCE(NULLIF(row_item->>'cost', '')::NUMERIC, 0) *
        (1 + COALESCE(NULLIF(row_item->>'taxRate', '')::NUMERIC, 0) / 100)
      ),
      0
    )
    INTO v_actual_cost
    FROM jsonb_array_elements(v_sanitized_rows) AS row_item;

    v_section_name := LOWER(
      COALESCE(
        NULLIF(v_section->>'name', ''),
        p_category_id
      )
    );
    v_section_estimate := COALESCE(NULLIF(v_section->>'estimate', '')::NUMERIC, 0);

    v_updated_section := jsonb_build_object(
      'name', v_section_name,
      'estimate', v_section_estimate,
      'actual_cost', v_actual_cost,
      'data', v_sanitized_rows,
      'completedAt', CASE
        WHEN v_section ? 'completedAt' THEN v_section->'completedAt'
        ELSE 'null'::JSONB
      END
    );

    v_financial_data := jsonb_set(
      v_financial_data,
      ARRAY[p_category_id],
      v_updated_section,
      TRUE
    );

    v_row_count := v_row_count + COALESCE(jsonb_array_length(v_sanitized_rows), 0);

    UPDATE project_financials
    SET
      financial_data = v_financial_data,
      financials_updated_at = NOW()
    WHERE financials_id = v_financial_record.financials_id;

    v_update_count := v_update_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'project_id', p_project_id,
    'category_id', p_category_id,
    'updated_task_count', v_update_count,
    'rows_after_distribution', v_row_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_project_cost_distribution(BIGINT, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION apply_project_cost_distribution IS
'Atomically replaces one non-hours section data array across selected completed tasks, preserving totals via client-provided distribution rows and optimistic concurrency checks.';
