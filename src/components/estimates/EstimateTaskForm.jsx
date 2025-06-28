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

  const handleDeleteSection = (taskId, index) => {
    const updatedSections = [...(tasks.find(t => t.est_task_id === taskId).sections || [])];
    updatedSections.splice(index, 1);

    handleUpdateTask(taskId, { sections: updatedSections });
  };

  const handleCancelSection = () => {
    setShowSectionForm(false);
    setEditingSectionIndex(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="flex-none">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-800">Tasks</h2>
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <FiPlusCircle className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {showNewTaskForm && (
          <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Enter task name"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTask}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowNewTaskForm(false)}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Tasks Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pr-2">
          {tasks.map((task) => (
            <div
              key={task.est_task_id}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden"
            >
              <div className="p-4">
                {isEditing && editingTaskId === task.est_task_id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSaveTask}
                      className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-800">
                      {task.est_task_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setEditingTaskId(task.est_task_id);
                          setTaskName(task.est_task_name);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.est_task_id)}
                        className="p-1.5 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sections */}
                <div className="mt-4 space-y-3">
                  {task.sections?.map((section, index) => (
                    <div key={index} className="border-l-2 border-slate-200 pl-3 py-1">
                      <div className="flex items-center">
                        <span className="text-sm">{section.style} - {section.cabinetInterior}</span>
                        <div className="ml-auto flex space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskId(task.est_task_id);
                              setEditingSectionIndex(index);
                              setShowSectionForm(true);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            aria-label="Edit section"
                          >
                            <FiEdit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(task.est_task_id, index)}
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

                  {showSectionForm && editingTaskId === task.est_task_id ? (
                    <div className="mt-4 bg-slate-50 rounded-lg border border-slate-200">
                      <EstimateSectionForm
                        section={
                          editingSectionIndex !== null
                            ? task.sections[editingSectionIndex]
                            : {}
                        }
                        onSave={(sectionData) =>
                          handleSaveSection(task.est_task_id, sectionData, editingSectionIndex)
                        }
                        onCancel={() => {
                          setShowSectionForm(false);
                          setEditingSectionIndex(null);
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingTaskId(task.est_task_id);
                        setEditingSectionIndex(null);
                        setShowSectionForm(true);
                      }}
                      className="w-full py-2 px-3 text-sm text-slate-600 bg-slate-50 rounded-md border border-dashed border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                    >
                      + Add Section
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTaskId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              Delete Task
            </h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this task? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTaskId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstimateTaskForm;
