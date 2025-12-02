import PropTypes from "prop-types";
import { useState } from "react";
import { useSelector } from "react-redux";

const EstimateSectionInfo = ({
  selectedTask,
  estimate_data,
  onAddSection,
  onEditSection,
  onEditEstimateDefaults,
  selectedSectionId,
  currentEstimate,
}) => {
  const section = selectedSectionId
    ? selectedTask?.sections?.find(
        (s) => s.est_section_id === selectedSectionId
      )
    : selectedTask?.sections?.length > 0
    ? selectedTask.sections[selectedTask.sections.length - 1]
    : null;

  const sectionData = section?.section_data || {};
  
  // Determine if we should show estimate defaults (when no section is selected)
  const showEstimateDefaults = !section && currentEstimate;
  const NOT_SELECTED = "Not Selected";
  const NONE = "None";

  const { materials, hardware, finishes } = useSelector((state) => state);

  const cabinetStyles = useSelector((state) => state.cabinetStyles.styles);

  const getTitle = () => {
    if (!selectedTask) return "Select a Room";
    if (showEstimateDefaults) return "Estimate Defaults";
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
      cabinetStyles.find((s) => s.cabinet_style_id === id)
        ?.cabinet_style_name || NOT_SELECTED
    );
  };

  const getBoxFinishDisplay = (boxMat, boxFinish) => {
    const boxMaterial = materials.boxMaterials.find((mat) => mat.id === boxMat);
    if (boxMaterial?.needs_finish === false) {
      return NONE;
    }
    return boxFinish?.length
      ? boxFinish
          .map((f) => finishes?.finishes?.find((fin) => fin.id === f)?.name || NOT_SELECTED)
          .join(", ")
      : NOT_SELECTED;
  };

  const getFaceFinishDisplay = (faceMat, faceFinish) => {
    const faceMaterial = materials.faceMaterials.find((mat) => mat.id === faceMat);
    if (faceMaterial?.needs_finish === false) {
      return NONE;
    }
    return faceFinish?.length
      ? faceFinish
          .map((f) => finishes?.finishes?.find((fin) => fin.id === f)?.name || NOT_SELECTED)
          .join(", ")
      : NOT_SELECTED;
  };

  const getFaceMaterialName = (id) => {
    return (
      materials?.faceMaterials?.find((m) => m.id === id)?.name || NOT_SELECTED
    );
  };

  const getBoxMaterialName = (id) => {
    return (
      materials?.boxMaterials?.find((m) => m.id === id)?.name || NOT_SELECTED
    );
  };

  const getDoorStyleName = (id, doorInsideMolding, doorOutsideMolding, doorReededPanel) => {
    const baseName =
      estimate_data?.doorStyles?.options?.find((s) => s.id === id)?.name ||
      NOT_SELECTED;
    const result = [baseName];

    if (doorInsideMolding) result.push("Inside Molding");
    if (doorOutsideMolding) result.push("Outside Molding");
    if (doorReededPanel) result.push("Reeded Panel");

    return result;
  };

  const getDoorHingeName = (id) => {
    return hardware?.hinges?.find((h) => h.id === id)?.name || NOT_SELECTED;
  };

  const getPullName = (id) => {
    return hardware?.pulls?.find((h) => h.id === id)?.name || NOT_SELECTED;
  };

  const getDrawerFrontStyleName = (id, drawerInsideMolding, drawerOutsideMolding, drawerReededPanel) => {
    const baseName =
      estimate_data?.drawerFrontStyles?.options?.find((s) => s.id === id)
        ?.name || NOT_SELECTED;
    const result = [baseName];

    if (drawerInsideMolding) result.push("Inside Molding");
    if (drawerOutsideMolding) result.push("Outside Molding");
    if (drawerReededPanel) result.push("Reeded Panel");

    return result;
  };

  const getDrawerBoxName = (id) => {
    return (
      materials?.drawerBoxMaterials?.find((d) => d.id === id)?.name ||
      NOT_SELECTED
    );
  };

  const getDrawerSlideName = (id) => {
    return hardware?.slides?.find((s) => s.id === id)?.name || NOT_SELECTED;
  };

  return (
    <div className="w-72 flex-none bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="flex items-center justify-between py-4 px-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-200">{getTitle()}</h2>
      </div>

      {selectedTask && (
        <>
          <div className="flex-1 overflow-y-auto p-4 text-left text-slate-200">
            {showEstimateDefaults ? (
              // Show estimate defaults
              <div className="space-y-2.5">
                <div className="text-sm text-slate-400 mb-4 italic">
                  Defaults for new sections in this estimate. Empty values use team defaults.
                </div>
                <div className="text-slate-400">Style:</div>
                <div className="pl-5 mb-3">
                  {getStyleName(currentEstimate.default_cabinet_style_id) || "Use Team Default"}
                </div>
                <div className="text-slate-400">Box Material:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_box_mat ? getBoxMaterialName(currentEstimate.default_box_mat) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Box Finish:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_box_finish ? getBoxFinishDisplay(currentEstimate.default_box_mat, currentEstimate.default_box_finish) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Face Material:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_face_mat ? getFaceMaterialName(currentEstimate.default_face_mat) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Face Finish:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_face_finish ? getFaceFinishDisplay(currentEstimate.default_face_mat, currentEstimate.default_face_finish) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Door Style:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_door_style ? getDoorStyleName(
                    currentEstimate.default_door_style,
                    currentEstimate.default_door_inside_molding,
                    currentEstimate.default_door_outside_molding,
                    currentEstimate.default_door_reeded_panel
                  ).map((line, i) => (
                    <div key={i}>{line}</div>
                  )) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Door Hinges:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_hinge_id ? getDoorHingeName(currentEstimate.default_hinge_id) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Door Pulls:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_door_pull_id ? getPullName(currentEstimate.default_door_pull_id) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Drawer Front Style:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_drawer_front_style ? getDrawerFrontStyleName(
                    currentEstimate.default_drawer_front_style,
                    currentEstimate.default_drawer_inside_molding,
                    currentEstimate.default_drawer_outside_molding,
                    currentEstimate.default_drawer_reeded_panel
                  ).map((line, i) => (
                    <div key={i}>{line}</div>
                  )) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Drawer Boxes:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_drawer_box_mat ? getDrawerBoxName(currentEstimate.default_drawer_box_mat) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Drawer Slides:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_slide_id ? getDrawerSlideName(currentEstimate.default_slide_id) : "Use Team Default"}
                </div>
                <div className="text-slate-400">Drawer Pulls:</div>
                <div className="pl-5 mb-3">
                  {currentEstimate.default_drawer_pull_id ? getPullName(currentEstimate.default_drawer_pull_id) : "Use Team Default"}
                </div>
              </div>
            ) : (
              // Show section details
              <div className="space-y-2.5">
                <div className="text-slate-400">Style:</div>
                <div className="pl-5 mb-3">
                  {getStyleName(section?.cabinet_style_id) || NOT_SELECTED}
                </div>
                <div className="text-slate-400">Box Material:</div>
                <div className="pl-5 mb-3">
                  {getBoxMaterialName(section?.box_mat)}
                </div>
                <div className="text-slate-400">Box Finish:</div>
                <div className="pl-5 mb-3">
                  {getBoxFinishDisplay(section?.box_mat, section?.box_finish)}
                </div>
                <div className="text-slate-400">Face Material:</div>
                <div className="pl-5 mb-3">
                  {getFaceMaterialName(section?.face_mat)}
                </div>
                <div className="text-slate-400">Face Finish:</div>
                <div className="pl-5 mb-3">
                  {getFaceFinishDisplay(section?.face_mat, section?.face_finish)}
                </div>
                <div className="text-slate-400">Door Style:</div>
                <div className="pl-5 mb-3">
                  {getDoorStyleName(
                    sectionData.doorStyle,
                    sectionData.doorInsideMolding,
                    sectionData.doorOutsideMolding,
                    sectionData.doorReededPanel
                  ).map((line, i) => (
                    <div key={i} className="">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="text-slate-400">Door Hinges:</div>
                <div className="pl-5 mb-3">
                  {getDoorHingeName(section.hinge_id)}
                </div>
                <div className="text-slate-400">Door Pulls:</div>
                <div className="pl-5 mb-3">
                  {getPullName(section.door_pull_id)}
                </div>
                <div className="text-slate-400">Drawer Front Style:</div>
                <div className="pl-5 mb-3">
                  {getDrawerFrontStyleName(
                    sectionData.drawerFrontStyle,
                    sectionData.drawerInsideMolding,
                    sectionData.drawerOutsideMolding,
                    sectionData.drawerReededPanel
                  ).map((line, i) => (
                    <div key={i} className="">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="text-slate-400">Drawer Boxes:</div>
                <div className="pl-5 mb-3">
                  {getDrawerBoxName(section.drawer_box_mat)}
                </div>
                <div className="text-slate-400">Drawer Slides:</div>
                <div className="pl-5 mb-3">
                  {getDrawerSlideName(section.slide_id)}
                </div>
                <div className="text-slate-400">Drawer Pulls:</div>
                <div className="pl-5 mb-3">
                  {getPullName(section.drawer_pull_id)}
                </div>
                {sectionData.notes && (
                  <>
                    <div className="text-slate-400">Notes:</div>
                    <div className="pl-5 mb-3 text-sm">{sectionData.notes}</div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <button
              onClick={section ? () => onEditSection(section) : onEditEstimateDefaults}
              className="mt-auto w-full py-3 px-4 text-sm font-medium text-slate-200 hover:text-slate-100 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              {section ? 'Edit Section Details' : 'Edit Estimate Defaults'}
            </button>

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
  currentEstimate: PropTypes.object,
  onAddSection: PropTypes.func,
  onEditEstimateDefaults: PropTypes.func,
  onEditSection: PropTypes.func,
  selectedSectionId: PropTypes.number,
};

export default EstimateSectionInfo;
