import PropTypes from "prop-types";
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

import { buttonClass } from "../../assets/tailwindConstants";
import { fetchProjectFinancials } from "../../redux/actions/financialsData";
import { calculateFinancialTotals } from "../../utils/helpers";
import GeneratePdfButton from "../common/GeneratePdfButton.jsx";
import FinancialsInputModal from "../financials/FinancialsInputModal.jsx";

import TaskFinancialsBreakdown from "./TaskFinancialsBreakdown.jsx";

const CompletedProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedTask, setSelectedTask] = useState(null);
  const [isFinancialsModalOpen, setIsFinancialsModalOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // Get financials from Redux store
  const {
    projectFinancials,
    loading,
    error: projectFinancialsError,
  } = useSelector((state) => state.financialsData);
  const project = projectFinancials?.find((p) => p.project_id === +projectId);

  const services = useSelector((state) => state.services?.allServices);

  useEffect(() => {
    if (!projectId) return;

    // Always fetch on mount or when projectId changes
    dispatch(fetchProjectFinancials(projectId));

    // If project not found, redirect back
    if (projectFinancialsError === "Project not found") {
      navigate("/completed");
    }
  }, [projectId, projectFinancialsError, dispatch, navigate]);

  // Calculate project totals
  const projectTotals = useMemo(() => {
    if (!projectFinancials?.length || !services?.length)
      return { estimate: 0, actual: 0, profit: 0 };

    const totals = projectFinancials.reduce(
      (acc, task) => {
        if (!task.financial_data || !services?.length) return acc;

        // Transform financial_data into sections array for calculateFinancialTotals
        const taskSections = Object.entries(task.financial_data).map(
          ([id, section]) => {
            if (id === "hours") {
              return {
                id,
                data: section.data || [],
              };
            }
            return {
              id,
              estimate: section.estimate || 0,
              inputRows: section.data || [],
            };
          }
        );

        const taskTotals = calculateFinancialTotals(taskSections, services);
        const adjustedTotals = task.adjustments
          ? calculateFinancialTotals(taskSections, services, task.adjustments)
          : taskTotals;

        return {
          estimate:
            acc.estimate +
            (adjustedTotals.total || adjustedTotals.estimate || 0),
          actual: acc.actual + (adjustedTotals.actual || 0),
        };
      },
      { estimate: 0, actual: 0 }
    );

    return {
      ...totals,
      profit: totals.estimate - totals.actual,
    };
  }, [projectFinancials, services]);

  // Get the most recent update date from all task financials
  const dateUpdated = useMemo(() => {
    if (!projectFinancials) return null;

    const maxDate = projectFinancials.reduce((latestDate, task) => {
      const taskDate = task.financials_updated_at;
      return !latestDate || (taskDate && taskDate > latestDate)
        ? taskDate
        : latestDate;
    }, null);

    return maxDate ? new Date(maxDate).toLocaleDateString() : "Not updated";
  }, [projectFinancials]);

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

  return (
    <div className="p-6 bg-slate-800 print:bg-white h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6 max-w-[1200px] mx-auto ">
        <div className="flex-1 flex justify-start space-x-2">
          <button
            onClick={() => navigate("/completed")}
            className={`${buttonClass} bg-blue-500 print:hidden`}
          >
            Back to Projects
          </button>
          <GeneratePdfButton
            project={project}
            projectFinancials={projectFinancials}
            projectTotals={projectTotals}
            dateUpdated={dateUpdated}
            services={services}
          />
        </div>
        <h1 className="flex-1 text-2xl font-bold text-white print:text-black text-center">
          {project.project_name}
        </h1>
        <div className="flex-1 flex flex-col text-right">
          <div className="text-slate-200 print:text-gray-600">
            Shop Completion: {completedDate}
          </div>
          <div className="text-slate-200 print:text-gray-600">
            Last updated: {dateUpdated}
          </div>
        </div>
      </div>

      {/* Project Totals */}
      <div className="bg-white shadow rounded-lg p-6 mb-4 max-w-[1200px] mx-auto">
        <h2 className="text-xl font-semibold mb-4">Project Totals</h2>
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-gray-600">Estimated</div>
            <div className="text-2xl font-bold">
              ${" "}
              {(projectTotals.estimate || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Actual</div>
            <div className="text-2xl font-bold">
              ${" "}
              {(projectTotals.actual || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Profit/Loss</div>
            <div
              className={`text-2xl font-bold ${
                (projectTotals.profit || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              ${" "}
              {(projectTotals.profit || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white shadow rounded-lg p-6 max-w-[1200px] mx-auto">
        {/* Header row - will stay fixed */}
        <div className="grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 font-semibold border-b pb-2 sticky top-0 bg-white z-10">
          <div>Job #</div>
          <div>Room Name</div>
          <div className="text-right">Estimated</div>
          <div className="text-right">Actual</div>
          <div className="text-right mx-2">Profit/Loss</div>
        </div>

        {/* Scrollable container for tasks */}
        <div className="max-h-[800px] overflow-y-auto">
          {projectFinancials.map((task, index) => {
            if (!task.financial_data || !services?.length) return null;

            // Transform financial_data into sections array for calculateFinancialTotals
            const taskSections = Object.entries(task.financial_data).map(
              ([id, section]) => {
                if (id === "hours") {
                  return {
                    id,
                    data: section.data || [],
                  };
                }
                return {
                  id,
                  estimate: section.estimate || 0,
                  inputRows: section.data || [],
                };
              }
            );

            const taskTotals = calculateFinancialTotals(taskSections, services);
            const adjustedTotals = task.adjustments
              ? calculateFinancialTotals(
                  taskSections,
                  services,
                  task.adjustments
                )
              : taskTotals;

            const estimate =
              adjustedTotals.total || adjustedTotals.estimate || 0;
            const actual = adjustedTotals.actual || 0;
            const taskProfit = estimate - actual;

            return (
              <div key={task.task_id}>
                <div
                  className={`grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 py-2 ${
                    index % 2 === 0 ? "bg-gray-50" : ""
                  } hover:bg-gray-100 cursor-pointer`}
                  onClick={() =>
                    setExpandedTaskId(
                      expandedTaskId === task.financials_id
                        ? null
                        : task.financials_id
                    )
                  }
                >
                  <div className="font-medium">{task.task_number}</div>
                  <div className="relative group flex items-center">
                    <svg
                      className={`w-4 h-4 mr-2 transition-transform ${
                        expandedTaskId === task.financials_id ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      ></path>
                    </svg>
                    <span>{task.task_name}</span>
                  </div>
                  <div className="text-right">
                    ${" "}
                    {estimate.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-right">
                    ${" "}
                    {actual.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div
                    className={`text-right mx-2 ${
                      taskProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    ${" "}
                    {taskProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {expandedTaskId === task.financials_id && (
                  <TaskFinancialsBreakdown
                    task={task}
                    services={services}
                    color={index % 2 === 0 ? "bg-gray-50" : ""}
                    adjustments={adjustedTotals.adjustments}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isFinancialsModalOpen && selectedTask && (
        <FinancialsInputModal
          isOpen={isFinancialsModalOpen}
          onClose={() => setIsFinancialsModalOpen(false)}
          selectedTask={selectedTask}
        />
      )}
    </div>
  );
};

CompletedProjectView.propTypes = {
  projectId: PropTypes.string,
  selectedTask: PropTypes.object,
  isFinancialsModalOpen: PropTypes.bool,
  setIsFinancialsModalOpen: PropTypes.func,
};

export default CompletedProjectView;
