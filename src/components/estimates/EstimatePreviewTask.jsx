import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";

import EstimatePreviewSection from "./EstimatePreviewSection.jsx";

const EstimatePreviewTask = ({
  task,
  estimate,
  onTaskDataChange,
  onTaskBreakdownChange,
  sectionRefs,
  selectedSections,
}) => {
  const [sectionDataMap, setSectionDataMap] = useState({});

  // Helper function to calculate breakdown from sections
  const calculateBreakdown = useCallback(
    (sections) => {
      if (!onTaskBreakdownChange) return;

      const taskBreakdown = {
        taskId: task.est_task_id,
        services: {},
        parts: {
          boxTotal: 0,
          boxCount: 0,
          facePrices: {},
          faceCounts: {},
          drawerBoxTotal: 0,
          drawerBoxCount: 0,
          rollOutTotal: 0,
          rollOutCount: 0,
          hingesTotal: 0,
          hingesCount: 0,
          slidesTotal: 0,
          slidesCount: 0,
          pullsTotal: 0,
          pullsCount: 0,
          woodTotal: 0,
          woodCount: 0,
          accessoriesTotal: 0,
          accessoriesCount: 0,
          otherTotal: 0,
          otherCount: 0,
        },
        partsTotal: 0,
        subtotal: 0,
        profit: 0,
        commission: 0,
        discount: 0,
      };

      // Only include selected sections in breakdown
      const selectedSectionsForTask = sections.filter(
        (section) => selectedSections?.[section.sectionId],
      );

      selectedSectionsForTask.forEach((section) => {
        // Aggregate services from laborCosts
        if (section.laborCosts?.costsByService) {
          Object.entries(section.laborCosts.costsByService).forEach(
            ([serviceId, data]) => {
              if (!taskBreakdown.services[serviceId]) {
                taskBreakdown.services[serviceId] = {
                  name: data.name,
                  hours: 0,
                  cost: 0,
                };
              }
              taskBreakdown.services[serviceId].hours += data.hours || 0;
              taskBreakdown.services[serviceId].cost += data.cost || 0;
            },
          );
        }

        // Aggregate parts breakdown from section calculations
        if (section.calculations) {
          const calc = section.calculations;

          // Aggregate box data
          taskBreakdown.parts.boxTotal += calc.boxTotal || 0;
          taskBreakdown.parts.boxCount += calc.boxCount || 0;

          // Aggregate face prices and counts
          if (calc.facePrices) {
            Object.entries(calc.facePrices).forEach(([type, price]) => {
              taskBreakdown.parts.facePrices[type] =
                (taskBreakdown.parts.facePrices[type] || 0) + price;
            });
          }
          if (calc.faceCounts) {
            Object.entries(calc.faceCounts).forEach(([type, count]) => {
              taskBreakdown.parts.faceCounts[type] =
                (taskBreakdown.parts.faceCounts[type] || 0) + count;
            });
          }

          // Aggregate drawer boxes and rollouts
          taskBreakdown.parts.drawerBoxTotal += calc.drawerBoxTotal || 0;
          taskBreakdown.parts.drawerBoxCount += calc.drawerBoxCount || 0;
          taskBreakdown.parts.rollOutTotal += calc.rollOutTotal || 0;
          taskBreakdown.parts.rollOutCount += calc.rollOutCount || 0;

          // Aggregate hardware
          taskBreakdown.parts.hingesTotal += calc.hingesTotal || 0;
          taskBreakdown.parts.hingesCount += calc.hingesCount || 0;
          taskBreakdown.parts.slidesTotal += calc.slidesTotal || 0;
          taskBreakdown.parts.slidesCount += calc.slidesCount || 0;
          taskBreakdown.parts.pullsTotal += calc.pullsTotal || 0;
          taskBreakdown.parts.pullsCount += calc.pullsCount || 0;

          // Aggregate wood and accessories
          taskBreakdown.parts.woodTotal += calc.woodTotal || 0;
          taskBreakdown.parts.woodCount += calc.woodCount || 0;
          taskBreakdown.parts.accessoriesTotal += calc.accessoriesTotal || 0;
          taskBreakdown.parts.accessoriesCount += calc.accessoriesCount || 0;
          taskBreakdown.parts.otherTotal += calc.otherTotal || 0;
          taskBreakdown.parts.otherCount += calc.otherCount || 0;
        }

        // Aggregate other totals
        taskBreakdown.partsTotal += section.partsTotalPrice || 0;
        taskBreakdown.subtotal += section.subTotalPrice || 0;
        taskBreakdown.profit += section.profit || 0;
        taskBreakdown.commission += section.commission || 0;
        taskBreakdown.discount += section.discount || 0;
      });

      onTaskBreakdownChange(taskBreakdown);
    },
    [task.est_task_id, selectedSections, onTaskBreakdownChange],
  );

  const handleSectionData = useCallback(
    (sectionData) => {
      setSectionDataMap((prev) => {
        const updated = { ...prev, [sectionData.sectionId]: sectionData };

        // Calculate task total and build task data object
        const sections = Object.values(updated);
        const taskTotal = sections.reduce(
          (sum, s) => sum + (s.totalPrice || 0),
          0,
        );

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

        // Calculate breakdown with updated sections
        calculateBreakdown(sections);

        return updated;
      });
    },
    [
      task.est_task_id,
      task.est_task_name,
      task.sections.length,
      onTaskDataChange,
      calculateBreakdown,
    ],
  );

  // Recalculate breakdown when selectedSections changes
  useEffect(() => {
    const sections = Object.values(sectionDataMap);
    if (sections.length > 0) {
      calculateBreakdown(sections);
    }
  }, [selectedSections, calculateBreakdown, sectionDataMap]);

  return (
    <div className="mb-8">
      {/* Task Header */}
      <div className="bg-slate-800 rounded-t-lg px-4 pt-4 border-t border-l border-r border-slate-600">
        <h2 className="text-xl font-bold text-slate-200 mx-6 pb-2 border-b-2 border-teal-500">
          {task.est_task_name}
        </h2>
      </div>

      {/* Sections */}
      <div className="bg-slate-800 rounded-b-lg p-4 border-l border-r border-b border-slate-600">
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
          <p className="text-slate-400 text-center py-8">
            No sections in this room
          </p>
        )}
      </div>
    </div>
  );
};

EstimatePreviewTask.propTypes = {
  task: PropTypes.object.isRequired,
  estimate: PropTypes.object.isRequired,
  onTaskDataChange: PropTypes.func,
  onTaskBreakdownChange: PropTypes.func,
  sectionRefs: PropTypes.object,
  selectedSections: PropTypes.object,
};

export default EstimatePreviewTask;
