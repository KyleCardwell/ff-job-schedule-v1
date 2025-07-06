import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../../utils/supabase';

const TeamJoin = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [mode, setMode] = useState('join'); // 'join' or 'create'
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

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Find the team with matching invite code
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('team_id, default_role_id')
        .eq('invite_code', inviteCode)
        .single();

      if (teamError || !teamData) {
        setError('Invalid invite code. Please try again.');
        return;
      }

      // Add user to team_members
      const { error: insertError } = await supabase
        .from('team_members')
        .insert([
          {
            user_id: user.id,
            team_id: teamData.team_id,
            role_id: teamData.default_role_id
          }
        ]);

      if (insertError) {
        console.error('Error joining team:', insertError);
        setError('Error joining team. Please try again.');
        return;
      }

      // Force reload since we're already at "/"
      window.location.reload();

    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {mode === 'join' ? 'Join a Team' : 'Create a Team'}
        </h2>
        <div className="mt-2 text-center">
          <button
            onClick={() => setMode(mode === 'join' ? 'create' : 'join')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            {mode === 'join' ? 'Or create a new team' : 'Or join an existing team'}
          </button>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {mode === 'join' ? (
            <form onSubmit={handleJoinTeam}>
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                  Invite Code
                </label>
                <div className="mt-1">
                  <input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
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
                  {loading ? 'Joining...' : 'Join Team'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateTeam}>
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