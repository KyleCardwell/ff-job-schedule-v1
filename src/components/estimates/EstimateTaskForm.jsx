import React, { useState } from "react";
import { FiPlusCircle, FiTrash2, FiEdit } from "react-icons/fi";
import EstimateSectionForm from "./EstimateSectionForm";

const EstimateTaskForm = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [taskName, setTaskName] = useState(task.name || "");
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  
  const handleSaveTask = () => {
    if (taskName.trim()) {
      onUpdate({
        ...task,
        name: taskName.trim()
      });
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
    const updatedSections = [...(task.sections || [])];
    
    if (editingSectionIndex !== null) {
      // Update existing section
      updatedSections[editingSectionIndex] = section;
    } else {
      // Add new section
      updatedSections.push(section);
    }
    
    onUpdate({
      ...task,
      sections: updatedSections
    });
    
    setShowSectionForm(false);
    setEditingSectionIndex(null);
  };
  
  const handleDeleteSection = (index) => {
    const updatedSections = [...(task.sections || [])];
    updatedSections.splice(index, 1);
    
    onUpdate({
      ...task,
      sections: updatedSections
    });
  };
  
  const handleCancelSection = () => {
    setShowSectionForm(false);
    setEditingSectionIndex(null);
  };
  
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 mb-4">
      <div className="flex items-center mb-4">
        {isEditing ? (
          <div className="flex-1">
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <span className="font-medium text-slate-700">{task.name || "Untitled Task"}</span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="ml-2 text-blue-500 hover:text-blue-700"
              aria-label="Edit task"
            >
              <FiEdit size={16} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="ml-auto text-red-500 hover:text-red-700"
          aria-label="Remove task"
        >
          <FiTrash2 />
        </button>
      </div>
      
      {!isEditing && (
        <>
          {/* Sections List */}
          {task.sections && task.sections.length > 0 ? (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Sections</h4>
              <div className="space-y-2 ml-2">
                {task.sections.map((section, index) => (
                  <div key={index} className="border-l-2 border-slate-200 pl-3 py-1">
                    <div className="flex items-center">
                      <span className="text-sm">{section.style} - {section.cabinetInterior}</span>
                      <div className="ml-auto flex space-x-1">
                        <button
                          type="button"
                          onClick={() => handleEditSection(index)}
                          className="text-blue-500 hover:text-blue-700"
                          aria-label="Edit section"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(index)}
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
        </>
      )}
    </div>
  );
};

export default EstimateTaskForm;
