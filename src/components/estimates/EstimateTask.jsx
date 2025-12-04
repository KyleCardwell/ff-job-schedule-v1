import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { updateTask, deleteTask, addTask } from "../../redux/actions/estimates";
import { getEffectiveValueOnly } from "../../utils/estimateDefaults";
import ConfirmationModal from "../common/ConfirmationModal.jsx";

import EstimateSection from "./EstimateSection.jsx";

const EstimateTask = ({
  task,
  isSelected,
  hasErrorState = false,
  onSelect,
  onDelete,
  sections = [],
  className = "",
  isNew = false,
  onSave,
  onCancel,
  selectedSectionId,
  setSelectedSectionId,
  setSelectedTaskId,
  setShowSectionForm,
  setShowProjectInfo,
  setShowEstimateDefaultsForm,
}) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults
  );
  const [isEditing, setIsEditing] = useState(isNew);
  const [taskName, setTaskName] = useState(task.est_task_name);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    if (isNew) {
      setIsEditing(true);
    }
  }, [isNew]);

  const handleSave = async () => {
    try {
      if (isNew) {
        const newTask = await dispatch(
          addTask(currentEstimate.estimate_id, taskName)
        );
        onSave?.(newTask.est_task_id);
      } else {
        await dispatch(
          updateTask(currentEstimate.estimate_id, task.est_task_id, {
            est_task_name: taskName,
          })
        );
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteTask(currentEstimate.estimate_id, task.est_task_id));
      onDelete?.();
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      onCancel?.();
    } else {
      setTaskName(task.est_task_name);
      setIsEditing(false);
    }
  };

  return (
    <>
      <div className={`group ${className}`}>
        {isEditing ? (
          <div className="flex flex-col items-center space-x-2 px-4 py-3">
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="flex-1 h-8 p-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-slate-700 text-slate-200"
              autoFocus
              placeholder="Room Name"
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
              w-full py-3 px-4 text-sm font-medium text-left flex items-center justify-between group/task
              ${
                hasErrorState
                  ? isSelected && sections.length === 1
                    ? "bg-red-700 text-slate-200 border-l-2 border-red-500"
                    : "bg-red-900 text-slate-200 hover:bg-red-600 hover:text-slate-100"
                  : isSelected && sections.length === 1
                    ? "bg-slate-800 text-teal-200 border-l-2 border-teal-200"
                    : "text-slate-200 hover:bg-slate-700 hover:text-teal-400"
              }
            `}
          >
            <span>{task.est_task_name}</span>
            <div className="invisible group-hover/task:visible space-x-2 flex">
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

        {/* Sections List */}
        {task.sections?.length > 1 && (
          <div className="pl-6">
            {task.sections.map((section, index) => {
              // Calculate the effective style using three-tier fallback
              const effectiveStyle = getEffectiveValueOnly(
                section?.cabinet_style_id,
                currentEstimate?.default_cabinet_style_id,
                teamDefaults?.default_cabinet_style_id
              ) || 13;

              // Check if this section has any cabinet errors
              const hasErrorCabinets = section.cabinets?.some((cabinet) => {
                return (
                  cabinet.cabinet_style_override === null &&
                  cabinet.saved_style_id != null &&
                  cabinet.saved_style_id !== effectiveStyle
                );
              });
              
              return (
                <EstimateSection
                  key={section.est_section_id}
                  section={section}
                  sectionNumber={index + 1}
                  task={task}
                  isSelected={selectedSectionId === section.est_section_id}
                  hasErrorState={hasErrorCabinets}
                  onSelect={() => {
                    setSelectedTaskId(task.est_task_id);
                    setSelectedSectionId(section.est_section_id);
                    setShowSectionForm(false);
                    setShowProjectInfo(false);
                    setShowEstimateDefaultsForm(false);
                  }}
                  onDelete={() => {
                    setSelectedSectionId(null);
                    setShowSectionForm(false);
                    setShowProjectInfo(false);
                    setShowEstimateDefaultsForm(false);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Delete Task"
        message={[
          `Are you sure you want to delete "${task.est_task_name}"?`,
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

EstimateTask.propTypes = {
  task: PropTypes.shape({
    est_task_id: PropTypes.number.isRequired,
    est_task_name: PropTypes.string.isRequired,
    sections: PropTypes.array,
  }).isRequired,
  isSelected: PropTypes.bool,
  hasErrorState: PropTypes.bool,
  onSelect: PropTypes.func,
  onDelete: PropTypes.func,
  sections: PropTypes.array,
  className: PropTypes.string,
  isNew: PropTypes.bool,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
  selectedSectionId: PropTypes.number,
  setSelectedSectionId: PropTypes.func,
  setSelectedTaskId: PropTypes.func,
  setShowSectionForm: PropTypes.func,
  setShowProjectInfo: PropTypes.func,
  setShowEstimateDefaultsForm: PropTypes.func,
};

export default EstimateTask;
