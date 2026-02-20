// @ts-ignore Deno edge runtime resolves URL imports.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.0";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: {
    get: (name: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteRequestBody = {
  email?: string;
  roleId?: number;
  redirectTo?: string;
};

const inviteEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { success: false, error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      success: false,
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { success: false, error: "Missing Authorization header" });
  }

  const accessToken = authHeader.replace("Bearer ", "").trim();
  if (!accessToken) {
    return jsonResponse(401, { success: false, error: "Missing bearer token" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user: inviterUser },
    error: inviterAuthError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (inviterAuthError || !inviterUser) {
    return jsonResponse(401, { success: false, error: "Invalid access token" });
  }

  let body: InviteRequestBody;
  try {
    body = await request.json();
  } catch (_error) {
    return jsonResponse(400, { success: false, error: "Invalid JSON body" });
  }

  const normalizedEmail = body.email?.trim().toLowerCase();
  if (!normalizedEmail || !inviteEmailRegex.test(normalizedEmail)) {
    return jsonResponse(400, { success: false, error: "A valid email is required" });
  }

  const {
    data: inviterMembership,
    error: inviterMembershipError,
  } = await supabaseAdmin
    .from("team_members")
    .select("team_id, role_id, custom_permissions")
    .eq("user_id", inviterUser.id)
    .single();

  if (inviterMembershipError || !inviterMembership) {
    return jsonResponse(403, {
      success: false,
      error: "Only existing team members can send invites",
    });
  }

  let canManageTeams = inviterMembership.role_id === 1;

  if (!canManageTeams) {
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("can_manage_teams")
      .eq("role_id", inviterMembership.role_id)
      .single();

    if (roleError) {
      return jsonResponse(500, { success: false, error: "Unable to validate inviter role" });
    }

    const customPermission = inviterMembership.custom_permissions?.can_manage_teams;
    canManageTeams =
      typeof customPermission === "boolean"
        ? customPermission
        : Boolean(roleData?.can_manage_teams);
  }

  if (!canManageTeams) {
    return jsonResponse(403, {
      success: false,
      error: "You do not have permission to invite team members",
    });
  }

  const { data: teamData, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("default_role_id")
    .eq("team_id", inviterMembership.team_id)
    .single();

  if (teamError || !teamData) {
    return jsonResponse(500, { success: false, error: "Unable to load team defaults" });
  }

  const selectedRoleId = Number(body.roleId ?? teamData.default_role_id);
  if (!Number.isFinite(selectedRoleId)) {
    return jsonResponse(400, { success: false, error: "A valid role is required" });
  }

  const { data: selectedRole, error: selectedRoleError } = await supabaseAdmin
    .from("roles")
    .select("role_id")
    .eq("role_id", selectedRoleId)
    .single();

  if (selectedRoleError || !selectedRole) {
    return jsonResponse(400, { success: false, error: "Selected role does not exist" });
  }

  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existingInvite } = await supabaseAdmin
    .from("team_invites")
    .select("invite_id")
    .eq("team_id", inviterMembership.team_id)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite?.invite_id) {
    const { error: updateInviteError } = await supabaseAdmin
      .from("team_invites")
      .update({
        role_id: selectedRoleId,
        invited_by_user_id: inviterUser.id,
        expires_at: inviteExpiresAt,
      })
      .eq("invite_id", existingInvite.invite_id);

    if (updateInviteError) {
      return jsonResponse(500, {
        success: false,
        error: "Failed to refresh existing invite",
      });
    }
  } else {
    const { error: insertInviteError } = await supabaseAdmin.from("team_invites").insert({
      team_id: inviterMembership.team_id,
      email: normalizedEmail,
      role_id: selectedRoleId,
      invited_by_user_id: inviterUser.id,
      status: "pending",
      expires_at: inviteExpiresAt,
    });

    if (insertInviteError) {
      return jsonResponse(500, { success: false, error: "Failed to create invite" });
    }
  }

  let emailSent = true;

  const { error: inviteEmailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo: body.redirectTo,
    }
  );

  if (inviteEmailError) {
    const loweredMessage = inviteEmailError.message?.toLowerCase() || "";
    const alreadyRegistered =
      loweredMessage.includes("already") && loweredMessage.includes("registered");

    if (!alreadyRegistered) {
      return jsonResponse(500, {
        success: false,
        error: inviteEmailError.message || "Failed to send invite email",
      });
    }

    emailSent = false;
  }

  return jsonResponse(200, {
    success: true,
    emailSent,
    teamId: inviterMembership.team_id,
    roleId: selectedRoleId,
  });
});
