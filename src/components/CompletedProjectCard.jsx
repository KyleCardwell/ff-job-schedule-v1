import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { fetchTaskFinancials } from "../redux/actions/financialsData";
import "./CompletedProjectCard.css";

const categories = ["Busybusy", "Alpha", "Probox", "Doors", "Other"];

const CompletedProjectCard = ({
  project,
  setIsFinancialsInputModalOpen,
  setSelectedTask,
}) => {
  const dispatch = useDispatch();
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const jobName = project.project_name;
  const completedDate = new Date(
    project.project_completed_at
  ).toLocaleDateString();

  const handleEditClick = (taskId, taskName, taskNumber) => {
    dispatch(fetchTaskFinancials(taskId))
      .then((data) => {
        console.log("Fetched financial data:", data);
        // Handle the fetched data as needed
        setSelectedTask({
          task_id: taskId,
          task_name: taskName,
          task_number: taskNumber,
          project_name: project.project_name,
        });
        setIsFinancialsInputModalOpen(true);
      })
      .catch((error) => {
        console.error("Error fetching financial data:", error);
      });
  };

  return (
    <div className="completed-job-card">
      <div className="card-header">
        <h2 className="text-lg font-bold">{jobName}</h2>
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
