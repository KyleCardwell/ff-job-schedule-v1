import PropTypes from "prop-types";
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

import { buttonClass } from "../../assets/tailwindConstants";
import {
  fetchProjectFinancials,
  fetchTaskFinancials,
} from "../../redux/actions/financialsData";
import { calculateFinancialTotals } from "../../utils/helpers";
import FinancialsInputModal from "../financials/FinancialsInputModal.jsx";

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

  const chartConfig = useSelector((state) => state.chartConfig);

  useEffect(() => {
    if (!projectId) return;

    // Always fetch on mount or when projectId changes
    dispatch(fetchProjectFinancials(projectId));

    // If project not found, redirect back
    if (projectFinancialsError === "Project not found") {
      navigate("/completed");
    }
  }, [projectId, projectFinancialsError, dispatch, navigate]);

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

  // Calculate project totals
  const projectTotals = useMemo(() => {
    if (!projectFinancials?.length) return { estimate: 0, actual: 0, profit: 0 };

    const totals = projectFinancials.reduce((acc, task) => {
      if (!task.financial_data) return acc;

      // Transform financial_data into sections array for calculateFinancialTotals
      const taskSections = Object.entries(task.financial_data).map(([id, section]) => {
        if (id === 'hours') {
          return {
            id,
            data: section.data || []
          };
        }
        return {
          id,
          estimate: section.estimate || 0,
          inputRows: section.data || []
        };
      });

      const taskTotals = calculateFinancialTotals(taskSections, chartConfig);
      const adjustedTotals = task.adjustments 
        ? calculateFinancialTotals(taskSections, chartConfig, task.adjustments)
        : taskTotals;

      return {
        estimate: acc.estimate + (adjustedTotals.total || adjustedTotals.estimate || 0),
        actual: acc.actual + (adjustedTotals.actual || 0)
      };
    }, { estimate: 0, actual: 0 });

    return {
      ...totals,
      profit: totals.estimate - totals.actual
    };
  }, [projectFinancials, chartConfig]);

  // Get the most recent update date from all task financials
  const dateUpdated = useMemo(() => {
    if (!projectFinancials) return null;
    
    const maxDate = projectFinancials.reduce((latestDate, task) => {
      const taskDate = task.financials_updated_at;
      return !latestDate || (taskDate && taskDate > latestDate) ? taskDate : latestDate;
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
    <div className="p-6 bg-slate-800 print:bg-white h-full">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/completed")}
          className={`${buttonClass} bg-blue-500 print:hidden`}
        >
          Back to Projects
        </button>
        <h1 className="text-2xl font-bold text-white print:text-black">{project.project_name}</h1>
        <div className="flex flex-col text-right">
          <div className="text-slate-200 print:text-gray-600">Shop Completion: {completedDate}</div>
          <div className="text-slate-200 print:text-gray-600">Last updated: {dateUpdated}</div>
        </div>
      </div>

      {/* Project Totals */}
      <div className="bg-white shadow rounded-lg p-6 mb-4">
        <h2 className="text-xl font-semibold mb-4">Project Totals</h2>
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-gray-600">Estimated</div>
            <div className="text-2xl font-bold">
              ${(projectTotals.estimate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Actual</div>
            <div className="text-2xl font-bold">
              ${(projectTotals.actual || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Profit/Loss</div>
            <div className={`text-2xl font-bold ${(projectTotals.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${(projectTotals.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 font-semibold border-b pb-2 mb-2">
          <div>Job #</div>
          <div>Room Name</div>
          <div className="text-right">Estimated</div>
          <div className="text-right">Actual</div>
          <div className="text-right">Profit/Loss</div>
        </div>

        {projectFinancials.map((task, index) => {
          if (!task.financial_data) return null;

          // Transform financial_data into sections array for calculateFinancialTotals
          const taskSections = Object.entries(task.financial_data).map(([id, section]) => {
            if (id === 'hours') {
              return {
                id,
                data: section.data || []
              };
            }
            return {
              id,
              estimate: section.estimate || 0,
              inputRows: section.data || []
            };
          });

          const taskTotals = calculateFinancialTotals(taskSections, chartConfig);
          const adjustedTotals = task.adjustments 
            ? calculateFinancialTotals(taskSections, chartConfig, task.adjustments)
            : taskTotals;

          const estimate = adjustedTotals.total || adjustedTotals.estimate || 0;
          const actual = adjustedTotals.actual || 0;
          const taskProfit = estimate - actual;

          return (
            <div
              key={task.task_id}
              className={`grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 py-2 ${
                index % 2 === 0 ? "bg-gray-50" : ""
              } hover:bg-gray-100`}
            >
              <div className="font-medium">{task.task_number}</div>
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
                  className="absolute left-0 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                >
                  Edit
                </button>
              </div>
              <div className="text-right">
                ${estimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-right">
                ${actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-right ${taskProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${taskProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          );
        })}
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
