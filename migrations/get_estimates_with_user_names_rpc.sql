DROP FUNCTION IF EXISTS public.get_estimates_with_user_names(UUID);

CREATE OR REPLACE FUNCTION public.get_estimates_with_user_names(team_id_param UUID)
RETURNS TABLE (
  estimate_id INTEGER,
  est_project_id INTEGER,
  status TEXT,
  version NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  created_by_name TEXT,
  updated_by_name TEXT,
  est_project_name TEXT,
  est_client_name TEXT,
  team_id UUID,
  finalized_on TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    e.estimate_id,
    e.est_project_id,
    e.status,
    e.version,
    e.created_at,
    e.updated_at,
    e.created_by,
    e.updated_by,
    tm_created.user_name AS created_by_name,
    tm_updated.user_name AS updated_by_name,
    ep.est_project_name,
    ep.est_client_name,
    ep.team_id,
    e.finalized_on,
    e.archived_at
  FROM public.estimates e
  JOIN public.estimate_projects ep 
    ON e.est_project_id = ep.est_project_id
  LEFT JOIN public.team_members tm_updated 
    ON e.updated_by = tm_updated.user_id
   AND tm_updated.team_id = team_id_param
  LEFT JOIN public.team_members tm_created 
    ON e.created_by = tm_created.user_id
   AND tm_created.team_id = team_id_param
  WHERE ep.team_id = team_id_param
    AND (
      public.has_team_permission(team_id_param, 'can_view_estimates')
      OR public.has_team_permission(team_id_param, 'can_create_estimates')
    )
  ORDER BY e.updated_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_estimates_with_user_names(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_estimates_with_user_names(UUID) TO authenticated;
