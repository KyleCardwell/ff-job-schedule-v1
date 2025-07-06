import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { updateTask, deleteTask, addTask } from "../../redux/actions/estimates";

const EstimateTaskForm = ({
  selectedTaskId,
  onTaskDeleted,
  isNew = false,
  onTaskSaved,
  onCancel,
}) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const selectedTask = currentEstimate?.tasks?.find(
    (task) => task.est_task_id === selectedTaskId
  );

  const [taskName, setTaskName] = useState("");
  const [isEditing, setIsEditing] = useState(isNew);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);

  useEffect(() => {
    if (selectedTask) {
      setTaskName(selectedTask.est_task_name);
    } else if (isNew) {
      setIsEditing(true);
    }
  }, [selectedTask, isNew]);

  const handleSave = async () => {
    try {
      if (isNew) {
        const newTask = await dispatch(
          addTask(currentEstimate.estimate_id, taskName)
        );
        onTaskSaved?.(newTask.est_task_id);
      } else {
        await dispatch(
          updateTask(currentEstimate.estimate_id, selectedTask.est_task_id, {
            est_task_name: taskName,
          })
        );
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(
        deleteTask(currentEstimate.est_project_id, selectedTask.est_task_id)
      );
      onTaskDeleted?.();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleSaveSection = async (sectionData) => {
    if (!selectedTask) return;
    const updatedSections = [...(selectedTask.sections || [])];

    if (editingSectionIndex !== null) {
      updatedSections[editingSectionIndex] = sectionData;
    } else {
      updatedSections.push(sectionData);
    }

    try {
      await dispatch(
        updateTask(currentEstimate.est_project_id, selectedTask.est_task_id, {
          sections: updatedSections,
        })
      );
      setShowSectionForm(false);
      setEditingSectionIndex(null);
    } catch (error) {
      console.error("Error saving section:", error);
    }
  };

  if (!selectedTask && !isNew) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {isEditing ? (
          <div className="flex items-center space-x-2 flex-1 mr-2">
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full h-9 p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              autoFocus
              placeholder="Room Name"
            />
            <button
              onClick={() => {
                if (isNew) {
                  onCancel?.();
                } else {
                  setTaskName(selectedTask?.est_task_name || "");
                  setIsEditing(false);
                }
              }}
              className="px-3 py-1 text-sm font-medium text-slate-700 bg-white rounded hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <h2 className="text-xl font-semibold text-slate-200">{taskName}</h2>
        )}

        <div className="flex space-x-2">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm font-medium text-white bg-teal-500 rounded hover:bg-teal-600"
            >
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm font-medium text-teal-400 hover:text-teal-300"
            >
              Edit
            </button>
          )}
          {!isNew && (
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm font-medium text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstimateTaskForm;
