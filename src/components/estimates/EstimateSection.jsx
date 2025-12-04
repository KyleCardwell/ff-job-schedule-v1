import PropTypes from "prop-types";
import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { deleteSection } from "../../redux/actions/estimates";
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

  return (
    <>
      <div>
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
          <span>Section {sectionNumber}</span>
          <div className="invisible group-hover/section:visible space-x-2 flex">
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
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Delete Section"
        message={[
          `Are you sure you want to delete "${task.est_task_name} - Section ${sectionNumber}"?`,
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
