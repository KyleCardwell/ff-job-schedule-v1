import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProjectFinancials,
  fetchTaskFinancials,
} from "../../redux/actions/financialsData";
import { buttonClass } from "../../assets/tailwindConstants";
import FinancialsInputModal from "../financials/FinancialsInputModal";

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

  const chartConfig = useSelector((state) => state.chartConfig);

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

  // Calculate project totals
  const projectTotals = useMemo(() => {
    if (!projectFinancials) return { estimate: 0, actual: 0, profit: 0 };
    
    const sections = ['cabinets', 'doors', 'drawers', 'hours', 'other'];
    return projectFinancials.reduce((acc, task) => {
      const taskTotals = sections.reduce((sectionAcc, section) => {
        const sectionData = task[section] || {};
        
        if (section === 'hours') {
          // For hours, sum actual costs from each type
          const actualTotal = sectionData.data?.reduce((sum, typeData) => 
            sum + (typeData.actual_cost || 0), 0) || 0;

          // For estimate, multiply estimated hours by employee type rates
          const estimateTotal = sectionData.data?.reduce((typeAcc, typeData) => {
            const employeeType = chartConfig.employee_type?.find(
              (type) => type.id === typeData.type_id
            );
            const rate = employeeType?.rate || 0;
            return typeAcc + ((typeData.estimate || 0) * rate);
          }, 0) || 0;

          return {
            estimate: sectionAcc.estimate + estimateTotal,
            actual: sectionAcc.actual + actualTotal
          };
        }

        // For non-hours sections
        return {
          estimate: sectionAcc.estimate + (sectionData.estimate || 0),
          actual: sectionAcc.actual + (sectionData.actual_cost || 0)
        };
      }, { estimate: 0, actual: 0 });

      return {
        estimate: acc.estimate + taskTotals.estimate,
        actual: acc.actual + taskTotals.actual,
        profit: acc.profit + (taskTotals.estimate - taskTotals.actual)
      };
    }, { estimate: 0, actual: 0, profit: 0 });
  }, [projectFinancials, chartConfig.employee_type]);

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

      {/* Project Totals */}
      <div className="bg-white shadow rounded-lg p-6 mb-4">
        <h2 className="text-xl font-semibold mb-4">Project Totals</h2>
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-gray-600">Estimated</div>
            <div className="text-2xl font-bold">${projectTotals.estimate.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Actual</div>
            <div className="text-2xl font-bold">${projectTotals.actual.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Profit/Loss</div>
            <div className={`text-2xl font-bold ${projectTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${projectTotals.profit.toLocaleString()}
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
          const sections = ['cabinets', 'doors', 'drawers', 'hours', 'other'];
          const taskTotals = sections.reduce((acc, section) => {
            const sectionData = task[section] || {};
            
            if (section === 'hours') {
              // For hours, sum actual costs from each type
              const actualTotal = sectionData.data?.reduce((sum, typeData) => 
                sum + (typeData.actual_cost || 0), 0) || 0;

              // For estimate, multiply estimated hours by employee type rates
              const estimateTotal = sectionData.data?.reduce((typeAcc, typeData) => {
                const employeeType = chartConfig.employee_type?.find(
                  (type) => type.id === typeData.type_id
                );
                const rate = employeeType?.rate || 0;
                return typeAcc + ((typeData.estimate || 0) * rate);
              }, 0) || 0;

              return {
                estimate: acc.estimate + estimateTotal,
                actual: acc.actual + actualTotal
              };
            }

            // For non-hours sections
            return {
              estimate: acc.estimate + (sectionData.estimate || 0),
              actual: acc.actual + (sectionData.actual_cost || 0)
            };
          }, { estimate: 0, actual: 0 });

          const taskProfit = taskTotals.estimate - taskTotals.actual;

          return (
            <div
              key={task.task_id}
              className={`grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 py-2 ${
                index % 2 === 0 ? "bg-gray-50" : ""
              } hover:bg-gray-100`}
            >
              <div className="font-medium">{task.tasks.task_number}</div>
              <div className="relative group">
                <span>{task.tasks.task_name}</span>
                <button
                  onClick={() =>
                    handleEditClick(
                      task.task_id,
                      task.tasks.task_name,
                      task.tasks.task_number
                    )
                  }
                  className="absolute left-0 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                >
                  Edit
                </button>
              </div>
              <div className="text-right">${taskTotals.estimate.toLocaleString()}</div>
              <div className="text-right">${taskTotals.actual.toLocaleString()}</div>
              <div className={`text-right ${taskProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${taskProfit.toLocaleString()}
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

export default CompletedProjectView;
