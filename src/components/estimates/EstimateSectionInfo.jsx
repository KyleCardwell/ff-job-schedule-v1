import PropTypes from "prop-types";
import { useSelector } from "react-redux";

import {
  EDIT_TYPES,
  FACE_STYLES,
  NOT_SELECTED,
  PANEL_MOD_DISPLAY_NAMES,
  PRE_FINISHED,
} from "../../utils/constants";
import { getEffectiveValue as getEffectiveValueUtil } from "../../utils/estimateDefaults";

const EstimateSectionInfo = ({
  selectedTask,
  onAddSection,
  onEditSection,
  onEditEstimateDefaults,
  onEditLineItems,
  selectedSectionId,
  currentEstimate,
  showProjectInfo,
}) => {
  const section = selectedSectionId
    ? selectedTask?.sections?.find(
        (s) => s.est_section_id === selectedSectionId,
      )
    : selectedTask?.sections?.length > 0
      ? selectedTask.sections[selectedTask.sections.length - 1]
      : null;

  // Determine if we should show estimate defaults (only when Project Information is selected)
  const showEstimateDefaults = showProjectInfo && !!currentEstimate;

  const { materials, hardware, finishes } = useSelector((state) => state);

  const cabinetStyles = useSelector((state) => state.cabinetStyles.styles);
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults,
  );

  // Helper to get the effective value and source for a section field (with three-tier fallback)
  const getSectionEffectiveValue = (
    sectionValue,
    estimateKey,
    teamDefaultKey,
  ) => {
    const estimateValue = currentEstimate?.[estimateKey];
    const teamValue = teamDefaults?.[teamDefaultKey];
    const result = getEffectiveValueUtil(
      sectionValue,
      estimateValue,
      teamValue,
    );
    return result; // { value, source: 'section' | 'estimate' | 'team' }
  };

  // Get color class based on source
  const getSourceColor = (source) => {
    if (source === EDIT_TYPES.SECTION) return "text-amber-400";
    if (source === EDIT_TYPES.ESTIMATE) return "text-green-400";
    return "text-slate-400"; // team
  };

  const getTitle = () => {
    if (!selectedTask) return "Estimate Defaults";
    if (showEstimateDefaults) return "Estimate Defaults";
    if (selectedTask.sections?.length <= 1)
      return `${selectedTask.est_task_name} Details`;
    const sectionIndex = selectedTask.sections.findIndex(
      (s) => s.est_section_id === selectedSectionId,
    );
    const section = selectedTask.sections[sectionIndex];
    const sectionNumber = sectionIndex + 1;
    const sectionName = section?.section_name || `Section ${sectionNumber}`;
    return `${selectedTask.est_task_name} - ${sectionName} Details`;
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
      return PRE_FINISHED;
    }
    return boxFinish?.length
      ? boxFinish
          .map(
            (f) =>
              finishes?.finishes?.find((fin) => fin.id === f)?.name ||
              NOT_SELECTED,
          )
          .join(", ")
      : NOT_SELECTED;
  };

  const getFaceFinishDisplay = (faceMat, faceFinish) => {
    const faceMaterial = materials.faceMaterials.find(
      (mat) => mat.id === faceMat,
    );
    if (faceMaterial?.needs_finish === false) {
      return PRE_FINISHED;
    }
    return faceFinish?.length
      ? faceFinish
          .map(
            (f) =>
              finishes?.finishes?.find((fin) => fin.id === f)?.name ||
              NOT_SELECTED,
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
    doorPanelModId,
  ) => {
    const baseName =
      FACE_STYLES.find((s) => s.id === id)?.label || NOT_SELECTED;
    const result = [baseName];

    if (doorInsideMolding) result.push("Inside Molding");
    if (doorOutsideMolding) result.push("Outside Molding");
    if (doorPanelModId && doorPanelModId > 0) {
      result.push(PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod");
    }

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
    drawerPanelModId,
  ) => {
    const baseName =
      FACE_STYLES.find((s) => s.id === id)?.label || NOT_SELECTED;
    const result = [baseName];

    if (drawerInsideMolding) result.push("Inside Molding");
    if (drawerOutsideMolding) result.push("Outside Molding");
    if (drawerPanelModId && drawerPanelModId > 0) {
      result.push(PANEL_MOD_DISPLAY_NAMES[drawerPanelModId] || "Panel Mod");
    }

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
            <div className="pr-2">
              <span className={`${getSourceColor(EDIT_TYPES.TEAM)}`}>●</span>{" "}
              Team default
            </div>
            <div className="flex-1 border-l-2 border-slate-600 pl-2 flex w-full">
              <div>Override:</div>
              <div className="pl-2">
                <span className={`${getSourceColor(EDIT_TYPES.ESTIMATE)}`}>
                  ●
                </span>{" "}
                Estimate
                {!showEstimateDefaults}
              </div>
              {!showEstimateDefaults && (
                <div className="pl-2">
                  <span className={`${getSourceColor(EDIT_TYPES.SECTION)}`}>
                    ●
                  </span>{" "}
                  Section
                </div>
              )}
            </div>
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
                  "default_cabinet_style_id",
                );
                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Style:</span>
                    </div>
                    <div className="pl-5 mb-3">{getStyleName(value)}</div>
                  </>
                );
              })()}
              {(() => {
                const { value, source } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.box_mat,
                  "default_box_mat",
                  "default_box_mat",
                );
                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Box Material:</span>
                    </div>
                    <div className="pl-5 mb-3">{getBoxMaterialName(value)}</div>
                  </>
                );
              })()}
              {(() => {
                const boxMat = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.box_mat,
                  "default_box_mat",
                  "default_box_mat",
                );
                const { value: boxFinish, source } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.box_finish,
                  "default_box_finish",
                  "default_box_finish",
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
                  "default_face_mat",
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
                  "default_face_mat",
                );
                const { value: faceFinish, source } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.face_finish,
                  "default_face_finish",
                  "default_face_finish",
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
                const { value: doorStyle, source: doorStyleSource } =
                  getSectionEffectiveValue(
                    showEstimateDefaults ? null : section?.door_style,
                    "default_door_style",
                    "default_door_style",
                  );
                const {
                  value: doorInsideMoldingValue,
                  source: doorInsideMoldingSource,
                } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.door_inside_molding,
                  "default_door_inside_molding",
                  "default_door_inside_molding",
                );
                const {
                  value: doorOutsideMoldingValue,
                  source: doorOutsideMoldingSource,
                } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.door_outside_molding,
                  "default_door_outside_molding",
                  "default_door_outside_molding",
                );
                const {
                  value: doorPanelModIdValue,
                  source: doorPanelModIdSource,
                } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.door_panel_mod_id,
                  "default_door_panel_mod_id",
                  "default_door_panel_mod_id",
                );

                // Determine most specific source (section > estimate > team)
                const sources = [
                  doorStyleSource,
                  doorInsideMoldingSource,
                  doorOutsideMoldingSource,
                  doorPanelModIdSource,
                ];
                const source = sources.includes(EDIT_TYPES.SECTION)
                  ? EDIT_TYPES.SECTION
                  : sources.includes(EDIT_TYPES.ESTIMATE)
                    ? EDIT_TYPES.ESTIMATE
                    : EDIT_TYPES.TEAM;

                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Door Style:</span>
                    </div>
                    <div className="pl-5 mb-3">
                      {getDoorStyleName(
                        doorStyle,
                        doorInsideMoldingValue,
                        doorOutsideMoldingValue,
                        doorPanelModIdValue,
                      ).map((line, i) => (
                        <div key={i} className="">
                          {line}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
              {/* Door Material Override - only show if set */}
              {!showEstimateDefaults &&
                section?.door_mat &&
                (() => {
                  const doorMat = materials.faceMaterials?.find(
                    (m) => m.id === section.door_mat,
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(EDIT_TYPES.SECTION)}>
                          ●
                        </span>
                        <span>Door Material:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {doorMat?.name || "Unknown"}
                      </div>
                    </>
                  );
                })()}
              {/* Door Finish Override - only show if set */}
              {!showEstimateDefaults &&
                section?.door_finish &&
                section.door_finish.length > 0 &&
                (() => {
                  const doorMat = materials.faceMaterials?.find(
                    (m) => m.id === section.door_mat,
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(EDIT_TYPES.SECTION)}>
                          ●
                        </span>
                        <span>Door Finish:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getFaceFinishDisplay(
                          doorMat?.id || section.face_mat,
                          section.door_finish,
                        )}
                      </div>
                    </>
                  );
                })()}
              {(() => {
                const { value, source } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.hinge_id,
                  "default_hinge_id",
                  "default_hinge_id",
                );
                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Door Hinges:</span>
                    </div>
                    <div className="pl-5 mb-3">{getDoorHingeName(value)}</div>
                  </>
                );
              })()}
              {(() => {
                const { value, source } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.door_pull_id,
                  "default_door_pull_id",
                  "default_door_pull_id",
                );
                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Door Pulls:</span>
                    </div>
                    <div className="pl-5 mb-3">{getPullName(value)}</div>
                  </>
                );
              })()}
              {(() => {
                const {
                  value: drawerFrontStyle,
                  source: drawerFrontStyleSource,
                } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.drawer_front_style,
                  "default_drawer_front_style",
                  "default_drawer_front_style",
                );
                const {
                  value: drawerInsideMoldingValue,
                  source: drawerInsideMoldingSource,
                } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.drawer_inside_molding,
                  "default_drawer_inside_molding",
                  "default_drawer_inside_molding",
                );
                const {
                  value: drawerOutsideMoldingValue,
                  source: drawerOutsideMoldingSource,
                } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.drawer_outside_molding,
                  "default_drawer_outside_molding",
                  "default_drawer_outside_molding",
                );
                const {
                  value: drawerPanelModIdValue,
                  source: drawerPanelModIdSource,
                } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.drawer_panel_mod_id,
                  "default_drawer_panel_mod_id",
                  "default_drawer_panel_mod_id",
                );

                // Determine most specific source (section > estimate > team)
                const drawerSources = [
                  drawerFrontStyleSource,
                  drawerInsideMoldingSource,
                  drawerOutsideMoldingSource,
                  drawerPanelModIdSource,
                ];
                const source = drawerSources.includes(EDIT_TYPES.SECTION)
                  ? EDIT_TYPES.SECTION
                  : drawerSources.includes(EDIT_TYPES.ESTIMATE)
                    ? EDIT_TYPES.ESTIMATE
                    : EDIT_TYPES.TEAM;

                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Drawer Front Style:</span>
                    </div>
                    <div className="pl-5 mb-3">
                      {getDrawerFrontStyleName(
                        drawerFrontStyle,
                        drawerInsideMoldingValue,
                        drawerOutsideMoldingValue,
                        drawerPanelModIdValue,
                      ).map((line, i) => (
                        <div key={i} className="">
                          {line}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
              {/* Drawer Front Material Override - only show if set */}
              {!showEstimateDefaults &&
                section?.drawer_front_mat &&
                (() => {
                  const drawerFrontMat = materials.faceMaterials?.find(
                    (m) => m.id === section.drawer_front_mat,
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(EDIT_TYPES.SECTION)}>
                          ●
                        </span>
                        <span>Drawer Front Material:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {drawerFrontMat?.name || "Unknown"}
                      </div>
                    </>
                  );
                })()}
              {/* Drawer Front Finish Override - only show if set */}
              {!showEstimateDefaults &&
                section?.drawer_front_finish &&
                section.drawer_front_finish.length > 0 &&
                (() => {
                  const drawerFrontMat = materials.faceMaterials?.find(
                    (m) => m.id === section.drawer_front_mat,
                  );
                  return (
                    <>
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className={getSourceColor(EDIT_TYPES.SECTION)}>
                          ●
                        </span>
                        <span>Drawer Front Finish:</span>
                      </div>
                      <div className="pl-5 mb-3">
                        {getFaceFinishDisplay(
                          drawerFrontMat?.id || section.face_mat,
                          section.drawer_front_finish,
                        )}
                      </div>
                    </>
                  );
                })()}
              {(() => {
                const { value, source } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.drawer_box_mat,
                  "default_drawer_box_mat",
                  "default_drawer_box_mat",
                );
                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Drawer Boxes:</span>
                    </div>
                    <div className="pl-5 mb-3">{getDrawerBoxName(value)}</div>
                  </>
                );
              })()}
              {(() => {
                const { value, source } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.slide_id,
                  "default_slide_id",
                  "default_slide_id",
                );
                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Drawer Slides:</span>
                    </div>
                    <div className="pl-5 mb-3">{getDrawerSlideName(value)}</div>
                  </>
                );
              })()}
              {(() => {
                const { value, source } = getSectionEffectiveValue(
                  showEstimateDefaults ? null : section?.drawer_pull_id,
                  "default_drawer_pull_id",
                  "default_drawer_pull_id",
                );
                return (
                  <>
                    <div className="text-slate-400 flex items-center gap-2">
                      <span className={getSourceColor(source)}>●</span>
                      <span>Drawer Pulls:</span>
                    </div>
                    <div className="pl-5 mb-3">{getPullName(value)}</div>
                  </>
                );
              })()}
              {section?.notes && (
                <>
                  <div className="text-slate-400">Notes:</div>
                  <div className="pl-5 mb-3 text-sm">{section.notes}</div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            {showEstimateDefaults ? (
              <>
                <button
                  onClick={onEditEstimateDefaults}
                  className="mt-auto w-full py-3 px-4 text-sm font-medium text-slate-200 hover:text-slate-100 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
                >
                  Edit Estimate Defaults
                </button>

                <button
                  onClick={onEditLineItems}
                  className="mt-auto w-full py-3 px-4 text-sm font-medium text-teal-400 hover:text-teal-300 border-t border-slate-700 bg-slate-800 hover:bg-slate-700"
                >
                  Edit Estimate Line Items
                </button>
              </>
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
  currentEstimate: PropTypes.object,
  onAddSection: PropTypes.func,
  onEditEstimateDefaults: PropTypes.func,
  onEditLineItems: PropTypes.func,
  onEditSection: PropTypes.func,
  selectedSectionId: PropTypes.number,
  showProjectInfo: PropTypes.bool,
};

export default EstimateSectionInfo;
