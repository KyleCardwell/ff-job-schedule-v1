import PropTypes from "prop-types";
import { useState } from "react";
import { FaEye } from "react-icons/fa";
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiEdit,
  FiX,
} from "react-icons/fi";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

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
  bgHoverColor,
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

  const handleViewClick = async (e) => {
    e.stopPropagation();
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
        className={`grid grid-cols-[1fr_1fr_1fr_150px] items-center sticky top-0 z-10 ${bgColor} hover:${bgHoverColor}`}
        onMouseEnter={() => setHoveredProjectId(project.project_id)}
        onMouseLeave={() => setHoveredProjectId(null)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 ml-2 py-2">
          <span className="ml-4 font-bold">{jobName}</span>
        </div>
        <span>{completedDate}</span>
        <div className="flex items-center justify-center gap-2 relative">
          {costingComplete ? (
            <FiCheck className="text-green-500" size={24} />
          ) : (
            <FiX className="text-red-500" size={24} />
          )}
          <span>{costingComplete ? "Complete" : "Incomplete"}</span>
          <button className="justify-self-end p-2 absolute right-2">
            {isExpanded ? (
              <FiChevronUp size={20} />
            ) : (
              <FiChevronDown size={20} />
            )}
          </button>
        </div>
        <div className="flex items-center justify-center h-full border-l border-gray-400">
          <button
            onClick={handleViewClick}
            className={`text-gray-600 hover:text-blue-900 mx-auto ${
              !canViewProfitLoss ? "hidden" : ""
            }`}
          >
            <FaEye size={20} />
          </button>
        </div>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className={`p-4 ${bgColor}`}>
            <div className="grid grid-cols-[100px_1fr_150px_150px] gap-px bg-gray-500 border border-gray-500">
              <div className="contents font-bold text-center">
                <span className="p-2 bg-gray-300">Job Number</span>
                <span className="p-2 bg-gray-300">Room Name</span>
                <span className="p-2 bg-gray-300">Costing Complete</span>
                <span className="p-2 bg-gray-300">Actions</span>
              </div>
              {project.tasks.map((task, index) => {
                const taskBgColor =
                  index % 2 === 0 ? "bg-gray-200" : "bg-white";
                const taskBgHoverColor =
                  index % 2 === 0
                    ? "group-hover/row:bg-blue-100"
                    : "group-hover/row:bg-blue-50";
                return (
                  <div
                    key={task.task_id}
                    className="contents group/row"
                    onMouseEnter={() => setHoveredTaskId(task.task_id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  >
                    <span className={`p-2 ${taskBgColor} ${taskBgHoverColor}`}>
                      {task.task_number}
                    </span>
                    <div
                      className={`relative p-2 ${taskBgColor} ${taskBgHoverColor}`}
                    >
                      <span>{task.task_name}</span>
                    </div>
                    <div
                      className={`relative p-2 ${taskBgColor} ${taskBgHoverColor} flex justify-center items-center flex justify-center items-center`}
                    >
                      {task.costing_complete ? (
                        <FiCheck className="text-green-500" size={24} />
                      ) : (
                        <FiX className="text-red-500" size={24} />
                      )}
                    </div>
                    <div
                      className={`${taskBgColor} ${taskBgHoverColor} flex justify-center items-center`}
                    >
                      <button
                        onClick={() =>
                          handleEditClick(
                            task.task_id,
                            task.task_name,
                            task.task_number
                          )
                        }
                        className={`text-blue-600 hover:text-blue-900 mx-auto ${
                          !canEditFinancials ? "hidden" : ""
                        }`}
                        aria-label="Edit estimate"
                      >
                        <FiEdit size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
