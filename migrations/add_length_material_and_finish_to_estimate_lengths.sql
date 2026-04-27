-- Add per-length material/finish override columns
-- NULL means inherit from section/estimate/team fallback

alter table public.estimate_lengths
  add column if not exists length_mat bigint null,
  add column if not exists length_finish bigint[] null;

comment on column public.estimate_lengths.length_mat is 'Optional material override for this length item; NULL inherits section/estimate/team face material';
comment on column public.estimate_lengths.length_finish is 'Optional finish override array for this length item; NULL inherits section/estimate/team face finish, empty array means explicit none';
