import PropTypes from "prop-types";
import { useState } from "react";
import { FiCheck, FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { buttonClass } from "../../assets/tailwindConstants";
import { usePermissions } from "../../hooks/usePermissions";
import { Actions } from "../../redux/actions";
import {
  fetchProjectFinancials,
  fetchTaskFinancials,
} from "../../redux/actions/financialsData";

const CompletedProjectCard = ({
  project,
  setIsFinancialsInputModalOpen,
  setSelectedTask,
  bgColor,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { canEditFinancials, canViewProfitLoss } = usePermissions();
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [hoveredProjectId, setHoveredProjectId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const jobName = project.project_name;
  const completedDate = new Date(
    project.project_completed_at
  ).toLocaleDateString();

  const costingComplete = project.tasks.every((task) => task.costing_complete);

  const handleEditClick = (taskId, taskName, taskNumber) => {
    try {
      dispatch({ type: Actions.financialsData.CLEAR_TASK_FINANCIALS });
      setIsFinancialsInputModalOpen(true);
      dispatch(fetchTaskFinancials(taskId, project.project_id));
      setSelectedTask({
        task_id: taskId,
        task_name: taskName,
        task_number: taskNumber,
        project_name: project.project_name,
      });
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
    <div className={`border-b border-gray-300 ${bgColor}`}>
      <div
        className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center p-2"
        onMouseEnter={() => setHoveredProjectId(project.project_id)}
        onMouseLeave={() => setHoveredProjectId(null)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <span className="ml-2 font-bold">{jobName}</span>
          <button
            onClick={handleViewClick}
            className={`px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-opacity duration-200 ${
              hoveredProjectId === project.project_id
                ? "opacity-100"
                : "opacity-0"
            } ${!canViewProfitLoss ? "hidden" : ""}`}
          >
            View
          </button>
        </div>
        <span>{completedDate}</span>
        <div className="flex items-center justify-center gap-2">
          {costingComplete ? (
            <FiCheck className="text-green-500" size={24}/>
          ) : (
            <FiX className="text-red-500" size={24}/>
          )}
          <span>{costingComplete ? "Complete" : "Incomplete"}</span>
        </div>
        <div className="justify-self-end">
          <button
            // onClick={() => setIsExpanded(!isExpanded)}
            className="justify-self-end p-2"
          >
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>
      </div>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 bg-gray-100">
          <div className="grid grid-cols-[100px_1fr_150px] gap-px bg-gray-500 border border-gray-500">
            <div className="contents font-bold text-center">
              <span className="p-2 bg-gray-200">Job Number</span>
              <span className="p-2 bg-gray-200">Room Name</span>
              <span className="p-2 bg-gray-200">Costing Complete</span>
            </div>
            {project.tasks.map((task, index) => {
              const taskBgColor = index % 2 === 0 ? "bg-gray-50" : "bg-white";
              return (
                <div
                  key={task.task_id}
                  className="contents group"
                  onMouseEnter={() => setHoveredTaskId(task.task_id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                >
                  <span className={`p-2 ${taskBgColor} group-hover:bg-blue-50`}>
                    {task.task_number}
                  </span>
                  <div
                    className={`relative p-2 ${taskBgColor} group-hover:bg-blue-50`}
                  >
                    <button
                      onClick={() =>
                        handleEditClick(
                          task.task_id,
                          task.task_name,
                          task.task_number
                        )
                      }
                      className={`absolute left-2 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-opacity duration-200 ${
                        hoveredTaskId === task.task_id
                          ? "opacity-100"
                          : "opacity-0"
                      } ${!canEditFinancials ? "hidden" : ""}`}
                    >
                      Edit
                    </button>

                    <span>{task.task_name}</span>
                  </div>
                  <div
                    className={`relative p-2 ${taskBgColor} group-hover:bg-blue-50 flex justify-center items-center`}
                  >
                    {task.costing_complete ? (
                      <FiCheck className="text-green-500" size={24} />
                    ) : (
                      <FiX className="text-red-500" size={24} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

CompletedProjectCard.propTypes = {
  project: PropTypes.object.isRequired,
  setIsFinancialsInputModalOpen: PropTypes.func.isRequired,
  setSelectedTask: PropTypes.func.isRequired,
  bgColor: PropTypes.string,
};

export default CompletedProjectCard;
