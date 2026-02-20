-- =====================================================
-- Migration: Team invites + invite acceptance RPC
-- Purpose: Move team onboarding to admin-driven invite flow
-- =====================================================

CREATE TABLE IF NOT EXISTS public.team_invites (
  invite_id bigserial PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams (team_id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id bigint NOT NULL REFERENCES public.roles (role_id),
  invited_by_user_id uuid NOT NULL,
  accepted_by_user_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_team_invites_email
  ON public.team_invites (lower(email));

CREATE INDEX IF NOT EXISTS idx_team_invites_team_status
  ON public.team_invites (team_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invites_pending_team_email
  ON public.team_invites (team_id, lower(email))
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.set_team_invites_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_invites_updated_at ON public.team_invites;
CREATE TRIGGER trg_team_invites_updated_at
BEFORE UPDATE ON public.team_invites
FOR EACH ROW
EXECUTE FUNCTION public.set_team_invites_updated_at();

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_invites'
      AND policyname = 'Users can view invites for their email'
  ) THEN
    CREATE POLICY "Users can view invites for their email"
    ON public.team_invites
    FOR SELECT
    TO authenticated
    USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_team_invite()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_user_email text;
  invite_row public.team_invites%ROWTYPE;
  existing_team_member_id bigint;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'not_authenticated');
  END IF;

  SELECT au.email
    INTO current_user_email
  FROM auth.users au
  WHERE au.id = current_user_id;

  IF current_user_email IS NULL THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'email_not_found');
  END IF;

  SELECT tm.team_member_id
    INTO existing_team_member_id
  FROM public.team_members tm
  WHERE tm.user_id = current_user_id
  LIMIT 1;

  IF existing_team_member_id IS NOT NULL THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'already_member');
  END IF;

  UPDATE public.team_invites
  SET status = 'expired',
      updated_at = timezone('utc', now())
  WHERE status = 'pending'
    AND expires_at <= timezone('utc', now());

  SELECT ti.*
    INTO invite_row
  FROM public.team_invites ti
  WHERE ti.status = 'pending'
    AND lower(ti.email) = lower(current_user_email)
    AND ti.expires_at > timezone('utc', now())
  ORDER BY ti.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'no_pending_invite');
  END IF;

  INSERT INTO public.team_members (user_id, team_id, role_id)
  VALUES (current_user_id, invite_row.team_id, invite_row.role_id);

  UPDATE public.team_invites
  SET status = 'accepted',
      accepted_at = timezone('utc', now()),
      accepted_by_user_id = current_user_id,
      updated_at = timezone('utc', now())
  WHERE invite_id = invite_row.invite_id;

  RETURN jsonb_build_object(
    'accepted', true,
    'team_id', invite_row.team_id,
    'role_id', invite_row.role_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'already_member');
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_invite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_team_invite() TO authenticated;
