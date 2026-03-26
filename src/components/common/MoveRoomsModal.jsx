import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

const MoveRoomsModal = ({ open, onClose, onSave, isSaving = false }) => {
  const currentEstimate = useSelector((state) => state.estimates.currentEstimate);
  const estimates = useSelector((state) => state.estimates.estimates || []);

  const [selectedSectionIds, setSelectedSectionIds] = useState([]);
  const [selectedTargetEstimateId, setSelectedTargetEstimateId] = useState(null);

  const sectionsByTask = useMemo(
    () =>
      (currentEstimate?.tasks || []).map((task) => ({
        taskId: task.est_task_id,
        taskName: task.est_task_name,
        sections: task.sections || [],
      })),
    [currentEstimate],
  );

  const draftEstimates = useMemo(
    () =>
      (estimates || []).filter(
        (estimate) =>
          estimate.status === "draft" &&
          estimate.estimate_id !== currentEstimate?.estimate_id,
      ),
    [estimates, currentEstimate?.estimate_id],
  );

  const allSectionIds = useMemo(
    () =>
      sectionsByTask.flatMap((task) =>
        task.sections.map((section) => section.est_section_id),
      ),
    [sectionsByTask],
  );

  useEffect(() => {
    if (!open || !currentEstimate) return;

    setSelectedSectionIds([]);
    setSelectedTargetEstimateId(draftEstimates[0]?.estimate_id || null);
  }, [open, currentEstimate, draftEstimates]);

  if (!open || !currentEstimate) return null;

  const selectedSet = new Set(selectedSectionIds);
  const selectedCount = selectedSectionIds.length;
  const totalCount = sectionsByTask.reduce(
    (count, task) => count + task.sections.length,
    0,
  );

  const toggleSection = (sectionId) => {
    setSelectedSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  const toggleTaskSections = (taskSections, checked) => {
    const taskSectionIds = taskSections.map((section) => section.est_section_id);

    setSelectedSectionIds((prev) => {
      if (checked) {
        const next = new Set(prev);
        taskSectionIds.forEach((id) => next.add(id));
        return Array.from(next);
      }

      return prev.filter((id) => !taskSectionIds.includes(id));
    });
  };

  const handleMove = () => {
    if (selectedSectionIds.length === 0 || !selectedTargetEstimateId) return;

    onSave({
      selectedSectionIds,
      targetEstimateId: selectedTargetEstimateId,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold mb-2">Move Rooms</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select rooms/sections to move into another draft estimate.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Estimate
          </label>
          <select
            value={selectedTargetEstimateId || ""}
            onChange={(e) => setSelectedTargetEstimateId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={draftEstimates.length === 0 || isSaving}
          >
            {draftEstimates.length === 0 ? (
              <option value="">No other draft estimates available</option>
            ) : (
              draftEstimates.map((estimate) => (
                <option key={estimate.estimate_id} value={estimate.estimate_id}>
                  {estimate.est_project_name || "Untitled Project"} - V{estimate.version}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded mb-4">
          <div className="flex items-center justify-between gap-3">
            <span>
              {selectedCount} of {totalCount} sections selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedSectionIds(allSectionIds)}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                disabled={isSaving || selectedCount === totalCount || totalCount === 0}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelectedSectionIds([])}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                disabled={isSaving || selectedCount === 0}
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1">
          {sectionsByTask.map((task) => {
            const taskSelectedCount = task.sections.filter((section) =>
              selectedSet.has(section.est_section_id),
            ).length;
            const isTaskFullySelected =
              task.sections.length > 0 && taskSelectedCount === task.sections.length;

            return (
              <div key={task.taskId} className="border border-gray-200 rounded-md">
                <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={isTaskFullySelected}
                    onChange={(e) => toggleTaskSections(task.sections, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    {task.taskName} ({taskSelectedCount}/{task.sections.length})
                  </span>
                </label>

                <div className="p-3 space-y-2">
                  {task.sections.map((section, index) => {
                    const sectionDisplayName =
                      section.section_name || `Section ${index + 1}`;

                    return (
                      <label
                        key={section.est_section_id}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSet.has(section.est_section_id)}
                          onChange={() => toggleSection(section.est_section_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{sectionDisplayName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={selectedCount === 0 || !selectedTargetEstimateId || isSaving}
          >
            {isSaving ? "Moving..." : "Move Rooms"}
          </button>
        </div>
      </div>
    </div>
  );
};

MoveRoomsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
};

export default MoveRoomsModal;
