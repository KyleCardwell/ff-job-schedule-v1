import PropTypes from "prop-types";
import { useMemo } from "react";
import { FiX, FiCopy } from "react-icons/fi";

const CopyRoomDetailsModal = ({
  isOpen,
  onClose,
  currentEstimate,
  currentSectionId,
  onCopySection,
}) => {
  // Get all sections from all tasks, excluding the current section
  const availableSections = useMemo(() => {
    if (!currentEstimate?.tasks) return [];

    const sections = [];
    currentEstimate.tasks.forEach((task) => {
      if (task.sections && Array.isArray(task.sections)) {
        const taskSectionCount = task.sections.length;
        task.sections.forEach((section, index) => {
          // Exclude the current section being edited
          if (section.est_section_id !== currentSectionId) {
            sections.push({
              ...section,
              taskName: task.est_task_name,
              taskId: task.est_task_id,
              taskSectionCount,
              sectionIndex: index,
            });
          }
        });
      }
    });

    return sections;
  }, [currentEstimate, currentSectionId]);

  // Get display name for a section (following EstimateSectionInfo pattern)
  const getSectionDisplayName = (section) => {
    const taskName = section.taskName || "Unnamed Task";
    
    // If task has only 1 section, just show task name
    if (section.taskSectionCount <= 1) {
      return taskName;
    }
    
    // Multiple sections: show "TaskName - SectionName" or "TaskName - Section {number}"
    const sectionNumber = section.sectionIndex + 1;
    const sectionName = section.section_name || `Section ${sectionNumber}`;
    return `${taskName} - ${sectionName}`;
  };

  const handleCopyClick = (section) => {
    onCopySection(section);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-300">
          <h2 className="text-xl font-bold text-slate-800">
            Copy Room Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {availableSections.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No other sections available to copy from.</p>
              <p className="text-sm mt-2">
                Create another section first to copy its details.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 mb-4">
                Select a section to copy its configuration to the current form.
                You can review and modify before saving.
              </p>
              {availableSections.map((section) => (
                <button
                  key={section.est_section_id}
                  onClick={() => handleCopyClick(section)}
                  className="w-full text-left p-3 border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">
                      {getSectionDisplayName(section)}
                    </div>
                    {/* {section.notes?.[0] && (
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {section.notes[0]}
                      </div>
                    )} */}
                  </div>
                  <div className="ml-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiCopy size={20} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-300 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

CopyRoomDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentEstimate: PropTypes.object,
  currentSectionId: PropTypes.number,
  onCopySection: PropTypes.func.isRequired,
};

export default CopyRoomDetailsModal;
