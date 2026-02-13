-- Drop the old 9-parameter signature if it exists (parameter list changed)
DROP FUNCTION IF EXISTS add_estimate_to_schedule(TEXT, UUID, BIGINT, TIMESTAMPTZ, NUMERIC, NUMERIC, INTEGER, BIGINT, JSONB);

-- Create the RPC function for atomically adding estimate sections to the schedule
CREATE OR REPLACE FUNCTION add_estimate_to_schedule(
  p_project_name TEXT,
  p_team_id UUID,
  p_employee_id BIGINT,
  p_start_date TIMESTAMPTZ,
  p_day_width NUMERIC,
  p_workday_hours NUMERIC,
  p_next_task_number INTEGER,
  p_chart_config_id BIGINT,
  p_groups JSONB,
  -- Each group: { "name": "Task Name", "duration": 12.5, "section_ids": [1, 2, 3] }
  p_existing_task_id BIGINT DEFAULT NULL
  -- If sections from this estimate are already scheduled, pass one of their
  -- scheduled_task_id values so new tasks get added to the same project.
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_project_id BIGINT;
  v_task_id BIGINT;
  v_subtask_id BIGINT;
  v_group JSONB;
  v_task_number INTEGER;
  v_results JSONB := '[]'::JSONB;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Resolve or create the project
  IF p_existing_task_id IS NOT NULL THEN
    -- Look up the project from the already-scheduled task
    SELECT t.project_id INTO v_project_id
    FROM tasks t
    WHERE t.task_id = p_existing_task_id;

    IF v_project_id IS NULL THEN
      RAISE EXCEPTION 'Could not find project for existing task_id %', p_existing_task_id;
    END IF;
  ELSE
    -- First time scheduling for this estimate — create a new project
    INSERT INTO projects (
      project_name,
      project_created_at,
      project_scheduled_at,
      team_id
    )
    VALUES (
      p_project_name,
      v_now,
      v_now,
      p_team_id
    )
    RETURNING project_id INTO v_project_id;
  END IF;

  v_task_number := p_next_task_number;

  -- 2. Loop through each group to create tasks and subtasks
  FOR v_group IN SELECT * FROM jsonb_array_elements(p_groups)
  LOOP
    -- Create task
    INSERT INTO tasks (
      project_id,
      task_number,
      task_name,
      task_active,
      task_created_at,
      est_duration
    )
    VALUES (
      v_project_id,
      v_task_number::TEXT,
      v_group->>'name',
      TRUE,
      v_now,
      (v_group->>'duration')::NUMERIC
    )
    RETURNING task_id INTO v_task_id;

    -- Create subtask (one per task, assigned to default employee)
    INSERT INTO subtasks (
      task_id,
      employee_id,
      duration,
      subtask_width,
      start_date,
      end_date,
      subtask_created_at
    )
    VALUES (
      v_task_id,
      p_employee_id,
      (v_group->>'duration')::NUMERIC,
      p_day_width,
      p_start_date,
      p_start_date + (CEIL((v_group->>'duration')::NUMERIC / p_workday_hours) * INTERVAL '1 day'),
      v_now
    )
    RETURNING subtask_id INTO v_subtask_id;

    -- Validate: no section in this group is already scheduled
    IF EXISTS (
      SELECT 1 FROM estimate_sections
      WHERE est_section_id = ANY(
        SELECT (value)::BIGINT
        FROM jsonb_array_elements_text(v_group->'section_ids')
      )
      AND scheduled_task_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'One or more sections are already scheduled (group: %)', v_group->>'name';
    END IF;

    -- Update estimate_sections with the new task reference
    UPDATE estimate_sections
    SET scheduled_task_id = v_task_id
    WHERE est_section_id = ANY(
      SELECT (value)::BIGINT
      FROM jsonb_array_elements_text(v_group->'section_ids')
    );

    v_task_number := v_task_number + 1;

    -- Accumulate results
    v_results := v_results || jsonb_build_object(
      'task_id', v_task_id,
      'subtask_id', v_subtask_id,
      'task_name', v_group->>'name',
      'section_ids', v_group->'section_ids'
    );
  END LOOP;

  -- 3. Update next_task_number in chart_config
  UPDATE chart_config
  SET next_task_number = v_task_number
  WHERE chart_config_id = p_chart_config_id;

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'next_task_number', v_task_number,
    'tasks', v_results
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_estimate_to_schedule(TEXT, UUID, BIGINT, TIMESTAMPTZ, NUMERIC, NUMERIC, INTEGER, BIGINT, JSONB, BIGINT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION add_estimate_to_schedule IS 'Atomically creates (or appends to) a schedule project with tasks and subtasks from estimate sections. If p_existing_task_id is provided, new tasks are added to the same project; otherwise a new project is created. Updates estimate_sections.scheduled_task_id to track the link. All operations are in a single transaction.';
