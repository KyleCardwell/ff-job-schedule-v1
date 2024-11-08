import React, { useEffect, useRef } from "react";
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
import { fetchProjects } from "./redux/actions/projects";
import { fetchEmployees } from "./redux/actions/builders";
import { supabase } from "./utils/supabase";

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
			dispatch(fetchEmployees());
			dispatch(
				fetchProjects({
					select: `*, tasks (task_id, project_id, task_number, task_name, task_active, task_created_at, subtasks (subtask_id, task_id, employee_id, duration, subtask_width, start_date, end_date, subtask_created_at))`,
				})
			);
			initialFetchDone.current = true;
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
