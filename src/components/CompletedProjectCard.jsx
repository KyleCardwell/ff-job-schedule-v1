import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchProjectFinancials, fetchTaskFinancials } from "../redux/actions/financialsData";
import { buttonClass } from "../assets/tailwindConstants";
import "./CompletedProjectCard.css";

const categories = ["Busybusy", "Alpha", "Probox", "Doors", "Other"];

const CompletedProjectCard = ({
  project,
  setIsFinancialsInputModalOpen,
  setSelectedTask,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [hoveredProjectId, setHoveredProjectId] = useState(null);
  const jobName = project.project_name;
  const completedDate = new Date(
    project.project_completed_at
  ).toLocaleDateString();

  const handleEditClick = async (taskId, taskName, taskNumber) => {
    try {
      const data = await dispatch(fetchTaskFinancials(taskId, project.project_id));
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
      className="completed-job-card"
      onMouseEnter={() => setHoveredProjectId(project.project_id)}
      onMouseLeave={() => setHoveredProjectId(null)}
    >
      <div className="card-header flex justify-between items-center">
        <div className="flex gap-4">
          <h2 className="text-lg font-bold">{jobName}</h2>
          <button
            onClick={handleViewClick}
            className={`${buttonClass} bg-blue-500 ${
              hoveredProjectId === project.project_id
                ? "opacity-100"
                : "opacity-0"
            }`}
          >
            View
          </button>
        </div>
        <span className="completed-date">Completed: {completedDate}</span>
      </div>
      <div className="room-grid">
        <div className="grid-row grid-header">
          <span>Job Number</span>
          <span>Room Name</span>
          {categories.map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
        {project.tasks.map((task, index) => (
          <div
            key={task.task_id}
            className={`grid-row room-row ${
              index % 2 === 0 ? "even" : "odd"
            } relative group`}
            onMouseEnter={() => setHoveredTaskId(task.task_id)}
            onMouseLeave={() => setHoveredTaskId(null)}
          >
            <span>{task.task_number}</span>
            <div className="relative">
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
                }`}
              >
                Edit
              </button>

              <span>{task.task_name}</span>
            </div>
            {categories.map((category) => (
              <span key={category}>
                <input type="checkbox" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompletedProjectCard;
