import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ChartContainer } from "./components/ChartContainerGrid.jsx";
import CompletedJobsContainer from "./components/CompletedProjectsContainer.jsx";
import CompletedProjectView from "./components/completedProjects/CompletedProjectView";
import { setSession, clearSession } from "./redux/authSlice";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabaseQuery } from "./hooks/useSupabase";
import { fetchProjects, fetchProjectsOptions } from "./redux/actions/projects";
import { fetchEmployees } from "./redux/actions/builders";
import { supabase } from "./utils/supabase";
import { fetchChartConfig } from "./redux/actions/chartConfig";

const authContainerStyle = {
  maxWidth: '400px',
  margin: '100px auto',
  padding: '20px',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  borderRadius: '8px',
};

const App = () => {
	const dispatch = useDispatch();
	const { session, loading } = useSelector((state) => state.auth);
	const initialFetchDone = useRef(false);

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			dispatch(setSession(session));
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session) {
				dispatch(setSession(session));
			} else {
				dispatch(clearSession());
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
						<Route path="/completed/:projectId" element={<CompletedProjectView />} />
					</Routes>
				</ErrorBoundary>
			</div>
		</Router>
	);
};

export default App;
