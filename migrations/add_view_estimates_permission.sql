alter table public.roles
  add column if not exists can_view_estimates boolean not null default false;

update public.roles
set can_view_estimates = true
where coalesce(can_create_estimates, false) = true;

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
      when 'can_edit_projects'    then coalesce(r.can_edit_projects, false)
      when 'can_manage_teams'     then coalesce(r.can_manage_teams, false)
      when 'can_edit_schedule'    then coalesce(r.can_edit_schedule, false)
      when 'can_edit_financials'  then coalesce(r.can_edit_financials, false)
      when 'can_view_profit_loss' then coalesce(r.can_view_profit_loss, false)
      when 'can_create_estimates' then coalesce(r.can_create_estimates, false)
      when 'can_view_estimates'   then coalesce(r.can_view_estimates, false)
      else false
    end
    from public.roles r
    where r.role_id = p_role_id
    limit 1
  ), false);
$$;

grant execute on function public.role_has_permission(bigint, text) to authenticated;
