begin;

lock table public.estimate_lengths in access exclusive mode;

do $$
declare
  current_unit text;
begin
  select col_description('public.estimate_lengths'::regclass, attribute.attnum)
  into current_unit
  from pg_attribute as attribute
  where attribute.attrelid = 'public.estimate_lengths'::regclass
    and attribute.attname = 'length'
    and not attribute.attisdropped;

  if current_unit is distinct from 'Length in inches' then
    update public.estimate_lengths
    set length = length * 12
    where length is not null;
  end if;
end;
$$;

comment on column public.estimate_lengths.length is 'Length in inches';

commit;
