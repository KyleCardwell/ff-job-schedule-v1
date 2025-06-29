import React from "react";

const EstimateSectionInfo = ({ selectedTask, onAddSection, onEditSections }) => {
  const section = selectedTask?.sections?.length === 1 ? selectedTask.sections[0] : null;

  const NOT_SELECTED = "Not Selected";

  return (
    <div className="w-80 flex-none bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="flex items-center justify-between py-4 px-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-200">
          {selectedTask ? `Section Details - ${selectedTask.est_task_name}` : 'Select a Room'}
        </h2>
      </div>

      {selectedTask && (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-slate-700 rounded-lg p-4 text-slate-200">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Style:</span>
                  <span>{section?.style || NOT_SELECTED}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Box Material:</span>
                  <span>{section?.cabinetInterior || NOT_SELECTED}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Face Material:</span>
                  <span>{section?.material || NOT_SELECTED}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Door Style:</span>
                  <span>{section?.doorStyle || NOT_SELECTED}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Drawer Box:</span>
                  <span>{section?.drawerBox || NOT_SELECTED}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Finish:</span>
                  <span>
                    {section?.finishType?.length ? section.finishType.join(', ') : NOT_SELECTED}
                  </span>
                </div>
                {section?.notes && (
                  <div className="mt-4">
                    <span className="text-slate-400 block mb-1">Notes:</span>
                    <p className="text-sm">{section.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            {!section ? (
              <button
                onClick={onAddSection}
                className="mt-auto w-full py-3 px-4 text-sm font-medium text-teal-400 hover:text-teal-300 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
              >
                Add Section
              </button>
            ) : (
              <button
                onClick={onEditSections}
                className="mt-auto w-full py-3 px-4 text-sm font-medium text-slate-200 hover:text-slate-100 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
              >
                Edit Section
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EstimateSectionInfo;
