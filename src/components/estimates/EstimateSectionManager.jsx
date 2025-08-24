import { isEqual } from "lodash";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useDispatch } from "react-redux";

import { useDebouncedCallback } from "../../hooks/useDebounce";
import { updateSectionItems } from "../../redux/actions/estimates";
import { SECTION_TYPES } from "../../utils/constants.js";

import EstimateAccessoriesManager from "./EstimateAccessoriesManager.jsx";
import EstimateCabinetManager from "./EstimateCabinetManager.jsx";
import EstimateLengthManager from "./EstimateLengthManager.jsx";
import EstimateOtherManager from "./EstimateOtherManager.jsx";

const EstimateSectionManager = ({ taskId, sectionId, section }) => {
  const dispatch = useDispatch();

  // No longer need to look up the section since it's passed as a prop
  // Keep taskId and sectionId for dispatching actions

  // Initialize section data from current section
  const [sectionData, setSectionData] = useState({
    cabinets: section?.cabinets || [],
    lengths: section?.lengths || [],
    accessories: section?.accessories || [],
    other: section?.other || [],
    style: section?.section_data?.style || "euro",
  });

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
  const debouncedSave = useDebouncedCallback(async (type, updatedItems) => {
    try {
      // Only save if there are actual changes compared to Redux state
      if (!hasUnsavedChanges(type, updatedItems)) {
        console.log(`No changes detected for ${type}. Skipping save.`);
        return;
      }

      if (sectionId) {
        console.log(`Saving changes for ${type}`);
        
        const tableName = sectionTableMapping[type];
        // For now, we'll pass an empty array for idsToDelete - you can enhance this later
        const idsToDelete = [];
        
        await dispatch(updateSectionItems(tableName, sectionId, updatedItems, idsToDelete));
        
        console.log(`Successfully saved ${type} changes`);
      }
    } catch (error) {
      console.error("Error saving section data:", error);
      // On error, revert to the last known good state from Redux
      setSectionData((prev) => ({
        ...prev,
        [type]: section?.[type] || [],
      }));
    }
  }, 1000); // 1 second debounce delay

  // Immediate save function (no debounce)
  const saveImmediately = async (type, updatedItems) => {
    try {
      if (!hasUnsavedChanges(type, updatedItems)) {
        console.log(`No changes detected for ${type}. Skipping save.`);
        return;
      }

      if (sectionId) {
        console.log(`Immediately saving changes for ${type}`);
        
        const tableName = sectionTableMapping[type];
        const idsToDelete = [];
        
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

  const handleUpdateItems = (type, updatedItems) => {
    // Update local state immediately (optimistic update)
    setSectionData((prev) => ({
      ...prev,
      [type]: updatedItems,
    }));

    // Debounced save to database
    // debouncedSave(type, updatedItems);
    saveImmediately(type, updatedItems);
  };

  const sections = [
    {
      type: SECTION_TYPES.CABINETS.type,
      title: SECTION_TYPES.CABINETS.title,
      component: (
        <EstimateCabinetManager
          items={sectionData.cabinets}
          onUpdateItems={(items) => handleUpdateItems(SECTION_TYPES.CABINETS.type, items)}
          style={sectionData.style}
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
    </div>
  );
};

EstimateSectionManager.propTypes = {
  taskId: PropTypes.number.isRequired,
  sectionId: PropTypes.number.isRequired,
  section: PropTypes.object.isRequired,
};

export default EstimateSectionManager;
