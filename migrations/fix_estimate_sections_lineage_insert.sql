create or replace function public.set_estimate_section_lineage_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.section_lineage_id is null then
    if new.est_section_id is null then
      new.est_section_id := nextval(
        pg_get_serial_sequence('public.estimate_sections', 'est_section_id')
      );
    end if;

    new.section_lineage_id := new.est_section_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_estimate_section_lineage_defaults on public.estimate_sections;

create trigger trg_set_estimate_section_lineage_defaults
before insert on public.estimate_sections
for each row
execute function public.set_estimate_section_lineage_defaults();
