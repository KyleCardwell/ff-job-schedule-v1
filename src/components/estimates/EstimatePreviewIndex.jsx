import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";

/**
 * Index component for estimate preview with checkboxes to include/exclude tasks/sections
 * Similar to ScrollableIndex but with checkbox functionality for estimate preview
 */
const EstimatePreviewIndex = ({
  taskDataMap,
  tasksOrder = [],
  selectedItems,
  onToggleItem,
  onToggleAll,
  scrollContainerRef,
  sectionRefs,
  scrollOffset = 150,
  scrollOffsetSingleSection = 220,
  lineItems = [],
  selectedLineItems = {},
  onToggleLineItem,
  onToggleAllLineItems,
  onScrollToLineItems,
  className = "",
}) => {
  const [activeItemId, setActiveItemId] = useState(null);

  // Sort tasks by tasks_order array
  const orderedTasks = useMemo(() => {
    if (!tasksOrder || tasksOrder.length === 0) {
      return Object.values(taskDataMap);
    }
    
    return tasksOrder
      .map((taskId) => taskDataMap[taskId])
      .filter(Boolean); // Remove any undefined tasks
  }, [taskDataMap, tasksOrder]);

  // Check if all sections are selected
  const allSectionsSelected = useMemo(() => {
    // Get all possible section IDs from taskDataMap
    const allPossibleSectionIds = orderedTasks.flatMap((task) =>
      (task.sections || []).map((section) => section.sectionId)
    );
    
    if (allPossibleSectionIds.length === 0) return false;
    
    // Check if every possible section is selected
    return allPossibleSectionIds.every((id) => selectedItems[id] === true);
  }, [selectedItems, orderedTasks]);

  // Check if all line items are selected
  const allLineItemsSelected = useMemo(() => {
    // Get all possible line item keys from lineItems array
    const allPossibleLineItemKeys = [];
    lineItems.forEach((item, index) => {
      const parentKey = String(index);
      allPossibleLineItemKeys.push(parentKey);
      
      // Add child keys
      if (item.subItems && Array.isArray(item.subItems)) {
        item.subItems.forEach((_, subIndex) => {
          allPossibleLineItemKeys.push(`${index}-${subIndex}`);
        });
      }
    });
    
    // If no line items exist, return true (nothing to deselect)
    if (allPossibleLineItemKeys.length === 0) return true;
    
    // Check if every possible line item is selected
    return allPossibleLineItemKeys.every((key) => selectedLineItems[key] === true);
  }, [selectedLineItems, lineItems]);

  // Check if everything is selected
  // Both sections and line items must be selected (or not exist)
  const allSelected = allSectionsSelected && allLineItemsSelected;

  // Intersection Observer to track visible sections
  useEffect(() => {
    if (!scrollContainerRef?.current || !sectionRefs?.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let mostVisibleEntry = null;

        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        if (mostVisibleEntry && mostVisibleEntry.isIntersecting) {
          setActiveItemId(mostVisibleEntry.target.dataset.sectionId);
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: "-100px 0px -50% 0px",
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [scrollContainerRef, sectionRefs]);

  const scrollToSection = (itemId) => {
    const element = sectionRefs.current?.[itemId];
    if (element && scrollContainerRef?.current) {
      const container = scrollContainerRef.current;
      const elementTop = element.offsetTop;

      // Find the section to determine which offset to use
      let sectionInfo = null;
      Object.values(taskDataMap).forEach((task) => {
        const section = task.sections?.find((s) => s.sectionId === itemId);
        if (section) {
          sectionInfo = section;
        }
      });

      // Use scrollOffsetSingleSection if:
      // - Task has only 1 section (hasMultipleSections === false), OR
      // - Task has multiple sections AND this is the first section (isFirstSection === true)
      const useHigherOffset = 
        sectionInfo && 
        (!sectionInfo.hasMultipleSections || sectionInfo.isFirstSection);
      
      const offset = useHigherOffset ? scrollOffsetSingleSection : scrollOffset;

      container.scrollTo({
        top: elementTop - offset,
        behavior: "smooth",
      });
    }
  };

  if (!taskDataMap || Object.keys(taskDataMap).length === 0) return null;

  return (
    <div className={`w-64 flex-none ${className}`}>
      <div className="mt-8 p-3 max-h-[calc(100vh-150px)] overflow-y-auto bg-slate-800 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-xs font-semibold text-slate-300 uppercase">
            Include in Estimate
          </h3>
          <button
            onClick={() => {
              const selectAll = !allSelected;
              onToggleAll(selectAll);
              if (onToggleAllLineItems) {
                onToggleAllLineItems(selectAll);
              }
            }}
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
        <nav className="space-y-1">
          {orderedTasks.map((taskData) => {
            const hasSections = taskData.sections && taskData.sections.length > 0;
            const hasMultipleSections = hasSections && taskData.sections.length > 1;

            return (
              <div key={taskData.taskId} className="">
                {/* If task has only 1 section, show task with checkbox */}
                {!hasMultipleSections && hasSections && (
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selectedItems[taskData.sections[0].sectionId] || false}
                      onChange={() => onToggleItem(taskData.sections[0].sectionId)}
                      className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
                    />
                    <button
                      onClick={() => scrollToSection(taskData.sections[0].sectionId)}
                      className={`
                        flex-1 text-left px-2 py-1 rounded text-sm transition-all
                        ${
                          activeItemId === taskData.sections[0].sectionId
                            ? "bg-teal-600 text-white font-medium"
                            : "text-slate-300 hover:bg-slate-700 hover:text-white"
                        }
                      `}
                    >
                      {taskData.taskName}
                    </button>
                  </div>
                )}

                {/* If task has multiple sections, show task name (no checkbox) and sections with checkboxes */}
                {hasMultipleSections && (
                  <>
                    <h4 className="text-sm text-left font-semibold text-slate-300 mb-2 px-2">
                      {taskData.taskName}
                    </h4>
                    <div className="space-y-1 ml-2">
                      {taskData.sections.map((section) => (
                        <div key={section.sectionId} className="flex items-center gap-2 px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={selectedItems[section.sectionId] || false}
                            onChange={() => onToggleItem(section.sectionId)}
                            className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
                          />
                          <button
                            onClick={() => scrollToSection(section.sectionId)}
                            className={`
                              flex-1 text-left px-2 py-1 rounded text-sm transition-all
                              ${
                                activeItemId === section.sectionId
                                  ? "bg-teal-600 text-white font-medium"
                                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
                              }
                            `}
                          >
                            {section.sectionName}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </nav>

        {/* Line Items Section */}
        {lineItems && lineItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-slate-300 uppercase mb-2 px-2">
              Line Items
            </h4>
            <div className="space-y-1">
              {lineItems.map((item, index) => {
                const parentKey = String(index);
                return (
                  <div key={index}>
                    {/* Parent Line Item */}
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedLineItems[parentKey] || false}
                        onChange={() => onToggleLineItem && onToggleLineItem(parentKey)}
                        className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
                      />
                      <button
                        onClick={() => onScrollToLineItems && onScrollToLineItems()}
                        className="flex-1 text-left text-sm text-slate-300 hover:text-teal-400 transition-colors truncate"
                        title={item.title || `Line Item ${index + 1}`}
                      >
                        {item.title || `Line Item ${index + 1}`}
                      </button>
                    </div>
                    
                    {/* Child Line Items */}
                    {item.subItems && item.subItems.length > 0 && (
                      <div className="ml-6 space-y-1">
                        {item.subItems.map((subItem, subIndex) => {
                          const childKey = `${index}-${subIndex}`;
                          return (
                            <div key={subIndex} className="flex items-center gap-2 px-2 py-1">
                              <input
                                type="checkbox"
                                checked={selectedLineItems[childKey] || false}
                                onChange={() => onToggleLineItem && onToggleLineItem(childKey)}
                                className="w-3.5 h-3.5 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
                              />
                              <button
                                onClick={() => onScrollToLineItems && onScrollToLineItems()}
                                className="flex-1 text-left text-sm text-slate-300 hover:text-teal-400 transition-colors truncate"
                                title={subItem.title || `Sub-item ${subIndex + 1}`}
                              >
                                {subItem.title || `Sub-item ${subIndex + 1}`}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

EstimatePreviewIndex.propTypes = {
  taskDataMap: PropTypes.object.isRequired,
  tasksOrder: PropTypes.array,
  selectedItems: PropTypes.object.isRequired,
  onToggleItem: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
  scrollContainerRef: PropTypes.object.isRequired,
  sectionRefs: PropTypes.object.isRequired,
  scrollOffset: PropTypes.number,
  scrollOffsetSingleSection: PropTypes.number,
  lineItems: PropTypes.array,
  selectedLineItems: PropTypes.object,
  onToggleLineItem: PropTypes.func,
  onToggleAllLineItems: PropTypes.func,
  onScrollToLineItems: PropTypes.func,
  className: PropTypes.string,
};

export default EstimatePreviewIndex;
