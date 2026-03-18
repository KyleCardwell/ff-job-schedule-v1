-- 1) Role baseline permission resolver
create or replace function public.role_has_permission(
  p_role_id bigint,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case p_permission
      when 'can_edit_projects'   then coalesce(r.can_edit_projects, false)
      when 'can_manage_teams'    then coalesce(r.can_manage_teams, false)
      when 'can_edit_schedule'   then coalesce(r.can_edit_schedule, false)
      when 'can_edit_financials' then coalesce(r.can_edit_financials, false)
      when 'can_view_profit_loss'then coalesce(r.can_view_profit_loss, false)
      when 'can_create_estimates'then coalesce(r.can_create_estimates, false)
      else false
    end
    from public.roles r
    where r.role_id = p_role_id
    limit 1
  ), false);
$$;

grant execute on function public.role_has_permission(bigint, text) to authenticated;


-- 2) Team-scoped permission checker with custom override support
-- precedence:
--   admin role_id=1 => true
--   custom_permissions key exists => use it (true or false override)
--   else fallback to role_has_permission(...)
create or replace function public.has_team_permission(
  p_team_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.user_id = auth.uid()
      and tm.team_id = p_team_id
      and (
        tm.role_id = 1
        or (
          coalesce(tm.custom_permissions, '{}'::jsonb) ? p_permission
          and lower(
            coalesce(
              coalesce(tm.custom_permissions, '{}'::jsonb) ->> p_permission,
              'false'
            )
          ) = 'true'
        )
        or (
          not (coalesce(tm.custom_permissions, '{}'::jsonb) ? p_permission)
          and public.role_has_permission(tm.role_id, p_permission)
        )
      )
  );
$$;

grant execute on function public.has_team_permission(uuid, text) to authenticated;