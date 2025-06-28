import React, { useState } from "react";
import { FiPlusCircle, FiTrash2, FiEdit } from "react-icons/fi";
import EstimateSectionForm from "./EstimateSectionForm";
import { useDispatch, useSelector } from 'react-redux';
import { addTask, updateTask, deleteTask } from '../../redux/actions/estimates';
import ConfirmationModal from '../common/ConfirmationModal';

const EstimateTaskForm = () => {
  const dispatch = useDispatch();
  const { currentEstimate } = useSelector(state => state.estimates);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskName, setTaskName] = useState("");
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  // Tasks are now loaded from Redux state
  const tasks = currentEstimate?.tasks || [];

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;

    try {
      await dispatch(addTask(currentEstimate.est_project_id, newTaskName));
      setNewTaskName("");
      setShowNewTaskForm(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await dispatch(updateTask(currentEstimate.est_project_id, taskId, updates));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    setDeleteTaskId(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!deleteTaskId) return;

    try {
      await dispatch(deleteTask(currentEstimate.est_project_id, deleteTaskId));
      setDeleteTaskId(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleSaveTask = () => {
    if (taskName.trim()) {
      handleUpdateTask(editingTaskId, { est_task_name: taskName.trim() });
      setIsEditing(false);
    }
  };

  const handleAddSection = () => {
    setShowSectionForm(true);
    setEditingSectionIndex(null);
  };

  const handleEditSection = (index) => {
    setShowSectionForm(true);
    setEditingSectionIndex(index);
  };

  const handleSaveSection = (section) => {
    const updatedSections = [...(tasks[0].sections || [])];

    if (editingSectionIndex !== null) {
      // Update existing section
      updatedSections[editingSectionIndex] = section;
    } else {
      // Add new section
      updatedSections.push(section);
    }

    handleUpdateTask(tasks[0].est_task_id, { sections: updatedSections });

    setShowSectionForm(false);
    setEditingSectionIndex(null);
  };

  const handleDeleteSection = (index) => {
    const updatedSections = [...(tasks[0].sections || [])];
    updatedSections.splice(index, 1);

    handleUpdateTask(tasks[0].est_task_id, { sections: updatedSections });
  };

  const handleCancelSection = () => {
    setShowSectionForm(false);
    setEditingSectionIndex(null);
  };

  return (
    <div className="space-y-4">
      <ConfirmationModal
        isOpen={!!deleteTaskId}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteTaskId(null)}
        confirmText="Delete"
        confirmButtonClass="bg-red-500 hover:bg-red-600"
      />
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tasks</h3>
        <button
          type="button"
          onClick={() => setShowNewTaskForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Add Task
        </button>
      </div>

      {showNewTaskForm && (
        <div className="p-4 bg-gray-50 rounded-md">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Enter task name"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <div className="mt-2 flex space-x-2">
            <button
              type="button"
              onClick={handleAddTask}
              className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewTaskForm(false);
                setNewTaskName("");
              }}
              className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((task, index) => (
          <div
            key={task.est_task_id}
            className="p-4 bg-white border border-gray-200 rounded-md"
          >
            <div className="flex items-center justify-between">
              {isEditing && task.est_task_id === editingTaskId ? (
                <div className="flex-1">
                  <input
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task name"
                    autoFocus
                  />
                  <div className="flex mt-2">
                    <button
                      type="button"
                      onClick={handleSaveTask}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="font-medium text-slate-700">{task.est_task_name || "Untitled Task"}</span>
                  <div className="ml-auto flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setEditingTaskId(task.est_task_id);
                        setTaskName(task.est_task_name);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                      aria-label="Edit task"
                    >
                      <FiEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.est_task_id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Sections List */}
            {task.sections && task.sections.length > 0 ? (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Sections</h4>
                <div className="space-y-2 ml-2">
                  {task.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="border-l-2 border-slate-200 pl-3 py-1">
                      <div className="flex items-center">
                        <span className="text-sm">{section.style} - {section.cabinetInterior}</span>
                        <div className="ml-auto flex space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditSection(sectionIndex)}
                            className="text-blue-500 hover:text-blue-700"
                            aria-label="Edit section"
                          >
                            <FiEdit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sectionIndex)}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Remove section"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        <span>Material: {section.material}</span>
                        {section.finish && section.finish.length > 0 && (
                          <span className="ml-2">Finish: {section.finish.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-4">No sections added yet</p>
            )}

            {/* Section Form */}
            {showSectionForm ? (
              <EstimateSectionForm
                section={editingSectionIndex !== null ? task.sections[editingSectionIndex] : {}}
                onSave={handleSaveSection}
                onCancel={handleCancelSection}
              />
            ) : (
              <button
                type="button"
                onClick={handleAddSection}
                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 flex items-center"
              >
                <FiPlusCircle className="mr-1" size={12} />
                Add Section
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EstimateTaskForm;
