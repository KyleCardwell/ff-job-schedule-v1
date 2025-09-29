import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
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
  const [sortConfig, setSortConfig] = useState({
    key: "project",
    direction: "asc",
  });

  const handleFilterChange = (filters) => {
    dispatch(fetchCompletedProjects(filters));
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedProjects = useMemo(() => {
    if (!completedProjects) return [];
    
    const sorted = [...completedProjects];
    
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case "project":
            aValue = a.project_name?.toLowerCase() || "";
            bValue = b.project_name?.toLowerCase() || "";
            break;
          case "completed":
            aValue = new Date(a.project_completed_at);
            bValue = new Date(b.project_completed_at);
            break;
          case "costing":
            // Sort by number of incomplete tasks
            aValue = a.tasks.filter(t => !t.costing_complete).length;
            bValue = b.tasks.filter(t => !t.costing_complete).length;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sorted;
  }, [completedProjects, sortConfig]);

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
          <button
            onClick={() => handleSort("project")}
            className="p-2 font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            Project
            {sortConfig.key === "project" && (
              sortConfig.direction === "asc" ? (
                <FiChevronUp size={16} />
              ) : (
                <FiChevronDown size={16} />
              )
            )}
          </button>
          <button
            onClick={() => handleSort("completed")}
            className="p-2 font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            Shop Completed
            {sortConfig.key === "completed" && (
              sortConfig.direction === "asc" ? (
                <FiChevronUp size={16} />
              ) : (
                <FiChevronDown size={16} />
              )
            )}
          </button>
          <button
            onClick={() => handleSort("costing")}
            className="p-2 font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            Costing Complete
            {sortConfig.key === "costing" && (
              sortConfig.direction === "asc" ? (
                <FiChevronUp size={16} />
              ) : (
                <FiChevronDown size={16} />
              )
            )}
          </button>
          <span className="p-2 font-bold border-l border-gray-400">
            Actions
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 max-w-[1200px] mx-auto w-full">
        {sortedProjects?.map((project, index) => (
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
