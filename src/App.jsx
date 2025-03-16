import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ChartContainer } from "./components/ChartContainerGrid.jsx";
import CompletedJobsContainer from "./components/CompletedProjectsContainer.jsx";
import { setSession, clearSession, setUserTeam, clearAuth } from "./redux/authSlice";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabaseQuery } from "./hooks/useSupabase";
import { fetchProjects, fetchProjectsOptions } from "./redux/actions/projects";
import { fetchEmployees } from "./redux/actions/builders";
import { supabase } from "./utils/supabase";
import { fetchChartConfig } from "./redux/actions/chartConfig";

const authContainerStyle = {
  maxWidth: '400px',  // Adjust this width as needed
  margin: '100px auto', // Centers the container and adds top margin
  padding: '20px',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)', // Optional: adds subtle shadow
  borderRadius: '8px', // Optional: rounds corners
};

const App = () => {
	const dispatch = useDispatch();
	const { session, loading } = useSelector((state) => state.auth);
	const initialFetchDone = useRef(false);

	const fetchUserData = async (user) => {
		try {
			const { data: teamMemberData, error: teamMemberError } = await supabase
				.from('team_members')
				.select(`*`)
				.eq('user_id', user.id)
				.single();

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

		} catch (error) {
			console.error('Error fetching user data:', error);
		}
	};

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				dispatch(setSession(session));
				fetchUserData(session.user);
			}
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session) {
				dispatch(setSession(session));
				fetchUserData(session.user);
			} else {
				dispatch(clearSession());
				dispatch(clearAuth());
				initialFetchDone.current = false;
			}
		});

		return () => subscription.unsubscribe();
	}, [dispatch]);

	useEffect(() => {
		if (session && !initialFetchDone.current) {
			dispatch(fetchChartConfig());
			dispatch(fetchEmployees());
			dispatch(fetchProjects(fetchProjectsOptions));
			initialFetchDone.current = true;
		}
	}, [session, dispatch]);

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

	return (
		<Router>
			<div className="App h-screen">
				<ErrorBoundary>
					<Routes>
						<Route path="/" element={<ChartContainer />} />
						<Route path="/completed" element={<CompletedJobsContainer />} />
					</Routes>
				</ErrorBoundary>
			</div>
		</Router>
	);
};

export default App;
