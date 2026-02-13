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
import AddToSchedule from "./components/estimates/AddToSchedule.jsx";
import EstimateDashboard from "./components/estimates/EstimateDashboard.jsx";
import EstimateLayout from "./components/estimates/EstimateLayout.jsx";
import EstimatePreview from "./components/estimates/EstimatePreview.jsx";
import EstimatesList from "./components/estimates/InProgressEstimates.jsx";
import MockAuth from "./mocks/mockAuth.js";
import { fetchEmployees } from "./redux/actions/builders";
import { fetchChartConfig } from "./redux/actions/chartConfig";
import { fetchFeatureToggles } from "./redux/actions/featureToggles";
import { fetchOverheadRate } from "./redux/actions/financialsData.js";
import { fetchServices } from "./redux/actions/services.js";
import {
  fetchTeamMemberData,
  fetchTeamMemberRole,
} from "./redux/actions/teamMembers.js";
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

const AppContent = () => {
  const dispatch = useDispatch();
  const { session, teamId } = useSelector((state) => state.auth);
  const { company_name, loading: configLoading } = useSelector(
    (state) => state.chartConfig
  );
  const { loading: featureTogglesLoading } = useSelector(
    (state) => state.featureToggles
  );

  const [authChecked, setAuthChecked] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const initialFetchDone = useRef(false);
  const fetchUserDataRef = useRef();

  useEffect(() => {
    if (company_name) {
      document.title = `${company_name} Schedule`;
    }
  }, [company_name]);

  const fetchUserData = useCallback(
    async (currentSession) => {
      if (!currentSession) {
        dispatch(clearAuth());
        initialFetchDone.current = false;
        setIsOpen(false);
        return;
      }

      const state = store.getState();
      if (state.auth.session?.user?.id === currentSession.user.id) {
        return;
      }

      try {
        dispatch(setLoading(true));
        const { teamMemberData, error: teamMemberError } =
          await fetchTeamMemberData(dispatch, currentSession.user.id);

        if (teamMemberError && teamMemberError.code === "PGRST116") {
          dispatch(setSession(currentSession));
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
        dispatch(setSession(currentSession));
        dispatch(fetchFeatureToggles());
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
    fetchUserDataRef.current = fetchUserData;
  }, [fetchUserData]);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        if (mounted) {
          fetchUserDataRef.current(currentSession);
        }
      })
      .finally(() => {
        if (mounted) {
          setAuthChecked(true);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        fetchUserDataRef.current(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session || !teamId || initialFetchDone.current) return;

      initialFetchDone.current = true;

      try {
        await Promise.all([
          dispatch(fetchChartConfig()),
          dispatch(fetchEmployees()),
          dispatch(fetchServices()),
          dispatch(fetchOverheadRate()),
        ]);
      } catch (error) {
        console.error("Error fetching initial app data:", error);
        initialFetchDone.current = false;
      }
    };

    fetchData();
  }, [session, teamId, dispatch]);

  // Show a global loader until auth is checked and critical data is loaded.
  if (!authChecked || featureTogglesLoading || configLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <GridLoader color="#4F46E5" />
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
            <Navigation isOpen={isOpen} onClose={() => setIsOpen(false)} />
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
                  path="in-progress"
                  element={
                    <ProtectedRoute>
                      <EstimatesList mode="draft" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="finalized"
                  element={
                    <ProtectedRoute>
                      <EstimatesList mode="finalized" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="archived"
                  element={
                    <ProtectedRoute>
                      <EstimatesList mode="archived" />
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
                <Route
                  path="in-progress/:estimateId/preview"
                  element={
                    <ProtectedRoute>
                      <EstimatePreview />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="finalized/:estimateId"
                  element={
                    <ProtectedRoute>
                      <EstimateLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="finalized/:estimateId/preview"
                  element={
                    <ProtectedRoute>
                      <EstimatePreview />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="finalized/:estimateId/schedule"
                  element={
                    <ProtectedRoute>
                      <AddToSchedule />
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
        </ErrorBoundary>
      </div>
    </Router>
  );
};

const App = () => {
  const isDevelopment = import.meta.env.DEV;
  const urlParams = new URLSearchParams(window.location.search);
  const useMockAuth = isDevelopment && urlParams.get("mock") === "true";

  if (useMockAuth) {
    return (
      <MockAuth>
        <AppContent />
      </MockAuth>
    );
  }

  return <AppContent />;
};

export default App;
