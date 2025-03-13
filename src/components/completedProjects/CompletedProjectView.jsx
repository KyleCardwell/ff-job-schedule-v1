import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProjectFinancials,
  fetchTaskFinancials,
} from "../../redux/actions/financialsData";
import { buttonClass } from "../../assets/tailwindConstants";

const categories = ["Busybusy", "Alpha", "Probox", "Doors", "Other"];

const CompletedProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedTask, setSelectedTask] = useState(null);
  const [isFinancialsModalOpen, setIsFinancialsModalOpen] = useState(false);

  // Get financials from Redux store
  const {
    projectFinancials,
    loading,
    error: projectFinancialsError,
  } = useSelector((state) => state.financialsData);
  const project = projectFinancials?.find((p) => p.project_id === +projectId);

  useEffect(() => {
    if (
      projectId &&
      (!projectFinancials || projectFinancials.length === 0) &&
      !projectFinancialsError
    ) {
      dispatch(fetchProjectFinancials(projectId));
    }
  }, [projectId, projectFinancials, dispatch, projectFinancialsError]);

  const handleEditClick = (taskId, taskName, taskNumber) => {
    dispatch(fetchTaskFinancials(taskId, projectId))
      .then((data) => {
        setSelectedTask({
          task_id: taskId,
          task_name: taskName,
          task_number: taskNumber,
          project_name: project?.project_name,
        });
        setIsFinancialsModalOpen(true);
      })
      .catch((error) => {
        console.error("Error fetching financial data:", error);
      });
  };

  // Check for error first
  if (projectFinancialsError) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/completed")}
          className={`${buttonClass} bg-blue-500 mb-4`}
        >
          Back to Projects
        </button>
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">{projectFinancialsError}</p>
        </div>
      </div>
    );
  }

  // Then check loading state
  if (loading) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/completed")}
          className={`${buttonClass} bg-blue-500 mb-4`}
        >
          Back to Projects
        </button>
        <div className="text-center">
          <p className="text-xl font-semibold">Loading project...</p>
        </div>
      </div>
    );
  }

  // Finally check for data
  if (!project || !projectFinancials?.length) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/completed")}
          className={`${buttonClass} bg-blue-500 mb-4`}
        >
          Back to Projects
        </button>
        <div className="text-center">
          <p className="text-xl font-semibold">Project not found</p>
        </div>
      </div>
    );
  }

  const completedDate = new Date(
    project.project_completed_at
  ).toLocaleDateString();
  const dateUpdated = projectFinancials[0]?.financials_updated_at
    ? new Date(projectFinancials[0].financials_updated_at).toLocaleDateString()
    : "Not updated";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/completed")}
          className={`${buttonClass} bg-blue-500`}
        >
          Back to Projects
        </button>
        <h1 className="text-2xl font-bold">{project.project_name}</h1>
        <div className="flex flex-col text-right">
          <div className="text-gray-600">Shop Completion: {completedDate}</div>
          <div className="text-gray-600">Last updated: {dateUpdated}</div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-[auto_1fr_repeat(5,auto)] gap-4 font-semibold border-b pb-2 mb-2">
          <div>Job Number</div>
          <div>Room Name</div>
          {categories.map((category) => (
            <div key={category}>{category}</div>
          ))}
        </div>

        {projectFinancials.map((task, index) => (
          <div
            key={task.task_id}
            className={`grid grid-cols-[auto_1fr_repeat(5,auto)] gap-4 py-2 ${
              index % 2 === 0 ? "bg-gray-50" : ""
            }`}
          >
            <div>{task.task_number}</div>
            <div className="relative group">
              <span>{task.task_name}</span>
              <button
                onClick={() =>
                  handleEditClick(
                    task.task_id,
                    task.task_name,
                    task.task_number
                  )
                }
                className="absolute left-0 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-opacity duration-200 opacity-0 group-hover:opacity-100 -translate-y-1/2"
              >
                Edit
              </button>
            </div>
            {categories.map((category) => (
              <div key={category} className="flex justify-center">
                <input type="checkbox" className="h-4 w-4" />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* TODO: Add FinancialsInputModal component when ready */}
      {isFinancialsModalOpen && selectedTask && (
        <div>{/* Placeholder for FinancialsInputModal */}</div>
      )}
    </div>
  );
};

export default CompletedProjectView;
