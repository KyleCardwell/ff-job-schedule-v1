import PropTypes from "prop-types";
import { useState } from "react";
import { useSelector } from "react-redux";

import { getEffectiveValue as getEffectiveValueUtil } from "../../utils/estimateDefaults";

const EstimateSectionInfo = ({
  selectedTask,
  estimate_data,
  onAddSection,
  onEditSection,
  onEditEstimateDefaults,
  selectedSectionId,
  currentEstimate,
  showProjectInfo,
}) => {
  const section = selectedSectionId
    ? selectedTask?.sections?.find(
        (s) => s.est_section_id === selectedSectionId
      )
    : selectedTask?.sections?.length > 0
    ? selectedTask.sections[selectedTask.sections.length - 1]
    : null;

  const sectionData = section?.section_data || {};
  
  // Determine if we should show estimate defaults (only when Project Information is selected)
  const showEstimateDefaults = showProjectInfo && !!currentEstimate;
  const NOT_SELECTED = "Not Selected";
  const NONE = "None";

  const { materials, hardware, finishes } = useSelector((state) => state);

  const cabinetStyles = useSelector((state) => state.cabinetStyles.styles);
  const teamDefaults = useSelector((state) => state.teamEstimateDefaults.teamDefaults);

  // Helper to get the effective value and source level
  // Uses the utility function for consistency across the app
  const getEffectiveValue = (estimateValue, teamDefaultKey) => {
    const teamValue = teamDefaults?.[teamDefaultKey];
    const result = getEffectiveValueUtil(null, estimateValue, teamValue);
    // result is now { value, source: 'section' | 'estimate' | 'team' }
    return result;
  };

  const getTitle = () => {
    if (!selectedTask) return "Estimate Defaults";
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

      {(selectedTask || showEstimateDefaults) && (
        <>
          <div className="flex-1 overflow-y-auto p-4 text-left text-slate-200">
            {showEstimateDefaults ? (
              // Show estimate defaults
              <div className="space-y-2.5">
                <div className="text-sm text-slate-400 mb-4 italic">
                  Defaults for new sections in this estimate.
                </div>
                <div className="text-xs text-slate-500 mb-4 space-y-1">
                  <div><span className="text-teal-400">●</span> Estimate override</div>
                  <div><span className="text-amber-400">●</span> Team default</div>
                </div>
                {(() => {
                  const { value, source } = getEffectiveValue(
                    currentEstimate.default_cabinet_style_id,
                    'default_cabinet_style_id'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Style:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getStyleName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getEffectiveValue(
                    currentEstimate.default_box_mat,
                    'default_box_mat'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Box Material:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getBoxMaterialName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const boxMat = getEffectiveValue(
                    currentEstimate.default_box_mat,
                    'default_box_mat'
                  );
                  const { value: boxFinish, source } = getEffectiveValue(
                    currentEstimate.default_box_finish,
                    'default_box_finish'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Box Finish:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getBoxFinishDisplay(boxMat.value, boxFinish)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getEffectiveValue(
                    currentEstimate.default_face_mat,
                    'default_face_mat'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Face Material:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getFaceMaterialName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const faceMat = getEffectiveValue(
                    currentEstimate.default_face_mat,
                    'default_face_mat'
                  );
                  const { value: faceFinish, source } = getEffectiveValue(
                    currentEstimate.default_face_finish,
                    'default_face_finish'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Face Finish:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getFaceFinishDisplay(faceMat.value, faceFinish)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value: doorStyle, source } = getEffectiveValue(
                    currentEstimate.default_door_style,
                    'default_door_style'
                  );
                  const doorInsideMolding = getEffectiveValue(
                    currentEstimate.default_door_inside_molding,
                    'default_door_inside_molding'
                  );
                  const doorOutsideMolding = getEffectiveValue(
                    currentEstimate.default_door_outside_molding,
                    'default_door_outside_molding'
                  );
                  const doorReededPanel = getEffectiveValue(
                    currentEstimate.default_door_reeded_panel,
                    'default_door_reeded_panel'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Door Style:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDoorStyleName(
                          doorStyle,
                          doorInsideMolding.value,
                          doorOutsideMolding.value,
                          doorReededPanel.value
                        ).map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getEffectiveValue(
                    currentEstimate.default_hinge_id,
                    'default_hinge_id'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Door Hinges:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDoorHingeName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getEffectiveValue(
                    currentEstimate.default_door_pull_id,
                    'default_door_pull_id'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Door Pulls:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getPullName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value: drawerFrontStyle, source } = getEffectiveValue(
                    currentEstimate.default_drawer_front_style,
                    'default_drawer_front_style'
                  );
                  const drawerInsideMolding = getEffectiveValue(
                    currentEstimate.default_drawer_inside_molding,
                    'default_drawer_inside_molding'
                  );
                  const drawerOutsideMolding = getEffectiveValue(
                    currentEstimate.default_drawer_outside_molding,
                    'default_drawer_outside_molding'
                  );
                  const drawerReededPanel = getEffectiveValue(
                    currentEstimate.default_drawer_reeded_panel,
                    'default_drawer_reeded_panel'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Drawer Front Style:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDrawerFrontStyleName(
                          drawerFrontStyle,
                          drawerInsideMolding.value,
                          drawerOutsideMolding.value,
                          drawerReededPanel.value
                        ).map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getEffectiveValue(
                    currentEstimate.default_drawer_box_mat,
                    'default_drawer_box_mat'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Drawer Boxes:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDrawerBoxName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getEffectiveValue(
                    currentEstimate.default_slide_id,
                    'default_slide_id'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Drawer Slides:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDrawerSlideName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getEffectiveValue(
                    currentEstimate.default_drawer_pull_id,
                    'default_drawer_pull_id'
                  );
                  const sourceColor = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={`${sourceColor}`}>●</span>
                        <span>Drawer Pulls:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getPullName(value)}
                      </div>
                    </>
                  );
                })()}
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
            {showEstimateDefaults ? (
              <button
                onClick={onEditEstimateDefaults}
                className="mt-auto w-full py-3 px-4 text-sm font-medium text-slate-200 hover:text-slate-100 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
              >
                Edit Estimate Defaults
              </button>
            ) : (
              <>
                <button
                  onClick={() => onEditSection(section)}
                  className="mt-auto w-full py-3 px-4 text-sm font-medium text-slate-200 hover:text-slate-100 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
                >
                  Edit Section Details
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
              </>
            )}
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
  showProjectInfo: PropTypes.bool,
};

export default EstimateSectionInfo;
