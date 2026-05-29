-- RPC function to switch the active section revision for a lineage within a task

DROP FUNCTION IF EXISTS public.switch_section_revision(BIGINT, BIGINT, BIGINT);

CREATE OR REPLACE FUNCTION public.switch_section_revision(
  p_task_id BIGINT,
  p_lineage_id BIGINT,
  p_target_section_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_old_section_id BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.estimate_sections es
    WHERE es.est_section_id = p_target_section_id
      AND es.est_task_id = p_task_id
      AND es.section_lineage_id = p_lineage_id
  ) THEN
    RAISE EXCEPTION
      'Target section % is invalid for task % and lineage %',
      p_target_section_id,
      p_task_id,
      p_lineage_id;
  END IF;

  SELECT u.section_id
  INTO v_old_section_id
  FROM public.estimate_tasks et
  CROSS JOIN LATERAL unnest(et.sections_order) AS u(section_id)
  JOIN public.estimate_sections es
    ON es.est_section_id = u.section_id
  WHERE et.est_task_id = p_task_id
    AND es.section_lineage_id = p_lineage_id
  LIMIT 1;

  IF v_old_section_id IS NULL THEN
    RAISE EXCEPTION
      'No active section found in task % for lineage %',
      p_task_id,
      p_lineage_id;
  END IF;

  UPDATE public.estimate_tasks
  SET sections_order = array_replace(sections_order, v_old_section_id, p_target_section_id)
  WHERE est_task_id = p_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.switch_section_revision(BIGINT, BIGINT, BIGINT) TO authenticated;

COMMENT ON FUNCTION public.switch_section_revision(BIGINT, BIGINT, BIGINT) IS 'Swaps which revision of a section lineage is active for a task by updating estimate_tasks.sections_order.';
