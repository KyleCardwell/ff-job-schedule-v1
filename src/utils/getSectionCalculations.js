import { FACE_TYPES } from "./constants";
import {
  calculate5PieceDoorHours,
  calculate5PieceHardwoodFacePrice,
  calculateBoxPrice,
  calculateSlabDoorHours,
  calculateSlabHardwoodFacePrice,
  calculateSlabSheetFacePrice,
} from "./estimateHelpers";

export const getSectionCalculations = (
  section,
  boxMaterials,
  faceMaterials,
  finishTypes
) => {
  if (!section)
    return {
      totalPrice: 0,
      faceCounts: {},
      facePrices: {},
      boxTotal: 0,
      boxCount: 0,
      shopHours: 0,
      finishHours: 0,
      installHours: 0,
      drawerBoxCount: 0,
      drawerBoxTotal: 0,
      rollOutCount: 0,
      rollOutTotal: 0,
    };

  let sectionTotal = 0;
  const faceCounts = {};
  const facePrices = {}; // New object to track prices per face type
  let boxTotal = 0; // Track total box prices
  let boxCount = 0; // Track total box count
  let shopHours = 0; // Track shop hours
  let finishHours = 0; // Track finish hours
  let installHours = 0; // Track install hours
  let totalFinishHours = 0; // Accumulator for pre-adjusted finish hours

  // Add new variables for drawer boxes and rollouts
  let drawerBoxCount = 0;
  let drawerBoxTotal = 0;
  let rollOutCount = 0;
  let rollOutTotal = 0;

  // Fixed prices for drawer boxes and rollouts
  const DRAWER_BOX_PRICE = 50;
  const ROLL_OUT_PRICE = 60;

  // Initialize faceCounts and facePrices with all face types at 0
  FACE_TYPES.forEach((type) => {
    faceCounts[type.value] = 0;
    facePrices[type.value] = 0;
  });

  // Calculate cabinet prices and face counts
  if (
    section.cabinets &&
    Array.isArray(section.cabinets) &&
    section.cabinets.length > 0
  ) {
    section.cabinets.forEach((cabinet) => {
      if (!cabinet) return;

      const quantity = Number(cabinet.quantity) || 1;
      let cabinetPrice = 0;

      if (cabinet.face_config) {
        // Calculate box material price
        const selectedMaterial = cabinet.finished_interior
          ? boxMaterials.find((mat) => mat.id === section.face_mat)
          : boxMaterials.find((mat) => mat.id === section.box_mat);
        const boxPrice =
          calculateBoxPrice(cabinet, selectedMaterial)(section) || 0;
        boxTotal += boxPrice * quantity; // Add to boxTotal with quantity
        boxCount += quantity; // Add to boxCount with quantity

        // Add cabinet hours if available
        if (cabinet.cabinetHours) {
          shopHours += (cabinet.cabinetHours.shopHours || 0) * quantity;
          if (cabinet.finished_interior) {
            // Check if the selected material needs finishing
            const needsFinish = selectedMaterial?.needs_finish;

            if (needsFinish) {
              let addFinishHours = 1;

              if (Array.isArray(section.section_data?.finish)) {
                section.section_data.finish.forEach((finishId) => {
                  const finishObj = finishTypes.find(
                    (ft) => ft.id === finishId
                  );
                  if (finishObj?.adjust) {
                    addFinishHours *= finishObj.adjust;
                  }
                });
              }

              finishHours +=
                (cabinet.cabinetHours.finishHours || 0) *
                quantity *
                addFinishHours;
            }
          }
          installHours += (cabinet.cabinetHours.installHours || 0) * quantity;
        }

        // Calculate face material price and hours using face summary and styles
        let facePrice = 0;
        let facePriceByType = {};

        if (
          section.section_data &&
          section.face_mat &&
          cabinet.face_config?.faceSummary
        ) {
          const selectedMaterial = faceMaterials.find(
            (mat) => mat.id === section.face_mat
          );

          if (selectedMaterial) {
            facePriceByType = {};
            Object.keys(cabinet.face_config.faceSummary).forEach((faceType) => {
              facePriceByType[faceType] = 0;
            });

            Object.entries(cabinet.face_config.faceSummary).forEach(
              ([faceType, faceData]) => {
                if (["open", "container"].includes(faceType)) return;

                let styleToUse =
                  faceType === "drawer_front" || faceType === "false_front"
                    ? section.section_data.drawerFrontStyle
                    : section.section_data.doorStyle;

                // --- Style-Based Hour Calculation ---
                if (faceData.faces && Array.isArray(faceData.faces)) {
                  faceData.faces.forEach((face) => {
                    let hours = {};
                    if (
                      styleToUse === "5_piece_hardwood" ||
                      styleToUse === "slab_hardwood"
                    ) {
                      hours = calculate5PieceDoorHours(
                        face.width,
                        face.height,
                        selectedMaterial.thickness
                      );
                    } else if (styleToUse === "slab_sheet") {
                      hours = calculateSlabDoorHours(face.width, face.height);
                    }
                    shopHours += (hours.shopHours || 0) * quantity;
                    installHours += (hours.installHours || 0) * quantity;
                    if (selectedMaterial.needs_finish) {
                      totalFinishHours += (hours.finishHours || 0) * quantity;
                    }
                    console.log(cabinet.name, faceType, hours);
                  });
                }

                // --- Style-Based Material Price Calculation ---
                let typeTotalPrice = 0;
                if (styleToUse === "slab_sheet") {
                  typeTotalPrice = calculateSlabSheetFacePrice(
                    faceData,
                    selectedMaterial
                  );
                } else if (styleToUse === "5_piece_hardwood") {
                  typeTotalPrice = calculate5PieceHardwoodFacePrice(
                    faceData,
                    selectedMaterial
                  );
                } else if (styleToUse === "slab_hardwood") {
                  typeTotalPrice = calculateSlabHardwoodFacePrice(
                    faceData,
                    selectedMaterial
                  );
                }
                facePriceByType[faceType] = typeTotalPrice;
                facePrice += typeTotalPrice;
              }
            );
          }
        }

        // Count drawer boxes and rollouts
        const countDrawerBoxesAndRollouts = (node) => {
          if (!node) return;

          // Count drawer boxes
          if (node.type === "drawer_front" && node.drawerBoxDimensions) {
            drawerBoxCount += quantity;
            drawerBoxTotal += DRAWER_BOX_PRICE * quantity;
          }

          // Count rollouts
          if (node.rollOutQty && node.rollOutQty > 0) {
            const rollOutQty = parseInt(node.rollOutQty, 10);
            rollOutCount += rollOutQty * quantity;
            rollOutTotal += ROLL_OUT_PRICE * rollOutQty * quantity;
          }

          // Process children recursively
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach(countDrawerBoxesAndRollouts);
          }
        };

        // Process the cabinet face config to count drawer boxes and rollouts
        countDrawerBoxesAndRollouts(cabinet.face_config);

        cabinetPrice = (boxPrice + facePrice) * quantity;
        sectionTotal += cabinetPrice;

        // Count faces and add face prices
        if (cabinet.face_config.faceSummary) {
          // Count faces and add prices for each type
          Object.entries(cabinet.face_config.faceSummary).forEach(
            ([faceType, faceData]) => {
              if (Object.prototype.hasOwnProperty.call(faceCounts, faceType)) {
                // Count faces
                faceCounts[faceType] += (faceData.count || 0) * quantity;

                // Add prices directly from the breakdown
                if (facePriceByType[faceType]) {
                  facePrices[faceType] += facePriceByType[faceType] * quantity;
                }
              }
            }
          );
        }
      } else {
        // Fallback to direct price if no face configuration
        cabinetPrice = (Number(cabinet.price) || 0) * quantity;
        sectionTotal += cabinetPrice;
      }
    });
  }

  // Apply finish adjustments to the total accumulated finish hours
  let finishMultiplier = 1;
  const selectedMaterialForFinish = faceMaterials.find(
    (mat) => mat.id === section.face_mat
  );
  if (
    selectedMaterialForFinish?.needs_finish &&
    section.section_data.finish?.length > 0
  ) {
    section.section_data.finish.forEach((finishId) => {
      const finishObj = finishTypes.find((ft) => ft.id === finishId);
      if (finishObj?.adjust) {
        finishMultiplier *= finishObj.adjust;
      }
    });
  }
  finishHours += totalFinishHours * finishMultiplier;

  // Add drawer box and rollout totals to section total
  sectionTotal += drawerBoxTotal + rollOutTotal;

  // Calculate length items prices
  if (
    section.lengths &&
    Array.isArray(section.lengths) &&
    section.lengths.length > 0
  ) {
    sectionTotal += section.lengths.reduce((total, item) => {
      if (!item) return total;

      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      return total + price * quantity;
    }, 0);
  }

  // Calculate accessories prices
  if (
    section.accessories &&
    Array.isArray(section.accessories) &&
    section.accessories.length > 0
  ) {
    sectionTotal += section.accessories.reduce((total, item) => {
      if (!item) return total;

      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      return total + price * quantity;
    }, 0);
  }

  // Calculate other item prices
  if (
    section.other &&
    Array.isArray(section.other) &&
    section.other.length > 0
  ) {
    sectionTotal += section.other.reduce((total, item) => {
      if (!item) return total;

      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      return total + price * quantity;
    }, 0);
  }

  if (installHours > 0) {
    // add 1 hour for setup and cleanup
    installHours += 1;
  }

  return {
    totalPrice: sectionTotal,
    faceCounts,
    facePrices,
    boxTotal,
    boxCount,
    shopHours,
    finishHours,
    installHours,
    drawerBoxCount,
    drawerBoxTotal,
    rollOutCount,
    rollOutTotal,
  };
};
