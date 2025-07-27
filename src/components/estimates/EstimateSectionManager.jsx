import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { useDebouncedCallback } from "../../hooks/useDebounce";
import { updateSection } from "../../redux/actions/estimates";
import { SECTION_TYPES } from "../../utils/constants.js";

import EstimateAccessoriesManager from "./EstimateAccessoriesManager.jsx";
import EstimateCabinetManager from "./EstimateCabinetManager.jsx";
import EstimateLengthManager from "./EstimateLengthManager.jsx";
import EstimateOtherManager from "./EstimateOtherManager.jsx";

const EstimateSectionManager = ({ taskId, sectionId }) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );

  const currentSection = currentEstimate?.tasks
    ?.find((t) => t.est_task_id === taskId)
    ?.sections?.find((s) => s.est_section_id === sectionId);

  const [openSectionType, setOpenSectionType] = useState(null);

  // Initialize section data from current section
  const [sectionData, setSectionData] = useState({
    cabinets: currentSection?.cabinets || [],
    lengths: currentSection?.lengths || [],
    accessories: currentSection?.accessories || [],
    other: currentSection?.other || [],
  });

  // Update local state when currentSection changes
  useEffect(() => {
    if (currentSection) {
      setSectionData({
        cabinets: [
          {
            name: "BU",
            width: 24,
            height: 30.5,
            depth: 24,
            quantity: 1,
          },
          {
            name: "B3D",
            width: 27,
            height: 30.5,
            depth: 24,
            quantity: 1,
          },
        ],
        lengths: currentSection.lengths || [],
        accessories: currentSection.accessories || [],
        other: currentSection.other || [],
      });
    }
  }, [currentSection]);

  const handleToggleSection = (sectionType) => {
    setOpenSectionType(openSectionType === sectionType ? null : sectionType);
  };

  // Debounced save to database
  const debouncedSave = useDebouncedCallback(async (type, updatedItems) => {
    try {
      if (currentEstimate && taskId && sectionId) {
        // await dispatch(
        //   updateSection(currentEstimate.estimate_id, taskId, sectionId, {
        //     [type]: updatedItems,
        //   })
        // );
      }
    } catch (error) {
      console.error("Error saving section data:", error);
      // On error, revert to the last known good state from Redux
      setSectionData((prev) => ({
        ...prev,
        [type]: currentSection?.[type] || [],
      }));
    }
  }, 10000); // 10 second debounce delay

  const handleUpdateItems = (type, updatedItems) => {
    // Update local state immediately (optimistic update)
    setSectionData((prev) => ({
      ...prev,
      [type]: updatedItems,
    }));

    // Debounced save to database
    debouncedSave(type, updatedItems);
  };

  const sections = [
    {
      type: SECTION_TYPES.CABINETS.type,
      title: SECTION_TYPES.CABINETS.title,
      component: (
        <EstimateCabinetManager
          items={sectionData.cabinets}
          onUpdateItems={(items) => handleUpdateItems(SECTION_TYPES.CABINETS.type, items)}
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
    <div className="max-w-3xl mx-auto space-y-2">
      {sections.map(({ type, title, component }) => (
        <div
          key={type}
          className="border border-slate-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => handleToggleSection(type)}
            className={`
              w-full px-4 py-3 text-left flex items-center justify-between
              ${openSectionType === type ? "bg-slate-100" : "bg-white"}
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
};

export default EstimateSectionManager;
