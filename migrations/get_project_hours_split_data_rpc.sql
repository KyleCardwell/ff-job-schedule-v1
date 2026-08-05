DROP FUNCTION IF EXISTS get_project_hours_split_data(BIGINT);

CREATE OR REPLACE FUNCTION get_project_hours_split_data(
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
        'hours', COALESCE(pf.financial_data->'hours', '{}'::JSONB)
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

GRANT EXECUTE ON FUNCTION get_project_hours_split_data(BIGINT) TO authenticated;

COMMENT ON FUNCTION get_project_hours_split_data IS
'Returns only the hours financial data needed to preview an employee-hours redistribution for completed tasks in an accessible project.';
