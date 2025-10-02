import PropTypes from "prop-types";
import { useSelector } from "react-redux";

const EstimateSectionInfo = ({
  selectedTask,
  estimate_data,
  onAddSection,
  onEditSection,
  selectedSectionId,
}) => {
  const section = selectedSectionId
    ? selectedTask?.sections?.find(
        (s) => s.est_section_id === selectedSectionId
      )
    : selectedTask?.sections?.length === 1
    ? selectedTask.sections[0]
    : null;

  const sectionData = section?.section_data || {};
  const NOT_SELECTED = "Not Selected";

  const materials = useSelector((state) => state.materials);

  const cabinetStyles = useSelector((state) => state.cabinetStyles.styles);

  const getTitle = () => {
    if (!selectedTask) return "Select a Room";
    if (selectedTask.sections?.length <= 1)
      return `${selectedTask.est_task_name} Details`;
    const sectionNumber =
      selectedTask.sections.findIndex(
        (s) => s.est_section_id === selectedSectionId
      ) + 1;
    return `${selectedTask.est_task_name} - Section ${sectionNumber} Details`;
  };

  const getStyleName = (id) => {
    return (
      cabinetStyles.find((s) => s.cabinet_style_id === id)?.cabinet_style_name ||
      NOT_SELECTED
    );
  };

  const getFinishName = (id) => {
    return (
      estimate_data?.finishes?.find((f) => f.id === id)?.name ||
      NOT_SELECTED
    );
  };

  const getFaceMaterialName = (id) => {
    return (
      materials?.faceMaterials?.find((m) => m.id === id)?.name ||
      NOT_SELECTED
    );
  };

  const getBoxMaterialName = (id) => {
    return (
      materials?.boxMaterials?.find((m) => m.id === id)?.name ||
      NOT_SELECTED
    );
  };

  const getDoorStyleName = (id) => {
    const baseName =
      estimate_data?.doorStyles?.options?.find((s) => s.id === id)?.name ||
      NOT_SELECTED;
    const result = [baseName];

    if (sectionData.doorInsideMolding) result.push("Inside Molding");
    if (sectionData.doorOutsideMolding) result.push("Outside Molding");

    return result;
  };

  const getDoorHingeName = (id) => {
    return (
      estimate_data?.doorHingeTypes?.find((h) => h.id === id)?.name ||
      NOT_SELECTED
    );
  };

  const getDrawerFrontStyleName = (id) => {
    const baseName =
      estimate_data?.drawerFrontStyles?.options?.find((s) => s.id === id)
        ?.name || NOT_SELECTED;
    const result = [baseName];

    if (sectionData.drawerInsideMolding) result.push("Inside Molding");
    if (sectionData.drawerOutsideMolding) result.push("Outside Molding");

    return result;
  };

  const getDrawerBoxName = (id) => {
    return (
      estimate_data?.drawerBoxTypes?.find((d) => d.id === id)?.name ||
      NOT_SELECTED
    );
  };

  const getDrawerSlideName = (id) => {
    return (
      estimate_data?.drawerSlideTypes?.find((s) => s.id === id)?.name ||
      NOT_SELECTED
    );
  };

  return (
    <div className="w-80 flex-none bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="flex items-center justify-between py-4 px-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-200">{getTitle()}</h2>
      </div>

      {selectedTask && (
        <>
          <div className="flex-1 overflow-y-auto p-4 text-left">
            <div className="bg-slate-700 rounded-lg p-4 text-slate-200">
              <div className="space-y-3">
                <div className="text-slate-400">Style:</div>
                <div className="pl-5 mb-3">
                  {getStyleName(section?.cabinet_style_id) || NOT_SELECTED}
                </div>
                <div className="text-slate-400">Face Material:</div>
                <div className="pl-5 mb-3">
                  {getFaceMaterialName(section?.face_mat)}
                </div>
                <div className="text-slate-400">Box Material:</div>
                <div className="pl-5 mb-3">
                  {getBoxMaterialName(section?.box_mat)}
                </div>
                <div className="text-slate-400">Finish:</div>
                <div className="pl-5 mb-3">
                  {sectionData.finish?.length
                    ? sectionData.finish.map((f) => getFinishName(f)).join(", ")
                    : NOT_SELECTED}
                </div>
                <div className="text-slate-400">Door Style:</div>
                <div className="pl-5 mb-3">
                  {getDoorStyleName(sectionData.doorStyle).map((line, i) => (
                    <div key={i} className="">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="text-slate-400">Door Hinge:</div>
                <div className="pl-5 mb-3">
                  {getDoorHingeName(sectionData.doorHinge)}
                </div>
                <div className="text-slate-400">Drawer Style:</div>
                <div className="pl-5 mb-3">
                  {getDrawerFrontStyleName(sectionData.drawerFrontStyle).map(
                    (line, i) => (
                      <div key={i} className="">
                        {line}
                      </div>
                    )
                  )}
                </div>
                <div className="text-slate-400">Drawer Box:</div>
                <div className="pl-5 mb-3">
                  {getDrawerBoxName(sectionData.drawerBoxes)}
                </div>
                <div className="text-slate-400">Drawer Slide:</div>
                <div className="pl-5 mb-3">
                  {getDrawerSlideName(sectionData.drawerSlide)}
                </div>
                {sectionData.notes && (
                  <>
                    <div className="text-slate-400">Notes:</div>
                    <div className="pl-5 mb-3 text-sm">{sectionData.notes}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            {section && (
              <button
                onClick={() => onEditSection(section)}
                className="mt-auto w-full py-3 px-4 text-sm font-medium text-slate-200 hover:text-slate-100 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
              >
                Edit Section Details
              </button>
            )}

            <button
              onClick={() => {
                // If there are sections, pass the last section's data as a template
                const lastSection =
                  selectedTask?.sections?.[selectedTask.sections.length - 1];
                onAddSection(lastSection);
              }}
              className="mt-auto w-full py-3 px-4 text-sm font-medium text-teal-400 hover:text-teal-300 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              Add Section
            </button>
          </div>
        </>
      )}
    </div>
  );
};

EstimateSectionInfo.propTypes = {
  selectedTask: PropTypes.object,
  estimate_data: PropTypes.object,
  onAddSection: PropTypes.func,
  onEditSection: PropTypes.func,
  selectedSectionId: PropTypes.number,
};

export default EstimateSectionInfo;
