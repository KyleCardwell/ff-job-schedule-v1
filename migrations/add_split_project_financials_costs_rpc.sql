-- RPC to split invoice costs across multiple tasks in a project and append to project_financials.financial_data category rows.

DROP FUNCTION IF EXISTS split_project_financials_costs(
  BIGINT,
  TEXT,
  TEXT,
  JSONB,
  TEXT,
  BIGINT
);

CREATE OR REPLACE FUNCTION split_project_financials_costs(
  p_project_id BIGINT,
  p_category_id TEXT,
  p_category_name TEXT DEFAULT NULL,
  p_task_rows JSONB DEFAULT '[]'::JSONB,
  p_category_type TEXT DEFAULT 'section',
  p_service_team_service_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_team_id UUID;
  v_task_entry JSONB;
  v_row JSONB;
  v_selected_task_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_task_id BIGINT;
  v_task_id_text TEXT;

  v_project_exists BOOLEAN;
  v_financial_record RECORD;
  v_financial_data JSONB;
  v_section JSONB;
  v_existing_rows JSONB;
  v_payload_rows JSONB;
  v_sanitized_rows JSONB := '[]'::JSONB;
  v_combined_rows JSONB;
  v_actual_cost NUMERIC;
  v_resolved_category_name TEXT;
  v_category_type TEXT := LOWER(COALESCE(NULLIF(TRIM(p_category_type), ''), 'section'));
  v_service_team_service_id BIGINT := p_service_team_service_id;
  v_service_amount_to_add NUMERIC := 0;
  v_row_total NUMERIC := 0;
  v_hours_data JSONB := '[]'::JSONB;
  v_hours_data_updated JSONB := '[]'::JSONB;
  v_service_found BOOLEAN := FALSE;
  v_service_item JSONB;
  v_service_input_rows JSONB := '[]'::JSONB;
  v_service_input_rows_to_append JSONB := '[]'::JSONB;
  v_service_actual_cost NUMERIC := 0;

  v_updated_rows INTEGER := 0;
  v_added_rows INTEGER := 0;
BEGIN
  IF COALESCE(TRIM(p_category_id), '') = '' THEN
    RAISE EXCEPTION 'Category is required';
  END IF;

  IF v_category_type NOT IN ('section', 'service') THEN
    RAISE EXCEPTION 'Invalid category type: %', v_category_type;
  END IF;

  IF v_category_type = 'service' AND COALESCE(v_service_team_service_id, 0) <= 0 THEN
    RAISE EXCEPTION 'Service category requires a valid service team_service_id';
  END IF;

  SELECT tm.team_id
  INTO v_team_id
  FROM team_members tm
  WHERE tm.user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'No team found for current user';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.project_id = p_project_id
      AND p.team_id = v_team_id
  )
  INTO v_project_exists;

  IF NOT v_project_exists THEN
    RAISE EXCEPTION 'Project % not found or not accessible', p_project_id;
  END IF;

  FOR v_task_entry IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_task_rows, '[]'::JSONB))
  LOOP
    v_task_id_text := NULLIF(v_task_entry->>'taskId', '');
    IF v_task_id_text IS NULL THEN
      CONTINUE;
    END IF;

    IF v_task_id_text !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Invalid taskId format: %', v_task_id_text;
    END IF;

    v_task_id := v_task_id_text::BIGINT;

    IF array_position(v_selected_task_ids, v_task_id) IS NULL THEN
      v_selected_task_ids := v_selected_task_ids || v_task_id;
    END IF;
  END LOOP;

  IF array_length(v_selected_task_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one task is required for split save';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_selected_task_ids) AS selected(task_id)
    LEFT JOIN tasks t
      ON t.task_id = selected.task_id
      AND t.project_id = p_project_id
    LEFT JOIN projects p
      ON p.project_id = t.project_id
      AND p.team_id = v_team_id
    WHERE p.project_id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more selected tasks are invalid for project %', p_project_id;
  END IF;

  INSERT INTO project_financials (
    task_id,
    team_id,
    financial_data,
    financials_created_at,
    financials_updated_at
  )
  SELECT
    selected.task_id,
    v_team_id,
    '{}'::JSONB,
    NOW(),
    NOW()
  FROM unnest(v_selected_task_ids) AS selected(task_id)
  LEFT JOIN project_financials pf ON pf.task_id = selected.task_id
  WHERE pf.task_id IS NULL;

  FOREACH v_task_id IN ARRAY v_selected_task_ids LOOP
    SELECT
      pf.financials_id,
      COALESCE(pf.financial_data, '{}'::JSONB) AS financial_data
    INTO v_financial_record
    FROM project_financials pf
    WHERE pf.task_id = v_task_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Financial record not found for task %', v_task_id;
    END IF;

    v_financial_data := COALESCE(v_financial_record.financial_data, '{}'::JSONB);
    v_section := COALESCE(v_financial_data -> p_category_id, '{}'::JSONB);
    v_existing_rows := COALESCE(v_section->'data', '[]'::JSONB);

    SELECT COALESCE(t.value->'rows', '[]'::JSONB)
    INTO v_payload_rows
    FROM jsonb_array_elements(COALESCE(p_task_rows, '[]'::JSONB)) AS t(value)
    WHERE NULLIF(t.value->>'taskId', '') IS NOT NULL
      AND (t.value->>'taskId') ~ '^[0-9]+$'
      AND (t.value->>'taskId')::BIGINT = v_task_id
    LIMIT 1;

    v_sanitized_rows := '[]'::JSONB;
    FOR v_row IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(v_payload_rows, '[]'::JSONB))
    LOOP
      v_sanitized_rows := v_sanitized_rows || jsonb_build_array(
        jsonb_strip_nulls(
          jsonb_build_object(
            'invoice', COALESCE(v_row->>'invoice', ''),
            'description', NULLIF(v_row->>'description', ''),
            'cost', COALESCE(NULLIF(v_row->>'cost', '')::NUMERIC, 0),
            'taxRate', COALESCE(NULLIF(v_row->>'taxRate', '')::NUMERIC, 0)
          )
        )
      );
    END LOOP;

    IF v_category_type = 'service' THEN
      v_service_amount_to_add := 0;
      v_service_input_rows_to_append := '[]'::JSONB;

      FOR v_row IN
        SELECT value
        FROM jsonb_array_elements(v_sanitized_rows)
      LOOP
        v_row_total := ROUND(
          COALESCE(NULLIF(v_row->>'cost', '')::NUMERIC, 0) *
          (1 + COALESCE(NULLIF(v_row->>'taxRate', '')::NUMERIC, 0) / 100),
          2
        );

        v_service_amount_to_add := v_service_amount_to_add + v_row_total;

        v_service_input_rows_to_append := v_service_input_rows_to_append || jsonb_build_array(
          jsonb_strip_nulls(
            jsonb_build_object(
              'id', md5(random()::TEXT || clock_timestamp()::TEXT || v_task_id::TEXT || v_row_total::TEXT),
              'employee_id', 'fixed_amount',
              'hours', jsonb_build_object(
                'display', TRIM(BOTH '.' FROM TRIM(TRAILING '0' FROM to_char(v_row_total, 'FM9999999999999990.00'))),
                'decimal', v_row_total
              ),
              'isOvertime', FALSE,
              'actual_cost', v_row_total,
              'invoice', COALESCE(v_row->>'invoice', ''),
              'description', NULLIF(v_row->>'description', ''),
              'cost', COALESCE(NULLIF(v_row->>'cost', '')::NUMERIC, 0),
              'taxRate', COALESCE(NULLIF(v_row->>'taxRate', '')::NUMERIC, 0)
            )
          )
        );
      END LOOP;

      v_section := COALESCE(v_financial_data -> 'hours', '{}'::JSONB);
      v_hours_data := COALESCE(v_section->'data', '[]'::JSONB);
      v_hours_data_updated := '[]'::JSONB;
      v_service_found := FALSE;

      FOR v_service_item IN
        SELECT value
        FROM jsonb_array_elements(v_hours_data)
      LOOP
        IF (v_service_item->>'team_service_id') ~ '^[0-9]+$'
          AND (v_service_item->>'team_service_id')::BIGINT = v_service_team_service_id
        THEN
          v_service_found := TRUE;

          v_service_input_rows :=
            COALESCE(v_service_item->'inputRows', '[]'::JSONB)
            || v_service_input_rows_to_append;

          SELECT COALESCE(
            SUM(COALESCE(NULLIF(input_row->>'actual_cost', '')::NUMERIC, 0)),
            0
          )
          INTO v_service_actual_cost
          FROM jsonb_array_elements(v_service_input_rows) AS input_row;

          v_hours_data_updated := v_hours_data_updated || jsonb_build_array(
            jsonb_set(
              jsonb_set(
                v_service_item,
                '{inputRows}',
                v_service_input_rows,
                TRUE
              ),
              '{actual_cost}',
              to_jsonb(v_service_actual_cost),
              TRUE
            )
          );
        ELSE
          v_hours_data_updated := v_hours_data_updated || jsonb_build_array(v_service_item);
        END IF;
      END LOOP;

      IF NOT COALESCE(v_service_found, FALSE) THEN
        v_hours_data_updated := v_hours_data_updated || jsonb_build_array(
          jsonb_build_object(
            'estimate', 0,
            'fixedAmount', 0,
            'rateOverride', NULL,
            'actual_cost', v_service_amount_to_add,
            'inputRows', v_service_input_rows_to_append,
            'team_service_id', v_service_team_service_id
          )
        );
      END IF;

      SELECT COALESCE(
        SUM(COALESCE(NULLIF(service_item->>'actual_cost', '')::NUMERIC, 0)),
        0
      )
      INTO v_actual_cost
      FROM jsonb_array_elements(v_hours_data_updated) AS service_item;

      v_financial_data := jsonb_set(
        v_financial_data,
        ARRAY['hours'],
        jsonb_build_object(
          'name', LOWER(COALESCE(NULLIF(v_section->>'name', ''), 'hours')),
          'estimate', COALESCE(NULLIF(v_section->>'estimate', '')::NUMERIC, 0),
          'actual_cost', v_actual_cost,
          'data', v_hours_data_updated,
          'completedAt', CASE
            WHEN v_section ? 'completedAt' THEN v_section->'completedAt'
            ELSE 'null'::JSONB
          END
        ),
        TRUE
      );
    ELSE
      v_combined_rows := v_existing_rows || v_sanitized_rows;

      SELECT COALESCE(
        SUM(
          COALESCE(NULLIF(row_item->>'cost', '')::NUMERIC, 0) *
          (1 + COALESCE(NULLIF(row_item->>'taxRate', '')::NUMERIC, 0) / 100)
        ),
        0
      )
      INTO v_actual_cost
      FROM jsonb_array_elements(v_combined_rows) AS row_item;

      v_resolved_category_name := LOWER(
        COALESCE(
          NULLIF(v_section->>'name', ''),
          NULLIF(p_category_name, ''),
          p_category_id
        )
      );

      v_financial_data := jsonb_set(
        v_financial_data,
        ARRAY[p_category_id],
        jsonb_build_object(
          'name', v_resolved_category_name,
          'estimate', COALESCE(NULLIF(v_section->>'estimate', '')::NUMERIC, 0),
          'actual_cost', v_actual_cost,
          'data', v_combined_rows,
          'completedAt', CASE
            WHEN v_section ? 'completedAt' THEN v_section->'completedAt'
            ELSE 'null'::JSONB
          END
        ),
        TRUE
      );
    END IF;

    v_added_rows := v_added_rows + COALESCE(jsonb_array_length(v_sanitized_rows), 0);

    UPDATE project_financials
    SET
      financial_data = v_financial_data,
      financials_updated_at = NOW()
    WHERE financials_id = v_financial_record.financials_id;

    v_updated_rows := v_updated_rows + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'project_id', p_project_id,
    'category_id', p_category_id,
    'category_type', v_category_type,
    'service_team_service_id', CASE
      WHEN v_category_type = 'service' THEN v_service_team_service_id
      ELSE NULL
    END,
    'updated_task_count', v_updated_rows,
    'inserted_row_count', v_added_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION split_project_financials_costs(
  BIGINT,
  TEXT,
  TEXT,
  JSONB,
  TEXT,
  BIGINT
) TO authenticated;

COMMENT ON FUNCTION split_project_financials_costs IS
'Atomically saves pre-grouped taskRows into project_financials: section categories append invoice rows and recalc actual_cost, while service categories append fixed_amount inputRows under hours.data[] for the selected team service and recalc service/hours actual_cost.';
