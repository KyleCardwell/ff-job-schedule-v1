import PropTypes from "prop-types";
import { useCallback, useState } from "react";

import EstimatePreviewSection from "./EstimatePreviewSection.jsx";

const EstimatePreviewTask = ({ task, estimate, onTaskTotalChange }) => {
  const [sectionTotals, setSectionTotals] = useState({});

  const handleSectionTotal = useCallback((sectionId, total) => {
    setSectionTotals((prev) => {
      const updated = { ...prev, [sectionId]: total };
      // Calculate task total and notify parent
      const taskTotal = Object.values(updated).reduce((sum, val) => sum + (val || 0), 0);
      if (onTaskTotalChange) {
        onTaskTotalChange(task.est_task_id, taskTotal);
      }
      return updated;
    });
  }, [task.est_task_id, onTaskTotalChange]);

  return (
    <div className="mb-8">
      {/* Task Header */}
      <div className="bg-slate-800 rounded-t-lg p-4 border-b-2 border-teal-500">
        <h2 className="text-xl font-bold text-slate-200">{task.est_task_name}</h2>
      </div>

      {/* Sections */}
      <div className="bg-slate-800 rounded-b-lg p-4">
        {task.sections && task.sections.length > 0 ? (
          task.sections.map((section, index) => (
            <EstimatePreviewSection
              key={section.est_section_id}
              section={section}
              sectionNumber={task.sections.length > 1 ? index + 1 : null}
              taskName={task.est_task_name}
              estimate={estimate}
              onTotalCalculated={(total) => handleSectionTotal(section.est_section_id, total)}
            />
          ))
        ) : (
          <p className="text-slate-400 text-center py-8">No sections in this room</p>
        )}
      </div>
    </div>
  );
};

EstimatePreviewTask.propTypes = {
  task: PropTypes.object.isRequired,
  estimate: PropTypes.object.isRequired,
  onTaskTotalChange: PropTypes.func,
};

export default EstimatePreviewTask;
