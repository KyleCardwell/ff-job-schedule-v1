DROP FUNCTION IF EXISTS apply_project_hours_split(BIGINT, BIGINT, BIGINT[], JSONB);
DROP FUNCTION IF EXISTS apply_project_hours_split(BIGINT, BIGINT, BIGINT[], BOOLEAN, JSONB);

CREATE OR REPLACE FUNCTION apply_project_hours_split(
  p_project_id BIGINT,
  p_team_service_id BIGINT,
  p_employee_ids BIGINT[],
  p_include_fixed_amount BOOLEAN DEFAULT FALSE,
  p_task_updates JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_team_id UUID;
  v_task_update JSONB;
  v_task_id BIGINT;
  v_task_id_text TEXT;
  v_expected_updated_at TIMESTAMPTZ;
  v_financial_record RECORD;
  v_financial_data JSONB;
  v_hours_section JSONB;
  v_hours_data JSONB;
  v_updated_hours_data JSONB;
  v_service_item JSONB;
  v_updated_service JSONB;
  v_existing_row JSONB;
  v_replacement_row JSONB;
  v_updated_input_rows JSONB;
  v_employee_id BIGINT;
  v_employee_id_text TEXT;
  v_hours NUMERIC;
  v_actual_cost NUMERIC;
  v_fixed_amount_value NUMERIC;
  v_service_actual_cost NUMERIC;
  v_hours_actual_cost NUMERIC;
  v_service_found BOOLEAN;
  v_updated_count INTEGER := 0;
  v_replacement_count INTEGER := 0;
  v_selected_task_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_original_hours NUMERIC := 0;
  v_original_actual_cost NUMERIC := 0;
  v_replacement_hours NUMERIC := 0;
  v_replacement_actual_cost NUMERIC := 0;
BEGIN
  IF COALESCE(p_project_id, 0) <= 0 THEN
    RAISE EXCEPTION 'A valid project is required';
  END IF;

  IF COALESCE(p_team_service_id, 0) <= 0 THEN
    RAISE EXCEPTION 'A valid service is required';
  END IF;

  IF COALESCE(array_length(p_employee_ids, 1), 0) = 0
    AND NOT COALESCE(p_include_fixed_amount, FALSE)
  THEN
    RAISE EXCEPTION 'Select at least one employee or include fixed amounts';
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

  IF NOT EXISTS (
    SELECT 1
    FROM team_services ts
    WHERE ts.id = p_team_service_id
      AND ts.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'Service % is not available to this team', p_team_service_id;
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

  -- Lock in a consistent order so concurrent splits cannot partially interleave.
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
      RAISE EXCEPTION 'Hours changed for task % after the split data was loaded. Refresh and calculate again.', v_task_id;
    END IF;

    v_financial_data := v_financial_record.financial_data;
    v_hours_section := COALESCE(v_financial_data->'hours', '{}'::JSONB);
    v_hours_data := COALESCE(v_hours_section->'data', '[]'::JSONB);

    IF jsonb_typeof(v_hours_data) <> 'array' THEN
      RAISE EXCEPTION 'Hours data is invalid for task %', v_task_id;
    END IF;

    v_updated_hours_data := '[]'::JSONB;
    v_service_found := FALSE;

    FOR v_service_item IN
      SELECT value
      FROM jsonb_array_elements(v_hours_data)
    LOOP
      IF (v_service_item->>'team_service_id') ~ '^[0-9]+$'
        AND (v_service_item->>'team_service_id')::BIGINT = p_team_service_id
      THEN
        v_service_found := TRUE;
        v_updated_input_rows := '[]'::JSONB;

        FOR v_existing_row IN
          SELECT value
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(COALESCE(v_service_item->'inputRows', '[]'::JSONB)) = 'array'
              THEN COALESCE(v_service_item->'inputRows', '[]'::JSONB)
              ELSE '[]'::JSONB
            END
          )
        LOOP
          v_employee_id_text := NULLIF(v_existing_row->>'employee_id', '');
          IF v_employee_id_text IS NOT NULL
            AND v_employee_id_text ~ '^[0-9]+$'
            AND v_employee_id_text::BIGINT = ANY(p_employee_ids)
          THEN
            v_original_hours := v_original_hours + COALESCE(
              NULLIF(v_existing_row->'hours'->>'decimal', '')::NUMERIC,
              CASE
                WHEN jsonb_typeof(v_existing_row->'hours') = 'number'
                THEN (v_existing_row->>'hours')::NUMERIC
                ELSE 0
              END
            );
            v_original_actual_cost := v_original_actual_cost + COALESCE(
              NULLIF(v_existing_row->>'actual_cost', '')::NUMERIC,
              0
            );
            CONTINUE;
          END IF;

          IF COALESCE(p_include_fixed_amount, FALSE)
            AND v_employee_id_text = 'fixed_amount'
          THEN
            v_fixed_amount_value := COALESCE(
              NULLIF(v_existing_row->>'actual_cost', '')::NUMERIC,
              NULLIF(v_existing_row->'hours'->>'decimal', '')::NUMERIC,
              CASE
                WHEN jsonb_typeof(v_existing_row->'hours') = 'number'
                THEN (v_existing_row->>'hours')::NUMERIC
                ELSE 0
              END,
              0
            );
            v_original_hours := v_original_hours + v_fixed_amount_value;
            v_original_actual_cost := v_original_actual_cost + v_fixed_amount_value;
            CONTINUE;
          END IF;

          v_updated_input_rows := v_updated_input_rows || jsonb_build_array(v_existing_row);
        END LOOP;

        IF jsonb_typeof(COALESCE(v_task_update->'rows', '[]'::JSONB)) <> 'array' THEN
          RAISE EXCEPTION 'Replacement rows must be an array for task %', v_task_id;
        END IF;

        FOR v_replacement_row IN
          SELECT value
          FROM jsonb_array_elements(COALESCE(v_task_update->'rows', '[]'::JSONB))
        LOOP
          v_employee_id_text := NULLIF(v_replacement_row->>'employee_id', '');
          IF v_employee_id_text IS NULL THEN
            RAISE EXCEPTION 'Replacement rows require a valid employee_id';
          END IF;

          IF v_employee_id_text = 'fixed_amount' THEN
            IF NOT COALESCE(p_include_fixed_amount, FALSE) THEN
              RAISE EXCEPTION 'Replacement fixed_amount rows were not selected';
            END IF;

            v_hours := COALESCE(NULLIF(v_replacement_row->'hours'->>'decimal', '')::NUMERIC, 0);
            v_actual_cost := COALESCE(
              NULLIF(v_replacement_row->>'actual_cost', '')::NUMERIC,
              v_hours
            );
            IF v_hours < 0 OR v_actual_cost < 0 THEN
              RAISE EXCEPTION 'Replacement fixed amounts cannot be negative';
            END IF;

            v_replacement_hours := v_replacement_hours + v_hours;
            v_replacement_actual_cost := v_replacement_actual_cost + v_actual_cost;

            v_updated_input_rows := v_updated_input_rows || jsonb_build_array(
              jsonb_strip_nulls(
                jsonb_build_object(
                  'id', COALESCE(
                    NULLIF(v_replacement_row->>'id', ''),
                    md5(random()::TEXT || clock_timestamp()::TEXT || v_task_id::TEXT)
                  ),
                  'employee_id', 'fixed_amount',
                  'invoice', NULLIF(BTRIM(v_replacement_row->>'invoice'), ''),
                  'hours', jsonb_build_object(
                    'display', COALESCE(
                      NULLIF(v_replacement_row->'hours'->>'display', ''),
                      v_hours::TEXT
                    ),
                    'decimal', v_hours
                  ),
                  'isOvertime', FALSE,
                  'actual_cost', v_actual_cost,
                  'split_batch_id', NULLIF(v_replacement_row->>'split_batch_id', '')
                )
              )
            );
            v_replacement_count := v_replacement_count + 1;
            CONTINUE;
          END IF;

          IF v_employee_id_text !~ '^[0-9]+$' THEN
            RAISE EXCEPTION 'Replacement rows require a valid employee_id';
          END IF;

          v_employee_id := v_employee_id_text::BIGINT;
          IF NOT (v_employee_id = ANY(p_employee_ids)) THEN
            RAISE EXCEPTION 'Replacement employee % was not selected', v_employee_id;
          END IF;

          v_hours := COALESCE(NULLIF(v_replacement_row->'hours'->>'decimal', '')::NUMERIC, 0);
          v_actual_cost := COALESCE(NULLIF(v_replacement_row->>'actual_cost', '')::NUMERIC, 0);
          IF v_hours < 0 OR v_actual_cost < 0 THEN
            RAISE EXCEPTION 'Replacement hours and actual cost cannot be negative';
          END IF;

          v_replacement_hours := v_replacement_hours + v_hours;
          v_replacement_actual_cost := v_replacement_actual_cost + v_actual_cost;

          v_updated_input_rows := v_updated_input_rows || jsonb_build_array(
            jsonb_strip_nulls(
              jsonb_build_object(
                'id', COALESCE(
                  NULLIF(v_replacement_row->>'id', ''),
                  md5(random()::TEXT || clock_timestamp()::TEXT || v_task_id::TEXT)
                ),
                'employee_id', v_employee_id_text,
                'hours', jsonb_build_object(
                  'display', COALESCE(
                    NULLIF(v_replacement_row->'hours'->>'display', ''),
                    v_hours::TEXT
                  ),
                  'decimal', v_hours
                ),
                'isOvertime', COALESCE((v_replacement_row->>'isOvertime')::BOOLEAN, FALSE),
                'actual_cost', v_actual_cost,
                'split_batch_id', NULLIF(v_replacement_row->>'split_batch_id', '')
              )
            )
          );
          v_replacement_count := v_replacement_count + 1;
        END LOOP;

        SELECT COALESCE(
          SUM(COALESCE(NULLIF(input_row->>'actual_cost', '')::NUMERIC, 0)),
          0
        )
        INTO v_service_actual_cost
        FROM jsonb_array_elements(v_updated_input_rows) AS input_row;

        v_updated_service := jsonb_set(
          jsonb_set(
            v_service_item,
            '{inputRows}',
            v_updated_input_rows,
            TRUE
          ),
          '{actual_cost}',
          to_jsonb(v_service_actual_cost),
          TRUE
        );
        v_updated_hours_data := v_updated_hours_data || jsonb_build_array(v_updated_service);
      ELSE
        v_updated_hours_data := v_updated_hours_data || jsonb_build_array(v_service_item);
      END IF;
    END LOOP;

    IF NOT v_service_found THEN
      RAISE EXCEPTION 'Service % is missing from task % hours data', p_team_service_id, v_task_id;
    END IF;

    SELECT COALESCE(
      SUM(COALESCE(NULLIF(service_item->>'actual_cost', '')::NUMERIC, 0)),
      0
    )
    INTO v_hours_actual_cost
    FROM jsonb_array_elements(v_updated_hours_data) AS service_item;

    v_hours_section := jsonb_set(
      jsonb_set(
        v_hours_section,
        '{data}',
        v_updated_hours_data,
        TRUE
      ),
      '{actual_cost}',
      to_jsonb(v_hours_actual_cost),
      TRUE
    );
    v_financial_data := jsonb_set(
      v_financial_data,
      '{hours}',
      v_hours_section,
      TRUE
    );

    UPDATE project_financials
    SET
      financial_data = v_financial_data,
      financials_updated_at = NOW()
    WHERE financials_id = v_financial_record.financials_id;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  IF ABS(v_original_hours - v_replacement_hours) > 0.000001 THEN
    RAISE EXCEPTION 'The calculated distribution does not preserve selected hours/fixed amounts';
  END IF;

  IF ABS(v_original_actual_cost - v_replacement_actual_cost) > 0.0001 THEN
    RAISE EXCEPTION 'The calculated split does not preserve total labor cost';
  END IF;

  RETURN jsonb_build_object(
    'projectId', p_project_id,
    'teamServiceId', p_team_service_id,
    'updatedTaskCount', v_updated_count,
    'replacementRowCount', v_replacement_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_project_hours_split(
  BIGINT,
  BIGINT,
  BIGINT[],
  BOOLEAN,
  JSONB
) TO authenticated;

COMMENT ON FUNCTION apply_project_hours_split IS
'Atomically replaces selected employee rows (and optional fixed_amount rows) for one service across completed project tasks, preserving other rows and recalculating service and hours actual-cost totals.';
