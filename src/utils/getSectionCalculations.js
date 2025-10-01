import { DRAWER_BOX_HEIGHTS, FACE_TYPES } from "./constants";
import {
  calculate5PieceDoorHours,
  calculate5PieceHardwoodFacePrice,
  calculateOutsourceBatchCostCNC,
  calculateSlabDoorHours,
  calculateSlabHardwoodFacePrice,
  calculateSlabSheetFacePrice,
} from "./estimateHelpers";

// Calculate face counts and prices for all cabinets in a section
const calculateFaceTotals = (section, faceMaterials, finishMultiplier) => {
  const totals = {
    faceCounts: {},
    facePrices: {},
    shopHours: 0,
    finishHours: 0,
    installHours: 0,
  };

  FACE_TYPES.forEach((type) => {
    if (type.value === "reveal") return;
    totals.faceCounts[type.value] = 0;
    totals.facePrices[type.value] = 0;
  });

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  const selectedFaceMaterial = faceMaterials.find(
    (mat) => mat.id === section.face_mat
  );

  if (!selectedFaceMaterial) return totals;

  section.cabinets.forEach((cabinet) => {
    if (!cabinet.face_config?.faceSummary) return;

    const quantity = Number(cabinet.quantity) || 1;

    Object.entries(cabinet.face_config.faceSummary).forEach(
      ([faceType, faceData]) => {
        if (["open", "container", "reveal"].includes(faceType)) return;

        const styleToUse =
          faceType === "drawer_front" || faceType === "false_front"
            ? section.section_data.drawerFrontStyle
            : section.section_data.doorStyle;

        // Calculate hours for each face
        if (faceData.faces && Array.isArray(faceData.faces)) {
          faceData.faces.forEach((face) => {
            let faceHours = {};
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
            totals.shopHours += (faceHours.shopHours || 0) * quantity;
            totals.installHours += (faceHours.installHours || 0) * quantity;
            if (selectedFaceMaterial.needs_finish) {
              totals.finishHours +=
                (faceHours.finishHours || 0) * quantity * finishMultiplier;
            }
          });
        }

        // Calculate price for this face type
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

        totals.facePrices[faceType] += typeTotalPrice * quantity;
        totals.faceCounts[faceType] += (faceData.count || 0) * quantity;
      }
    );
  });

  return totals;
};

// Calculate drawer box and rollout totals for all cabinets in a section
const calculateDrawerAndRolloutTotals = (section) => {
  const totals = {
    drawerBoxCount: 0,
    drawerBoxTotal: 0,
    rollOutCount: 0,
    rollOutTotal: 0,
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  const DRAWER_BOX_PRICE = 50;
  const ROLL_OUT_PRICE = 60;

  section.cabinets.forEach((cabinet) => {
    if (!cabinet.face_config) return;

    const quantity = Number(cabinet.quantity) || 1;

    const countDrawerAndRollouts = (node) => {
      if (!node) return;
      if (node.type === "drawer_front" && node.drawerBoxDimensions) {
        totals.drawerBoxCount += quantity;
        totals.drawerBoxTotal += DRAWER_BOX_PRICE * quantity;
      }
      if (node.rollOutQty && node.rollOutQty > 0) {
        const rollOutQty = parseInt(node.rollOutQty, 10);
        totals.rollOutCount += rollOutQty * quantity;
        totals.rollOutTotal += ROLL_OUT_PRICE * rollOutQty * quantity;
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(countDrawerAndRollouts);
      }
    };

    countDrawerAndRollouts(cabinet.face_config);
  });

  return totals;
};

// Calculate cabinet box hours for all cabinets in a section
const calculateCabinetBoxHours = (section, boxMaterials, faceMaterials, finishMultiplier) => {
  const totals = {
    shopHours: 0,
    finishHours: 0,
    installHours: 0,
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  section.cabinets.forEach((cabinet) => {
    if (!cabinet.cabinetHours) return;

    const quantity = Number(cabinet.quantity) || 1;

    totals.shopHours += (cabinet.cabinetHours.shopHours || 0) * quantity;
    totals.installHours += (cabinet.cabinetHours.installHours || 0) * quantity;

    // Add finish hours if finished interior
    if (cabinet.finished_interior) {
      const selectedBoxMaterial = cabinet.finished_interior
        ? faceMaterials.find((mat) => mat.id === section.face_mat)
        : boxMaterials.find((mat) => mat.id === section.box_mat);

      if (selectedBoxMaterial?.needs_finish) {
        totals.finishHours +=
          (cabinet.cabinetHours.finishHours || 0) * quantity * finishMultiplier;
      }
    }
  });

  return totals;
};

const calculateCabinetTotals = (
  section,
  boxMaterials,
  faceMaterials,
  finishMultiplier
) => {
  // Calculate box costs using batch CNC calculation
  const costBatchCNC = calculateOutsourceBatchCostCNC(
    section,
    boxMaterials,
    faceMaterials,
    1.5, //cut price per foot
    .85, //drill cost per hinge bore
    1.15, //drill cost per slide
    0.1, //rounding increment
    0.25, //edge band price per foot
    0.1, //tax rate
    12, //setup cost per sheet
    0.10 //waste factor (10% for cuts, defects, layout inefficiency)
  );
  
  console.log("costBatchCNC", costBatchCNC);

  // Calculate face totals (counts, prices, and hours)
  const faceTotals = calculateFaceTotals(section, faceMaterials, finishMultiplier);

  // Calculate drawer box and rollout totals
  const drawerRolloutTotals = calculateDrawerAndRolloutTotals(section);

  // Calculate cabinet box hours
  const boxHours = calculateCabinetBoxHours(section, boxMaterials, faceMaterials, finishMultiplier);

  // Count total boxes
  const boxCount = section.cabinets?.reduce((count, cabinet) => {
    return count + (Number(cabinet.quantity) || 1);
  }, 0) || 0;

  // Calculate total face price
  const facePrice = Object.values(faceTotals.facePrices).reduce((sum, price) => sum + price, 0);

  // Combine all totals
  const totals = {
    price: costBatchCNC.totalCost + facePrice,
    boxPrice: costBatchCNC.totalCost,
    boxCount,
    shopHours: boxHours.shopHours + faceTotals.shopHours,
    finishHours: boxHours.finishHours + faceTotals.finishHours,
    installHours: boxHours.installHours + faceTotals.installHours,
    faceCounts: faceTotals.faceCounts,
    facePrices: faceTotals.facePrices,
    drawerBoxCount: drawerRolloutTotals.drawerBoxCount,
    drawerBoxTotal: drawerRolloutTotals.drawerBoxTotal,
    rollOutCount: drawerRolloutTotals.rollOutCount,
    rollOutTotal: drawerRolloutTotals.rollOutTotal,
  };

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
