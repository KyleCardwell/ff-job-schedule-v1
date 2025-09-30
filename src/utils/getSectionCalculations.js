import { DRAWER_BOX_HEIGHTS, FACE_TYPES } from "./constants";
import {
  calculate5PieceDoorHours,
  calculate5PieceHardwoodFacePrice,
  calculateBoxPrice,
  calculateOutsourceCabinetCost,
  calculateSlabDoorHours,
  calculateSlabHardwoodFacePrice,
  calculateSlabSheetFacePrice,
} from "./estimateHelpers";

const calculateSingleCabinet = (
  cabinet,
  section,
  boxMaterials,
  faceMaterials,
  finishMultiplier
) => {
  if (!cabinet) return null;

  const quantity = Number(cabinet.quantity) || 1;
  let cabinetSubtotal = {
    price: 0,
    boxPrice: 0,
    facePrice: 0,
    shopHours: 0,
    finishHours: 0,
    installHours: 0,
    faceCounts: {},
    facePrices: {},
    drawerBoxCount: 0,
    drawerBoxTotal: 0,
    rollOutCount: 0,
    rollOutTotal: 0,
  };

  FACE_TYPES.forEach((type) => {
    if (type.value === "reveal") return;
    cabinetSubtotal.faceCounts[type.value] = 0;
    cabinetSubtotal.facePrices[type.value] = 0;
  });

  if (cabinet.face_config) {
    // Box Price & Hours
    const selectedBoxMaterial = cabinet.finished_interior
      ? faceMaterials.find((mat) => mat.id === section.face_mat)
      : boxMaterials.find((mat) => mat.id === section.box_mat);
    // const boxPrice =
    //   calculateBoxPrice(cabinet, selectedBoxMaterial)(section) || 0;
    
    const cabinetCost = calculateOutsourceCabinetCost(
      cabinet,
      selectedBoxMaterial,
      75, //labor price per sheet
      0.3, //rounding increment
      0.15, //edge band price per foot
      0.1 //tax rate
    );

    const boxPrice = cabinetCost.totalCost || 0

    cabinetSubtotal.boxPrice = boxPrice * quantity;

    console.log("cabinetCost", cabinet.type, cabinetCost);
    // console.log("cabinetCost", cabinet.type, cabinetCost);

    if (cabinet.cabinetHours) {
      cabinetSubtotal.shopHours +=
        (cabinet.cabinetHours.shopHours || 0) * quantity;
      if (cabinet.finished_interior && selectedBoxMaterial?.needs_finish) {
        cabinetSubtotal.finishHours +=
          (cabinet.cabinetHours.finishHours || 0) * quantity * finishMultiplier;
      }
      cabinetSubtotal.installHours +=
        (cabinet.cabinetHours.installHours || 0) * quantity;
    }

    // Face Price & Hours
    const selectedFaceMaterial = faceMaterials.find(
      (mat) => mat.id === section.face_mat
    );
    if (selectedFaceMaterial && cabinet.face_config.faceSummary) {
      Object.entries(cabinet.face_config.faceSummary).forEach(
        ([faceType, faceData]) => {
          if (["open", "container", "reveal"].includes(faceType)) return;

          const styleToUse =
            faceType === "drawer_front" || faceType === "false_front"
              ? section.section_data.drawerFrontStyle
              : section.section_data.doorStyle;

          let faceHours = {};
          if (faceData.faces && Array.isArray(faceData.faces)) {
            faceData.faces.forEach((face) => {
              if (
                styleToUse === "5_piece_hardwood" ||
                styleToUse === "slab_hardwood"
              ) {
                faceHours = calculate5PieceDoorHours(
                  face.width,
                  face.height,
                  selectedFaceMaterial.thickness
                );
              } else if (styleToUse === "slab_sheet") {
                faceHours = calculateSlabDoorHours(face.width, face.height);
              }
              cabinetSubtotal.shopHours +=
                (faceHours.shopHours || 0) * quantity;
              cabinetSubtotal.installHours +=
                (faceHours.installHours || 0) * quantity;
              if (selectedFaceMaterial.needs_finish) {
                cabinetSubtotal.finishHours +=
                  (faceHours.finishHours || 0) * quantity * finishMultiplier;
              }
            });
          }

          let typeTotalPrice = 0;
          if (styleToUse === "slab_sheet") {
            typeTotalPrice = calculateSlabSheetFacePrice(
              faceData,
              selectedFaceMaterial
            );
          } else if (styleToUse === "5_piece_hardwood") {
            typeTotalPrice = calculate5PieceHardwoodFacePrice(
              faceData,
              selectedFaceMaterial
            );
          } else if (styleToUse === "slab_hardwood") {
            typeTotalPrice = calculateSlabHardwoodFacePrice(
              faceData,
              selectedFaceMaterial
            );
          }

          cabinetSubtotal.facePrices[faceType] += typeTotalPrice * quantity;
          cabinetSubtotal.facePrice += typeTotalPrice * quantity;
          cabinetSubtotal.faceCounts[faceType] +=
            (faceData.count || 0) * quantity;
        }
      );
    }

    // Drawer Box and Rollout Calculation
    const countDrawerAndRollouts = (node) => {
      if (!node) return;
      if (node.type === "drawer_front" && node.drawerBoxDimensions) {
        cabinetSubtotal.drawerBoxCount += quantity;
        cabinetSubtotal.drawerBoxTotal += 50 * quantity; // DRAWER_BOX_PRICE
      }
      if (node.rollOutQty && node.rollOutQty > 0) {
        const rollOutQty = parseInt(node.rollOutQty, 10);
        cabinetSubtotal.rollOutCount += rollOutQty * quantity;
        cabinetSubtotal.rollOutTotal += 60 * rollOutQty * quantity; // ROLL_OUT_PRICE
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(countDrawerAndRollouts);
      }
    };
    countDrawerAndRollouts(cabinet.face_config);

    cabinetSubtotal.price =
      cabinetSubtotal.boxPrice + cabinetSubtotal.facePrice;
  } else {
    cabinetSubtotal.price = (Number(cabinet.price) || 0) * quantity;
  }

  return cabinetSubtotal;
};

const calculateCabinetTotals = (
  section,
  boxMaterials,
  faceMaterials,
  finishMultiplier
) => {
  const totals = {
    price: 0,
    boxPrice: 0,
    boxCount: 0,
    shopHours: 0,
    finishHours: 0,
    installHours: 0,
    faceCounts: {},
    facePrices: {},
    drawerBoxCount: 0,
    drawerBoxTotal: 0,
    rollOutCount: 0,
    rollOutTotal: 0,
  };

  FACE_TYPES.forEach((type) => {
    if (type.value === "reveal") return;
    totals.faceCounts[type.value] = 0;
    totals.facePrices[type.value] = 0;
  });

  if (section.cabinets && Array.isArray(section.cabinets)) {
    section.cabinets.forEach((cabinet) => {
      const subtotal = calculateSingleCabinet(
        cabinet,
        section,
        boxMaterials,
        faceMaterials,
        finishMultiplier
      );
      if (subtotal) {
        const quantity = Number(cabinet.quantity) || 1;
        totals.price += subtotal.price;
        totals.boxPrice += subtotal.boxPrice;
        totals.boxCount += quantity;
        totals.shopHours += subtotal.shopHours;
        totals.finishHours += subtotal.finishHours;
        totals.installHours += subtotal.installHours;
        totals.drawerBoxCount += subtotal.drawerBoxCount;
        totals.drawerBoxTotal += subtotal.drawerBoxTotal;
        totals.rollOutCount += subtotal.rollOutCount;
        totals.rollOutTotal += subtotal.rollOutTotal;

        Object.keys(subtotal.faceCounts).forEach((faceType) => {
          totals.faceCounts[faceType] += subtotal.faceCounts[faceType];
          totals.facePrices[faceType] += subtotal.facePrices[faceType];
        });
      }
    });
  }

  return totals;
};

const calculateSimpleItemsTotal = (items) => {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    if (!item) return total;
    const quantity = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    return total + price * quantity;
  }, 0);
};

export const getSectionCalculations = (
  section,
  boxMaterials,
  faceMaterials,
  finishTypes
) => {
  if (!section) {
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
  }

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

  const cabinetTotals = calculateCabinetTotals(
    section,
    boxMaterials,
    faceMaterials,
    finishMultiplier
  );

  const lengthsTotal = calculateSimpleItemsTotal(section.lengths);
  const accessoriesTotal = calculateSimpleItemsTotal(section.accessories);
  const otherTotal = calculateSimpleItemsTotal(section.other);

  const totalPrice =
    cabinetTotals.price +
    cabinetTotals.drawerBoxTotal +
    cabinetTotals.rollOutTotal +
    lengthsTotal +
    accessoriesTotal +
    otherTotal;

  let installHours = cabinetTotals.installHours;
  if (installHours > 0) {
    installHours += 1; // Add 1 hour for setup and cleanup
  }

  return {
    totalPrice,
    faceCounts: cabinetTotals.faceCounts,
    facePrices: cabinetTotals.facePrices,
    boxTotal: cabinetTotals.boxPrice,
    boxCount: cabinetTotals.boxCount,
    shopHours: cabinetTotals.shopHours,
    finishHours: cabinetTotals.finishHours,
    installHours,
    drawerBoxCount: cabinetTotals.drawerBoxCount,
    drawerBoxTotal: cabinetTotals.drawerBoxTotal,
    rollOutCount: cabinetTotals.rollOutCount,
    rollOutTotal: cabinetTotals.rollOutTotal,
  };
};

// Calculate roll-out dimensions based on face dimensions and cabinet depth
export const calculateRollOutDimensions = (
  faceWidth,
  cabinetDepth,
  faceHeight,
  type,
  minValue
) => {
  let height = DRAWER_BOX_HEIGHTS[0];
  if (type === "rollOut") {
    height = 4.25;
  } else {
    const maxHeight = Math.max(faceHeight - 1, minValue);
    for (let i = DRAWER_BOX_HEIGHTS.length - 1; i >= 0; i--) {
      if (DRAWER_BOX_HEIGHTS[i] <= maxHeight) {
        height = DRAWER_BOX_HEIGHTS[i];
        break;
      }
    }
  }
  // Width is face width minus 2 inches
  const width = Math.max(faceWidth - 2, minValue);

  // Depth should be a multiple of 3 inches and maximum cabinet depth - 1 inch
  const maxDepth = Math.max(cabinetDepth - 1, minValue);
  // Find the largest multiple of 3 that fits within maxDepth
  const depth = Math.floor(maxDepth / 3) * 3;

  return { width, height, depth };
};
