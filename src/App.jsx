import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import ErrorBoundary from "./components/ErrorBoundary";
import { ChartContainer } from "./components/ChartContainer";
import CompletedJobsContainer from "./components/CompletedProjectsContainer.jsx";

const App = () => {
  return (
    <Router>
      <div className="App">
        {/* <nav>
          <ul>
            <li>
              <Link to="/">Job Schedule</Link>
            </li>
            <li>
              <Link to="/completed">Completed Jobs</Link>
            </li>
          </ul>
        </nav> */}

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
