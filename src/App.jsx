import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ChartContainer } from "./components/ChartContainerGrid.jsx";
import CompletedJobsContainer from "./components/CompletedProjectsContainer.jsx";
import CompletedProjectView from "./components/completedProjects/CompletedProjectView";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "./utils/supabase";
import { fetchProjects, fetchProjectsOptions } from "./redux/actions/projects";
import { fetchEmployees } from "./redux/actions/builders";
import { fetchChartConfig } from "./redux/actions/chartConfig";
import { setSession, clearAuth, setUserTeam, setLoading } from "./redux/authSlice";
import { usePermissions } from "./hooks/usePermissions";
import TeamJoin from "./components/TeamJoin.jsx";

const authContainerStyle = {
  maxWidth: '400px',
  margin: '100px auto',
  padding: '20px',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  borderRadius: '8px',
};

const ProtectedRoute = ({ children }) => {
  const { canViewProfitLoss } = usePermissions();
  
  if (!canViewProfitLoss) {
    return <Navigate to="/completed" replace />;
  }

  return children;
};

const App = () => {
	const dispatch = useDispatch();
	const { session, loading, teamId } = useSelector((state) => state.auth);
	const initialFetchDone = React.useRef(false);
	const lastAuthFetch = React.useRef(null);

	const fetchUserData = useCallback(async (session) => {
		if (!session) {
			dispatch(clearAuth());
			initialFetchDone.current = false;
			return;
		}

		// Debounce auth fetches by 1 second
		const now = Date.now();
		if (lastAuthFetch.current && now - lastAuthFetch.current < 1000) {
			return;
		}
		lastAuthFetch.current = now;

		try {
			dispatch(setLoading(true));
			
			const { data: teamMemberData, error: teamMemberError } = await supabase
				.from('team_members')
				.select(`*`)
				.eq('user_id', session.user.id)
				.single();

			// If user not found in team_members, still set session but no team
			if (teamMemberError && teamMemberError.code === 'PGRST116') {
				dispatch(setSession(session));
				return;
			}

			if (teamMemberError) throw teamMemberError;

			const { data: roleData, error: roleError } = await supabase
				.from('roles')
				.select('permissions')
				.eq('role_id', teamMemberData.role_id)
				.single();

			if (roleError) throw roleError;

			dispatch(setUserTeam({
				teamId: teamMemberData.team_id,
				teamName: teamMemberData.team_name,
				roleId: teamMemberData.role_id,
				permissions: roleData.permissions
			}));

			dispatch(setSession(session));
		} catch (error) {
			console.error('Error fetching user data:', error);
			dispatch(clearAuth());
		} finally {
			dispatch(setLoading(false));
		}
	}, [dispatch]);

	useEffect(() => {
		let mounted = true;

		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (mounted) {
				fetchUserData(session);
			}
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (mounted) {
				fetchUserData(session);
			}
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, [fetchUserData]);

	useEffect(() => {
		if (session && teamId && !initialFetchDone.current) {
			dispatch(fetchChartConfig());
			dispatch(fetchEmployees());
			dispatch(fetchProjects(fetchProjectsOptions));
			initialFetchDone.current = true;
		}
	}, [session, teamId, dispatch]);

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!session) {
		return (
			<div style={authContainerStyle}>
				<Auth
					supabaseClient={supabase}
					appearance={{ theme: ThemeSupa }}
					providers={[]}
				/>
			</div>
		);
	}

	// Show TeamJoin if user is logged in but has no team
	if (!teamId) {
		return (
			<Router>
				<TeamJoin />
			</Router>
		);
	}

	return (
		<Router>
			<div className="App h-screen">
				<ErrorBoundary>
					<Routes>
						<Route path="/" element={<ChartContainer />} />
						<Route path="/completed" element={<CompletedJobsContainer />} />
						<Route 
							path="/completed/:projectId" 
							element={
								<ProtectedRoute>
									<CompletedProjectView />
								</ProtectedRoute>
							} 
						/>
					</Routes>
				</ErrorBoundary>
			</div>
		</Router>
	);
};

export default App;
