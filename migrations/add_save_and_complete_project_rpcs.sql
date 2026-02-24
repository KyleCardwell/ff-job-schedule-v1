-- save_project_with_tasks RPCs
-- These functions replace multi-call client writes so project/task/subtask updates
-- are committed (or rolled back) as a single transaction.

DROP FUNCTION IF EXISTS save_project_with_tasks(
  BIGINT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  BOOLEAN,
  DATE,
  DATE,
  TEXT,
  INTEGER,
  BIGINT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT[]
);

CREATE OR REPLACE FUNCTION save_project_with_tasks(
  p_project_id BIGINT,
  p_job_name TEXT,
  p_project_created_at TIMESTAMPTZ,
  p_project_scheduled_at TIMESTAMPTZ,
  p_project_completed_at TIMESTAMPTZ DEFAULT NULL,
  p_needs_attention BOOLEAN DEFAULT FALSE,
  p_deposit_date DATE DEFAULT NULL,
  p_delivery_date DATE DEFAULT NULL,
  p_project_notes TEXT DEFAULT NULL,
  p_next_task_number INTEGER DEFAULT NULL,
  p_chart_config_id BIGINT DEFAULT NULL,
  p_tasks_to_insert JSONB DEFAULT '[]'::JSONB,
  p_tasks_to_update JSONB DEFAULT '[]'::JSONB,
  p_subtasks_to_insert JSONB DEFAULT '[]'::JSONB,
  p_subtasks_to_update JSONB DEFAULT '[]'::JSONB,
  p_removed_work_period_ids TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_team_id UUID;
  v_project_id BIGINT;
  v_task JSONB;
  v_subtask JSONB;
  v_inserted_task_id BIGINT;
  v_task_id_by_temp JSONB := '{}'::JSONB;
  v_task_id_text TEXT;
  v_rows_affected INTEGER;
BEGIN
  SELECT tm.team_id
  INTO v_team_id
  FROM team_members tm
  WHERE tm.user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'No team found for current user';
  END IF;

  -- 1) Upsert project header
  IF p_project_id IS NOT NULL THEN
    UPDATE projects
    SET
      project_name = p_job_name,
      project_created_at = p_project_created_at,
      project_scheduled_at = p_project_scheduled_at,
      project_completed_at = p_project_completed_at,
      needs_attention = p_needs_attention,
      deposit_date = p_deposit_date,
      delivery_date = p_delivery_date,
      project_notes = p_project_notes,
      team_id = v_team_id
    WHERE project_id = p_project_id
      AND team_id = v_team_id
    RETURNING project_id INTO v_project_id;

    IF v_project_id IS NULL THEN
      RAISE EXCEPTION 'Project % not found or not accessible', p_project_id;
    END IF;
  ELSE
    INSERT INTO projects (
      project_name,
      project_created_at,
      project_scheduled_at,
      project_completed_at,
      needs_attention,
      deposit_date,
      delivery_date,
      project_notes,
      team_id
    )
    VALUES (
      p_job_name,
      p_project_created_at,
      p_project_scheduled_at,
      p_project_completed_at,
      p_needs_attention,
      p_deposit_date,
      p_delivery_date,
      p_project_notes,
      v_team_id
    )
    RETURNING project_id INTO v_project_id;
  END IF;

  -- 2) Insert tasks (new)
  FOR v_task IN SELECT value FROM jsonb_array_elements(COALESCE(p_tasks_to_insert, '[]'::JSONB))
  LOOP
    INSERT INTO tasks (
      temp_task_id,
      project_id,
      task_number,
      task_name,
      task_active,
      task_created_at,
      task_completed_at,
      est_duration
    )
    VALUES (
      NULLIF(v_task->>'temp_task_id', '')::UUID,
      v_project_id,
      v_task->>'task_number',
      v_task->>'task_name',
      COALESCE(NULLIF(v_task->>'task_active', '')::BOOLEAN, TRUE),
      COALESCE(NULLIF(v_task->>'task_created_at', '')::TIMESTAMPTZ, now()),
      NULLIF(v_task->>'task_completed_at', '')::TIMESTAMPTZ,
      NULLIF(v_task->>'est_duration', '')::NUMERIC
    )
    RETURNING task_id INTO v_inserted_task_id;

    IF COALESCE(v_task->>'temp_task_id', '') <> '' THEN
      v_task_id_by_temp := v_task_id_by_temp || jsonb_build_object(
        v_task->>'temp_task_id',
        v_inserted_task_id::TEXT
      );
    END IF;
  END LOOP;

  -- 3) Update tasks (existing)
  FOR v_task IN SELECT value FROM jsonb_array_elements(COALESCE(p_tasks_to_update, '[]'::JSONB))
  LOOP
    IF COALESCE(v_task->>'task_id', '') = '' THEN
      RAISE EXCEPTION 'Missing task_id in tasks_to_update payload';
    END IF;

    UPDATE tasks t
    SET
      task_number = COALESCE(NULLIF(v_task->>'task_number', ''), t.task_number),
      task_name = COALESCE(NULLIF(v_task->>'task_name', ''), t.task_name),
      task_active = COALESCE(NULLIF(v_task->>'task_active', '')::BOOLEAN, t.task_active),
      task_created_at = COALESCE(NULLIF(v_task->>'task_created_at', '')::TIMESTAMPTZ, t.task_created_at),
      task_completed_at = CASE
        WHEN v_task ? 'task_completed_at'
          THEN NULLIF(v_task->>'task_completed_at', '')::TIMESTAMPTZ
        ELSE t.task_completed_at
      END
    FROM projects p
    WHERE t.task_id::TEXT = v_task->>'task_id'
      AND p.project_id = t.project_id
      AND p.team_id = v_team_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
      RAISE EXCEPTION 'Task % not found or not accessible', v_task->>'task_id';
    END IF;
  END LOOP;

  -- 4) Insert subtasks (new)
  FOR v_subtask IN SELECT value FROM jsonb_array_elements(COALESCE(p_subtasks_to_insert, '[]'::JSONB))
  LOOP
    v_task_id_text := NULLIF(v_subtask->>'task_id', '');

    IF v_task_id_text IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM tasks t
      JOIN projects p ON p.project_id = t.project_id
      WHERE t.task_id::TEXT = v_task_id_text
        AND p.team_id = v_team_id
    ) THEN
      v_task_id_text := NULL;
    END IF;

    IF v_task_id_text IS NULL THEN
      v_task_id_text := v_task_id_by_temp ->> NULLIF(v_subtask->>'temp_task_id', '');
    END IF;

    IF v_task_id_text IS NULL THEN
      RAISE EXCEPTION 'Could not resolve task for subtask insert (temp_task_id=%)',
        COALESCE(v_subtask->>'temp_task_id', 'null');
    END IF;

    IF COALESCE(v_subtask->>'employee_id', '') = '' THEN
      RAISE EXCEPTION 'Missing employee_id for subtask insert (task_id=%)', v_task_id_text;
    END IF;

    IF COALESCE(v_subtask->>'start_date', '') = '' OR COALESCE(v_subtask->>'end_date', '') = '' THEN
      RAISE EXCEPTION 'Missing start_date or end_date for subtask insert (task_id=%)', v_task_id_text;
    END IF;

    IF COALESCE(v_subtask->>'duration', '') = '' THEN
      RAISE EXCEPTION 'Missing duration for subtask insert (task_id=%)', v_task_id_text;
    END IF;

    INSERT INTO subtasks (
      task_id,
      temp_subtask_id,
      employee_id,
      start_date,
      end_date,
      duration,
      subtask_width,
      subtask_created_at,
      hard_start_date
    )
    SELECT
      t.task_id,
      NULLIF(v_subtask->>'temp_subtask_id', '')::UUID,
      NULLIF(v_subtask->>'employee_id', '')::BIGINT,
      NULLIF(v_subtask->>'start_date', '')::TIMESTAMPTZ,
      NULLIF(v_subtask->>'end_date', '')::TIMESTAMPTZ,
      NULLIF(v_subtask->>'duration', '')::NUMERIC,
      NULLIF(v_subtask->>'subtask_width', '')::NUMERIC,
      COALESCE(NULLIF(v_subtask->>'subtask_created_at', '')::TIMESTAMPTZ, now()),
      COALESCE(NULLIF(v_subtask->>'hard_start_date', '')::BOOLEAN, FALSE)
    FROM tasks t
    JOIN projects p ON p.project_id = t.project_id
    WHERE t.task_id::TEXT = v_task_id_text
      AND p.team_id = v_team_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
      RAISE EXCEPTION 'Resolved task % not found for subtask insert', v_task_id_text;
    END IF;
  END LOOP;

  -- 5) Update subtasks (existing)
  FOR v_subtask IN SELECT value FROM jsonb_array_elements(COALESCE(p_subtasks_to_update, '[]'::JSONB))
  LOOP
    IF COALESCE(v_subtask->>'subtask_id', '') = '' THEN
      RAISE EXCEPTION 'Missing subtask_id in subtasks_to_update payload';
    END IF;

    UPDATE subtasks s
    SET
      employee_id = COALESCE(NULLIF(v_subtask->>'employee_id', '')::BIGINT, s.employee_id),
      start_date = COALESCE(NULLIF(v_subtask->>'start_date', '')::TIMESTAMPTZ, s.start_date),
      end_date = COALESCE(NULLIF(v_subtask->>'end_date', '')::TIMESTAMPTZ, s.end_date),
      duration = COALESCE(NULLIF(v_subtask->>'duration', '')::NUMERIC, s.duration),
      subtask_width = COALESCE(NULLIF(v_subtask->>'subtask_width', '')::NUMERIC, s.subtask_width),
      subtask_created_at = COALESCE(
        NULLIF(v_subtask->>'subtask_created_at', '')::TIMESTAMPTZ,
        s.subtask_created_at
      ),
      hard_start_date = CASE
        WHEN v_subtask ? 'hard_start_date'
          THEN COALESCE(NULLIF(v_subtask->>'hard_start_date', '')::BOOLEAN, FALSE)
        ELSE s.hard_start_date
      END
    FROM tasks t
    JOIN projects p ON p.project_id = t.project_id
    WHERE s.subtask_id::TEXT = v_subtask->>'subtask_id'
      AND t.task_id = s.task_id
      AND p.team_id = v_team_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
      RAISE EXCEPTION 'Subtask % not found for update', v_subtask->>'subtask_id';
    END IF;
  END LOOP;

  -- 6) Delete removed subtasks
  IF array_length(p_removed_work_period_ids, 1) IS NOT NULL THEN
    DELETE FROM subtasks s
    USING tasks t, projects p
    WHERE s.subtask_id::TEXT = ANY(p_removed_work_period_ids)
      AND t.task_id = s.task_id
      AND p.project_id = t.project_id
      AND p.team_id = v_team_id;
  END IF;

  -- 7) Persist next task number
  IF p_chart_config_id IS NOT NULL THEN
    UPDATE chart_config
    SET next_task_number = p_next_task_number
    WHERE chart_config_id = p_chart_config_id
      AND team_id = v_team_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
      RAISE EXCEPTION 'chart_config % not found for team %', p_chart_config_id, v_team_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'next_task_number', p_next_task_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION save_project_with_tasks(
  BIGINT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  BOOLEAN,
  DATE,
  DATE,
  TEXT,
  INTEGER,
  BIGINT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT[]
) TO authenticated;

COMMENT ON FUNCTION save_project_with_tasks IS
'Atomically saves a project and associated task/subtask inserts, updates, and deletions. Rolls back all changes on any error.';


DROP FUNCTION IF EXISTS complete_project_with_tasks(
  BIGINT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  BOOLEAN,
  DATE,
  DATE,
  TEXT,
  INTEGER,
  BIGINT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT[],
  JSONB,
  BIGINT
);

CREATE OR REPLACE FUNCTION complete_project_with_tasks(
  p_project_id BIGINT,
  p_job_name TEXT,
  p_project_created_at TIMESTAMPTZ,
  p_project_scheduled_at TIMESTAMPTZ,
  p_project_completed_at TIMESTAMPTZ DEFAULT NULL,
  p_needs_attention BOOLEAN DEFAULT FALSE,
  p_deposit_date DATE DEFAULT NULL,
  p_delivery_date DATE DEFAULT NULL,
  p_project_notes TEXT DEFAULT NULL,
  p_next_task_number INTEGER DEFAULT NULL,
  p_chart_config_id BIGINT DEFAULT NULL,
  p_tasks_to_insert JSONB DEFAULT '[]'::JSONB,
  p_tasks_to_update JSONB DEFAULT '[]'::JSONB,
  p_subtasks_to_insert JSONB DEFAULT '[]'::JSONB,
  p_subtasks_to_update JSONB DEFAULT '[]'::JSONB,
  p_removed_work_period_ids TEXT[] DEFAULT '{}',
  p_completed_tasks JSONB DEFAULT '[]'::JSONB,
  p_default_employee_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_save_result JSONB;
  v_completed_task_ids TEXT[];
BEGIN
  v_save_result := save_project_with_tasks(
    p_project_id,
    p_job_name,
    p_project_created_at,
    p_project_scheduled_at,
    p_project_completed_at,
    p_needs_attention,
    p_deposit_date,
    p_delivery_date,
    p_project_notes,
    p_next_task_number,
    p_chart_config_id,
    p_tasks_to_insert,
    p_tasks_to_update,
    p_subtasks_to_insert,
    p_subtasks_to_update,
    p_removed_work_period_ids
  );

  IF jsonb_array_length(COALESCE(p_completed_tasks, '[]'::JSONB)) > 0 THEN
    IF p_default_employee_id IS NULL THEN
      RAISE EXCEPTION 'p_default_employee_id is required when completing tasks';
    END IF;

    SELECT ARRAY_AGG(task_row->>'task_id')
    INTO v_completed_task_ids
    FROM jsonb_array_elements(p_completed_tasks) task_row
    WHERE COALESCE(task_row->>'task_id', '') <> '';

    IF array_length(v_completed_task_ids, 1) IS NOT NULL THEN
      UPDATE subtasks
      SET
        employee_id = p_default_employee_id,
        hard_start_date = FALSE
      WHERE task_id::TEXT = ANY(v_completed_task_ids);
    END IF;
  END IF;

  RETURN v_save_result || jsonb_build_object(
    'completed_task_count', COALESCE(array_length(v_completed_task_ids, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_project_with_tasks(
  BIGINT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  BOOLEAN,
  DATE,
  DATE,
  TEXT,
  INTEGER,
  BIGINT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT[],
  JSONB,
  BIGINT
) TO authenticated;

COMMENT ON FUNCTION complete_project_with_tasks IS
'Atomically saves project/task/subtask changes and applies completion behavior: completed task subtasks are reassigned to default employee and hard_start_date is cleared.';
