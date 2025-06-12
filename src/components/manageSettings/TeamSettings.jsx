import React, { forwardRef, useState, useImperativeHandle, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { supabase } from '../../utils/supabase';
import { fetchTeamMembers, fetchUserRoles } from '../../redux/actions/teamMembers';

const TeamSettings = forwardRef((props, ref) => {
  const [teams, setTeams] = useState([]);
  const dispatch = useDispatch();
  const teamId = useSelector((state) => state.auth.teamId);
  const { teamMembers, userRoles, loading, error } = useSelector((state) => state.teamMembers);
  
  // Expose save and cancel methods to parent
  useImperativeHandle(ref, () => ({
    handleSave: async () => {
      // Implement save logic here
    },
    handleCancel: () => {
      // Implement cancel logic here
    }
  }));

  useEffect(() => {
    const loadUserRoles = async () => {
      try {
        await fetchUserRoles(dispatch);
      } catch (err) {
        // Error is handled by the action and reducer
        console.error('Failed to load user roles:', err);
      }
    };

    loadUserRoles();
  }, []);

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (teamId) {
        try {
          await fetchTeamMembers(dispatch, teamId);
        } catch (err) {
          // Error is handled by the action and reducer
          console.error('Failed to load team members:', err);
        }
      }
    };

    loadTeamMembers();
  }, [dispatch, teamId]);

  if (loading) return <div className="p-4">Loading teams and team members...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-slate-200">Manage Teams and Team Members</h2>
      
      {/* Teams List */}
      <div className="space-y-4">
        {teams.map(team => (
          <div 
            key={team.id} 
            className="bg-slate-700 p-4 rounded-lg shadow"
          >
            <h3 className="text-lg font-semibold text-slate-200">{team.name}</h3>
            
            {/* Team Members List */}
            <div className="space-y-4 mt-4">
              {teamMembers && teamMembers.map(member => (
                <div 
                  key={member.id} 
                  className="bg-slate-600 p-4 rounded-lg shadow flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-slate-200">
                      {member.users?.email}
                    </h3>
                    <p className="text-slate-400">
                      Role: {member.roles?.name || 'No Role'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add Team Member Button */}
            <button 
              className="mt-4 px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
            >
              Add Team Member
            </button>
          </div>
        ))}
      </div>

      {/* Add Team Button */}
      <button 
        className="mt-4 px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
      >
        Add New Team
      </button>
    </div>
  );
});

TeamSettings.displayName = 'TeamSettings';

export default TeamSettings;
