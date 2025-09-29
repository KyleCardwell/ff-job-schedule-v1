import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchCompletedProjects } from "../../redux/actions/projects";
import FinancialsInputModal from "../financials/FinancialsInputModal.jsx";

import CompletedProjectCard from "./CompletedProjectCard.jsx";
import "./CompletedProjectsContainer.css";
import PdfCompletedListComponent from "./PdfCompletedListComponent.jsx";
import ProjectSearchFilter from "./ProjectSearchFilter.jsx";

const CompletedProjectsContainer = () => {
  const dispatch = useDispatch();
  const { completedProjects, loading, error } = useSelector(
    (state) => state.completedProjects
  );

  const [isFinancialsInputModalOpen, setIsFinancialsInputModalOpen] =
    useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleFilterChange = (filters) => {
    dispatch(fetchCompletedProjects(filters));
  };

  useEffect(() => {
    dispatch(fetchCompletedProjects());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600">
        Loading completed projects...
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full pb-6 bg-slate-800">
      {/* Fixed header */}
      <PdfCompletedListComponent completedProjects={completedProjects} />
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-10 bg-slate-800 px-6 pt-6 max-w-[1200px] mx-auto w-full">
        <ProjectSearchFilter onFilterChange={handleFilterChange} />
        <div className="grid grid-cols-[1fr_1fr_1fr_150px] bg-gray-200 border-b-2 border-gray-400 mt-4 text-center">
          <span className="p-2 font-bold">Project</span>
          <span className="p-2 font-bold">Shop Completed</span>
          <span className="p-2 font-bold">Costing Complete</span>
          <span className="p-2 font-bold border-l border-gray-400">
            Actions
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 max-w-[1200px] mx-auto w-full">
      {completedProjects?.map((project, index) => (
          <CompletedProjectCard
            key={project.project_id}
            project={project}
            setIsFinancialsInputModalOpen={setIsFinancialsInputModalOpen}
            setSelectedTask={setSelectedTask}
            index={index}
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

CompletedProjectsContainer.propTypes = {
  completedProjects: PropTypes.array,
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default CompletedProjectsContainer;
