import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import React, { useEffect, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	BrowserRouter as Router,
	Route,
	Routes,
	Navigate,
} from "react-router-dom";
import GridLoader from "react-spinners/GridLoader";

import AdminDashboard from "./components/adminDashboard/AdminDashboard.jsx";
import { ChartContainer } from "./components/ChartContainerGrid.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import Header from "./components/common/Header.jsx";
import Navigation from "./components/common/Navigation.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import TeamJoin from "./components/common/TeamJoin.jsx";
import CompletedJobsContainer from "./components/completedProjects/CompletedProjectsContainer.jsx";
import CompletedProjectView from "./components/completedProjects/CompletedProjectView.jsx";
import EstimateDashboard from "./components/estimates/EstimateDashboard.jsx";
import EstimateLayout from "./components/estimates/EstimateLayout.jsx";
import InProgressEstimates from "./components/estimates/InProgressEstimates.jsx";
import { fetchEmployees } from "./redux/actions/builders";
import { fetchChartConfig } from "./redux/actions/chartConfig";
import { fetchFeatureToggles } from "./redux/actions/featureToggles";
import { defineHolidays } from "./redux/actions/holidays.js";
import { fetchProjects } from "./redux/actions/projects";
import {
	fetchTeamMemberData,
	fetchTeamMemberRole,
} from "./redux/actions/teamMembers.js";
import { Actions } from "./redux/actions.js";
import {
	setSession,
	clearAuth,
	setUserTeam,
	setLoading,
} from "./redux/authSlice";
import store from "./redux/store";
import { PATHS } from "./utils/constants.js";
import { supabase } from "./utils/supabase";

const authContainerStyle = {
	maxWidth: "400px",
	margin: "100px auto",
	padding: "20px",
	boxShadow: "0 0 10px rgba(0,0,0,0.1)",
	borderRadius: "8px",
};

const App = () => {
	const dispatch = useDispatch();
	const {
		session,
		loading: authLoading,
		teamId,
	} = useSelector((state) => state.auth);
	const { loading: chartLoading } = useSelector((state) => state.chartData);
	const { loading: configLoading, company_name } = useSelector((state) => state.chartConfig);
	const { loading: buildersLoading } = useSelector((state) => state.builders);
	const initialFetchDone = useRef(false);
	const lastAuthFetch = useRef(null);
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (company_name) {
			document.title = `${company_name} Schedule`;
		}
	}, [company_name]);

	const fetchUserData = useCallback(
		async (session) => {
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

				const { teamMemberData, error: teamMemberError } =
					await fetchTeamMemberData(dispatch, session.user.id);

				// If user not found in team_members, still set session but no team
				if (teamMemberError && teamMemberError.code === "PGRST116") {
					dispatch(setSession(session));
					return;
				}

				const roleData = await fetchTeamMemberRole(
					dispatch,
					teamMemberData.role_id
				);

				dispatch(
					setUserTeam({
						teamId: teamMemberData.team_id,
						teamName: teamMemberData.team_name,
						roleId: teamMemberData.role_id,
						permissions: roleData,
						customPermissions: teamMemberData.custom_permissions,
					})
				);

				dispatch(setSession(session));
			} catch (error) {
				console.error("Error fetching user data:", error);
				dispatch(clearAuth());
			} finally {
				dispatch(setLoading(false));
			}
		},
		[dispatch]
	);

	useEffect(() => {
		let mounted = true;

		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (mounted) {
				// Fetch feature toggles as soon as we have a session
				if (session) {
					dispatch(fetchFeatureToggles());
				}
				fetchUserData(session);
			}
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (mounted) {
				// Fetch feature toggles on auth state change if we have a session
				if (session) {
					dispatch(fetchFeatureToggles());
				}
				fetchUserData(session);
			}
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, [fetchUserData, dispatch]);

	useEffect(() => {
		const fetchData = async () => {
			if (session && teamId && !initialFetchDone.current) {
				try {
					dispatch(fetchFeatureToggles()); // Add feature toggles fetch
					await dispatch(fetchChartConfig());
					await dispatch(fetchEmployees());

					// Get first employee after employees are loaded
					const state = store.getState();
					const employees = state.builders.employees;
					if (employees?.length > 0) {
						// await dispatch(fetchProjects(employees[0].employee_id));

						// After all data is loaded, we can create the holiday map
						const currentState = store.getState();
						const { chartStartDate, chartEndDate } = currentState.chartData;
						const { standardHolidays, customHolidays } = currentState.holidays;

						if (
							chartStartDate &&
							chartEndDate &&
							standardHolidays &&
							customHolidays
						) {
							const holidayMap = defineHolidays(
								chartStartDate,
								chartEndDate,
								standardHolidays,
								customHolidays
							);
							// You can either dispatch this to store or use it directly
							dispatch({
								type: Actions.holidays.SET_HOLIDAY_MAP,
								payload: holidayMap,
							});
						}
					}

					initialFetchDone.current = true;
				} catch (error) {
					console.error("Error fetching data:", error);
				}
			}
		};

		fetchData();
	}, [session, teamId, dispatch]);

	useEffect(() => {
		setIsOpen(false);
	}, [session]);

	const isLoading =
		authLoading ||
		(!initialFetchDone.current &&
			(chartLoading || configLoading || buildersLoading));

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<GridLoader color="#4F46E5" />
					<p className="mt-4 text-gray-600">Loading Job Schedule...</p>
				</div>
			</div>
		);
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
			<div className="App min-h-screen bg-gray-50">
				<ErrorBoundary>
					<Header onMenuClick={() => setIsOpen(!isOpen)} isMenuOpen={isOpen} />
					<main className="pt-[50px] flex-1 h-screen">
						<Routes>
							<Route path={PATHS.HOME} element={<ChartContainer />} />
							<Route
								path={`${PATHS.MANAGE}/*`}
								element={
									<ProtectedRoute>
										<AdminDashboard />
									</ProtectedRoute>
								}
							/>
							<Route path={PATHS.ESTIMATES}>
								<Route
									index
									element={
										<ProtectedRoute>
											<EstimateDashboard />
										</ProtectedRoute>
									}
								/>
								<Route
									path={PATHS.IN_PROGRESS_ESTIMATES}
									element={
										<ProtectedRoute>
											<InProgressEstimates />
										</ProtectedRoute>
									}
								/>
								<Route
									path={PATHS.NEW_ESTIMATE}
									element={
										<ProtectedRoute>
											<EstimateLayout />
										</ProtectedRoute>
									}
								/>
								<Route
									path={PATHS.IN_PROGRESS_ESTIMATES + "/:estimateId"}
									element={
										<ProtectedRoute>
											<EstimateLayout />
										</ProtectedRoute>
									}
								/>
							</Route>
							<Route
								path={PATHS.COMPLETED}
								element={<CompletedJobsContainer />}
							/>
							<Route
								path={PATHS.COMPLETED_PROJECT}
								element={
									<ProtectedRoute>
										<CompletedProjectView />
									</ProtectedRoute>
								}
							/>
							<Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
						</Routes>
					</main>
					<Navigation isOpen={isOpen} onClose={() => setIsOpen(false)} />
				</ErrorBoundary>
			</div>
		</Router>
	);
};

export default App;
