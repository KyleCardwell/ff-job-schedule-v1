import PropTypes from "prop-types";
import { forwardRef, useState, useImperativeHandle, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

import {
  fetchTeamMembers,
  fetchUserRoles,
  inviteTeamMember,
  updateTeamMembers,
} from "../../redux/actions/teamMembers";
import { fetchTeamData } from "../../redux/actions/teams";
import ErrorModal from "../common/ErrorModal.jsx";

import TeamContactInfo from "./TeamContactInfo.jsx";
import TeamLogo from "./TeamLogo.jsx";
import TeamMemberRow from "./TeamMemberRow.jsx";

const TeamSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const teamId = useSelector((state) => state.auth.teamId);
  const { teamMembers, userRoles, loading, error } = useSelector(
    (state) => state.teamMembers
  );
  const { teamData } = useSelector((state) => state.teams);
  const [localTeamMembers, setLocalTeamMembers] = useState([]);
  const [originalTeamMembers, setOriginalTeamMembers] = useState([]); // Store original state
  const [adminError, setAdminError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState(null);

  // Get all possible permissions from the first role's permissions object
  const permissionTypes = userRoles?.[0]?.permissions
    ? Object.keys(userRoles[0].permissions)
    : [];

  // Helper to check if a role has admin privileges and no overrides
  const isAdminRole = (roleId, customPermissions = {}) => {
    const role = userRoles?.find((r) => r.role_id === Number(roleId));
    // Check if role has admin permission
    const hasAdminRole = role?.permissions?.can_manage_teams === true;
    // For admin roles, ensure there are NO custom permission overrides at all
    const hasNoOverrides = hasAdminRole
      ? Object.keys(customPermissions).length === 0
      : true;
    return hasAdminRole && hasNoOverrides;
  };

  const handleAdminErrorClose = () => {
    setAdminError(null);
  };

  // Expose save and cancel methods to parent
  useImperativeHandle(ref, () => ({
    handleSave: async () => {
      try {
        // Check if save would remove all admins
        const hasAdmin = localTeamMembers.some((member) =>
          isAdminRole(member.role_id, member.custom_permissions)
        );
        if (!hasAdmin) {
          setAdminError(
            "Cannot save changes. At least one team member must have admin privileges with no permission overrides."
          );
          return;
        }

        // Find changed members
        const changedMembers = localTeamMembers
          .map((member) => {
            const originalMember = originalTeamMembers.find(
              (m) => m.team_member_id === member.team_member_id
            );
            const permissionsChanged =
              JSON.stringify(member.custom_permissions) !==
              JSON.stringify(originalMember?.custom_permissions);
            const roleChanged = member.role_id !== originalMember?.role_id;

            if (permissionsChanged || roleChanged) {
              return {
                team_member_id: member.team_member_id,
                role_id: member.role_id,
                custom_permissions: member.custom_permissions,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (changedMembers.length > 0) {
          await updateTeamMembers(dispatch, changedMembers);
          await fetchTeamMembers(dispatch, teamId);
          setOriginalTeamMembers(localTeamMembers);
        }
      } catch (error) {
        console.error("Error saving team member changes:", error);
        setAdminError("Failed to save changes. Please try again.");
      }
    },
    handleCancel: () => {
      setLocalTeamMembers(originalTeamMembers);
    },
  }));

  // Load user roles on mount
  useEffect(() => {
    fetchUserRoles(dispatch);
  }, [dispatch]);

  // Load team data and team members when we have a teamId
  useEffect(() => {
    if (teamId) {
      fetchTeamData(dispatch, teamId);
      fetchTeamMembers(dispatch, teamId);
    }
  }, [dispatch, teamId]);

  // Update local state when team members or roles change
  useEffect(() => {
    if (teamMembers && userRoles) {
      setLocalTeamMembers(teamMembers);
      setOriginalTeamMembers(teamMembers);
    }
  }, [teamMembers, userRoles]);

  useEffect(() => {
    if (!inviteRoleId && userRoles?.length) {
      const viewerRole = userRoles.find((role) =>
        role.role_name?.toLowerCase().includes("viewer")
      );
      setInviteRoleId(String(viewerRole?.role_id || userRoles[0].role_id));
    }
  }, [inviteRoleId, userRoles]);

  const handlePermissionChange = (memberId, newPermissions) => {
    setLocalTeamMembers((members) =>
      members.map((member) =>
        member.team_member_id === memberId
          ? { ...member, custom_permissions: newPermissions }
          : member
      )
    );
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    setInviteFeedback(null);

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      setInviteFeedback({ type: "error", message: "Please enter a valid email address." });
      return;
    }

    if (!inviteRoleId) {
      setInviteFeedback({ type: "error", message: "Please select a role for the invite." });
      return;
    }

    try {
      setInviteLoading(true);

      const result = await inviteTeamMember({
        email: normalizedEmail,
        roleId: Number(inviteRoleId),
        redirectTo: window.location.origin,
      });

      const successMessage = result?.emailSent
        ? `Invite sent to ${normalizedEmail}.`
        : `Invite saved for ${normalizedEmail}. Have them sign in with that email to join.`;

      setInviteFeedback({ type: "success", message: successMessage });
      setInviteEmail("");
    } catch (error) {
      setInviteFeedback({
        type: "error",
        message: error?.message || "Failed to send invite. Please try again.",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = (memberId, newRoleId) => {
    setLocalTeamMembers((members) =>
      members.map((member) =>
        member.team_member_id === memberId
          ? {
              ...member,
              role_id: newRoleId,
              custom_permissions: {}, // Clear custom permissions when role changes
            }
          : member
      )
    );
  };

  if (loading) return <div className="p-4">Loading team members...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="mt-4 flex justify-center h-full pb-10">
      <div className={`flex-1 flex flex-col ${maxWidthClass}`}>
        <h2 className="text-xl font-bold mb-6 text-slate-200">
          Team Settings
        </h2>

        {/* Company Info Section */}
        <div className="space-y-6 mb-8">
          <TeamContactInfo teamData={teamData} />
          <TeamLogo teamData={teamData} />
        </div>

        {/* Team Members Section */}
        <h3 className="text-lg font-semibold mb-4 text-slate-200">
          Manage Team Members
        </h3>

        <div className="bg-slate-700 p-4 rounded-lg shadow mb-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-200 mb-3">
            Invite Team Member
          </h4>
          <form
            className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-3 items-end"
            onSubmit={handleInviteSubmit}
          >
            <div>
              <label
                htmlFor="invite-email"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="new.member@company.com"
                className="w-full rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                required
              />
            </div>

            <div>
              <label
                htmlFor="invite-role"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRoleId}
                onChange={(event) => setInviteRoleId(event.target.value)}
                className="w-full rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {userRoles?.map((role) => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={inviteLoading}
              className="h-[38px] rounded bg-teal-400 px-4 text-sm font-semibold text-slate-900 hover:bg-teal-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {inviteLoading ? "Sending..." : "Send Invite"}
            </button>
          </form>

          {inviteFeedback && (
            <p
              className={`mt-3 text-sm ${
                inviteFeedback.type === "error" ? "text-red-300" : "text-emerald-300"
              }`}
            >
              {inviteFeedback.message}
            </p>
          )}
        </div>

        <div className="bg-slate-700 p-4 rounded-lg shadow relative">
          {/* Fade out effect - moved outside the scroll container */}
          <div className="absolute right-4 top-4 bottom-4 w-16 bg-gradient-to-l from-slate-700 to-transparent pointer-events-none z-30"></div>

          <div className="overflow-x-auto w-full">
            <div
              className="grid auto-cols-fr"
              style={{
                gridTemplateColumns: `150px 150px ${permissionTypes
                  .map(() => "150px")
                  .join(" ")}`,
                width: "fit-content",
                minWidth: "100%",
              }}
            >
              {/* Header */}
              <div className="contents">
                <div className="sticky left-0 z-20 bg-slate-800 px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider">
                  Name
                </div>
                <div className="sticky left-[150px] z-20 bg-slate-800 px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider">
                  Role
                </div>
                {permissionTypes.map((permission) => (
                  <div
                    key={permission}
                    className="bg-slate-800 px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider"
                  >
                    {permission.replace("can_", "").replace(/_/g, " ")}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {localTeamMembers?.map((member) => (
                <TeamMemberRow
                  key={member.team_member_id}
                  member={member}
                  userRoles={userRoles}
                  permissionTypes={permissionTypes}
                  onPermissionChange={handlePermissionChange}
                  onRoleChange={handleRoleChange}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <ErrorModal message={adminError} onClose={handleAdminErrorClose} />
    </div>
  );
});

TeamSettings.displayName = "TeamSettings";

TeamSettings.propTypes = {
  maxWidthClass: PropTypes.string,
};

export default TeamSettings;
