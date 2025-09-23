import PropTypes from "prop-types";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { buttonClass } from "../../assets/tailwindConstants";
import { usePermissions } from "../../hooks/usePermissions";
import {
  fetchProjectFinancials,
  fetchTaskFinancials,
} from "../../redux/actions/financialsData";
import { FiCheck, FiX } from "react-icons/fi";

// const categories = ["Busybusy", "Alpha", "Probox", "Doors", "Other"];

const CompletedProjectCard = ({
  project,
  setIsFinancialsInputModalOpen,
  setSelectedTask,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { canEditFinancials, canViewProfitLoss } = usePermissions();
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [hoveredProjectId, setHoveredProjectId] = useState(null);
  const jobName = project.project_name;
  const completedDate = new Date(
    project.project_completed_at
  ).toLocaleDateString();

  const handleEditClick = async (taskId, taskName, taskNumber) => {
    try {
      const data = await dispatch(
        fetchTaskFinancials(taskId, project.project_id)
      );
      setSelectedTask({
        task_id: taskId,
        task_name: taskName,
        task_number: taskNumber,
        project_name: project.project_name,
      });
      setIsFinancialsInputModalOpen(true);
    } catch (error) {
      console.error("Error fetching financial data:", error);
    }
  };

  const handleViewClick = async () => {
    try {
      await dispatch(fetchProjectFinancials(project.project_id));
      navigate(`/completed/${project.project_id}`);
    } catch (error) {
      console.error("Error fetching financial data:", error);
    }
  };

  return (
    <div
      className="border border-gray-300 rounded-lg mb-5 p-4 shadow-sm bg-white"
      onMouseEnter={() => setHoveredProjectId(project.project_id)}
      onMouseLeave={() => setHoveredProjectId(null)}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <h2 className="text-lg font-bold">{jobName}</h2>
          <button
            onClick={handleViewClick}
            className={`${buttonClass} bg-blue-500 ${
              hoveredProjectId === project.project_id
                ? "opacity-100"
                : "opacity-0"
            } ${!canViewProfitLoss ? "hidden" : ""}`}
          >
            View
          </button>
        </div>
        <span className="completed-date">Shop Completed: {completedDate}</span>
      </div>
      <div className="grid grid-cols-[100px_1fr_150px] gap-px bg-gray-200 border border-gray-200">
        <div className="contents font-bold">
          <span className="p-2 bg-gray-100">Job Number</span>
          <span className="p-2 bg-gray-100">Room Name</span>
          <span className="p-2 bg-gray-100">Costing Complete</span>
        </div>
        {project.tasks.map((task, index) => {
          const bgColor = index % 2 === 0 ? "bg-gray-50" : "bg-white";
          return (
            <div
              key={task.task_id}
              className="contents group"
              onMouseEnter={() => setHoveredTaskId(task.task_id)}
              onMouseLeave={() => setHoveredTaskId(null)}
            >
              <span className={`p-2 ${bgColor} group-hover:bg-blue-50`}>
                {task.task_number}
              </span>
              <div className={`relative p-2 ${bgColor} group-hover:bg-blue-50`}>
                <button
                  onClick={() =>
                    handleEditClick(
                      task.task_id,
                      task.task_name,
                      task.task_number
                    )
                  }
                  className={`absolute left-2 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-opacity duration-200 ${
                    hoveredTaskId === task.task_id ? "opacity-100" : "opacity-0"
                  } ${!canEditFinancials ? "hidden" : ""}`}
                >
                  Edit
                </button>

                <span>{task.task_name}</span>
              </div>
              <div
                className={`relative p-2 ${bgColor} group-hover:bg-blue-50 flex justify-center items-center`}
              >
                {task.costing_complete ? (
                  <FiCheck className="text-green-500" size={20} />
                ) : (
                  <FiX className="text-red-500" size={20} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

CompletedProjectCard.propTypes = {
  project: PropTypes.object,
  setIsFinancialsInputModalOpen: PropTypes.func,
  setSelectedTask: PropTypes.func,
};

export default CompletedProjectCard;
