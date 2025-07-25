import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { useDebouncedCallback } from "../../hooks/useDebounce";
import { updateSection } from "../../redux/actions/estimates";

import EstimateAccessoriesManager from "./EstimateAccessoriesManager.jsx";
import EstimateItemManager from "./EstimateItemManager.jsx";
import EstimateLengthManager from "./EstimateLengthManager.jsx";
import EstimateOtherManager from "./EstimateOtherManager.jsx";

const SECTION_TYPES = {
  CABINETS: "cabinets",
  LENGTHS: "lengths",
  ACCESSORIES: "accessories",
  OTHER: "other",
};

const EstimateSectionManager = ({ taskId, sectionId }) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );

  const currentSection = currentEstimate?.tasks
    ?.find((t) => t.est_task_id === taskId)
    ?.sections?.find((s) => s.est_section_id === sectionId);

  const [openSectionType, setOpenSectionType] = useState(null);
  const [sectionData, setSectionData] = useState({
    items: [],
    lengths: [],
    accessories: [],
    other: [],
  });

  // Initialize section data from Redux
  useEffect(() => {
    if (currentSection?.section_data) {
      setSectionData({
        items: currentSection.section_data.items || [],
        lengths: currentSection.section_data.lengths || [],
        accessories: currentSection.section_data.accessories || [],
        other: currentSection.section_data.other || [],
      });
    }
  }, [currentSection?.section_data]);

  const handleToggleSection = (sectionType) => {
    setOpenSectionType(openSectionType === sectionType ? null : sectionType);
  };

  // Debounced save to database
//   const debouncedSave = useDebouncedCallback(async (updatedSectionData) => {
//     try {
//       await dispatch(
//         updateSection(currentEstimate.estimate_id, taskId, sectionId, {
//           section_data: updatedSectionData,
//         })
//       );
//     } catch (error) {
//       console.error("Error saving section data:", error);
//       // On error, revert to the last known good state from Redux
//       if (currentSection?.section_data) {
//         setSectionData({
//           items: currentSection.section_data.items || [],
//           lengths: currentSection.section_data.lengths || [],
//           accessories: currentSection.section_data.accessories || [],
//           other: currentSection.section_data.other || [],
//         });
//       }
//     }
//   }, 1000); // 1 second debounce delay

  const handleUpdateItems = (type, updatedItems) => {
    // Update local state immediately (optimistic update)
    const updatedSectionData = {
      ...currentSection.section_data,
      [type]: updatedItems,
    };

    setSectionData(prev => ({
      ...prev,
      [type]: updatedItems,
    }));

    // Debounced save to database
    // debouncedSave(updatedSectionData);
  };

  const sections = [
    {
      type: SECTION_TYPES.CABINETS,
      title: "Cabinets",
      component: (
        <EstimateItemManager
          items={sectionData.items}
          onUpdateItems={(items) => handleUpdateItems("items", items)}
        />
      ),
    },
    {
      type: SECTION_TYPES.LENGTHS,
      title: "Lengths",
      component: (
        <EstimateLengthManager
          items={sectionData.lengths}
          onUpdateItems={(items) => handleUpdateItems("lengths", items)}
        />
      ),
    },
    {
      type: SECTION_TYPES.ACCESSORIES,
      title: "Accessories",
      component: (
        <EstimateAccessoriesManager
          items={sectionData.accessories}
          onUpdateItems={(items) => handleUpdateItems("accessories", items)}
        />
      ),
    },
    {
      type: SECTION_TYPES.OTHER,
      title: "Other",
      component: (
        <EstimateOtherManager
          items={sectionData.other}
          onUpdateItems={(items) => handleUpdateItems("other", items)}
        />
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-2">
      {sections.map(({ type, title, component }) => (
        <div key={type} className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => handleToggleSection(type)}
            className={`
              w-full px-4 py-3 text-left flex items-center justify-between
              ${openSectionType === type ? "bg-slate-100" : "bg-white"}
              hover:bg-slate-50 transition-colors
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
};

export default EstimateSectionManager;
