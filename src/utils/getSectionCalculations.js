import {
  DRAWER_BOX_HEIGHTS,
  FACE_NAMES,
  FACE_TYPES,
  DRAWER_BOX_MOD_BY_ID,
  CABINET_TYPES,
} from "./constants";
import { calculateDrawerBoxesPrice } from "./drawerBoxCalculations";
import {
  calculate5PieceDoorHours,
  calculate5PieceHardwoodFacePrice,
  calculateBoxPartsTime,
  calculateBoxSheetsCNC,
  calculateSlabDoorHours,
  calculateSlabHardwoodFacePrice,
  calculateSlabSheetFacePrice,
  roundToHundredth,
} from "./estimateHelpers";

// Calculate face counts and prices for all cabinets in a section
const calculateFaceTotals = (section, context) => {
  const totals = {
    faceCounts: {},
    facePrices: {},
    hoursByService: {}, // Keyed by service ID: 2=shop, 3=finish, 4=install
  };

  FACE_TYPES.forEach((type) => {
    if (type.value === "reveal") return;
    totals.faceCounts[type.value] = 0;
    totals.facePrices[type.value] = 0;
  });

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  const { selectedFaceMaterial } = context;

  if (!selectedFaceMaterial) return totals;

  section.cabinets.forEach((cabinet) => {
    if (!cabinet.face_config?.faceSummary) return;
    // Don't calculate hours for fillers (type === 5, done separately)
    if (cabinet.type === 5) return;
    // if (!CABINET_TYPES.includes(cabinet.type)) return;

    const quantity = Number(cabinet.quantity) || 1;

    Object.entries(cabinet.face_config.faceSummary).forEach(
      ([faceType, faceData]) => {
        if (["open", "container", "reveal"].includes(faceType)) return;

        const styleToUse =
          faceType === FACE_NAMES.drawer_front ||
          faceType === FACE_NAMES.false_front
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

            // Aggregate hours by service ID
            if (faceHours.hoursByService) {
              Object.entries(faceHours.hoursByService).forEach(
                ([serviceId, hours]) => {
                  if (!totals.hoursByService[serviceId]) {
                    totals.hoursByService[serviceId] = 0;
                  }
                  // Apply multipliers based on service ID
                  let multiplier = quantity;
                  if (
                    serviceId === "2" &&
                    selectedFaceMaterial.material?.needs_finish
                  ) {
                    // Shop multiplier for service ID 2
                    multiplier = quantity * selectedFaceMaterial.shopMultiplier;
                  } else if (
                    serviceId === "3" &&
                    selectedFaceMaterial.material?.needs_finish
                  ) {
                    // Finish multiplier for service ID 3
                    multiplier =
                      quantity * selectedFaceMaterial.finishMultiplier;
                  }
                  totals.hoursByService[serviceId] += (hours || 0) * multiplier;
                }
              );
            }
          });
        }

        // Calculate price for this face type
        let typeTotalPrice = 0;
        if (styleToUse === "slab_sheet") {
          typeTotalPrice = calculateSlabSheetFacePrice(
            faceData,
            selectedFaceMaterial.material
          );
        } else if (styleToUse === "5_piece_hardwood") {
          typeTotalPrice = calculate5PieceHardwoodFacePrice(
            faceData,
            selectedFaceMaterial.material
          );
        } else if (styleToUse === "slab_hardwood") {
          typeTotalPrice = calculateSlabHardwoodFacePrice(
            faceData,
            selectedFaceMaterial.material
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
const calculateDrawerAndRolloutTotals = (section, context) => {
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
      ? context.cabinetStyles?.find(
          (style) => style.cabinet_style_id === cabinet.cabinet_style_override
        )
      : context.cabinetStyles?.find(
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

  const drawerBoxMaterial = context.drawerBoxMaterials?.find(
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

const tapeTimeMinutes = ({
  beadLengthIn = 0,
  openingsCount = 0,
  overheadPerOpeningMin = 2,
  perInchRate = null,
  minMinutes = 8,
}) => {
  // Reference: one 22.5" x 29" opening = 20 min
  const refPerimeter = 103; // 22.5 + 29 repeated twice
  const refMinutes = 20;

  // Compute per-inch rate if not provided
  if (perInchRate === null) {
    perInchRate = (refMinutes - overheadPerOpeningMin) / refPerimeter;
  }

  let minutes =
    openingsCount * overheadPerOpeningMin + beadLengthIn * perInchRate;

  // Apply floor
  minutes = Math.max(minutes, minMinutes);

  return minutes;
};

const calculateFaceFramePrices = (section, context) => {
  const totals = {
    hoursByService: {}, // 2=shop, 3=finish
    woodTotal: 0,
    boardFeet: 0,
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) return totals;

  const { selectedFaceMaterial } = context;
  if (!selectedFaceMaterial) return totals;

  let totalTapeHours = 0; // 👈 track tape time separately

  section.cabinets.forEach((cabinet) => {
    if (cabinet.cabinet_style_override === 13) return;
    if (!cabinet.cabinet_tyle_override && section.cabinet_style_id === 13)
      return;

    const quantity = Number(cabinet.quantity) || 1;
    const { frameParts, openingsCount } = cabinet.face_config?.boxSummary || {};

    const tapeTime = tapeTimeMinutes({
      beadLengthIn: frameParts?.beadLength || 0,
      openingsCount: openingsCount || 1,
      overheadPerOpeningMin: 2,
      perInchRate: null,
      minMinutes: 8,
    });

    const tapeTimeHours = (tapeTime / 60) * quantity;
    totalTapeHours += tapeTimeHours; // 👈 accumulate separately

    if (!frameParts?.framePieces) return;

    frameParts.framePieces.forEach((piece) => {
      const length = piece.length || 0;
      const width = piece.width || 0;

      let shopTimeMinutes = 15;
      if (length > 36) {
        const extraLength = Math.min(length - 36, 60);
        const timeIncrease = (extraLength / 60) * 10;
        shopTimeMinutes = 15 + timeIncrease;
      }

      if (selectedFaceMaterial?.bd_ft_price) {
        const boardFeet =
          (length * width * selectedFaceMaterial.thickness) / 144;
        const boardFeetWithWaste = boardFeet * 1.25;
        totals.boardFeet += boardFeetWithWaste * quantity;
        totals.woodTotal +=
          boardFeetWithWaste * selectedFaceMaterial.bd_ft_price * quantity;
      }

      const shopTimeHours = shopTimeMinutes / 60;
      if (!totals.hoursByService[2]) totals.hoursByService[2] = 0;

      const shopMultiplier = selectedFaceMaterial.material?.needs_finish
        ? selectedFaceMaterial.shopMultiplier
        : 1;

      totals.hoursByService[2] += shopTimeHours * quantity * shopMultiplier;
    });
  });

  // Apply finish multiplier *only* to finish work, not tape time
  if (selectedFaceMaterial.material?.needs_finish) {
    const totalFinishHours = totals.hoursByService[3] || 0;
    const finishOnlyHours = Math.max(totalFinishHours - totalTapeHours, 0); // ✅ never negative
    const adjustedFinishHours =
      finishOnlyHours * selectedFaceMaterial.finishMultiplier;

    totals.hoursByService[3] = adjustedFinishHours + totalTapeHours;
  }

  return totals;
};

const calculateFillerMaterials = (section, context) => {
  const totals = {
    woodTotal: 0,
    boardFeet: 0,
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  const fillers = section.cabinets.filter((cabinet) => {
    // Only include filler parts (type 5)
    return cabinet.type === 5;
  });

  if (fillers.length === 0) return totals;

  const { selectedFaceMaterial } = context;
  if (!selectedFaceMaterial) return totals;

  const { material } = selectedFaceMaterial;

  fillers.forEach((filler) => {
    const { width, height, depth, quantity = 1 } = filler;

    const faceArea = width * height;
    const returnArea = depth * height;
    const wasteFactor = 1.25;

    if (material?.bd_ft_price) {
      const boardFeet =
        ((faceArea + returnArea) * material.thickness) / 144;
      const boardFeetWithWaste = boardFeet * wasteFactor;
      totals.boardFeet += boardFeetWithWaste * quantity;
      totals.woodTotal +=
        boardFeetWithWaste * material.bd_ft_price * quantity;
    } else {
      const totalArea = (faceArea + returnArea) * wasteFactor;
      const sheetArea = totalArea / material.area;
      totals.woodTotal +=
        sheetArea * material.sheet_price * quantity;
    }
  });

  return totals;
};

// Count and price hardware from cabinet boxHardware
const countHardware = (section, faceTotals, context) => {
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
  const doorHinge = context.hardware?.hinges?.find(
    (h) => h.id === section.hinge_id
  );
  const doorPull = context.hardware?.pulls?.find(
    (p) => p.id === section.door_pull_id
  );
  const drawerPull = context.hardware?.pulls?.find(
    (p) => p.id === section.drawer_pull_id
  );
  const drawerSlide = context.hardware?.slides?.find(
    (s) => s.id === section.slide_id
  );

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

const calculateCabinetTotals = (section, context) => {
  const cabinetCost = calculateBoxSheetsCNC(
    section,
    context,
    {
      cutPricePerFoot: 1.5,
      drillCostPerHingeBore: 0.85,
      drillCostPerSlide: 1.25,
      drillCostPerShelfHole: 0.08,
      edgeBandPricePerFoot: 0.2,
      taxRate: 0.1,
      setupCostPerSheet: 15,
      kerfWidth: 0.25, // Saw blade kerf width in inches
    }
  );

  const boxHours = calculateBoxPartsTime(section, context);

  // Calculate face totals (counts, prices, and hours)
  const faceTotals = calculateFaceTotals(section, context);

  // Calculate drawer box and rollout totals
  const drawerRolloutTotals = calculateDrawerAndRolloutTotals(section, context);

  const fillerMaterials = calculateFillerMaterials(section, context);

  const faceFramePrices = calculateFaceFramePrices(section, context);

  // Count total boxes
  const { boxCount, fillerCount } = section.cabinets?.reduce(
    (count, cabinet) => {
      // cabinet boxes
      if (CABINET_TYPES.includes(cabinet.type))
        return {
          boxCount: count.boxCount + (Number(cabinet.quantity) || 1),
          fillerCount: count.fillerCount,
        };
      // Fillers
      if (cabinet.type === 5)
        return {
          boxCount: count.boxCount,
          fillerCount: count.fillerCount + (Number(cabinet.quantity) || 1),
        };
      return count;
    },
    { boxCount: 0, fillerCount: 0 }
  ) || { boxCount: 0, fillerCount: 0 };

  // Calculate total face price
  const facePrice = Object.values(faceTotals.facePrices).reduce(
    (sum, price) => sum + price,
    0
  );

  // Calculate hardware counts and totals
  const hardwareTotals = countHardware(section, faceTotals, context);

  // Merge hoursByService from all sources
  const mergedHoursByService = {};
  [boxHours, faceTotals, faceFramePrices].forEach((source) => {
    if (source?.hoursByService) {
      Object.entries(source.hoursByService).forEach(([serviceType, hours]) => {
        if (!mergedHoursByService[serviceType]) {
          mergedHoursByService[serviceType] = 0;
        }
        mergedHoursByService[serviceType] += hours || 0;
      });
    }
  });

  // Combine all totals
  const totals = {
    price: cabinetCost.totalCost + facePrice + faceFramePrices.totalCost,
    boxPrice: cabinetCost.totalCost,
    boxCount: boxCount,
    hoursByService: mergedHoursByService,
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
    woodTotal: faceFramePrices.woodTotal + fillerMaterials.woodTotal,
    woodCount: faceFramePrices.boardFeet + fillerMaterials.boardFeet,
    fillerCount: fillerCount,
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

/**
 * Calculate section totals with all materials, hardware, and labor
 * @param {Object} section - The section to calculate
 * @param {Object} context - Calculation context with all global reference data
 * @param {Array} context.boxMaterials - Available box materials
 * @param {Array} context.faceMaterials - Available face materials
 * @param {Array} context.drawerBoxMaterials - Available drawer box materials
 * @param {Array} context.finishTypes - Available finish types
 * @param {Array} context.cabinetStyles - Available cabinet styles
 * @param {Object} context.hardware - Hardware data (hinges, pulls, slides)
 * @param {Object} context.partsListAnchors - Parts list anchors by parts_list_id
 * @param {Array} context.globalServices - Global services array
 */
export const getSectionCalculations = (section, context = {}) => {
  if (!section) {
    return {
      totalPrice: 0,
      faceCounts: {},
      facePrices: {},
      boxTotal: 0,
      boxCount: 0,
      hoursByService: {},
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
      woodTotal: 0,
      woodCount: 0,
      fillerCount: 0,
    };
  }

  const cabinetTotals = calculateCabinetTotals(section, context);

  const lengthsTotal = calculateSimpleItemsTotal(section.lengths);
  const accessoriesTotal = calculateSimpleItemsTotal(section.accessories);
  const otherTotal = calculateSimpleItemsTotal(section.other);

  const totalPrice =
    cabinetTotals.boxPrice +
    cabinetTotals.drawerBoxTotal +
    cabinetTotals.rollOutTotal +
    cabinetTotals.hingesTotal +
    cabinetTotals.pullsTotal +
    cabinetTotals.slidesTotal +
    lengthsTotal +
    accessoriesTotal +
    cabinetTotals.woodTotal +
    otherTotal;

  // Add 1 hour setup/cleanup to install hours (service ID 4) if any install work exists
  const finalHoursByService = { ...cabinetTotals.hoursByService };
  if (finalHoursByService[4] && finalHoursByService[4] > 0) {
    finalHoursByService[4] += 1;
  }

  return {
    totalPrice,
    faceCounts: cabinetTotals.faceCounts,
    facePrices: cabinetTotals.facePrices,
    boxTotal: cabinetTotals.boxPrice,
    boxCount: cabinetTotals.boxCount,
    hoursByService: finalHoursByService,
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
    woodTotal: cabinetTotals.woodTotal,
    woodCount: roundToHundredth(cabinetTotals.woodCount),
    fillerCount: cabinetTotals.fillerCount,
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
