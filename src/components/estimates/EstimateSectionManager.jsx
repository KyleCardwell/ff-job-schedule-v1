import { isEqual } from "lodash";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

// import { useDebouncedCallback } from "../../hooks/useDebounce";
import { updateSectionItems, updateSectionItemOrder } from "../../redux/actions/estimates";
import { SECTION_TYPES } from "../../utils/constants.js";
import ConfirmationModal from "../common/ConfirmationModal.jsx";

import EstimateAccessoriesManager from "./EstimateAccessoriesManager.jsx";
import EstimateCabinetManager from "./EstimateCabinetManager.jsx";
import EstimateLengthManager from "./EstimateLengthManager.jsx";
import EstimateOtherManager from "./EstimateOtherManager.jsx";

const EstimateSectionManager = ({ taskId, sectionId, section }) => {
  const dispatch = useDispatch();
  const cabinetTypes = useSelector((state) => state.cabinetTypes.types);

  // Initialize section data from current section
  const [sectionData, setSectionData] = useState({
    cabinets: section?.cabinets || [],
    lengths: section?.lengths || [],
    accessories: section?.accessories || [],
    other: section?.other || [],
    style: section?.section_data?.style || "euro",
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Create a mapping of section types to their table names
  const sectionTableMapping = {
    cabinets: 'estimate_cabinets',
    accessories: 'estimate_accessories', 
    lengths: 'estimate_lengths',
    other: 'estimate_other',
  };

  // Helper function to check if there are unsaved changes by comparing with Redux state
  const hasUnsavedChanges = (type, updatedItems) => {
    const reduxItems = section?.[type] || [];
    return !isEqual(reduxItems, updatedItems);
  };

  // Update local state when section changes
  useEffect(() => {
    if (section) {
      setSectionData({
        cabinets: section.cabinets || [],
        lengths: section.lengths || [],
        accessories: section.accessories || [],
        other: section.other || [],
        style: section?.section_data?.style || 'euro',
      });
    }
  }, [section]);

  // Close all accordions when taskId changes
  useEffect(() => {
    setOpenSectionType(null);
  }, [taskId, sectionId]);

  const [openSectionType, setOpenSectionType] = useState(null);

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
        
        await dispatch(updateSectionItems(tableName, sectionId, updatedItems, idsToDelete));
        
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

  const handleDeleteItem = () => {
    if (!itemToDelete) return;

    const { type, item: itemToDeleteData } = itemToDelete;

    if (!itemToDeleteData || typeof itemToDeleteData.id === 'undefined') return;

    const updatedItems = sectionData[type].filter((item) => {
      if (item.id) return item.id !== itemToDeleteData.id;
      if (item.temp_id) return item.temp_id !== itemToDeleteData.temp_id;
      return false;
    });

    setSectionData((prev) => ({
      ...prev,
      [type]: updatedItems,
    }));

    saveImmediately(type, updatedItems, [itemToDeleteData.id]);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleUpdateItems = (type, updatedItems) => {
    // Update local state immediately (optimistic update)
    setSectionData((prev) => ({
      ...prev,
      [type]: updatedItems,
    }));

    saveImmediately(type, updatedItems, []);
  };

  const handleReorderItems = (type, orderedIds) => {
    const items = sectionData[type];
    const itemsMap = new Map(items.map(item => [item.id || item.temp_id, item]));
    const reorderedItems = orderedIds.map(id => itemsMap.get(id)).filter(Boolean);

    setSectionData((prev) => ({
      ...prev,
      [type]: reorderedItems,
    }));

    // Dispatch the new action to save only the order
    const tableName = sectionTableMapping[type];
    dispatch(updateSectionItemOrder(sectionId, tableName, orderedIds));
  };

  const sections = [
    {
      type: SECTION_TYPES.CABINETS.type,
      title: SECTION_TYPES.CABINETS.title,
      component: (
        <EstimateCabinetManager
          items={sectionData.cabinets}
          onUpdateItems={(items) => handleUpdateItems(SECTION_TYPES.CABINETS.type, items)}
          onDeleteItem={(item) => handleDeleteRequest(SECTION_TYPES.CABINETS.type, item)}
          onReorderItems={(orderedIds) => handleReorderItems(SECTION_TYPES.CABINETS.type, orderedIds)}
          cabinetStyleId={section.cabinet_style_id}
          cabinetTypes={cabinetTypes}
        />
      ),
    },
    {
      type: SECTION_TYPES.LENGTHS.type,
      title: SECTION_TYPES.LENGTHS.title,
      component: (
        <EstimateLengthManager
          items={sectionData.lengths}
          onUpdateItems={(items) => handleUpdateItems(SECTION_TYPES.LENGTHS.type, items)}
          onDeleteItem={(item) => handleDeleteRequest(SECTION_TYPES.LENGTHS.type, item)}
          onReorderItems={(orderedIds) => handleReorderItems(SECTION_TYPES.LENGTHS.type, orderedIds)}
        />
      ),
    },
    {
      type: SECTION_TYPES.ACCESSORIES.type,
      title: SECTION_TYPES.ACCESSORIES.title,
      component: (
        <EstimateAccessoriesManager
          items={sectionData.accessories}
          onUpdateItems={(items) => handleUpdateItems(SECTION_TYPES.ACCESSORIES.type, items)}
          onDeleteItem={(item) => handleDeleteRequest(SECTION_TYPES.ACCESSORIES.type, item)}
          onReorderItems={(orderedIds) => handleReorderItems(SECTION_TYPES.ACCESSORIES.type, orderedIds)}
        />
      ),
    },
    {
      type: SECTION_TYPES.OTHER.type,
      title: SECTION_TYPES.OTHER.title,
      component: (
        <EstimateOtherManager
          items={sectionData.other}
          onUpdateItems={(items) => handleUpdateItems(SECTION_TYPES.OTHER.type, items)}
          onDeleteItem={(item) => handleDeleteRequest(SECTION_TYPES.OTHER.type, item)}
          onReorderItems={(orderedIds) => handleReorderItems(SECTION_TYPES.OTHER.type, orderedIds)}
        />
      ),
    },
  ];

  return (
    <div className="flex-1 max-w-3xl mx-auto space-y-2">
      {sections.map(({ type, title, component }) => (
        <div
          key={type}
          className="border border-slate-200 rounded-lg"
        >
          <button
            onClick={() => handleToggleSection(type)}
            className={`
              w-full px-4 py-3 text-left flex items-center justify-between
              ${openSectionType === type ? "bg-slate-100 rounded-t" : "bg-white rounded"}
              hover:bg-slate-200 transition-colors
            `}
          >
            <span className="text-sm font-medium text-slate-700">{title}</span>
            <span className="text-slate-400">
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
};

export default EstimateSectionManager;
