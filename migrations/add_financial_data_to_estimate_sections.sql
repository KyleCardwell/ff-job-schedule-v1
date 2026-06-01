-- Add pre-computed financial breakdown data to estimate sections
-- NULL means no pre-computed breakdown is stored

alter table public.estimate_sections
  add column if not exists financial_data jsonb null default null;

comment on column public.estimate_sections.financial_data is 'Pre-computed section financial breakdown JSON (cabinets, doors, drawers, hardware, wood, hours, other)';
