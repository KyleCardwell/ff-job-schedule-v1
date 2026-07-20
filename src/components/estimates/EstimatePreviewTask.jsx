import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCalendar } from "react-icons/fi";

import { TASK_SCHEDULED_COLOR } from "../../assets/tailwindConstants.js";

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
  const parsedTaskQuantity = Number(task?.quantity);
  const taskQuantity =
    task?.quantity == null
      ? 1
      : Number.isFinite(parsedTaskQuantity)
        ? parsedTaskQuantity
        : 1;

  const getOrderedSectionData = useCallback(
    (dataMap) => {
      const orderedByTask = (task.sections || [])
        .map((section) => dataMap[section.est_section_id])
        .filter(Boolean);
      const orderedIds = new Set(
        orderedByTask.map((section) => section.sectionId),
      );
      const remaining = Object.values(dataMap).filter(
        (section) => !orderedIds.has(section.sectionId),
      );
      return [...orderedByTask, ...remaining];
    },
    [task.sections],
  );

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
        const parsedSectionQuantity = Number(section.quantity);
        const sectionQuantity =
          section.quantity == null
            ? 1
            : Number.isFinite(parsedSectionQuantity)
              ? parsedSectionQuantity
              : 1;

        if (!(sectionQuantity > 0)) {
          return;
        }

        const quantityMultiplier = sectionQuantity * taskQuantity;

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
              taskBreakdown.services[serviceId].hours +=
                (data.hours || 0) * quantityMultiplier;
              taskBreakdown.services[serviceId].cost +=
                (data.cost || 0) * quantityMultiplier;
            },
          );
        }

        // Aggregate parts breakdown from section calculations
        if (section.calculations) {
          const calc = section.calculations;

          // Aggregate box data
          taskBreakdown.parts.boxTotal +=
            (calc.boxTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.boxCount +=
            (calc.boxCount || 0) * quantityMultiplier;

          // Aggregate face prices and counts
          if (calc.facePrices) {
            Object.entries(calc.facePrices).forEach(([type, price]) => {
              taskBreakdown.parts.facePrices[type] =
                (taskBreakdown.parts.facePrices[type] || 0) +
                (price || 0) * quantityMultiplier;
            });
          }
          if (calc.faceCounts) {
            Object.entries(calc.faceCounts).forEach(([type, count]) => {
              taskBreakdown.parts.faceCounts[type] =
                (taskBreakdown.parts.faceCounts[type] || 0) +
                (count || 0) * quantityMultiplier;
            });
          }

          // Aggregate drawer boxes and rollouts
          taskBreakdown.parts.drawerBoxTotal +=
            (calc.drawerBoxTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.drawerBoxCount +=
            (calc.drawerBoxCount || 0) * quantityMultiplier;
          taskBreakdown.parts.rollOutTotal +=
            (calc.rollOutTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.rollOutCount +=
            (calc.rollOutCount || 0) * quantityMultiplier;

          // Aggregate hardware
          taskBreakdown.parts.hingesTotal +=
            (calc.hingesTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.hingesCount +=
            (calc.hingesCount || 0) * quantityMultiplier;
          taskBreakdown.parts.slidesTotal +=
            (calc.slidesTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.slidesCount +=
            (calc.slidesCount || 0) * quantityMultiplier;
          taskBreakdown.parts.pullsTotal +=
            (calc.pullsTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.pullsCount +=
            (calc.pullsCount || 0) * quantityMultiplier;

          // Aggregate wood and accessories
          taskBreakdown.parts.woodTotal +=
            (calc.woodTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.woodCount +=
            (calc.woodCount || 0) * quantityMultiplier;
          taskBreakdown.parts.accessoriesTotal +=
            (calc.accessoriesTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.accessoriesCount +=
            (calc.accessoriesCount || 0) * quantityMultiplier;
          taskBreakdown.parts.otherTotal +=
            (calc.otherTotal || 0) * quantityMultiplier;
          taskBreakdown.parts.otherCount +=
            (calc.otherCount || 0) * quantityMultiplier;
        }

        // Aggregate other totals
        taskBreakdown.partsTotal +=
          (section.partsTotalPrice || 0) * quantityMultiplier;
        taskBreakdown.subtotal +=
          (section.subTotalPrice || 0) * quantityMultiplier;
        taskBreakdown.profit += (section.profit || 0) * quantityMultiplier;
        taskBreakdown.commission +=
          (section.commission || 0) * quantityMultiplier;
        taskBreakdown.discount +=
          (section.discount || 0) * quantityMultiplier;
      });

      onTaskBreakdownChange(taskBreakdown);
    },
    [task.est_task_id, taskQuantity, selectedSections, onTaskBreakdownChange],
  );

  const handleSectionData = useCallback(
    (sectionData) => {
      setSectionDataMap((prev) => {
        const updated = { ...prev, [sectionData.sectionId]: sectionData };

        // Calculate task total and build task data object
        const sections = getOrderedSectionData(updated);
        const roomCost = sections.reduce(
          (sum, s) => sum + (s.totalPriceWithQuantity || 0),
          0,
        );
        const taskTotal = roomCost * taskQuantity;

        // Add metadata for scroll offset logic
        const hasMultipleSections = task.sections.length > 1;
        const sectionsWithMetadata = sections.map((section, index) => ({
          ...section,
          hasMultipleSections,
          isFirstSection: index === 0,
          taskId: task.est_task_id,
          taskQuantity,
        }));

        const taskData = {
          taskId: task.est_task_id,
          taskName: task.est_task_name,
          taskQuantity,
          sections: sectionsWithMetadata,
          roomCost,
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
      taskQuantity,
      onTaskDataChange,
      calculateBreakdown,
      getOrderedSectionData,
    ],
  );

  // Recalculate breakdown when selectedSections changes
  useEffect(() => {
    const sections = getOrderedSectionData(sectionDataMap);
    if (sections.length > 0) {
      calculateBreakdown(sections);
    }
  }, [selectedSections, calculateBreakdown, getOrderedSectionData, sectionDataMap]);

  const scheduled = task.sections.every(section => section.scheduled_task_id !== null);

  const { selectedRoomCost, selectedRoomTotal, selectedSectionCount } = useMemo(() => {
    const sections = getOrderedSectionData(sectionDataMap);
    const selectedSectionsForTask = sections.filter(
      (sectionData) => selectedSections?.[sectionData.sectionId],
    );

    const selectedRoomCost = selectedSectionsForTask.reduce(
      (sum, sectionData) => sum + (sectionData.totalPriceWithQuantity || 0),
      0,
    );

    return {
      selectedRoomCost,
      selectedRoomTotal: selectedRoomCost * taskQuantity,
      selectedSectionCount: selectedSectionsForTask.length,
    };
    }, [sectionDataMap, selectedSections, taskQuantity, getOrderedSectionData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  return (
    <div className="mb-8">
      {/* Task Header */}
      <div className="bg-slate-800 rounded-t-lg px-4 pt-4 border-t border-l border-r border-slate-600">
        <h2 className="text-xl font-bold text-slate-200 mx-6 pb-2 border-b-2 border-teal-500">
          {scheduled ? <FiCalendar size={18} className={`inline ${TASK_SCHEDULED_COLOR}`} /> : ""} {task.est_task_name}
        </h2>
      </div>

      {/* Sections */}
      <div className="bg-slate-800 rounded-b-lg p-4 border-l border-r border-b border-slate-600">
        {task.sections && task.sections.length > 0 ? (
          <>
            {task.sections.map((section, index) => (
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
            ))}

            {(task.sections.length > 1 || taskQuantity !== 1) && (
              <div className="border-t border-slate-600 pt-4 mt-2">
                <div
                  className={`flex justify-between text-sm ${
                    selectedSectionCount === 0 ? "text-slate-400" : "text-slate-300"
                  }`}
                >
                  <span>Room Quantity</span>
                  <span>× {taskQuantity}</span>
                </div>
                {taskQuantity !== 1 && (
                  <div
                    className={`flex justify-between text-sm mt-1 ${
                      selectedSectionCount === 0 ? "text-slate-400" : "text-slate-300"
                    }`}
                  >
                    <span>Room Cost</span>
                    <span>{formatCurrency(selectedRoomCost)}</span>
                  </div>
                )}
                <div
                  className={`flex justify-between text-lg font-semibold mt-1 ${
                    selectedSectionCount === 0 ? "text-slate-400" : "text-teal-400"
                  }`}
                >
                  <span>Room Total</span>
                  <span>{formatCurrency(selectedRoomTotal)}</span>
                </div>
              </div>
            )}
          </>
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
