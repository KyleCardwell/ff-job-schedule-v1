import { NONE, NOT_SELECTED, PRE_FINISHED } from "./constants.js";

export const getEstimatePdfMaterialDetails = ({
  context,
  effectiveSection,
  hasDrawerBoxes,
  hasFinishedInteriors,
}) => {
  const faceMaterial = context.selectedFaceMaterial?.material;
  const boxMaterial = context.selectedBoxMaterial?.material;
  const getFinishNames = (finishIds, material) =>
    material?.needs_finish === false
      ? PRE_FINISHED
      : finishIds
          ?.map((id) => context.finishTypes?.find((finish) => finish.id === id)?.name)
          .filter(Boolean)
          .join(", ") || NONE;

  const faceFinishNames = getFinishNames(
    effectiveSection.face_finish,
    faceMaterial,
  );
  const baseBoxFinishNames = getFinishNames(
    effectiveSection.box_finish,
    boxMaterial,
  );
  const boxFinishNames = hasFinishedInteriors
    ? [...new Set([baseBoxFinishNames, faceFinishNames])].join("/")
    : baseBoxFinishNames;
  const drawerBoxMaterial = context.drawerBoxMaterials?.find(
    (material) => String(material.id) === String(effectiveSection.drawer_box_mat),
  );

  return {
    faceFinishNames,
    boxFinishNames,
    showBoxFinish: boxMaterial?.needs_finish !== false || hasFinishedInteriors,
    drawerBoxMaterialName: hasDrawerBoxes ? drawerBoxMaterial?.name || "" : NONE,
    groupingDrawerBoxMaterialName: drawerBoxMaterial?.name || NOT_SELECTED,
  };
};
