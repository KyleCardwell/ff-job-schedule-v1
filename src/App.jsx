import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import ErrorBoundary from "./components/ErrorBoundary";
import { ChartContainer } from "./components/ChartContainer";
import CompletedJobsContainer from "./components/CompletedProjectsContainer.jsx";
import { setSession, clearSession } from "./redux/authSlice";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabaseQuery } from "./hooks/useSupabase";
import { fetchProjectDateRange, fetchProjects } from "./redux/actions/projects";
import { fetchEmployees } from "./redux/actions/builders";
// Initialize Supabase client
const supabase = createClient(
	import.meta.env.VITE_FF_JS_SUPABASE_URL,
	import.meta.env.VITE_FF_JS_SUPABASE_ANON_KEY
);

const App = () => {
	const dispatch = useDispatch();
	const { session, loading } = useSelector((state) => state.auth);

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
			}
		});

		return () => subscription.unsubscribe();
	}, [dispatch]);

	useEffect(() => {
		if (session) {
			dispatch(fetchProjectDateRange());
			dispatch(
				fetchProjects({
					select: `*, tasks (*, subTasks (*))`,
				})
			);
			dispatch(fetchEmployees());

		}
	}, [session, dispatch]);

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!session) {
		return (
			<Auth
				supabaseClient={supabase}
				appearance={{ theme: ThemeSupa }}
				providers={["google"]}
			/>
		);
	}

	return (
		<Router>
			<div className="App">
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
