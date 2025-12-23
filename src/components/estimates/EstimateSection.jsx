import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { deleteSection, updateSection } from "../../redux/actions/estimates";
import ConfirmationModal from "../common/ConfirmationModal.jsx";

const EstimateSection = ({
  task,
  isSelected,
  hasErrorState = false,
  onSelect,
  onDelete,
  section,
  sectionNumber,
}) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sectionName, setSectionName] = useState(section.section_name || "");

  useEffect(() => {
    setSectionName(section.section_name || "");
  }, [section.section_name]);

  const handleDelete = async () => {
    try {
      await dispatch(
        deleteSection(
          currentEstimate.estimate_id,
          task.est_task_id,
          section.est_section_id
        )
      );
      onDelete?.();
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting section:", error);
    }
  };

  const handleSave = async () => {
    try {
      // Convert empty string to null for database
      const nameToSave = sectionName.trim() === "" ? null : sectionName.trim();
      await dispatch(
        updateSection(
          currentEstimate.estimate_id,
          task.est_task_id,
          section.est_section_id,
          { section_name: nameToSave }
        )
      );
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving section name:", error);
    }
  };

  const handleCancel = () => {
    setSectionName(section.section_name || "");
    setIsEditing(false);
  };

  // Display name: use custom name if exists, otherwise "Section #"
  const displayName = section.section_name || `Section ${sectionNumber}`;

  return (
    <>
      <div>
        {isEditing ? (
          <div className="flex flex-col items-center space-x-2 px-4 py-2">
            <input
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              className="flex-1 h-8 p-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-slate-700 text-slate-200"
              autoFocus
              placeholder={`Section ${sectionNumber}`}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="px-2 py-1 text-sm font-medium text-teal-400 hover:text-teal-300"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-sm font-medium text-slate-400 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onSelect}
            className={`
              w-full py-2 px-4 text-sm font-medium text-left flex items-center justify-between group/section
              ${
                hasErrorState
                  ? isSelected
                    ? "bg-red-700 text-slate-200 border-l-2 border-red-500"
                    : "bg-red-700 text-slate-200 hover:bg-red-600 hover:text-slate-100"
                  : isSelected
                    ? "bg-slate-800 text-teal-200 border-l-2 border-teal-200"
                    : "text-slate-400 hover:bg-slate-700 hover:text-teal-400"
              }
            `}
          >
            <span>{displayName}</span>
            <div className="invisible group-hover/section:visible space-x-2 flex">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 text-slate-400 hover:text-teal-400"
              >
                <FiEdit2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirmation(true);
                }}
                className="p-1 text-slate-400 hover:text-red-400"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          </button>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Delete Section"
        message={[
          `Are you sure you want to delete "${task.est_task_name} - ${displayName}"?`,
          "This action cannot be undone.",
        ]}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirmation(false)}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-500 hover:bg-red-600"
      />
    </>
  );
};

EstimateSection.propTypes = {
  task: PropTypes.shape({
    est_task_id: PropTypes.number.isRequired,
    est_task_name: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool,
  hasErrorState: PropTypes.bool,
  onSelect: PropTypes.func,
  onDelete: PropTypes.func,
  section: PropTypes.object,
  sectionNumber: PropTypes.number,
};

export default EstimateSection;
