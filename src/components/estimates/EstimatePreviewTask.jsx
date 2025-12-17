import PropTypes from "prop-types";
import { useCallback, useState } from "react";

import EstimatePreviewSection from "./EstimatePreviewSection.jsx";

const EstimatePreviewTask = ({ task, estimate, onTaskDataChange, sectionRefs, selectedSections }) => {
  const [sectionDataMap, setSectionDataMap] = useState({});

  const handleSectionData = useCallback((sectionData) => {
    setSectionDataMap((prev) => {
      const updated = { ...prev, [sectionData.sectionId]: sectionData };
      
      // Calculate task total and build task data object
      const sections = Object.values(updated);
      const taskTotal = sections.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
      
      // Add metadata for scroll offset logic
      const hasMultipleSections = task.sections.length > 1;
      const sectionsWithMetadata = sections.map((section, index) => ({
        ...section,
        hasMultipleSections,
        isFirstSection: index === 0,
      }));
      
      const taskData = {
        taskId: task.est_task_id,
        taskName: task.est_task_name,
        sections: sectionsWithMetadata,
        totalPrice: taskTotal,
      };
      
      if (onTaskDataChange) {
        onTaskDataChange(taskData);
      }
      return updated;
    });
  }, [task.est_task_id, task.est_task_name, task.sections.length, onTaskDataChange]);

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
              onTotalCalculated={handleSectionData}
              hasMultipleSections={task.sections.length > 1}
              isFirstSection={index === 0}
              isSelected={selectedSections?.[section.est_section_id] || false}
              sectionRef={(el) => {
                if (sectionRefs?.current && el) {
                  sectionRefs.current[section.est_section_id] = el;
                }
              }}
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
  onTaskDataChange: PropTypes.func,
  sectionRefs: PropTypes.object,
  selectedSections: PropTypes.object,
};

export default EstimatePreviewTask;
