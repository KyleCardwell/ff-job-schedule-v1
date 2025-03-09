import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CompletedProjectCard from "./CompletedProjectCard";
import ChartActionButtons from "./ChartActionButtons";
import { fetchCompletedProjects } from "../redux/actions/projects";
import FinancialsInputModal from "./financials/FinancialsInputModal";
import ProjectSearchFilter from "./ProjectSearchFilter";
import "./CompletedProjectsContainer.css";

const CompletedProjectsContainer = () => {
  const dispatch = useDispatch();
  const { completedProjects, loading, error } = useSelector(
    (state) => state.completedProjects
  );

  const [isFinancialsInputModalOpen, setIsFinancialsInputModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleFilterChange = (filters) => {
    dispatch(fetchCompletedProjects(filters));
  };

  useEffect(() => {
    dispatch(fetchCompletedProjects());
  }, [dispatch]);

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading completed projects...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Completed Jobs</h1>
      <ChartActionButtons />
      <ProjectSearchFilter onFilterChange={handleFilterChange} />
      <div className="space-y-6">
        {completedProjects?.map((project) => (
          <CompletedProjectCard
            key={project.project_id}
            project={project}
            setIsFinancialsInputModalOpen={setIsFinancialsInputModalOpen}
            setSelectedTask={setSelectedTask}
          />
        ))}
      </div>
      <FinancialsInputModal
        isOpen={isFinancialsInputModalOpen}
        onClose={() => setIsFinancialsInputModalOpen(false)}
        selectedTask={selectedTask}
      />
    </div>
  );
};

export default CompletedProjectsContainer;
