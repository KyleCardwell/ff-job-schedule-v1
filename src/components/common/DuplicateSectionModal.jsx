import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

const DuplicateSectionModal = ({ 
  open, 
  onClose, 
  onSave, 
  currentTaskId,
  currentSectionId,
  sectionName,
  canMoveFromTask = true,
  sectionCount = 1,
  taskName,
  isDuplicatingTask = false
}) => {
  const currentEstimate = useSelector((state) => state.estimates.currentEstimate);
  
  const [selectedTaskId, setSelectedTaskId] = useState(currentTaskId);
  const [isNewTask, setIsNewTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  // Initialize with current task
  // If duplicating entire task, default to creating new task
  useEffect(() => {
    if (open) {
      if (isDuplicatingTask) {
        setIsNewTask(true);
        setSelectedTaskId(null);
      } else {
        setSelectedTaskId(currentTaskId);
        setIsNewTask(false);
      }
      setNewTaskName('');
      setNewSectionName('');
    }
  }, [open, currentTaskId, isDuplicatingTask]);

  const handleTaskChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setIsNewTask(true);
      setSelectedTaskId(null);
    } else {
      setIsNewTask(false);
      setSelectedTaskId(parseInt(value, 10));
    }
  };

  const handleSave = () => {
    if (isNewTask) {
      if (!newTaskName.trim()) {
        alert('Please enter a name for the new task');
        return;
      }
      onSave({
        isNewTask: true,
        newTaskName: newTaskName.trim(),
        sectionName: newSectionName.trim() || null,
      });
    } else {
      onSave({
        isNewTask: false,
        targetTaskId: selectedTaskId,
        sectionName: newSectionName.trim() || null,
      });
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!open || !currentEstimate) return null;

  const isSameTask = selectedTaskId === currentTaskId && !isNewTask;
  const selectedTask = currentEstimate.tasks?.find(t => t.est_task_id === selectedTaskId);
  const selectedTaskName = isNewTask ? newTaskName : selectedTask?.est_task_name || 'Unknown';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {sectionCount > 1 
            ? `Duplicate: ${taskName} (${sectionCount} sections)`
            : `Duplicate: ${taskName}${sectionName ? ` - ${sectionName}` : ''}`
          }
        </h2>
        
        <div className="space-y-4">
          {/* Task Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Room
            </label>
            <select
              value={isNewTask ? 'new' : selectedTaskId || ''}
              onChange={handleTaskChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currentEstimate.tasks?.map((task) => (
                <option key={task.est_task_id} value={task.est_task_id}>
                  {task.est_task_name}
                </option>
              ))}
              <option value="new">+ Create New Room</option>
            </select>
          </div>

          {/* New Task Name Input */}
          {isNewTask && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Room Name
              </label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Enter task name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          )}

          {/* Section Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section Name (optional)
            </label>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Enter section name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location Info */}
          {isSameTask && !isNewTask && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              The duplicate section will be added to the same room: <strong>{selectedTaskName}</strong>
            </div>
          )}
          {!isSameTask && !isNewTask && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
              The section will be duplicated to: <strong>{selectedTaskName}</strong>
            </div>
          )}
          {isNewTask && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
              A new room will be created: <strong>{newTaskName || '(enter name above)'}</strong>
            </div>
          )}

          {/* Warning if section can't be moved */}
          {!canMoveFromTask && (
            <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
              Note: This is the only section in the current room, so it cannot be moved to another room.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isNewTask && !newTaskName.trim()}
          >
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
};

DuplicateSectionModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  currentTaskId: PropTypes.number.isRequired,
  currentSectionId: PropTypes.number.isRequired,
  sectionName: PropTypes.string,
  canMoveFromTask: PropTypes.bool,
  sectionCount: PropTypes.number,
  taskName: PropTypes.string.isRequired,
  isDuplicatingTask: PropTypes.bool,
};

export default DuplicateSectionModal;
