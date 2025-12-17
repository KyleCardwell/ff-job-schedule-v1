import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";

/**
 * Index component for estimate preview with checkboxes to include/exclude tasks/sections
 * Similar to ScrollableIndex but with checkbox functionality for estimate preview
 */
const EstimatePreviewIndex = ({
  taskDataMap,
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
  className = "",
}) => {
  const [activeItemId, setActiveItemId] = useState(null);

  // Check if all sections are selected
  const allSectionsSelected = useMemo(() => {
    const allSectionIds = Object.keys(selectedItems);
    return allSectionIds.length > 0 && allSectionIds.every((id) => selectedItems[id]);
  }, [selectedItems]);

  // Check if all line items are selected
  const allLineItemsSelected = useMemo(() => {
    const allLineItemIds = Object.keys(selectedLineItems);
    return allLineItemIds.length > 0 && allLineItemIds.every((id) => selectedLineItems[id]);
  }, [selectedLineItems]);

  // Check if everything is selected
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
      <div className="sticky top-24 p-3 max-h-[calc(100vh-200px)] overflow-y-auto bg-slate-800 rounded-lg border border-slate-700">
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
          {Object.values(taskDataMap).map((taskData) => {
            const hasSections = taskData.sections && taskData.sections.length > 0;
            const hasMultipleSections = hasSections && taskData.sections.length > 1;

            return (
              <div key={taskData.taskId} className="mb-3">
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
              {lineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={selectedLineItems[index] || false}
                    onChange={() => onToggleLineItem && onToggleLineItem(index)}
                    className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
                  />
                  <span
                    className="text-sm text-slate-300 cursor-pointer hover:text-teal-400 transition-colors truncate"
                    onClick={() => onToggleLineItem && onToggleLineItem(index)}
                    title={item.title || `Line Item ${index + 1}`}
                  >
                    {item.title || `Line Item ${index + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

EstimatePreviewIndex.propTypes = {
  taskDataMap: PropTypes.object.isRequired,
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
  className: PropTypes.string,
};

export default EstimatePreviewIndex;
