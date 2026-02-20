import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../../utils/supabase';

const TeamJoin = () => {
  const [teamName, setTeamName] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create new team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            team_name: teamName,
            invite_code: Math.random().toString(36).substring(2, 10), // Generate random invite code
            default_role_id: 3 // viewer
          }
        ])
        .select()
        .single();

      if (teamError) {
        console.error('Error creating team:', teamError);
        setError('Error creating team. Please try again.');
        return;
      }

      // Add user as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            user_id: user.id,
            team_id: teamData.team_id,
            role_id: 1 // admin for first user who creates team
          }
        ]);

      if (memberError) {
        console.error('Error joining team:', memberError);
        setError('Error joining team. Please try again.');
        return;
      }

      // Navigate to main app - App.jsx will handle fetching team data
      navigate('/');

    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMembership = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          You&apos;re Signed In
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <p className="text-sm text-gray-700">
            Ask a team admin to invite this email address. Once you accept the invite, click the button below.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleRefreshMembership}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              I Accepted My Invite
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowCreateTeam((previous) => !previous)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              {showCreateTeam
                ? 'Hide create team form'
                : 'Need to create your first team?'}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {showCreateTeam && (
            <form onSubmit={handleCreateTeam} className="mt-6 border-t border-gray-200 pt-6">
              <div>
                <label htmlFor="teamName" className="block text-sm font-medium text-gray-700">
                  Team Name
                </label>
                <div className="mt-1">
                  <input
                    id="teamName"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamJoin;