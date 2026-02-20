import PropTypes from "prop-types";
import { useState } from "react";

import { supabase } from "../../utils/supabase";

const CompleteInviteProfile = ({ teamMemberId, userId, onComplete }) => {
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedFirstName = firstName.trim();

    if (!normalizedFirstName) {
      setError("Please enter your first name.");
      return;
    }

    if (normalizedFirstName.length > 50) {
      setError("First name is too long.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!userId) {
      setError("We could not verify your user account. Please sign in again.");
      return;
    }

    try {
      setSaving(true);

      let profileUpdateQuery = supabase
        .from("team_members")
        .update({ user_name: normalizedFirstName })
        .eq("user_id", userId);

      if (teamMemberId) {
        profileUpdateQuery = profileUpdateQuery.eq("team_member_id", teamMemberId);
      }

      const {
        data: updatedTeamMembers,
        error: teamMemberUpdateError,
      } = await profileUpdateQuery.select("team_member_id, user_name");

      if (teamMemberUpdateError) {
        throw new Error(teamMemberUpdateError.message || "Failed to save your first name.");
      }

      if (!updatedTeamMembers || updatedTeamMembers.length === 0) {
        throw new Error(
          "Could not save your first name. Please verify team member update permissions (RLS) and try again."
        );
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        password,
        data: { first_name: normalizedFirstName },
      });

      if (authUpdateError) {
        throw new Error(authUpdateError.message || "Failed to update your password.");
      }

      onComplete(normalizedFirstName);
    } catch (submitError) {
      setError(submitError.message || "Could not complete your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Finish Setting Up Your Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your first name and create your password to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="first-name"
                className="block text-sm font-medium text-gray-700"
              >
                First Name
              </label>
              <div className="mt-1">
                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  maxLength={50}
                  autoComplete="given-name"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={saving}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save and Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

CompleteInviteProfile.propTypes = {
  teamMemberId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  userId: PropTypes.string,
  onComplete: PropTypes.func.isRequired,
};

export default CompleteInviteProfile;
