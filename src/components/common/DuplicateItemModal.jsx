import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

const DuplicateItemModal = ({ 
  open, 
  onClose, 
  onSave, 
  currentTaskId, 
  currentSectionId,
  itemType = 'item'
}) => {
  const currentEstimate = useSelector((state) => state.estimates.currentEstimate);
  
  const [selectedTaskId, setSelectedTaskId] = useState(currentTaskId);
  const [selectedSectionId, setSelectedSectionId] = useState(currentSectionId);
  const [availableSections, setAvailableSections] = useState([]);

  // Initialize with current task/section
  useEffect(() => {
    if (open) {
      setSelectedTaskId(currentTaskId);
      setSelectedSectionId(currentSectionId);
    }
  }, [open, currentTaskId, currentSectionId]);

  // Update available sections when task changes
  useEffect(() => {
    if (selectedTaskId && currentEstimate?.tasks) {
      const task = currentEstimate.tasks.find(t => t.est_task_id === selectedTaskId);
      setAvailableSections(task?.sections || []);
      
      // If we changed tasks and current section isn't in new task, select first section
      if (task?.sections?.length > 0) {
        const sectionExists = task.sections.some(s => s.est_section_id === selectedSectionId);
        if (!sectionExists) {
          setSelectedSectionId(task.sections[0].est_section_id);
        }
      }
    }
  }, [selectedTaskId, currentEstimate, selectedSectionId]);

  const handleSave = () => {
    onSave({
      targetTaskId: selectedTaskId,
      targetSectionId: selectedSectionId,
    });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!open || !currentEstimate) return null;

  const tasks = currentEstimate.tasks || [];
  const isSameLocation = selectedTaskId === currentTaskId && selectedSectionId === currentSectionId;
  
  // Helper function to get section display name
  const getSectionDisplayName = (section, index) => {
    return section.name || `Section ${index + 1}`;
  };

  // Get current section name for display
  const selectedSection = availableSections.find(s => s.est_section_id === selectedSectionId);
  const selectedSectionIndex = availableSections.findIndex(s => s.est_section_id === selectedSectionId);
  const selectedSectionName = selectedSection ? getSectionDisplayName(selectedSection, selectedSectionIndex) : '';

  // Check if selected task has only one section
  const hasMultipleSections = availableSections.length > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Duplicate {itemType}</h2>
        
        <div className="space-y-4 mb-6">
          {/* Task Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Task
            </label>
            <select
              value={selectedTaskId || ''}
              onChange={(e) => setSelectedTaskId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tasks.map((task) => (
                <option key={task.est_task_id} value={task.est_task_id}>
                  {task.est_task_name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selection - only show if task has multiple sections */}
          {hasMultipleSections && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Section
              </label>
              <select
                value={selectedSectionId || ''}
                onChange={(e) => setSelectedSectionId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedTaskId || availableSections.length === 0}
              >
                {availableSections.map((section, index) => (
                  <option key={section.est_section_id} value={section.est_section_id}>
                    {getSectionDisplayName(section, index)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location Info */}
          {isSameLocation && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              The duplicate will be added to the same section: <strong>{selectedSectionName}</strong>
            </div>
          )}
          {!isSameLocation && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
              The duplicate will be added to: <strong>{selectedSectionName}</strong>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <button 
            onClick={handleCancel} 
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={!selectedTaskId || !selectedSectionId}
          >
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
};

DuplicateItemModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  currentTaskId: PropTypes.number.isRequired,
  currentSectionId: PropTypes.number.isRequired,
  itemType: PropTypes.string,
};

export default DuplicateItemModal;
