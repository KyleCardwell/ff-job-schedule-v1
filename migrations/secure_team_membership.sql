-- Migration: secure team membership (DATABASE-PLAN round D0, 2026-10-13)
--
-- Closes two privilege escalations on public.team_members:
--   1. INSERT policy only checked auth.uid() = user_id, so any signed-in user could add
--      themselves to ANY team with ANY role (including role 1 = admin).
--   2. UPDATE policy let a member update their own row, including role_id and
--      custom_permissions, so any member could promote themselves.
--
-- After this migration:
--   - Teams are created only through create_team(), which also adds the creator as admin.
--   - Nobody inserts into team_members from the browser. accept_team_invite() (security
--     definer) and the invite-team-member edge function (service role) keep working.
--   - Members can still update their own row (e.g. user_name), but only a team admin can
--     change role_id or custom_permissions, user_id/team_id never change, and a team can't
--     lose its last admin.
--
-- Run the whole file once in the Supabase SQL editor. Safe to re-run.
-- Deploy the TeamJoin.jsx change (create_team RPC) at the same time: the old client-side
-- team creation stops working once this runs.

begin;

-- ---------------------------------------------------------------------------------------
-- 1. create_team(): team + first admin in one transaction
-- ---------------------------------------------------------------------------------------

create or replace function public.create_team(p_team_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name    text := nullif(trim(p_team_name), '');
  v_team_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'Team name is required' using errcode = '22023';
  end if;

  -- Same one-team-per-user rule as accept_team_invite().
  if exists (select 1 from public.team_members tm where tm.user_id = v_user_id) then
    raise exception 'You are already a member of a team' using errcode = '23505';
  end if;

  insert into public.teams (team_name, invite_code, default_role_id)
  values (v_name, substr(md5(gen_random_uuid()::text), 1, 8), 3)   -- 3 = viewer
  returning team_id into v_team_id;

  insert into public.team_members (user_id, team_id, role_id)
  values (v_user_id, v_team_id, 1);                                -- 1 = admin

  return v_team_id;
end;
$$;

revoke all on function public.create_team(text) from public;
grant execute on function public.create_team(text) to authenticated;

-- ---------------------------------------------------------------------------------------
-- 2. No direct inserts into teams or team_members from the browser
-- ---------------------------------------------------------------------------------------

drop policy if exists "Enable insert for users based on user_id" on public.team_members;
drop policy if exists "Enable insert for authenticated users only" on public.teams;

-- ---------------------------------------------------------------------------------------
-- 3. Guard updates to team_members
--    RLS still decides WHICH rows a user may update (own row, or any row if team admin).
--    This trigger decides WHICH COLUMNS may change.
-- ---------------------------------------------------------------------------------------

create or replace function public.guard_team_member_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  -- SQL editor / service role (edge functions): no auth.uid(), allow.
  if v_caller is null then
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.team_id is distinct from old.team_id then
    raise exception 'A team membership''s user and team cannot be changed'
      using errcode = '42501';
  end if;

  if new.role_id is distinct from old.role_id
     or new.custom_permissions is distinct from old.custom_permissions then

    if not exists (
      select 1 from public.team_members tm
      where tm.user_id = v_caller
        and tm.team_id = old.team_id
        and tm.role_id = 1
    ) then
      raise exception 'Only a team admin can change roles or permissions'
        using errcode = '42501';
    end if;

    -- Never leave a team without an admin.
    if old.role_id = 1 and new.role_id is distinct from 1 and not exists (
      select 1 from public.team_members tm
      where tm.team_id = old.team_id
        and tm.role_id = 1
        and tm.team_member_id <> old.team_member_id
    ) then
      raise exception 'A team must keep at least one admin'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_team_member_update on public.team_members;
create trigger guard_team_member_update
  before update on public.team_members
  for each row execute function public.guard_team_member_update();

commit;

-- ---------------------------------------------------------------------------------------
-- Checks (run after applying; each should behave as described)
-- ---------------------------------------------------------------------------------------
-- a) Policies: no INSERT policy should remain on team_members or teams.
--    select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename in ('team_members','teams') order by 1,3;
--
-- b) Trigger exists:
--    select tgname from pg_trigger where tgrelid = 'public.team_members'::regclass and not tgisinternal;
--
-- c) In the app, as a NON-admin user: change your own name (should work). Then in the
--    browser console of ff-job-schedule:
--      await supabase.from('team_members').update({ role_id: 1 }).eq('user_id', '<your id>')
--    -> should return an error "Only a team admin can change roles or permissions".
--
-- d) As an admin: change another member's role on the Manage Team page (should work).
--
-- e) Sign up a brand-new user, create a team on the "You're Signed In" screen (after the
--    TeamJoin.jsx change is deployed): the team is created and the user is its admin.
