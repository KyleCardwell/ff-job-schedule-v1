import React, { useEffect, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
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
import { fetchFeatureToggles } from "./redux/actions/featureToggles"; // Import the fetchFeatureToggles action
import {
  setSession,
  clearAuth,
  setUserTeam,
  setLoading,
} from "./redux/authSlice";
import TeamJoin from "./components/TeamJoin.jsx";
import AdminDashboard from "./components/adminDashboard/AdminDashboard.jsx";
import Navigation from "./components/Navigation";
import Header from "./components/Header"; // Import the new Header component
import { PATHS } from "./utils/constants.js";
import store from "./redux/store"; // Import the store
import ProtectedRoute from "./components/ProtectedRoute";
import GridLoader from "react-spinners/GridLoader";

const authContainerStyle = {
  maxWidth: "400px",
  margin: "100px auto",
  padding: "20px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  borderRadius: "8px",
};

const App = () => {
  const dispatch = useDispatch();
  const { session, loading: authLoading, teamId } = useSelector((state) => state.auth);
  const { loading: chartLoading } = useSelector((state) => state.chartData);
  const { loading: configLoading } = useSelector((state) => state.chartConfig);
  const { loading: buildersLoading } = useSelector((state) => state.builders);
  const initialFetchDone = useRef(false);
  const lastAuthFetch = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const isLoading = authLoading || (!initialFetchDone.current && (chartLoading || configLoading || buildersLoading));

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

        const { data: teamMemberData, error: teamMemberError } = await supabase
          .from("team_members")
          .select(`*`)
          .eq("user_id", session.user.id)
          .single();

        // If user not found in team_members, still set session but no team
        if (teamMemberError && teamMemberError.code === "PGRST116") {
          dispatch(setSession(session));
          return;
        }

        if (teamMemberError) throw teamMemberError;

        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select(
            "can_edit_projects, can_manage_teams, can_edit_schedule, can_edit_financials, can_view_profit_loss"
          )
          .eq("role_id", teamMemberData.role_id)
          .single();

        if (roleError) throw roleError;

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
    const fetchData = async () => {
      if (session && teamId && !initialFetchDone.current) {
        try {
          dispatch(fetchFeatureToggles()); // Add feature toggles fetch
          dispatch(fetchChartConfig());
          await dispatch(fetchEmployees());

          // Get first employee after employees are loaded
          const state = store.getState();
          const employees = state.builders.employees;
          if (employees?.length > 0) {
            await dispatch(fetchProjects(employees[0].employee_id));
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
            </Routes>
          </main>
          <Navigation isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </ErrorBoundary>
      </div>
    </Router>
  );
};

export default App;
