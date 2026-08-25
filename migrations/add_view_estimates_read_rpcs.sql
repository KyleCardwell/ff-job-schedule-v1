create or replace function public.can_read_estimate_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_team_permission(p_team_id, 'can_view_estimates')
    or public.has_team_permission(p_team_id, 'can_create_estimates');
$$;

create or replace function public.can_read_estimate(p_estimate_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.estimates e
    join public.estimate_projects ep on ep.est_project_id = e.est_project_id
    where e.estimate_id = p_estimate_id
      and public.can_read_estimate_team(ep.team_id)
  );
$$;

create or replace function public.can_read_estimate_task(p_task_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.estimate_tasks et
    join public.estimates e on e.estimate_id = et.estimate_id
    join public.estimate_projects ep on ep.est_project_id = e.est_project_id
    where et.est_task_id = p_task_id
      and public.can_read_estimate_team(ep.team_id)
  );
$$;

create or replace function public.can_read_estimate_section(p_section_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.estimate_sections es
    join public.estimate_tasks et on et.est_task_id = es.est_task_id
    join public.estimates e on e.estimate_id = et.estimate_id
    join public.estimate_projects ep on ep.est_project_id = e.est_project_id
    where es.est_section_id = p_section_id
      and public.can_read_estimate_team(ep.team_id)
  );
$$;

create or replace function public.can_read_estimate_cabinet(p_cabinet_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.estimate_cabinets ec
    join public.estimate_sections es on es.est_section_id = ec.est_section_id
    join public.estimate_tasks et on et.est_task_id = es.est_task_id
    join public.estimates e on e.estimate_id = et.estimate_id
    join public.estimate_projects ep on ep.est_project_id = e.est_project_id
    where ec.id = p_cabinet_id
      and public.can_read_estimate_team(ep.team_id)
  );
$$;

revoke all on function public.can_read_estimate_team(uuid) from public;
revoke all on function public.can_read_estimate(bigint) from public;
revoke all on function public.can_read_estimate_task(bigint) from public;
revoke all on function public.can_read_estimate_section(bigint) from public;
revoke all on function public.can_read_estimate_cabinet(bigint) from public;
grant execute on function public.can_read_estimate_team(uuid) to authenticated;
grant execute on function public.can_read_estimate(bigint) to authenticated;
grant execute on function public.can_read_estimate_task(bigint) to authenticated;
grant execute on function public.can_read_estimate_section(bigint) to authenticated;
grant execute on function public.can_read_estimate_cabinet(bigint) to authenticated;

drop policy if exists "View estimate projects with estimate permission" on public.estimate_projects;
create policy "View estimate projects with estimate permission"
  on public.estimate_projects for select to authenticated
  using (public.can_read_estimate_team(team_id));

drop policy if exists "View estimates with estimate permission" on public.estimates;
create policy "View estimates with estimate permission"
  on public.estimates for select to authenticated
  using (public.can_read_estimate(estimate_id));

drop policy if exists "View estimate tasks with estimate permission" on public.estimate_tasks;
create policy "View estimate tasks with estimate permission"
  on public.estimate_tasks for select to authenticated
  using (public.can_read_estimate(estimate_id));

drop policy if exists "View estimate sections with estimate permission" on public.estimate_sections;
create policy "View estimate sections with estimate permission"
  on public.estimate_sections for select to authenticated
  using (public.can_read_estimate_task(est_task_id));

drop policy if exists "View estimate cabinets with estimate permission" on public.estimate_cabinets;
create policy "View estimate cabinets with estimate permission"
  on public.estimate_cabinets for select to authenticated
  using (public.can_read_estimate_section(est_section_id));

drop policy if exists "View estimate accessories with estimate permission" on public.estimate_accessories;
create policy "View estimate accessories with estimate permission"
  on public.estimate_accessories for select to authenticated
  using (
    public.can_read_estimate_section(est_section_id)
    or public.can_read_estimate_cabinet(est_cabinet_id)
  );

drop policy if exists "View estimate lengths with estimate permission" on public.estimate_lengths;
create policy "View estimate lengths with estimate permission"
  on public.estimate_lengths for select to authenticated
  using (public.can_read_estimate_section(est_section_id));

drop policy if exists "View estimate other with estimate permission" on public.estimate_other;
create policy "View estimate other with estimate permission"
  on public.estimate_other for select to authenticated
  using (public.can_read_estimate_section(est_section_id));
