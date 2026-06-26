alter table public.lengths_catalog
  add column if not exists is_default boolean not null default false;
