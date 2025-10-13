import {
  DRAWER_BOX_HEIGHTS,
  FACE_NAMES,
  FACE_TYPES,
  DRAWER_BOX_MOD_BY_ID,
} from "./constants";
import { calculateDrawerBoxesPrice } from "./drawerBoxCalculations";
import {
  calculate5PieceDoorHours,
  calculate5PieceHardwoodFacePrice,
  calculateOutsourceBatchCostCNC,
  calculateBoxSheetsCNC,
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
const calculateDrawerAndRolloutTotals = (
  section,
  drawerBoxMaterials,
  cabinetStyles
) => {
  const totals = {
    drawerBoxCount: 0,
    drawerBoxTotal: 0,
    rollOutCount: 0,
    rollOutTotal: 0,
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  // Collect all drawer boxes and rollouts across all cabinets
  const allDrawerBoxes = [];
  const allRollOuts = [];

  section.cabinets.forEach((cabinet) => {
    if (!cabinet.face_config) return;

    const quantity = Number(cabinet.quantity) || 1;

    // Determine if section is face frame style
    const sectionStyle = cabinet.cabinet_style_override
      ? cabinetStyles?.find(
          (style) => style.cabinet_style_id === cabinet.cabinet_style_override
        )
      : cabinetStyles?.find(
          (style) => style.cabinet_style_id === section.cabinet_style_id
        );
    const isFaceFrame =
      sectionStyle?.cabinet_style_name?.toLowerCase().includes("face frame") ||
      false;

    const collectDrawerAndRollouts = (node) => {
      if (!node) return;

      // Collect drawer boxes
      if (node.type === "drawer_front" && node.drawerBoxDimensions) {
        const { width, height, depth } = node.drawerBoxDimensions;
        allDrawerBoxes.push({
          width,
          height,
          depth,
          quantity,
          rollOut: false,
          isFaceFrame,
        });
        totals.drawerBoxCount += quantity;
      }

      // Collect rollouts
      if (node.rollOutQty && node.rollOutQty > 0 && node.rollOutDimensions) {
        const rollOutQty = parseInt(node.rollOutQty, 10);
        const { width, height, depth } = node.rollOutDimensions;
        allRollOuts.push({
          width,
          height,
          depth,
          quantity: rollOutQty * quantity,
          rollOut: true,
          isFaceFrame,
        });
        totals.rollOutCount += rollOutQty * quantity;
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(collectDrawerAndRollouts);
      }
    };

    collectDrawerAndRollouts(cabinet.face_config);
  });

  const drawerBoxMaterial = drawerBoxMaterials?.find(
    (mat) => mat.id === section.drawer_box_mat
  );

  // Calculate drawer box costs using the new pricing function
  if (allDrawerBoxes.length > 0) {
    const drawerBoxResult = calculateDrawerBoxesPrice({
      boxes: allDrawerBoxes,
      sheetPrice: drawerBoxMaterial?.sheet_price || 150,
      sheetSize: {
        width: drawerBoxMaterial?.width || 60,
        height: drawerBoxMaterial?.height || 60,
      },
      baseLaborRate: 18,
      wasteFactor: 0.05,
      roundingIncrement: 0.5,
      taxRate: 0.1,
    });
    totals.drawerBoxTotal = drawerBoxResult.totalCost;
  }

  // Calculate rollout costs separately (they have rollOut: true flag for scoop cost)
  if (allRollOuts.length > 0) {
    const rollOutResult = calculateDrawerBoxesPrice({
      boxes: allRollOuts,
      sheetPrice: drawerBoxMaterial?.sheet_price || 150,
      sheetSize: {
        width: drawerBoxMaterial?.width || 60,
        height: drawerBoxMaterial?.height || 60,
      },
      baseLaborRate: 18,
      wasteFactor: 0.05,
      roundingIncrement: 0.5,
      taxRate: 0.1,
    });
    totals.rollOutTotal = rollOutResult.totalCost;
  }

  return totals;
};

// Calculate cabinet box hours for all cabinets in a section
const calculateCabinetBoxHours = (
  section,
  boxMaterials,
  faceMaterials,
  finishMultiplier
) => {
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

// Count and price hardware from cabinet boxHardware
const countHardware = (section, hardware, faceTotals) => {
  let totalHinges = 0;
  let totalPulls = 0;
  let totalSlides = 0;

  // Sum up hardware from all cabinets
  section.cabinets?.forEach((cabinet) => {
    if (cabinet.face_config?.boxSummary?.boxHardware) {
      const qty = Number(cabinet.quantity) || 1;
      const {
        totalHinges: hinges,
        totalPulls: pulls,
        totalSlides: slides,
      } = cabinet.face_config.boxSummary.boxHardware;
      totalHinges += (hinges || 0) * qty;
      totalPulls += (pulls || 0) * qty;
      totalSlides += (slides || 0) * qty;
    }
  });

  // Get hardware items from section
  const doorHinge = hardware?.hinges?.find((h) => h.id === section.hinge_id);
  const doorPull = hardware?.pulls?.find((p) => p.id === section.door_pull_id);
  const drawerPull = hardware?.pulls?.find(
    (p) => p.id === section.drawer_pull_id
  );
  const drawerSlide = hardware?.slides?.find((s) => s.id === section.slide_id);

  // Calculate totals
  const hingesTotal = totalHinges * (doorHinge?.price || 0);
  const slidesTotal = totalSlides * (drawerSlide?.price || 0);

  // Calculate pulls pricing based on face counts
  const doorCount = faceTotals.faceCounts?.door || 0;
  const drawerCount =
    (faceTotals.faceCounts?.drawer_front || 0) +
    (faceTotals.faceCounts?.false_front || 0);
  const doorPullsTotal = doorCount * (doorPull?.price || 0);
  const drawerPullsTotal = drawerCount * (drawerPull?.price || 0);
  const pullsTotal = doorPullsTotal + drawerPullsTotal;

  return {
    hingesCount: totalHinges,
    hingesTotal,
    pullsCount: totalPulls,
    pullsTotal,
    slidesCount: totalSlides,
    slidesTotal,
  };
};

const calculateCabinetTotals = (
  section,
  boxMaterials,
  faceMaterials,
  drawerBoxMaterials,
  finishMultiplier,
  cabinetStyles,
  hardware
) => {
  // Calculate box costs using batch CNC calculation
  const costBatchCNC = calculateOutsourceBatchCostCNC(
    section,
    boxMaterials,
    faceMaterials,
    1.5, //cut price per foot
    0.85, //drill cost per hinge bore
    1.15, //drill cost per slide
    0.08, //drill cost per shelf hole
    0.2, //rounding increment
    0.25, //edge band price per foot
    0.1, //tax rate
    12, //setup cost per sheet
    0.1 //waste factor (10% for cuts, defects, layout inefficiency)
  );

  const cabinetCost = calculateBoxSheetsCNC(
    section,
    boxMaterials,
    faceMaterials,
    {
      cutPricePerFoot: 1.5,
      drillCostPerHingeBore: 0.85,
      drillCostPerSlide: 1.25,
      drillCostPerShelfHole: 0.08,
      edgeBandPricePerFoot: 0.20,
      taxRate: 0.1,
      setupCostPerSheet: 15,
      kerfWidth: 0.25, // Saw blade kerf width in inches
    }
  );

  console.log("costBatchCNC", costBatchCNC);
  console.log("cabinetCost", cabinetCost);
  // Calculate face totals (counts, prices, and hours)
  const faceTotals = calculateFaceTotals(
    section,
    faceMaterials,
    finishMultiplier
  );

  // Calculate drawer box and rollout totals
  const drawerRolloutTotals = calculateDrawerAndRolloutTotals(
    section,
    drawerBoxMaterials,
    cabinetStyles
  );

  // Calculate cabinet box hours
  const boxHours = calculateCabinetBoxHours(
    section,
    boxMaterials,
    faceMaterials,
    finishMultiplier
  );

  // Count total boxes
  const boxCount =
    section.cabinets?.reduce((count, cabinet) => {
      return count + (Number(cabinet.quantity) || 1);
    }, 0) || 0;

  // Calculate total face price
  const facePrice = Object.values(faceTotals.facePrices).reduce(
    (sum, price) => sum + price,
    0
  );

  // Calculate hardware counts and totals
  const hardwareTotals = countHardware(section, hardware, faceTotals);

  // Combine all totals
  const totals = {
    price: cabinetCost.totalCost + facePrice,
    boxPrice: cabinetCost.totalCost,
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
    hingesCount: hardwareTotals.hingesCount,
    hingesTotal: hardwareTotals.hingesTotal,
    pullsCount: hardwareTotals.pullsCount,
    pullsTotal: hardwareTotals.pullsTotal,
    slidesCount: hardwareTotals.slidesCount,
    slidesTotal: hardwareTotals.slidesTotal,
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
  drawerBoxMaterials,
  finishTypes,
  cabinetStyles,
  hardware
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
      hingesCount: 0,
      hingesTotal: 0,
      pullsCount: 0,
      pullsTotal: 0,
      slidesCount: 0,
      slidesTotal: 0,
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
    drawerBoxMaterials,
    finishMultiplier,
    cabinetStyles,
    hardware
  );

  const lengthsTotal = calculateSimpleItemsTotal(section.lengths);
  const accessoriesTotal = calculateSimpleItemsTotal(section.accessories);
  const otherTotal = calculateSimpleItemsTotal(section.other);

  const totalPrice =
    cabinetTotals.price +
    cabinetTotals.drawerBoxTotal +
    cabinetTotals.rollOutTotal +
    cabinetTotals.hingesTotal +
    cabinetTotals.pullsTotal +
    cabinetTotals.slidesTotal +
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
    hingesCount: cabinetTotals.hingesCount,
    hingesTotal: cabinetTotals.hingesTotal,
    pullsCount: cabinetTotals.pullsCount,
    pullsTotal: cabinetTotals.pullsTotal,
    slidesCount: cabinetTotals.slidesCount,
    slidesTotal: cabinetTotals.slidesTotal,
  };
};

// Calculate roll-out dimensions based on face dimensions and cabinet depth
export const calculateRollOutDimensions = (
  style,
  faceWidth,
  cabinetDepth,
  faceHeight,
  type,
  isRollout
) => {
  let height = DRAWER_BOX_HEIGHTS[0];
  if (isRollout) {
    height = 4.25;
  } else {
    const maxHeight = Math.max(faceHeight - 1, DRAWER_BOX_HEIGHTS[0]);
    for (let i = DRAWER_BOX_HEIGHTS.length - 1; i >= 0; i--) {
      if (DRAWER_BOX_HEIGHTS[i] <= maxHeight) {
        height = DRAWER_BOX_HEIGHTS[i];
        break;
      }
    }
  }

  let subtractWidth =
    DRAWER_BOX_MOD_BY_ID[style.cabinet_style_id]?.subtractWidth || 0;

  if (type === FACE_NAMES.DOOR) {
    subtractWidth += 1.25;
  }
  if (type === FACE_NAMES.PAIR_DOOR) {
    subtractWidth += 2.5;
  }

  // Width is face width minus 2 inches
  const width = Math.max(faceWidth - subtractWidth, 5);

  // Depth should be a multiple of 3 inches and maximum cabinet depth - 1 inch
  const maxDepth = Math.max(cabinetDepth - 1.25, 6);
  // Find the largest multiple of 3 that fits within maxDepth
  const depth = Math.floor(maxDepth / 3) * 3;

  return { width, height, depth, rollOut: type === "rollOut" };
};
