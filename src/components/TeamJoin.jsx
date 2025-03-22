import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { supabase } from '../utils/supabase';
import { setUserTeam } from '../redux/authSlice';

const TeamJoin = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if user is already in a team
      const { data: existingMember, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') { 
        console.error('Error fetching existing member:', memberError);
        setError('Error checking membership. Please try again.');
        return;
      }

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

      if (existingMember) {
        if (existingMember.team_id) {
          setError('You are already a member of a team.');
          return;
        }

        // Update existing team_member record
        const { error: updateError } = await supabase
          .from('team_members')
          .update({
            team_id: teamData.team_id,
            role_id: teamData.default_role_id
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating team member:', updateError);
          setError('Error joining team. Please try again.');
          return;
        }
      } else {
        // Add new user to team_members
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
      }

      // Update Redux state with team info (minimal info needed to trigger App.jsx reload)
      dispatch(setUserTeam({
        teamId: teamData.team_id,
        roleId: teamData.default_role_id
      }));

      // Redirect to main app
      navigate('/');

    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join your team
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your team's invite code to get started
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="invite-code" className="sr-only">
                Invite Code
              </label>
              <input
                id="invite-code"
                name="invite-code"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </>
              ) : (
                'Join Team'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamJoin;