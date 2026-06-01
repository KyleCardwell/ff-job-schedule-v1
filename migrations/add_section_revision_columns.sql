alter table public.estimate_sections
  add column section_lineage_id bigint,
  add column revision integer not null default 1;

comment on column public.estimate_sections.section_lineage_id is 'Stable lineage identifier shared by all revisions of the same logical estimate section.';
comment on column public.estimate_sections.revision is 'Revision number within a section lineage; starts at 1 for existing/original rows and increments for new revisions.';

update public.estimate_sections
set section_lineage_id = est_section_id
where section_lineage_id is null;

alter table public.estimate_sections
  alter column section_lineage_id set not null;

alter table public.estimate_sections
  add constraint estimate_sections_section_lineage_revision_key unique (section_lineage_id, revision);

create index idx_estimate_sections_section_lineage_id
  on public.estimate_sections (section_lineage_id);

create or replace function public.create_initial_section()
returns trigger
language plpgsql
security definer
as $$
declare
  new_section_id bigint;
begin
  insert into public.estimate_sections (est_task_id)
  values (new.est_task_id)
  returning est_section_id into new_section_id;

  update public.estimate_sections
  set section_lineage_id = est_section_id
  where est_section_id = new_section_id;

  update public.estimate_tasks
  set sections_order = array[new_section_id]::bigint[]
  where est_task_id = new.est_task_id;

  return new;
end;
$$;
