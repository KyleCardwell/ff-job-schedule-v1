import PropTypes from "prop-types";
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
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults
  );

  // Helper to get the effective value and source for a section field (with three-tier fallback)
  const getSectionEffectiveValue = (sectionValue, estimateKey, teamDefaultKey) => {
    const estimateValue = currentEstimate?.[estimateKey];
    const teamValue = teamDefaults?.[teamDefaultKey];
    const result = getEffectiveValueUtil(
      sectionValue,
      estimateValue,
      teamValue
    );
    return result; // { value, source: 'section' | 'estimate' | 'team' }
  };

  // Get color class based on source
  const getSourceColor = (source) => {
    if (source === "section") return "text-blue-400";
    if (source === "estimate") return "text-teal-400";
    return "text-amber-400"; // team
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
          .map(
            (f) =>
              finishes?.finishes?.find((fin) => fin.id === f)?.name ||
              NOT_SELECTED
          )
          .join(", ")
      : NOT_SELECTED;
  };

  const getFaceFinishDisplay = (faceMat, faceFinish) => {
    const faceMaterial = materials.faceMaterials.find(
      (mat) => mat.id === faceMat
    );
    if (faceMaterial?.needs_finish === false) {
      return NONE;
    }
    return faceFinish?.length
      ? faceFinish
          .map(
            (f) =>
              finishes?.finishes?.find((fin) => fin.id === f)?.name ||
              NOT_SELECTED
          )
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

  const getDoorStyleName = (
    id,
    doorInsideMolding,
    doorOutsideMolding,
    doorReededPanel
  ) => {
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

  const getDrawerFrontStyleName = (
    id,
    drawerInsideMolding,
    drawerOutsideMolding,
    drawerReededPanel
  ) => {
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
      <div className="flex flex-col items-center justify-between pt-4 pb-2 px-2 space-y-1 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-200">{getTitle()}</h2>
        {(selectedTask || showEstimateDefaults) && (
          <div className="flex w-full justify-between text-xs text-slate-400">
            <div>
              <span className="text-amber-400">●</span> Team default
            </div>
            <div>
              <span className="text-teal-400">●</span> Estimate
              {!showEstimateDefaults && " override"}
            </div>
            {!showEstimateDefaults && (
              <div>
                <span className="text-blue-400">●</span> Section
              </div>
            )}
          </div>
        )}
      </div>

      {(selectedTask || showEstimateDefaults) && (
        <>
          <div className="flex-1 overflow-y-auto p-4 text-left text-slate-200">
            <div className="space-y-2.5">
                {(() => {
                  const { value, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.cabinet_style_id,
                    "default_cabinet_style_id",
                    "default_cabinet_style_id"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Style:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getStyleName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.box_mat,
                    "default_box_mat",
                    "default_box_mat"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Box Material:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getBoxMaterialName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const boxMat = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.box_mat,
                    "default_box_mat",
                    "default_box_mat"
                  );
                  const { value: boxFinish, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.box_finish,
                    "default_box_finish",
                    "default_box_finish"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Box Finish:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getBoxFinishDisplay(boxMat.value, boxFinish)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.face_mat,
                    "default_face_mat",
                    "default_face_mat"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Face Material:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getFaceMaterialName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const faceMat = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.face_mat,
                    "default_face_mat",
                    "default_face_mat"
                  );
                  const { value: faceFinish, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.face_finish,
                    "default_face_finish",
                    "default_face_finish"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Face Finish:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getFaceFinishDisplay(faceMat.value, faceFinish)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value: doorStyle, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : sectionData.doorStyle,
                    "default_door_style",
                    "default_door_style"
                  );
                  const doorInsideMolding = getSectionEffectiveValue(
                    showEstimateDefaults ? null : sectionData.doorInsideMolding,
                    "default_door_inside_molding",
                    "default_door_inside_molding"
                  );
                  const doorOutsideMolding = getSectionEffectiveValue(
                    showEstimateDefaults ? null : sectionData.doorOutsideMolding,
                    "default_door_outside_molding",
                    "default_door_outside_molding"
                  );
                  const doorReededPanel = getSectionEffectiveValue(
                    showEstimateDefaults ? null : sectionData.doorReededPanel,
                    "default_door_reeded_panel",
                    "default_door_reeded_panel"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Door Style:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDoorStyleName(
                          doorStyle,
                          doorInsideMolding.value,
                          doorOutsideMolding.value,
                          doorReededPanel.value
                        ).map((line, i) => (
                          <div key={i} className="">
                            {line}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.hinge_id,
                    "default_hinge_id",
                    "default_hinge_id"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Door Hinges:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDoorHingeName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.door_pull_id,
                    "default_door_pull_id",
                    "default_door_pull_id"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Door Pulls:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getPullName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value: drawerFrontStyle, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : sectionData.drawerFrontStyle,
                    "default_drawer_front_style",
                    "default_drawer_front_style"
                  );
                  const drawerInsideMolding = getSectionEffectiveValue(
                    showEstimateDefaults ? null : sectionData.drawerInsideMolding,
                    "default_drawer_inside_molding",
                    "default_drawer_inside_molding"
                  );
                  const drawerOutsideMolding = getSectionEffectiveValue(
                    showEstimateDefaults ? null : sectionData.drawerOutsideMolding,
                    "default_drawer_outside_molding",
                    "default_drawer_outside_molding"
                  );
                  const drawerReededPanel = getSectionEffectiveValue(
                    showEstimateDefaults ? null : sectionData.drawerReededPanel,
                    "default_drawer_reeded_panel",
                    "default_drawer_reeded_panel"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Drawer Front Style:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDrawerFrontStyleName(
                          drawerFrontStyle,
                          drawerInsideMolding.value,
                          drawerOutsideMolding.value,
                          drawerReededPanel.value
                        ).map((line, i) => (
                          <div key={i} className="">
                            {line}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.drawer_box_mat,
                    "default_drawer_box_mat",
                    "default_drawer_box_mat"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Drawer Boxes:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDrawerBoxName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.slide_id,
                    "default_slide_id",
                    "default_slide_id"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Drawer Slides:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getDrawerSlideName(value)}
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const { value, source } = getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.drawer_pull_id,
                    "default_drawer_pull_id",
                    "default_drawer_pull_id"
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(source)}>●</span>
                        <span>Drawer Pulls:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getPullName(value)}
                      </div>
                    </>
                  );
                })()}
                {sectionData.notes && (
                  <>
                    <div className="text-slate-400">Notes:</div>
                    <div className="pl-5 mb-3 text-sm">{sectionData.notes}</div>
                  </>
                )}
              </div>
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
                      selectedTask?.sections?.[
                        selectedTask.sections.length - 1
                      ];
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
