import { useCallback, useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { fetchEstimateById } from "../../redux/actions/estimates";

import EstimatePreviewTask from "./EstimatePreviewTask.jsx";

const EstimatePreview = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { estimateId } = useParams();

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const estimates = useSelector((state) => state.estimates.estimates);

  // Track task totals - children will report their totals up
  const [taskTotals, setTaskTotals] = useState({});

  const handleTaskTotalChange = useCallback((taskId, total) => {
    setTaskTotals((prev) => ({ ...prev, [taskId]: total }));
  }, []);

  // Calculate grand total from task totals
  const grandTotal = Object.values(taskTotals).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

  useEffect(() => {
    const loadEstimate = async () => {
      if (estimateId) {
        const existingEstimate = estimates.find(
          (est) => est.est_project_id === estimateId
        );
        if (!existingEstimate) {
          await dispatch(fetchEstimateById(estimateId));
        }
      }
    };

    loadEstimate();
  }, [dispatch, estimateId, estimates]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  if (!currentEstimate) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-slate-200">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/estimates/in-progress/${estimateId}`)}
                className="hover:text-teal-400 transition-colors"
                aria-label="Back to estimate"
              >
                <FiArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Estimate Preview</h1>
                <p className="text-slate-400 text-sm">
                  {currentEstimate.est_project_name}
                </p>
              </div>
            </div>
            {/* Placeholder for future Generate PDF button */}
            <div className="text-sm text-slate-400">
              {/* Generate PDF button will go here */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Estimate Notes Section (Placeholder for future) */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3">Estimate Notes</h2>
          <p className="text-slate-400 text-sm">
            (Note editing functionality will be added here)
          </p>
        </div>

        {/* Tasks and Sections */}
        {currentEstimate.tasks && currentEstimate.tasks.length > 0 ? (
          currentEstimate.tasks.map((task) => (
            <EstimatePreviewTask
              key={task.est_task_id}
              task={task}
              estimate={currentEstimate}
              onTaskTotalChange={handleTaskTotalChange}
            />
          ))
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400">No rooms in this estimate</p>
          </div>
        )}

        {/* Grand Total */}
        <div className="bg-slate-800 rounded-lg p-6 sticky bottom-0 border-t-4 border-teal-500">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Total Estimate</h2>
            <p className="text-3xl font-bold text-teal-400">
              {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatePreview;
