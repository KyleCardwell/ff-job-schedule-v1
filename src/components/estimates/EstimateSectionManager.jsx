import { isEqual } from "lodash";
import PropTypes from "prop-types";
import { useState, useEffect, useMemo } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiAlertCircle,
  FiList,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

// import { useDebouncedCallback } from "../../hooks/useDebounce";
import {
  updateSection,
  updateSectionItems,
  updateSectionItemOrder,
} from "../../redux/actions/estimates";
import { SECTION_TYPES } from "../../utils/constants.js";
import { getEffectiveValueOnly } from "../../utils/estimateDefaults";
import ConfirmationModal from "../common/ConfirmationModal.jsx";

import EstimateAccessoriesManager from "./EstimateAccessoriesManager.jsx";
import EstimateCabinetManager from "./EstimateCabinetManager.jsx";
import EstimateLengthManager from "./EstimateLengthManager.jsx";
import EstimateOtherManager from "./EstimateOtherManager.jsx";
import EstimateSectionBreakdown from "./EstimateSectionBreakdown.jsx";
import LaborAdjustmentssManager from "./LaborAdjustmentsManager.jsx";

const EstimateSectionManager = ({
  taskId,
  sectionId,
  section,
  sectionCalculations,
}) => {
  const dispatch = useDispatch();
  const cabinetTypes = useSelector((state) => state.cabinetTypes.types);
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults,
  );

  // Initialize section data from current section
  // Use three-tier fallback for style: section → estimate → team → 13
  const [sectionData, setSectionData] = useState({
    cabinets: section?.cabinets || [],
    lengths: section?.lengths || [],
    accessories: section?.accessories || [],
    other: section?.other || [],
    style:
      getEffectiveValueOnly(
        section?.cabinet_style_id,
        currentEstimate?.default_cabinet_style_id,
        teamDefaults?.default_cabinet_style_id,
      ) || 13,
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [openSectionType, setOpenSectionType] = useState(
    SECTION_TYPES.CABINETS.type,
  );
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Create a mapping of section types to their table names
  const sectionTableMapping = {
    cabinets: "estimate_cabinets",
    accessories: "estimate_accessories",
    lengths: "estimate_lengths",
    other: "estimate_other",
  };

  // Helper function to check if there are unsaved changes by comparing with Redux state
  const hasUnsavedChanges = (type, updatedItems) => {
    const reduxItems = section?.[type] || [];
    return !isEqual(reduxItems, updatedItems);
  };

  // Update local state when section changes
  // Use three-tier fallback for style: section → estimate → team → 13
  useEffect(() => {
    if (section) {
      setSectionData({
        cabinets: section?.cabinets || [],
        lengths: section?.lengths || [],
        accessories: section?.accessories || [],
        other: section?.other || [],
        style:
          getEffectiveValueOnly(
            section?.cabinet_style_id,
            currentEstimate?.default_cabinet_style_id,
            teamDefaults?.default_cabinet_style_id,
          ) || 13,
      });
    }
  }, [
    section,
    section?.cabinets,
    section?.lengths,
    section?.accessories,
    section?.other,
    section?.cabinet_style_id,
    currentEstimate?.default_cabinet_style_id,
    teamDefaults?.default_cabinet_style_id,
  ]);

  // Close all accordions when taskId changes
  useEffect(() => {
    setOpenSectionType(null);
  }, [taskId, sectionId]);

  const handleToggleSection = (sectionType) => {
    setOpenSectionType(openSectionType === sectionType ? null : sectionType);
  };

  // Debounced save to database
  // const debouncedSave = useDebouncedCallback(async (type, updatedItems) => {
  //   try {
  //     // Only save if there are actual changes compared to Redux state
  //     if (!hasUnsavedChanges(type, updatedItems)) {
  //       console.log(`No changes detected for ${type}. Skipping save.`);
  //       return;
  //     }

  //     if (sectionId) {
  //       console.log(`Saving changes for ${type}`);

  //       const tableName = sectionTableMapping[type];
  //       // For now, we'll pass an empty array for idsToDelete - you can enhance this later
  //       const idsToDelete = [];

  //       await dispatch(updateSectionItems(tableName, sectionId, updatedItems, idsToDelete));

  //       console.log(`Successfully saved ${type} changes`);
  //     }
  //   } catch (error) {
  //     console.error("Error saving section data:", error);
  //     // On error, revert to the last known good state from Redux
  //     setSectionData((prev) => ({
  //       ...prev,
  //       [type]: section?.[type] || [],
  //     }));
  //   }
  // }, 1000); // 1 second debounce delay

  // Immediate save function (no debounce)
  const saveImmediately = async (type, updatedItems, idsToDelete = []) => {
    try {
      if (!hasUnsavedChanges(type, updatedItems)) {
        console.log(`No changes detected for ${type}. Skipping save.`);
        return;
      }

      if (sectionId) {
        console.log(`Immediately saving changes for ${type}`);

        const tableName = sectionTableMapping[type];

        await dispatch(
          updateSectionItems(tableName, sectionId, updatedItems, idsToDelete),
        );

        console.log(`Successfully saved ${type} changes immediately`);
      }
    } catch (error) {
      console.error("Error saving section data:", error);
      setSectionData((prev) => ({
        ...prev,
        [type]: section?.[type] || [],
      }));
    }
  };

  const handleDeleteRequest = (type, item) => {
    setItemToDelete({ type, item });
    setIsDeleteModalOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    const { type, item: itemToDeleteData } = itemToDelete;

    if (!itemToDeleteData || typeof itemToDeleteData.id === "undefined") return;

    // Get current items from Redux/section, not local state
    const currentItems = section?.[type] || [];

    // Filter out the deleted item for local state update
    const updatedItems = currentItems.filter((item) => {
      if (item.id) return item.id !== itemToDeleteData.id;
      if (item.temp_id) return item.temp_id !== itemToDeleteData.temp_id;
      return false;
    });

    // Update local state immediately for UI responsiveness
    setSectionData((prev) => ({
      ...prev,
      [type]: updatedItems,
    }));

    // Save to database - pass empty array for items since we're only deleting
    // The Redux action will handle the deletion via idsToDelete
    try {
      await saveImmediately(type, [], [itemToDeleteData.id]);
    } catch (error) {
      // On error, revert local state to Redux state
      setSectionData((prev) => ({
        ...prev,
        [type]: section?.[type] || [],
      }));
    }

    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleUpdateItems = (type, updatedItems) => {
    // Only save items that have actually changed
    const reduxItems = section?.[type] || [];
    const currentTimestamp = new Date().toISOString();
    const changedItems = updatedItems.filter((updatedItem) => {
      // New items (no id) should always be saved
      if (!updatedItem.id) return true;

      // Find the corresponding item in Redux state
      const reduxItem = reduxItems.find((ri) => ri.id === updatedItem.id);

      // If not found in Redux, it's new (shouldn't happen but handle it)
      if (!reduxItem) return true;

      // Strip errorState (UI-only property) before comparing
      const { errorState: _, ...itemWithoutErrorState } = updatedItem;

      // Compare the items - if they're different, include in changedItems
      return !isEqual(itemWithoutErrorState, reduxItem);
    });

    // Update changed items with current timestamp and strip errorState (UI-only)
    const changedItemsWithTimestamp = changedItems.map((item) => {
      const { errorState, ...itemWithoutErrorState } = item;
      return {
        ...itemWithoutErrorState,
        updated_at: currentTimestamp,
      };
    });

    // Update local state with all items, but with updated timestamps for changed items
    const itemsWithUpdatedTimestamps = updatedItems.map((item) => {
      const isChanged = changedItems.some(
        (ci) =>
          (item.id && ci.id === item.id) ||
          (item.temp_id && ci.temp_id === item.temp_id),
      );
      return isChanged ? { ...item, updated_at: currentTimestamp } : item;
    });

    setSectionData((prev) => ({
      ...prev,
      [type]: itemsWithUpdatedTimestamps,
    }));

    // Only save if there are actually changed items
    if (changedItemsWithTimestamp.length > 0) {
      saveImmediately(type, changedItemsWithTimestamp, []);
    }
  };

  const handleReorderItems = (type, orderedIds) => {
    const items = sectionData[type];
    const itemsMap = new Map(
      items.map((item) => [item.id || item.temp_id, item]),
    );
    const reorderedItems = orderedIds
      .map((id) => itemsMap.get(id))
      .filter(Boolean);

    setSectionData((prev) => ({
      ...prev,
      [type]: reorderedItems,
    }));

    // Dispatch the new action to save only the order
    const tableName = sectionTableMapping[type];
    dispatch(updateSectionItemOrder(sectionId, tableName, orderedIds));
  };

  const handleSaveAddHours = async (data) => {
    // Update section metadata with add_hours
    await dispatch(
      updateSection(currentEstimate.estimate_id, taskId, sectionId, {
        add_hours: data.add_hours,
      }),
    );
  };

  // Add errorState flag to cabinet items based on saved_style_id comparison
  // Use effective style with three-tier fallback for accurate comparison
  const cabinetsWithErrorState = useMemo(() => {
    if (!sectionData.cabinets) {
      return [];
    }

    // Calculate the effective style using three-tier fallback
    const effectiveStyle =
      getEffectiveValueOnly(
        section?.cabinet_style_id,
        currentEstimate?.default_cabinet_style_id,
        teamDefaults?.default_cabinet_style_id,
      ) || 13;

    return sectionData.cabinets.map((item) => {
      // Cabinet needs update if:
      // 1. It has no override (uses section default)
      // 2. The saved style doesn't match current effective style
      const needsUpdate =
        item.cabinet_style_override === null &&
        item.saved_style_id != null &&
        item.saved_style_id !== effectiveStyle;

      return {
        ...item,
        errorState: needsUpdate,
      };
    });
  }, [
    sectionData.cabinets,
    section?.cabinet_style_id,
    currentEstimate?.default_cabinet_style_id,
    teamDefaults?.default_cabinet_style_id,
  ]);

  // TODO: Add similar processing for other section types when error state logic is implemented
  // const lengthsWithErrorState = useMemo(() => { ... }, [sectionData.lengths, ...]);
  // const accessoriesWithErrorState = useMemo(() => { ... }, [sectionData.accessories, ...]);
  // const otherWithErrorState = useMemo(() => { ... }, [sectionData.other, ...]);

  // sectionCalculations is now passed as a prop from EstimateLayout

  // Check if each section type has items in error state
  const getSectionErrorState = useMemo(() => {
    return {
      // Check cabinets for error state
      cabinets: cabinetsWithErrorState.some((item) => item.errorState),

      // Placeholder for other section types (to be implemented later)
      lengths: false,
      accessories: false,
      other: false,
    };
  }, [cabinetsWithErrorState]);

  const sections = [
    {
      type: SECTION_TYPES.CABINETS.type,
      title: SECTION_TYPES.CABINETS.title,
      count: cabinetsWithErrorState.length,
      component: (
        <EstimateCabinetManager
          items={cabinetsWithErrorState}
          onUpdateItems={(items) =>
            handleUpdateItems(SECTION_TYPES.CABINETS.type, items)
          }
          onDeleteItem={(item) =>
            handleDeleteRequest(SECTION_TYPES.CABINETS.type, item)
          }
          onReorderItems={(orderedIds) =>
            handleReorderItems(SECTION_TYPES.CABINETS.type, orderedIds)
          }
          cabinetStyleId={sectionData.style}
          cabinetTypes={cabinetTypes}
        />
      ),
    },
    {
      type: SECTION_TYPES.LENGTHS.type,
      title: SECTION_TYPES.LENGTHS.title,
      count: sectionData.lengths?.length,
      component: (
        <EstimateLengthManager
          items={sectionData.lengths}
          onUpdateItems={(items) =>
            handleUpdateItems(SECTION_TYPES.LENGTHS.type, items)
          }
          onDeleteItem={(item) =>
            handleDeleteRequest(SECTION_TYPES.LENGTHS.type, item)
          }
          onReorderItems={(orderedIds) =>
            handleReorderItems(SECTION_TYPES.LENGTHS.type, orderedIds)
          }
        />
      ),
    },
    {
      type: SECTION_TYPES.ACCESSORIES.type,
      title: SECTION_TYPES.ACCESSORIES.title,
      count: sectionData.accessories?.length,
      component: (
        <EstimateAccessoriesManager
          items={sectionData.accessories}
          onUpdateItems={(items) =>
            handleUpdateItems(SECTION_TYPES.ACCESSORIES.type, items)
          }
          onDeleteItem={(item) =>
            handleDeleteRequest(SECTION_TYPES.ACCESSORIES.type, item)
          }
          onReorderItems={(orderedIds) =>
            handleReorderItems(SECTION_TYPES.ACCESSORIES.type, orderedIds)
          }
        />
      ),
    },
    {
      type: SECTION_TYPES.OTHER.type,
      title: SECTION_TYPES.OTHER.title,
      count: sectionData.other?.length,
      component: (
        <EstimateOtherManager
          items={sectionData.other}
          onUpdateItems={(items) =>
            handleUpdateItems(SECTION_TYPES.OTHER.type, items)
          }
          onDeleteItem={(item) =>
            handleDeleteRequest(SECTION_TYPES.OTHER.type, item)
          }
          onReorderItems={(orderedIds) =>
            handleReorderItems(SECTION_TYPES.OTHER.type, orderedIds)
          }
        />
      ),
    },
  ];

  // Render breakdown view if active
  if (showBreakdown && sectionCalculations) {
    // Find the current task to get task name
    const currentTask = currentEstimate?.tasks?.find(
      (t) => t.est_task_id === taskId,
    );
    
    // Calculate section number (1-indexed)
    const sectionIndex = currentTask?.sections?.findIndex(
      (s) => s.est_section_id === section.est_section_id,
    );
    const sectionNumber = sectionIndex !== undefined && sectionIndex >= 0 ? sectionIndex + 1 : null;
    
    // Determine section display name
    const sectionDisplayName = section?.section_name 
      || (sectionNumber ? `Section ${sectionNumber}` : "");

    return (
      <div className="flex-1 max-w-6xl mx-auto space-y-4">
        <EstimateSectionBreakdown
          sectionCalculations={sectionCalculations}
          section={section}
          projectName={currentEstimate?.est_project_name || ""}
          taskName={currentTask?.est_task_name || ""}
          sectionName={sectionDisplayName}
          onClose={() => setShowBreakdown(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto space-y-4">
      {/* Section Items Accordions */}
      {sections.map(({ type, title, count, component }) => (
        <div key={type} className="border border-slate-200 rounded-lg">
          <button
            onClick={() => handleToggleSection(type)}
            className={`
              w-full px-4 py-3 text-left flex items-center justify-between
              ${openSectionType === type ? "bg-slate-100 rounded-t" : "bg-white rounded"}
              ${getSectionErrorState[type] ? "border-4 border-red-500 rounded-lg" : ""}
              hover:bg-slate-200 transition-colors
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                {title}
              </span>
              {getSectionErrorState[type] && (
                <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                  <FiAlertCircle size={14} />
                  Needs Attention
                </span>
              )}
            </div>
            <span className="text-slate-400 flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                {count} item{count === 1 ? "" : "s"}
              </span>
              {openSectionType === type ? (
                <FiChevronDown size={20} />
              ) : (
                <FiChevronRight size={20} />
              )}
            </span>
          </button>
          {openSectionType === type && (
            <div className="border-t border-slate-200">{component}</div>
          )}
        </div>
      ))}

      {/* Add Hours Section - Always Visible */}
      <LaborAdjustmentssManager
        addHours={section?.add_hours}
        onSave={handleSaveAddHours}
      />

      {/* Section Breakdown Button */}
      <div className="w-full flex justify-end">
        <button
          onClick={() => setShowBreakdown(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
        >
          <FiList size={18} />
          View Section Breakdown
        </button>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleDeleteItem}
        title="Confirm Deletion"
        message="Are you sure you want to delete this item? This action cannot be undone."
      />
    </div>
  );
};

EstimateSectionManager.propTypes = {
  taskId: PropTypes.number.isRequired,
  sectionId: PropTypes.number.isRequired,
  section: PropTypes.object.isRequired,
  sectionCalculations: PropTypes.object,
};

export default EstimateSectionManager;
