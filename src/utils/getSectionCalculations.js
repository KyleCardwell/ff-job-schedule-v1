import { getItemTypeConfig } from "../config/cabinetItemTypes";

import { calculateAccessoryUnitAndPrice } from "./accessoryCalculations";
import {
  DRAWER_BOX_HEIGHTS,
  FACE_NAMES,
  FACE_TYPES,
  DRAWER_BOX_MOD_BY_ID,
  CABINET_TYPES,
  FACE_STYLE_VALUES,
  ACCESSORY_TYPES,
  ITEM_TYPES,
  PART_NAMES,
} from "./constants";
import { calculateDrawerBoxesPrice } from "./drawerBoxCalculations";
import {
  getEffectiveDefaults,
  getEffectiveValueOnly,
} from "./estimateDefaults";
import {
  calculateBoxPartsTime,
  calculateBoxSheetsCNC,
  calculateDoorPartsTime,
  calculatePanelPartsTime,
  calculateHoodPartsTime,
  calculateSlabSheetFacePriceBulk,
  calculateMoldingCost,
  roundToHundredth,
  interpolateTimeByArea,
} from "./estimateHelpers";

// Calculate face counts and prices for all cabinets in a section
// Aggregates faces across all cabinets by style for efficient bulk calculation
const calculateFaceTotals = (section, context) => {
  const totals = {
    faceCounts: {},
    facePrices: {},
    hoursByService: {}, // Keyed by service ID: 2=shop, 3=finish, 4=install (aggregate)
    categoryHours: {}, // Hours by face type
    glassTotal: 0,
    glassCount: 0,
    hoodCount: 0,
  };

  FACE_TYPES.forEach((type) => {
    if (type.value === "reveal") return;
    totals.faceCounts[type.value] = 0;
    totals.facePrices[type.value] = 0;
    totals.categoryHours[type.value] = {}; // Initialize hours tracking for each face type
  });

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  const {
    selectedFaceMaterial,
    selectedDoorMaterial,
    selectedDrawerFrontMaterial,
    estimate,
    team,
  } = context;

  if (!selectedFaceMaterial) return totals;

  // Resolve effective values using three-tier fallback (section → estimate → team)
  const effectiveValues = getEffectiveDefaults(section, estimate, team);

  // Aggregate faces by style across all cabinets
  // Structure: { doorStyle: { slab_sheet: [faces...], 5_piece_hardwood: [faces...] } }
  const facesByStyle = {};
  const allFacesForHours = []; // For hour calculation

  section.cabinets.forEach((cabinet) => {
    const quantity = cabinet.quantity != null ? Number(cabinet.quantity) : 1;
    const cabinetStyleId =
      cabinet.cabinet_style_override || effectiveValues.cabinet_style_id;

    // Handle fillers (type 5) separately using boxPartsList
    if (cabinet.type === 5) {
      // Only include fillers if door style is slab_sheet
      if (effectiveValues.door_style !== FACE_STYLE_VALUES.SLAB_SHEET) return;

      if (!cabinet.face_config?.boxSummary?.boxPartsList) return;

      const boxPartsList = cabinet.face_config.boxSummary.boxPartsList;

      // Sum the widths of all parts to create a single panel
      let totalWidth = 0;
      let panelHeight = 0;

      boxPartsList.forEach((part) => {
        totalWidth += part.width || 0;
        // Use the first part's height (they should all be the same)
        if (panelHeight === 0) {
          panelHeight = part.height || 0;
        }
      });

      if (totalWidth > 0 && panelHeight > 0) {
        const faceType = FACE_NAMES.PANEL;
        const styleToUse = effectiveValues.door_style;

        // Initialize style category if needed
        if (!facesByStyle[styleToUse]) {
          facesByStyle[styleToUse] = [];
        }

        // Add the single combined panel (multiplied by cabinet quantity)
        for (let i = 0; i < quantity; i++) {
          facesByStyle[styleToUse].push({
            width: totalWidth,
            height: panelHeight,
            area: totalWidth * panelHeight,
            faceType,
            cabinetId: cabinet.id || cabinet.temp_id,
          });
        }

        // Update face counts
        if (!totals.faceCounts[faceType]) {
          totals.faceCounts[faceType] = 0;
        }
        totals.faceCounts[faceType] += quantity;
      }

      // Skip the rest of the processing for fillers (no faceSummary processing, no hours)
      return;
    }

    // Handle end panel nosing (type 10) separately using boxPartsList
    if (cabinet.type === 10) {
      // Check if shop_built flag is set
      if (cabinet.type_specific_options?.shop_built) {
        // Shop-built end panels: single slab_sheet panel, no face frame or reveals
        const styleToUse = FACE_STYLE_VALUES.SLAB_SHEET; // Always slab_sheet for shop-built

        if (!facesByStyle[styleToUse]) {
          facesByStyle[styleToUse] = [];
        }

        const faceType = FACE_NAMES.PANEL;

        // Create faces array for both pricing and hours calculation
        const shopBuiltFaces = [];

        // Add single panel using root dimensions (NOT multiplied - quantity handled later)
        shopBuiltFaces.push({
          width: cabinet.width,
          height: cabinet.height,
          area: cabinet.width * cabinet.height,
          faceType,
          cabinetId: cabinet.id || cabinet.temp_id,
          isShopBuilt: true, // Mark for reference
        });

        // Add to facesByStyle for pricing (multiplied by cabinet quantity)
        for (let i = 0; i < quantity; i++) {
          facesByStyle[styleToUse].push({
            width: cabinet.width,
            height: cabinet.height,
            area: cabinet.width * cabinet.height,
            faceType,
            cabinetId: cabinet.id || cabinet.temp_id,
            isShopBuilt: true,
          });
        }

        // Update face counts
        totals.faceCounts[faceType] =
          (totals.faceCounts[faceType] || 0) + quantity;

        // Still process nosing if present (shop-built panels can have nosing)
        if (cabinet.face_config?.boxSummary?.boxPartsList) {
          const boxPartsList = cabinet.face_config.boxSummary.boxPartsList;
          const nosingParts = boxPartsList.filter(
            (part) => part.type === PART_NAMES.NOSING,
          );

          if (nosingParts.length > 0) {
            // Process each nosing piece as a panel for pricing/hours
            nosingParts.forEach((nosingPart) => {
              // // Add to shopBuiltFaces for hours calculation (NOT multiplied)
              // shopBuiltFaces.push({
              //   width: nosingPart.width,
              //   height: nosingPart.height,
              //   area: nosingPart.area,
              //   faceType,
              //   cabinetId: cabinet.id || cabinet.temp_id,
              //   isNosing: true,
              // });

              // Add to facesByStyle for pricing (multiplied by cabinet quantity)
              for (let i = 0; i < quantity; i++) {
                facesByStyle[styleToUse].push({
                  width: nosingPart.width,
                  height: nosingPart.height,
                  area: nosingPart.area,
                  faceType,
                  cabinetId: cabinet.id || cabinet.temp_id,
                  isNosing: true, // Mark as nosing to exclude from counts
                });
              }
              // Don't update face counts for nosing parts
            });
          }
        }

        // Add to allFacesForHours for service hour calculation
        // Shop-built panels should not get panel mod time
        allFacesForHours.push({
          faces: shopBuiltFaces,
          faceType,
          styleToUse,
          cabinetStyleId,
          // panelModId: effectiveValues.door_panel_mod_id,
          panelModId: null, // No panel mod for shop-built
          quantity,
          cabinetTypeId: cabinet.type,
        });

        // Skip faceSummary processing (no face frame or reveals for shop-built)
        return;
      }

      // Non-shop-built end panels: original logic
      // Only include nosing if door style is slab_sheet and boxPartsList exists
      if (effectiveValues.door_style !== FACE_STYLE_VALUES.SLAB_SHEET) {
        // Continue to regular processing for non-slab_sheet styles
      } else if (cabinet.face_config?.boxSummary?.boxPartsList) {
        const boxPartsList = cabinet.face_config.boxSummary.boxPartsList;
        const nosingParts = boxPartsList.filter(
          (part) => part.type === PART_NAMES.NOSING,
        );

        if (nosingParts.length > 0) {
          const styleToUse = effectiveValues.door_style;

          // Initialize style category if needed
          if (!facesByStyle[styleToUse]) {
            facesByStyle[styleToUse] = [];
          }

          // Process each nosing piece as a panel for pricing/hours
          // but don't count them in faceCounts
          nosingParts.forEach((nosingPart) => {
            const faceType = FACE_NAMES.PANEL;

            // Add each nosing piece (multiplied by cabinet quantity)
            for (let i = 0; i < quantity; i++) {
              facesByStyle[styleToUse].push({
                width: nosingPart.width,
                height: nosingPart.height,
                area: nosingPart.area,
                faceType,
                cabinetId: cabinet.id || cabinet.temp_id,
                isNosing: true, // Mark as nosing to exclude from counts
              });
            }

            // Don't update face counts for nosing parts
          });
        }
      }
    }

    // // Add extra service hours for end panels (type 10) and appliance panels (type 11)
    // // Uses root dimensions with parts list anchors 17 and 18 respectively
    // if (cabinet.type === 10 || cabinet.type === 11) {
    //   const panelHours = calculatePanelPartsTime(
    //     cabinet,
    //     cabinetStyleId,
    //     context
    //   );

    //   const categoryKey = 'panel';
    //   const typeName = cabinet.type === 10 ? 'End Panel' : 'Appliance Panel';

    //   console.log(`🟣 ${typeName} (cabinet ${cabinet.id || cabinet.temp_id}):`, panelHours);

    //   // Aggregate panel hours by converting team_service_id to service_id
    //   Object.entries(panelHours).forEach(([teamServiceId, hours]) => {
    //     const service = context.globalServices?.find(
    //       (s) => s.team_service_id === parseInt(teamServiceId)
    //     );
    //     if (!service) return;

    //     const serviceId = service.service_id;
    //     if (!totals.hoursByService[serviceId]) {
    //       totals.hoursByService[serviceId] = 0;
    //     }
    //     // Hours already include quantity multiplier from calculatePanelPartsTime
    //     totals.hoursByService[serviceId] += hours || 0;

    //     // Track in categoryHours for breakdown display
    //     if (!totals.categoryHours[categoryKey]) {
    //       totals.categoryHours[categoryKey] = {};
    //     }
    //     if (!totals.categoryHours[categoryKey][serviceId]) {
    //       totals.categoryHours[categoryKey][serviceId] = 0;
    //     }
    //     totals.categoryHours[categoryKey][serviceId] += hours || 0;

    //     console.log(`  Added ${hours} hours to categoryHours.${categoryKey}[${serviceId}]`);
    //   });

    //   console.log(`  categoryHours.${categoryKey} now:`, totals.categoryHours[categoryKey]);
    // }

    // Add service hours for hoods (type 14)
    // Uses 3D volume (width × height × depth) with parts list anchor 21
    if (cabinet.type === 14) {
      const itemTypeConfig = getItemTypeConfig(ITEM_TYPES.HOOD.type);
      const hoodHours = calculateHoodPartsTime(cabinet, cabinetStyleId, {
        ...context,
        itemTypeConfig,
      });

      // Increment hood count
      totals.hoodCount += quantity;

      // Aggregate hood hours by converting team_service_id to service_id
      Object.entries(hoodHours).forEach(([teamServiceId, hours]) => {
        const service = context.globalServices?.find(
          (s) => s.team_service_id === parseInt(teamServiceId),
        );
        if (!service) return;

        const serviceId = service.service_id;
        if (!totals.hoursByService[serviceId]) {
          totals.hoursByService[serviceId] = 0;
        }
        // Hours already include quantity multiplier from calculateHoodPartsTime
        totals.hoursByService[serviceId] += hours || 0;

        // Track in categoryHours for breakdown display
        if (!totals.categoryHours.hood) {
          totals.categoryHours.hood = {};
        }
        if (!totals.categoryHours.hood[serviceId]) {
          totals.categoryHours.hood[serviceId] = 0;
        }
        totals.categoryHours.hood[serviceId] += hours || 0;
      });
    }

    // Regular cabinets - process faceSummary
    if (!cabinet.face_config?.faceSummary) return;

    Object.entries(cabinet.face_config.faceSummary).forEach(
      ([faceType, faceData]) => {
        // Process glass first (before exclusion check) so open face types with glass shelves are included
        if (faceData.glass) {
          const { glass } = context?.accessories || {};

          faceData.glass.forEach((piece) => {
            const sqft = (piece.width * piece.height) / 144;
            const price =
              glass.find((g) => g.id === piece.accessoryCatalogId)
                ?.default_price_per_unit || 0;
            // Store glass count as quantity (number of pieces) not square footage
            totals.glassCount += piece.quantity * quantity; // Multiply by cabinet quantity
            totals.glassTotal +=
              (sqft * price || 0) * piece.quantity * quantity;
          });
        }

        // Exclude open, container, and reveal types from face processing
        if (["open", "container", "reveal"].includes(faceType)) return;

        const styleToUse =
          faceType === FACE_NAMES.drawer_front ||
          faceType === FACE_NAMES.false_front
            ? effectiveValues.drawer_front_style
            : effectiveValues.door_style;

        // Initialize style category if needed
        if (!facesByStyle[styleToUse]) {
          facesByStyle[styleToUse] = [];
        }

        // Add each face to the aggregated list (multiplied by cabinet quantity)
        if (faceData.faces && Array.isArray(faceData.faces)) {
          faceData.faces.forEach((face) => {
            // Add face multiple times based on cabinet quantity
            for (let i = 0; i < quantity; i++) {
              facesByStyle[styleToUse].push({
                ...face,
                faceType,
                cabinetId: cabinet.id || cabinet.temp_id,
              });
            }
          });

          let panelModId = null;

          if (
            faceType === FACE_NAMES.DRAWER_FRONT ||
            faceType === FACE_NAMES.FALSE_FRONT
          ) {
            panelModId = effectiveValues.drawer_panel_mod_id;
          } else if (
            faceType === FACE_NAMES.DOOR ||
            faceType === FACE_NAMES.PAIR_DOOR ||
            faceType === FACE_NAMES.PANEL
          ) {
            panelModId = effectiveValues.door_panel_mod_id;
          }

          // Collect faces for hour calculation with cabinet style ID and face type
          allFacesForHours.push({
            faces: faceData.faces,
            faceType,
            styleToUse,
            cabinetStyleId,
            panelModId,
            quantity,
            cabinetTypeId: cabinet.type,
          });
        }

        // Update face counts
        totals.faceCounts[faceType] += (faceData.count || 0) * quantity;
      },
    );
  });

  // Log what's in facesByStyle for comparison
  console.log("📊 facesByStyle summary:");
  Object.entries(facesByStyle).forEach(([style, faces]) => {
    const byType = faces.reduce((acc, face) => {
      acc[face.faceType] = (acc[face.faceType] || 0) + 1;
      return acc;
    }, {});
    console.log(`  Style "${style}": ${faces.length} faces`, byType);
  });

  // Calculate hours using parts list anchors
  console.log(
    "🔵 Starting face hours calculation, allFacesForHours count:",
    allFacesForHours.length,
  );

  allFacesForHours.forEach(
    (
      {
        faces,
        faceType,
        styleToUse,
        cabinetStyleId,
        panelModId,
        quantity,
        cabinetTypeId,
      },
      index,
    ) => {
      // Determine effective material based on face type (door vs drawer)
      // Use the pre-calculated selectedDoorMaterial or selectedDrawerFrontMaterial from context
      // which already includes finish multipliers
      let effectiveMaterial;
      if (
        faceType === FACE_NAMES.DRAWER_FRONT ||
        faceType === FACE_NAMES.FALSE_FRONT
      ) {
        effectiveMaterial = context.selectedDrawerFrontMaterial;
      } else {
        // Door, pair_door, panel, etc.
        effectiveMaterial = context.selectedDoorMaterial;
      }

      const result = calculateDoorPartsTime(
        faces,
        styleToUse,
        cabinetStyleId,
        panelModId,
        cabinetTypeId,
        { ...context, effectiveMaterial },
      );

      const faceHours = result.hoursByService;
      const panelModHours = result.panelModHoursByService;

      // Aggregate hours by service ID (multipliers already applied in calculateDoorPartsTime)
      if (faceHours) {
        Object.entries(faceHours).forEach(([teamServiceId, hours]) => {
          const service = context.globalServices?.find(
            (s) => s.team_service_id === parseInt(teamServiceId),
          );
          if (!service) return;

          const serviceId = service.service_id;
          const hoursWithQuantity = roundToHundredth((hours || 0) * quantity);

          // Get panel mod hours for this service to subtract from face category
          const panelModHoursForService =
            panelModHours && panelModHours[teamServiceId]
              ? roundToHundredth(panelModHours[teamServiceId] * quantity)
              : 0;
          const faceOnlyHours = roundToHundredth(
            hoursWithQuantity - panelModHoursForService,
          );

          // Add to aggregate total (includes both face and panel mod)
          if (!totals.hoursByService[serviceId]) {
            totals.hoursByService[serviceId] = 0;
          }
          totals.hoursByService[serviceId] += hoursWithQuantity;

          // Track by face type for category hours (WITHOUT panel mod time)
          // Initialize the faceType object if it doesn't exist (for non-standard face types)
          if (!totals.categoryHours[faceType]) {
            totals.categoryHours[faceType] = {};
          }
          if (!totals.categoryHours[faceType][serviceId]) {
            totals.categoryHours[faceType][serviceId] = 0;
          }
          totals.categoryHours[faceType][serviceId] += faceOnlyHours;
        });
      }

      // Track panel mod hours separately for breakdown (already calculated in calculateDoorPartsTime)
      if (panelModHours && Object.keys(panelModHours).length > 0) {
        Object.entries(panelModHours).forEach(([teamServiceId, hours]) => {
          const service = context.globalServices?.find(
            (s) => s.team_service_id === parseInt(teamServiceId),
          );
          if (!service) return;

          const serviceId = service.service_id;
          const hoursWithQuantity = roundToHundredth((hours || 0) * quantity);

          // Track in panelMods category
          if (!totals.categoryHours.panelMods) {
            totals.categoryHours.panelMods = {};
          }
          if (!totals.categoryHours.panelMods[serviceId]) {
            totals.categoryHours.panelMods[serviceId] = 0;
          }
          totals.categoryHours.panelMods[serviceId] += hoursWithQuantity;
        });
      }
    },
  );

  // Calculate prices by style using bulk functions
  Object.entries(facesByStyle).forEach(([styleToUse, faces]) => {
    if (faces.length === 0) return;

    if (styleToUse === "slab_sheet") {
      // Group faces by their effective material to avoid duplicate calculations
      // Key: material ID, Value: { faces, moldings }
      const facesByMaterial = new Map();

      faces.forEach((face) => {
        const isDrawerType =
          face.faceType === FACE_NAMES.DRAWER_FRONT ||
          face.faceType === FACE_NAMES.FALSE_FRONT;

        const effectiveMaterial = isDrawerType
          ? selectedDrawerFrontMaterial
          : selectedDoorMaterial;

        if (!effectiveMaterial?.material) return;

        const materialKey = effectiveMaterial.material.id;

        if (!facesByMaterial.has(materialKey)) {
          facesByMaterial.set(materialKey, {
            material: effectiveMaterial.material,
            faces: [],
            doorInsideMolding: false,
            doorOutsideMolding: false,
            drawerInsideMolding: false,
            drawerOutsideMolding: false,
          });
        }

        const materialGroup = facesByMaterial.get(materialKey);
        materialGroup.faces.push(face);

        // Accumulate molding flags for this material group
        if (isDrawerType) {
          materialGroup.drawerInsideMolding =
            materialGroup.drawerInsideMolding ||
            section.drawer_inside_molding ||
            false;
          materialGroup.drawerOutsideMolding =
            materialGroup.drawerOutsideMolding ||
            section.drawer_outside_molding ||
            false;
        } else {
          materialGroup.doorInsideMolding =
            materialGroup.doorInsideMolding ||
            section.door_inside_molding ||
            false;
          materialGroup.doorOutsideMolding =
            materialGroup.doorOutsideMolding ||
            section.door_outside_molding ||
            false;
        }
      });

      // Calculate pricing for each material group
      facesByMaterial.forEach(
        ({
          material,
          faces: materialFaces,
          doorInsideMolding,
          doorOutsideMolding,
          drawerInsideMolding,
          drawerOutsideMolding,
        }) => {
          if (materialFaces.length === 0) return;

          const result = calculateSlabSheetFacePriceBulk(
            materialFaces,
            material,
            {
              doorInsideMolding,
              doorOutsideMolding,
              drawerInsideMolding,
              drawerOutsideMolding,
            },
          );

          // Distribute cost proportionally across face types
          const totalArea = materialFaces.reduce(
            (sum, face) => sum + face.area,
            0,
          );
          const areaByFaceType = {};

          materialFaces.forEach((face) => {
            const faceType = face.faceType;
            if (!areaByFaceType[faceType]) {
              areaByFaceType[faceType] = 0;
            }
            areaByFaceType[faceType] += face.area;
          });

          Object.entries(areaByFaceType).forEach(([faceType, area]) => {
            if (!totals.facePrices[faceType]) {
              totals.facePrices[faceType] = 0;
            }
            const proportion = totalArea > 0 ? area / totalArea : 0;
            totals.facePrices[faceType] += result.totalCost * proportion;
          });
        },
      );
    } else if (styleToUse === FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD) {
      // For 5-piece hardwood, calculate individual prices and aggregate by face type
      // Each door has a specific price based on its size and board feet
      const calculate5PieceDoorPrice = (face) => {
        const width = parseFloat(face.width);
        const height = parseFloat(face.height);

        // Use appropriate material based on face type
        let materialToUse;
        if (
          face.faceType === FACE_NAMES.DRAWER_FRONT ||
          face.faceType === FACE_NAMES.FALSE_FRONT
        ) {
          materialToUse =
            selectedDrawerFrontMaterial?.material ||
            selectedFaceMaterial.material;
        } else {
          materialToUse =
            selectedDoorMaterial?.material || selectedFaceMaterial.material;
        }

        const pricePerBoardFoot = materialToUse.bd_ft_price;

        // Use the same pricing logic as the bulk function
        const baseWidth = 23;
        const baseHeight = 31;
        const baseArea = baseWidth * baseHeight;
        const doorArea = width * height;

        const basePrice = 30 * Math.pow(pricePerBoardFoot, 0.65);
        const oversizeRate =
          0.065 * Math.pow(pricePerBoardFoot / 3.05, 0.95) * 1.15;
        const extra =
          doorArea > baseArea ? (doorArea - baseArea) * oversizeRate : 0;
        const setupFee = 10 + pricePerBoardFoot * 1.5;

        const taxRate = 8;
        const deliveryFee = 2;
        const creditCardFee = 3;
        const markup =
          1 + taxRate / 100 + deliveryFee / 100 + creditCardFee / 100;

        const doorPrice = (basePrice + extra + setupFee) * markup;

        // Add molding costs based on faceType
        const faceType = face.faceType;
        let insideMolding = false;
        let outsideMolding = false;

        if (
          faceType === FACE_NAMES.DOOR ||
          faceType === FACE_NAMES.PAIR_DOOR ||
          faceType === FACE_NAMES.PANEL
        ) {
          insideMolding = section.door_inside_molding || false;
          outsideMolding = section.door_outside_molding || false;
        } else if (
          faceType === FACE_NAMES.DRAWER_FRONT ||
          faceType === FACE_NAMES.FALSE_FRONT
        ) {
          insideMolding = section.drawer_inside_molding || false;
          outsideMolding = section.drawer_outside_molding || false;
        }

        const moldingCost = calculateMoldingCost(
          width,
          height,
          insideMolding,
          outsideMolding,
          materialToUse,
        );

        return doorPrice + moldingCost;
      };

      faces.forEach((face) => {
        const faceType = face.faceType;
        if (!totals.facePrices[faceType]) {
          totals.facePrices[faceType] = 0;
        }
        totals.facePrices[faceType] += calculate5PieceDoorPrice(face);
      });
    } else if (styleToUse === "slab_hardwood") {
      // For slab hardwood, calculate individual prices based on board feet
      faces.forEach((face) => {
        const width = parseFloat(face.width);
        const height = parseFloat(face.height);
        const faceType = face.faceType;

        // Use appropriate material based on face type
        let materialToUse;
        if (
          faceType === FACE_NAMES.DRAWER_FRONT ||
          faceType === FACE_NAMES.FALSE_FRONT
        ) {
          materialToUse =
            selectedDrawerFrontMaterial?.material ||
            selectedFaceMaterial.material;
        } else {
          materialToUse =
            selectedDoorMaterial?.material || selectedFaceMaterial.material;
        }

        const thickness = materialToUse.thickness || 0.75;
        const pricePerBoardFoot = materialToUse.bd_ft_price;

        // Calculate board feet: (width * height * thickness) / 144
        const boardFeet = (width * height * thickness) / 144;
        const facePrice = roundToHundredth(boardFeet * pricePerBoardFoot);

        // Add molding costs based on faceType
        let insideMolding = false;
        let outsideMolding = false;

        if (
          faceType === FACE_NAMES.DOOR ||
          faceType === FACE_NAMES.PAIR_DOOR ||
          faceType === FACE_NAMES.PANEL
        ) {
          insideMolding = section.door_inside_molding || false;
          outsideMolding = section.door_outside_molding || false;
        } else if (
          faceType === FACE_NAMES.DRAWER_FRONT ||
          faceType === FACE_NAMES.FALSE_FRONT
        ) {
          insideMolding = section.drawer_inside_molding || false;
          outsideMolding = section.drawer_outside_molding || false;
        }

        const moldingCost = calculateMoldingCost(
          width,
          height,
          insideMolding,
          outsideMolding,
          materialToUse,
        );

        if (!totals.facePrices[faceType]) {
          totals.facePrices[faceType] = 0;
        }
        totals.facePrices[faceType] += facePrice + moldingCost;
      });
    }
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

    const quantity = cabinet.quantity != null ? Number(cabinet.quantity) : 1;

    // Determine if section is face frame style
    const sectionStyle = cabinet.cabinet_style_override
      ? context.cabinetStyles?.find(
          (style) => style.cabinet_style_id === cabinet.cabinet_style_override,
        )
      : context.cabinetStyles?.find(
          (style) => style.cabinet_style_id === section.cabinet_style_id,
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
    (mat) => mat.id === section.drawer_box_mat,
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

// TODO: add interpolation rates for face frame finish tape time
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

/**
 * Calculate face frame finish tape time using interpolation
 * @param {Object} params - Tape calculation parameters
 * @param {number} params.beadLengthIn - Total bead length in inches
 * @param {number} params.openingsCount - Number of openings
 * @param {number} params.overheadPerOpeningMin - Base time per opening in minutes
 * @param {number} params.perInchRate - Rate per inch (calculated if null)
 * @param {number} params.minMinutes - Minimum total minutes
 * @returns {number} Total tape time in minutes
 */
const calculateFaceFramePrices = (section, context) => {
  const totals = {
    hoursByService: {}, // 2=shop, 3=finish
    woodTotal: 0,
    boardFeet: 0,
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) return totals;

  const { selectedFaceMaterial, partsListAnchors, globalServices } = context;
  if (!selectedFaceMaterial) return totals;

  let totalTapeHours = 0;

  const faceFrameAnchors = partsListAnchors?.[20];

  section.cabinets.forEach((cabinet) => {
    // 13 is euro cabinets (no face frame)
    // 16 is a face frame part
    if (cabinet.cabinet_style_override === 13 && cabinet.type !== 16) return;
    if (
      !cabinet.cabinet_style_override &&
      section.cabinet_style_id === 13 &&
      cabinet.type !== 16
    )
      return;

    const quantity = cabinet.quantity != null ? Number(cabinet.quantity) : 1;
    const { frameParts, openingsCount } = cabinet.face_config?.boxSummary || {};

    const cabType = context.cabinetTypes?.find(
      (ct) => ct.cabinet_type_id === cabinet.type,
    );

    if (cabType.item_type === ITEM_TYPES.CABINET.type) {
      const tapeTime = tapeTimeMinutes({
        beadLengthIn: frameParts?.beadLength || 0,
        openingsCount: openingsCount || 1,
        overheadPerOpeningMin: 2,
        perInchRate: null,
        minMinutes: 8,
      });

      const tapeTimeHours = (tapeTime / 60) * quantity;
      totalTapeHours += tapeTimeHours; // 👈 accumulate separately
    }

    if (!frameParts?.framePieces) return;

    const cabinetStyleId =
      cabinet.cabinet_style_override || section.cabinet_style_id;

    frameParts.framePieces.forEach((piece) => {
      const length = piece.length || 0;
      const width = piece.width || 0;

      if (selectedFaceMaterial?.material?.bd_ft_price) {
        const boardFeet =
          (length * width * selectedFaceMaterial.material.thickness) / 144;
        const boardFeetWithWaste = boardFeet * 1.25;
        totals.boardFeet += boardFeetWithWaste * quantity;
        totals.woodTotal +=
          boardFeetWithWaste *
          selectedFaceMaterial.material.bd_ft_price *
          quantity;
      }

      if (faceFrameAnchors && faceFrameAnchors.length > 0) {
        const area = length * width;

        globalServices?.forEach((service) => {
          const teamServiceId = service.team_service_id;
          const serviceId = service.service_id;

          const minutesEach = interpolateTimeByArea(
            faceFrameAnchors,
            area,
            teamServiceId,
            cabinetStyleId,
          );

          let totalMinutes = minutesEach * quantity;

          if (serviceId === 2 && selectedFaceMaterial.material?.needs_finish) {
            totalMinutes *= selectedFaceMaterial.shopMultiplier || 1;
          }

          if (serviceId === 3 && selectedFaceMaterial.material?.needs_finish) {
            totalMinutes *= selectedFaceMaterial.finishMultiplier || 1;
          }

          const hours = totalMinutes / 60;

          if (!totals.hoursByService[serviceId]) {
            totals.hoursByService[serviceId] = 0;
          }
          totals.hoursByService[serviceId] += hours;
        });
      }
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

  const { selectedFaceMaterial, estimate, team } = context;
  if (!selectedFaceMaterial) return totals;

  // Resolve effective values using three-tier fallback
  const effectiveValues = getEffectiveDefaults(section, estimate, team);

  if (effectiveValues.door_style === FACE_STYLE_VALUES.SLAB_SHEET)
    return totals;

  const fillers = section.cabinets.filter((cabinet) => {
    // Only include filler parts (type 5)
    return cabinet.type === 5;
  });

  if (fillers.length === 0) return totals;

  const { material } = selectedFaceMaterial;

  fillers.forEach((filler) => {
    const { width, height, depth, quantity = 1 } = filler;

    const faceArea = width * height;
    const returnArea = depth * height;
    const wasteFactor = 1.25;

    if (material?.bd_ft_price) {
      const boardFeet = ((faceArea + returnArea) * material.thickness) / 144;
      const boardFeetWithWaste = boardFeet * wasteFactor;
      totals.boardFeet += boardFeetWithWaste * quantity;
      totals.woodTotal += boardFeetWithWaste * material.bd_ft_price * quantity;
    } else {
      const totalArea = (faceArea + returnArea) * wasteFactor;
      const sheetArea = totalArea / material.area;
      totals.woodTotal += sheetArea * material.sheet_price * quantity;
    }
  });

  return totals;
};

const calculateEndPanelNosingMaterials = (section, context) => {
  const totals = {
    woodTotal: 0,
    boardFeet: 0,
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  const { selectedFaceMaterial, estimate, team } = context;
  if (!selectedFaceMaterial) return totals;

  // Resolve effective values using three-tier fallback
  const effectiveValues = getEffectiveDefaults(section, estimate, team);

  if (effectiveValues.door_style === FACE_STYLE_VALUES.SLAB_SHEET)
    return totals;

  const itemsWithNosing = section.cabinets.filter((cabinet) => {
    // Include end panels (type 10) and face frames (type 16) with nosing parts
    return (
      (cabinet.type === 10 || cabinet.type === 16) &&
      cabinet.face_config?.boxSummary?.boxPartsList?.length > 0
    );
  });

  if (itemsWithNosing.length === 0) return totals;

  const { material } = selectedFaceMaterial;

  itemsWithNosing.forEach((item) => {
    const { quantity = 1 } = item;
    const boxPartsList = item.face_config.boxSummary.boxPartsList;
    const nosingParts = boxPartsList.filter(
      (part) => part.type === PART_NAMES.NOSING,
    );

    if (nosingParts.length === 0) return;

    // Calculate total area of all nosing pieces
    const totalArea = nosingParts.reduce((sum, part) => sum + part.area, 0);
    const wasteFactor = 1.25;

    if (material?.bd_ft_price) {
      const boardFeet = (totalArea * material.thickness) / 144;
      const boardFeetWithWaste = boardFeet * wasteFactor;
      totals.boardFeet += boardFeetWithWaste * quantity;
      totals.woodTotal += boardFeetWithWaste * material.bd_ft_price * quantity;
    } else {
      const totalAreaWithWaste = totalArea * wasteFactor;
      const sheetArea = totalAreaWithWaste / material.area;
      totals.woodTotal += sheetArea * material.sheet_price * quantity;
    }
  });

  return totals;
};

// Count and price hardware from cabinet boxHardware
const countHardware = (section, faceTotals, context) => {
  let totalHinges = 0;
  let totalDoorPulls = 0;
  let totalDrawerPulls = 0;
  let totalAppliancePulls = 0;
  let totalSlides = 0;

  // Sum up hardware from all cabinets
  section.cabinets?.forEach((cabinet) => {
    if (cabinet.face_config?.boxSummary?.boxHardware) {
      const qty = cabinet.quantity != null ? Number(cabinet.quantity) : 1;
      const {
        totalHinges: hinges,
        totalDoorPulls: doorPulls,
        totalDrawerPulls: drawerPulls,
        totalAppliancePulls: appliancePulls,
        totalSlides: slides,
      } = cabinet.face_config.boxSummary.boxHardware;
      totalHinges += (hinges || 0) * qty;
      totalDoorPulls += (doorPulls || 0) * qty;
      totalDrawerPulls += (drawerPulls || 0) * qty;
      totalAppliancePulls += (appliancePulls || 0) * qty;
      totalSlides += (slides || 0) * qty;
    }
  });

  // Get hardware items from section
  const doorHinge = context.hardware?.hinges?.find(
    (h) => h.id === section.hinge_id,
  );
  const doorPull = context.hardware?.pulls?.find(
    (p) => p.id === section.door_pull_id,
  );
  const drawerPull = context.hardware?.pulls?.find(
    (p) => p.id === section.drawer_pull_id,
  );
  const drawerSlide = context.hardware?.slides?.find(
    (s) => s.id === section.slide_id,
  );

  // Calculate price totals
  const hingesTotal = totalHinges * (doorHinge?.price || 0);
  const slidesTotal = totalSlides * (drawerSlide?.price || 0);

  const doorPullsPrice = totalDoorPulls * (doorPull?.price || 0);
  const appliancePullsPrice = totalAppliancePulls * (doorPull?.price || 0);
  const drawerPullsPrice = totalDrawerPulls * (drawerPull?.price || 0);
  const pullsTotalPrice =
    doorPullsPrice + appliancePullsPrice + drawerPullsPrice;

  // Calculate service hours for hardware
  const hoursByService = {};

  // Process hinges services
  if (doorHinge && totalHinges > 0) {
    (doorHinge.services || []).forEach((service) => {
      if (service.time_per_unit > 0) {
        const serviceId = service.service_id;
        if (!hoursByService[serviceId]) {
          hoursByService[serviceId] = 0;
        }
        // time_per_unit is in minutes, convert to hours
        const hoursPerUnit = service.time_per_unit / 60;
        hoursByService[serviceId] += hoursPerUnit * totalHinges;
      }
    });
  }

  // Process door pulls services
  if (doorPull && (totalDoorPulls > 0 || totalAppliancePulls > 0)) {
    const totalDoorAndAppliancePulls = totalDoorPulls + totalAppliancePulls;
    (doorPull.services || []).forEach((service) => {
      if (service.time_per_unit > 0) {
        const serviceId = service.service_id;
        if (!hoursByService[serviceId]) {
          hoursByService[serviceId] = 0;
        }
        // time_per_unit is in minutes, convert to hours
        const hoursPerUnit = service.time_per_unit / 60;
        hoursByService[serviceId] += hoursPerUnit * totalDoorAndAppliancePulls;
      }
    });
  }

  // Process drawer pulls services
  if (drawerPull && totalDrawerPulls > 0) {
    (drawerPull.services || []).forEach((service) => {
      if (service.time_per_unit > 0) {
        const serviceId = service.service_id;
        if (!hoursByService[serviceId]) {
          hoursByService[serviceId] = 0;
        }
        // time_per_unit is in minutes, convert to hours
        const hoursPerUnit = service.time_per_unit / 60;
        hoursByService[serviceId] += hoursPerUnit * totalDrawerPulls;
      }
    });
  }

  // Process slides services
  if (drawerSlide && totalSlides > 0) {
    (drawerSlide.services || []).forEach((service) => {
      if (service.time_per_unit > 0) {
        const serviceId = service.service_id;
        if (!hoursByService[serviceId]) {
          hoursByService[serviceId] = 0;
        }
        // time_per_unit is in minutes, convert to hours
        const hoursPerUnit = service.time_per_unit / 60;
        hoursByService[serviceId] += hoursPerUnit * totalSlides;
      }
    });
  }

  // Separate hours by hardware type for detailed breakdown
  const hingesHours = {};
  const slidesHours = {};
  const pullsHours = {};

  // Process hinges services
  if (doorHinge && totalHinges > 0) {
    (doorHinge.services || []).forEach((service) => {
      if (service.time_per_unit > 0) {
        const serviceId = service.service_id;
        const hoursPerUnit = service.time_per_unit / 60;
        hingesHours[serviceId] = roundToHundredth(hoursPerUnit * totalHinges);
      }
    });
  }

  // Process door pulls services
  if (doorPull && (totalDoorPulls > 0 || totalAppliancePulls > 0)) {
    const totalDoorAndAppliancePulls = totalDoorPulls + totalAppliancePulls;
    (doorPull.services || []).forEach((service) => {
      if (service.time_per_unit > 0) {
        const serviceId = service.service_id;
        const hoursPerUnit = service.time_per_unit / 60;
        if (!pullsHours[serviceId]) pullsHours[serviceId] = 0;
        pullsHours[serviceId] += roundToHundredth(
          hoursPerUnit * totalDoorAndAppliancePulls,
        );
      }
    });
  }

  // Process drawer pulls services
  if (drawerPull && totalDrawerPulls > 0) {
    (drawerPull.services || []).forEach((service) => {
      if (service.time_per_unit > 0) {
        const serviceId = service.service_id;
        const hoursPerUnit = service.time_per_unit / 60;
        if (!pullsHours[serviceId]) pullsHours[serviceId] = 0;
        pullsHours[serviceId] += roundToHundredth(
          hoursPerUnit * totalDrawerPulls,
        );
      }
    });
  }

  // Process slides services
  if (drawerSlide && totalSlides > 0) {
    (drawerSlide.services || []).forEach((service) => {
      if (service.time_per_unit > 0) {
        const serviceId = service.service_id;
        const hoursPerUnit = service.time_per_unit / 60;
        slidesHours[serviceId] = roundToHundredth(hoursPerUnit * totalSlides);
      }
    });
  }

  return {
    hingesCount: totalHinges,
    hingesTotal,
    pullsCount: totalDoorPulls + totalDrawerPulls + totalAppliancePulls,
    pullsTotal: pullsTotalPrice,
    slidesCount: totalSlides,
    slidesTotal,
    hoursByService,
    categoryHours: {
      hinges: hingesHours,
      slides: slidesHours,
      pulls: pullsHours,
    },
  };
};

const calculateCabinetTotals = (section, context) => {
  const cabinetCost = calculateBoxSheetsCNC(section, context, {
    cutPricePerFoot: 1.5,
    drillCostPerHingeBore: 0.85,
    drillCostPerSlide: 1.25,
    drillCostPerShelfHole: 0.08,
    edgeBandPricePerFoot: 0.2,
    taxRate: 0.1,
    setupCostPerSheet: 15,
    kerfWidth: 0.25, // Saw blade kerf width in inches
  });

  // Calculate box parts time,
  const boxHours = calculateBoxPartsTime(section, context);

  // Calculate face totals (counts, prices, and hours)
  const faceTotals = calculateFaceTotals(section, context);

  // Calculate hardware counts and totals
  const hardwareTotals = countHardware(section, faceTotals, context);

  // Calculate drawer box and rollout totals
  const drawerRolloutTotals = calculateDrawerAndRolloutTotals(section, context);

  const fillerMaterials = calculateFillerMaterials(section, context);

  const endPanelNosingMaterials = calculateEndPanelNosingMaterials(
    section,
    context,
  );

  const faceFramePrices = calculateFaceFramePrices(section, context);

  // Count total boxes
  const { boxCount, fillerCount } = section.cabinets?.reduce(
    (count, cabinet) => {
      // cabinet boxes
      if (CABINET_TYPES.includes(cabinet.type))
        return {
          boxCount:
            count.boxCount +
            (cabinet.quantity != null ? Number(cabinet.quantity) : 1),
          fillerCount: count.fillerCount,
        };
      // Fillers
      if (cabinet.type === 5)
        return {
          boxCount: count.boxCount,
          fillerCount:
            count.fillerCount +
            (cabinet.quantity != null ? Number(cabinet.quantity) : 1),
        };
      return count;
    },
    { boxCount: 0, fillerCount: 0 },
  ) || { boxCount: 0, fillerCount: 0 };

  // Calculate total face price
  // const facePrice = Object.values(faceTotals.facePrices).reduce(
  //   (sum, price) => sum + price,
  //   0
  // );

  // Initialize all services from globalServices with 0 hours
  // This ensures all services show up in the UI, even if they have 0 hours
  const mergedHoursByService = {};
  if (context.globalServices && Array.isArray(context.globalServices)) {
    context.globalServices.forEach((service) => {
      if (service.service_id && service.is_active) {
        mergedHoursByService[service.service_id] = 0;
      }
    });
  }

  // Merge hoursByService from all sources
  [boxHours, faceTotals, faceFramePrices, hardwareTotals].forEach((source) => {
    if (source?.hoursByService) {
      Object.entries(source.hoursByService).forEach(([serviceType, hours]) => {
        // Only include hours for active services
        const service = context.globalServices?.find(
          (s) => s.service_id === parseInt(serviceType),
        );
        if (!service || !service.is_active) return;

        if (!mergedHoursByService[serviceType]) {
          mergedHoursByService[serviceType] = 0;
        }
        mergedHoursByService[serviceType] += hours || 0;
      });
    }
  });

  // Combine all totals
  const totals = {
    // price:
    //   cabinetCost.totalCost +
    //   facePrice +
    //   faceTotals.glassPrice +
    //   faceFramePrices.totalCost,
    boxPrice: cabinetCost.totalCost,
    boxCount: boxCount,
    hoursByService: mergedHoursByService,
    faceCounts: faceTotals.faceCounts,
    facePrices: faceTotals.facePrices,
    hoodCount: faceTotals.hoodCount || 0,
    drawerBoxTotal: drawerRolloutTotals.drawerBoxTotal,
    drawerBoxCount: drawerRolloutTotals.drawerBoxCount,
    rollOutCount: drawerRolloutTotals.rollOutCount,
    rollOutTotal: drawerRolloutTotals.rollOutTotal,
    hingesCount: hardwareTotals.hingesCount,
    hingesTotal: hardwareTotals.hingesTotal,
    pullsCount: hardwareTotals.pullsCount,
    pullsTotal: hardwareTotals.pullsTotal,
    slidesCount: hardwareTotals.slidesCount,
    slidesTotal: hardwareTotals.slidesTotal,
    woodTotal:
      faceFramePrices.woodTotal +
      fillerMaterials.woodTotal +
      endPanelNosingMaterials.woodTotal,
    woodCount:
      faceFramePrices.boardFeet +
      fillerMaterials.boardFeet +
      endPanelNosingMaterials.boardFeet,
    fillerCount: fillerCount,
    glassCount: faceTotals.glassCount,
    glassTotal: faceTotals.glassTotal,
    // Face frame component breakdown (for detailed breakdown view only)
    faceFramePrices: {
      woodTotal: faceFramePrices.woodTotal,
      boardFeet: faceFramePrices.boardFeet,
    },
    fillerMaterials: {
      woodTotal: fillerMaterials.woodTotal,
      boardFeet: fillerMaterials.boardFeet,
    },
    endPanelNosingMaterials: {
      woodTotal: endPanelNosingMaterials.woodTotal,
      boardFeet: endPanelNosingMaterials.boardFeet,
    },
    // Per-category hours for breakdown display
    categoryHours: {
      boxes: boxHours?.categoryHours?.boxes || {},
      faces: faceTotals.hoursByService || {},
      // Individual face types
      door: faceTotals.categoryHours?.door || {},
      pair_door: faceTotals.categoryHours?.pair_door || {},
      drawer_front: faceTotals.categoryHours?.drawer_front || {},
      false_front: faceTotals.categoryHours?.false_front || {},
      panel: faceTotals.categoryHours?.panel || {},
      // Special cabinet types
      endPanel: faceTotals.categoryHours?.endPanel || {},
      appliancePanel: faceTotals.categoryHours?.appliancePanel || {},
      hood: faceTotals.categoryHours?.hood || {},
      // Hardware
      hardware: hardwareTotals.hoursByService || {},
      hinges: hardwareTotals.categoryHours?.hinges || {},
      slides: hardwareTotals.categoryHours?.slides || {},
      pulls: hardwareTotals.categoryHours?.pulls || {},
      // Wood/face frame
      wood: faceFramePrices.hoursByService || {},
      faceFrame: faceFramePrices.hoursByService || {},
      fillers: boxHours?.categoryHours?.fillers || {},
      nosing: boxHours?.categoryHours?.nosing || {},
      panelMods: faceTotals.categoryHours?.panelMods || {},
    },
  };

  return totals;
};

const calculateSimpleItemsTotal = (items, context) => {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    if (!item) return total;
    const quantity = item.quantity !== null ? Number(item.quantity) : 1;
    const price = Number(item.price) || 0;
    return total + price * quantity;
  }, 0);
};

/**
 * Calculate length item totals with material costs and labor hours
 * @param {Array} items - Array of length items from the section
 * @param {Object} context - Calculation context with lengths catalog and materials
 * @returns {Object} { materialTotal, hoursByService: { serviceId: hours } }
 */
const calculateLengthTotals = (items, context) => {
  const totals = {
    materialTotal: 0,
    hoursByService: {}, // Keyed by service ID: 2=shop, 3=finish, 4=install
  };

  const { lengthsCatalog, selectedFaceMaterial } = context;

  if (!lengthsCatalog || !selectedFaceMaterial) return totals;
  if (!items || !Array.isArray(items)) return totals;

  items.forEach((item) => {
    const lengthItem = lengthsCatalog.find(
      (l) => l.id === item.length_catalog_id,
    );
    if (!lengthItem) return;

    const quantity = item.quantity != null ? Number(item.quantity) : 1;
    const lengthFeet = Number(item.length) || 0; // User inputs feet
    const lengthInches = lengthFeet * 12; // Convert to inches for calculations
    const miterCount = Number(item.miter_count) || 0;
    const cutoutCount = Number(item.cutout_count) || 0;

    // Calculate material cost based on length
    // Use bd_ft_price if available, otherwise use fraction of sheet_price
    const material = selectedFaceMaterial.material;
    const width = lengthItem.width || 1; // Width in inches
    const thickness = material.thickness || 0.75; // Thickness in inches

    if (material.bd_ft_price) {
      // Board feet calculation: (length * width * thickness) / 144
      const boardFeet = (lengthInches * width * thickness) / 144;
      const boardFeetWithWaste = boardFeet * 1.1; // 10% waste for linear items
      totals.materialTotal +=
        boardFeetWithWaste * material.bd_ft_price * quantity;
    } else if (material.sheet_price && material.area) {
      // Sheet goods: calculate area as fraction of sheet
      const area = (lengthInches * width) / 144; // Square feet
      const areaWithWaste = area * 1.1; // 10% waste
      const pricePerSqFt = material.sheet_price / material.area;
      totals.materialTotal += areaWithWaste * pricePerSqFt * quantity;
    }

    // Calculate labor hours from length_services
    if (lengthItem.services && Array.isArray(lengthItem.services)) {
      lengthItem.services.forEach((service) => {
        const serviceId = service.service_id;
        if (!serviceId) return;

        // Base time per unit (per linear foot)
        const timePerUnit = Number(service.time_per_unit) || 0;

        // Calculate base hours for the length
        let hours = 0;

        if (!service.is_miter_time && !service.is_cutout_time) {
          hours = (timePerUnit / 60) * lengthFeet * quantity;
        }

        // Add additional time for miters if this is miter time
        if (service.is_miter_time && miterCount > 0) {
          hours += (timePerUnit / 60) * miterCount * quantity;
        }

        // Add additional time for cutouts if this is cutout time
        if (service.is_cutout_time && cutoutCount > 0) {
          hours += (timePerUnit / 60) * cutoutCount * quantity;
        }

        // Add to totals
        if (!totals.hoursByService[serviceId]) {
          totals.hoursByService[serviceId] = 0;
        }
        totals.hoursByService[serviceId] += hours;
      });
    }
  });

  return totals;
};

const calculateAccessoriesTotal = (items, context, section) => {
  const totals = {
    glass: { count: 0, total: 0 },
    insert: { count: 0, total: 0 },
    hardware: { count: 0, total: 0 },
    shop_built: { count: 0, total: 0 },
    organizer: { count: 0, total: 0 },
    other: { count: 0, total: 0 },
    hoursByService: {},
  };
  const { accessories, selectedFaceMaterial, globalServices } = context;

  if (!accessories) return totals;

  // Collect all accessories from section.accessories items AND face configs
  const allAccessories = [];

  // Add section accessories
  if (items && Array.isArray(items)) {
    allAccessories.push(...items);
  }

  // Add accessories from cabinet face configs by traversing the tree
  if (section?.cabinets && Array.isArray(section.cabinets)) {
    section.cabinets.forEach((cabinet) => {
      const quantity = cabinet.quantity != null ? Number(cabinet.quantity) : 1;
      const faceConfig = cabinet.face_config;

      if (!faceConfig) return;

      // Recursively collect accessories from all face nodes
      const collectAccessories = (node) => {
        if (!node) return;

        // Collect accessories from this node
        if (node.accessories && Array.isArray(node.accessories)) {
          node.accessories.forEach((accessory) => {
            allAccessories.push({
              accessory_catalog_id: +accessory.accessory_id,
              quantity: accessory.quantity * quantity, // Multiply by cabinet quantity
              width: node.width,
              height: node.height,
              depth: accessory.depth,
            });
          });
        }

        // Recurse through children
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child) => collectAccessories(child));
        }
      };

      collectAccessories(faceConfig);
    });
  }

  allAccessories.forEach((item) => {
    const accessory = accessories.catalog.find(
      (acc) => acc.id === item.accessory_catalog_id,
    );
    if (!accessory) return;

    const quantity = item.quantity !== undefined ? item.quantity : 1;
    let price = 0;
    let unit = 0;

    // Calculate dimensions for the accessory
    const itemDimensions = {
      width: item.width,
      height: item.height,
      depth: item.depth,
    };

    // Store unitDifference in local variable (don't mutate Redux state)
    let itemUnitDifference = 0;

    // Handle shop-built accessories with material matching
    if (
      accessory.matches_room_material &&
      accessory.type === ACCESSORY_TYPES.SHOP_BUILT
    ) {
      // Use helper to calculate unit quantity based on size
      const { unit: calculatedUnit } = calculateAccessoryUnitAndPrice(
        accessory,
        itemDimensions,
      );
      unit = calculatedUnit;

      // Calculate price including material cost
      if (selectedFaceMaterial) {
        // Material cost calculated using face material
        const material = selectedFaceMaterial.material;
        const wasteFactor = accessory.material_waste_factor || 1.25;
        const dimensions = {
          width: itemDimensions.width || accessory.width || 0,
          height: itemDimensions.height || accessory.height || 0,
          depth: itemDimensions.depth || accessory.depth || 0,
        };
        const volume = dimensions.width * dimensions.height * dimensions.depth;

        if (volume > 0) {
          if (material?.bd_ft_price) {
            // Hardwood calculation
            const boardFeet = volume / 144;
            const boardFeetWithWaste = boardFeet * wasteFactor;
            price = boardFeetWithWaste * material.bd_ft_price;
          } else if (material?.sheet_price && material?.area) {
            // Sheet goods calculation
            const volumeWithWaste = volume * wasteFactor;
            const materialThickness = material.thickness || 0.75;
            const sheetVolume =
              material.width * material.height * materialThickness;

            if (sheetVolume > 0) {
              const sheetsNeeded = volumeWithWaste / sheetVolume;
              price = sheetsNeeded * material.sheet_price;
            }
          }
        }

        // Add proportional base price if specified
        if (accessory.default_price_per_unit) {
          const { basePrice, unitDifference } = calculateAccessoryUnitAndPrice(
            accessory,
            itemDimensions,
          );
          price += basePrice;
          itemUnitDifference = unitDifference;
        }
      } else {
        // Fallback to proportional default price if no material selected
        const { basePrice, unitDifference } = calculateAccessoryUnitAndPrice(
          accessory,
          itemDimensions,
        );
        price = basePrice;
        itemUnitDifference = unitDifference;
      }
    } else {
      // Standard accessory pricing logic - use helper for all types
      const {
        unit: calculatedUnit,
        basePrice,
        unitDifference,
      } = calculateAccessoryUnitAndPrice(accessory, itemDimensions);
      unit = calculatedUnit;
      price = basePrice;
      itemUnitDifference = unitDifference;
    }

    // Accumulate totals by type
    const accessoryType = accessory.type;
    if (totals[accessoryType]) {
      totals[accessoryType].count += quantity;
      totals[accessoryType].total += price * quantity;
    }

    // Calculate labor hours from time anchors if available
    if (accessories.timeAnchors && accessories.timeAnchors.length > 0) {
      const accessoryAnchors = accessories.timeAnchors.filter(
        (anchor) => anchor.accessories_catalog_id === accessory.id,
      );

      accessoryAnchors.forEach((anchor) => {
        // Use unitDifference to adjust labor time for oversized items
        // Base time is for catalog size, add extra time proportional to size difference
        const laborMultiplier = 1 + Math.max(0, itemUnitDifference); // Only add time for larger items, not reduce for smaller
        let totalMinutes = anchor.minutes_per_unit * quantity * laborMultiplier;

        // Apply multipliers for shop-built items that match room material
        if (
          accessory.matches_room_material &&
          accessory.type === ACCESSORY_TYPES.SHOP_BUILT &&
          selectedFaceMaterial &&
          globalServices
        ) {
          const service = globalServices.find(
            (s) => s.team_service_id === anchor.team_service_id,
          );

          if (service && selectedFaceMaterial.material?.needs_finish) {
            // Apply shop multiplier for service ID 2
            if (
              service.service_id === 2 &&
              selectedFaceMaterial.shopMultiplier
            ) {
              totalMinutes *= selectedFaceMaterial.shopMultiplier;
            }
            // Apply finish multiplier for service ID 3
            if (
              service.service_id === 3 &&
              selectedFaceMaterial.finishMultiplier
            ) {
              totalMinutes *= selectedFaceMaterial.finishMultiplier;
            }
          }
        }

        const hours = totalMinutes / 60;
        const service = globalServices?.find(
          (s) => s.team_service_id === anchor.team_service_id,
        );

        if (service) {
          if (!totals.hoursByService[service.service_id]) {
            totals.hoursByService[service.service_id] = 0;
          }
          totals.hoursByService[service.service_id] += hours;
        }
      });
    }
  });

  return totals;
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
      glassCount: 0,
      glassTotal: 0,
      quantity: 0,
      profit: 0,
      commission: 0,
      discount: 0,
    };
  }

  const cabinetTotals = calculateCabinetTotals(section, context);

  const lengthTotals = calculateLengthTotals(section.lengths, context);
  const accessoriesTotal = calculateAccessoriesTotal(
    section.accessories,
    context,
    section,
  );
  const otherTotal = calculateSimpleItemsTotal(section.other, context);

  // Get parts_included toggles (default all to true)
  const partsIncluded = section.parts_included || {};

  // Helper function to check if a part should be included
  const isPartIncluded = (partKey) => partsIncluded[partKey] !== false;

  // Calculate individual face prices that can be toggled
  const doorPrice = isPartIncluded("facePrices.door")
    ? cabinetTotals.facePrices?.door || 0
    : 0;
  const drawerFrontPrice = isPartIncluded("facePrices.drawer_front")
    ? cabinetTotals.facePrices?.drawer_front || 0
    : 0;
  const falseFrontPrice = isPartIncluded("facePrices.false_front")
    ? cabinetTotals.facePrices?.false_front || 0
    : 0;
  const panelPrice = isPartIncluded("facePrices.panel")
    ? cabinetTotals.facePrices?.panel || 0
    : 0;

  // Calculate other face prices (not individually toggled)
  const otherFacePrice = Object.entries(cabinetTotals.facePrices || {}).reduce(
    (sum, [faceType, price]) => {
      if (
        !["door", "drawer_front", "false_front", "panel"].includes(faceType)
      ) {
        return sum + price;
      }
      return sum;
    },
    0,
  );

  const totalFacePriceWithToggles =
    doorPrice +
    drawerFrontPrice +
    falseFrontPrice +
    panelPrice +
    otherFacePrice;

  // Calculate parts total price with toggles
  const partsTotalPrice =
    totalFacePriceWithToggles +
    (isPartIncluded("boxTotal") ? cabinetTotals.boxPrice : 0) +
    (isPartIncluded("drawerBoxTotal") ? cabinetTotals.drawerBoxTotal : 0) +
    (isPartIncluded("rollOutTotal") ? cabinetTotals.rollOutTotal : 0) +
    (isPartIncluded("hingesTotal") ? cabinetTotals.hingesTotal : 0) +
    (isPartIncluded("pullsTotal") ? cabinetTotals.pullsTotal : 0) +
    (isPartIncluded("slidesTotal") ? cabinetTotals.slidesTotal : 0) +
    (isPartIncluded("woodTotal") ? cabinetTotals.woodTotal : 0) +
    lengthTotals.materialTotal +
    otherTotal +
    // Include all accessories (glass from accessories + glass from faces + other accessory types)
    (isPartIncluded("accessoriesTotal")
      ? accessoriesTotal.glass.total +
        (cabinetTotals.glassTotal || 0) + // Glass from faces
        accessoriesTotal.insert.total +
        accessoriesTotal.hardware.total +
        accessoriesTotal.shop_built.total +
        accessoriesTotal.organizer.total +
        accessoriesTotal.other.total
      : 0);

  // Merge hoursByService from cabinets, lengths, and accessories
  const finalHoursByService = { ...cabinetTotals.hoursByService };

  // Add length hours to the final totals
  Object.entries(lengthTotals.hoursByService || {}).forEach(
    ([serviceId, hours]) => {
      if (!finalHoursByService[serviceId]) {
        finalHoursByService[serviceId] = 0;
      }
      finalHoursByService[serviceId] += hours;
    },
  );

  // Add accessory hours to the final totals
  Object.entries(accessoriesTotal.hoursByService || {}).forEach(
    ([serviceId, hours]) => {
      if (!finalHoursByService[serviceId]) {
        finalHoursByService[serviceId] = 0;
      }
      finalHoursByService[serviceId] += hours;
    },
  );

  // Add manually entered hours from add_hours field
  if (section.add_hours && typeof section.add_hours === "object") {
    Object.entries(section.add_hours).forEach(([serviceId, hours]) => {
      // Skip setup_hours as it's handled separately below
      if (serviceId === "setup_hours") return;

      const numericServiceId = parseInt(serviceId);
      const numericHours = parseFloat(hours) || 0;

      if (numericHours > 0) {
        if (!finalHoursByService[numericServiceId]) {
          finalHoursByService[numericServiceId] = 0;
        }
        finalHoursByService[numericServiceId] += numericHours;
      }
    });

    // Add setup_hours to Install service (service_id 4)
    const setupHours = parseFloat(section.add_hours.setup_hours) || 0;
    if (setupHours > 0) {
      if (!finalHoursByService[4]) {
        finalHoursByService[4] = 0;
      }
      finalHoursByService[4] += setupHours;
    }
  }

  // Calculate labor costs by service ID
  const getLaborCosts = () => {
    const hoursByService = finalHoursByService || {};
    let totalLaborCost = 0;
    const costsByService = {};

    // Get services_included toggles
    const servicesIncluded = section.services_included || {};

    Object.entries(hoursByService).forEach(([serviceId, hours]) => {
      const service = context.globalServices.find(
        (s) => s.service_id === parseInt(serviceId),
      );
      const roundedHours = roundToHundredth(hours);
      if (service) {
        // Use three-tier fallback for service rate: section -> estimate -> team (service default)
        const rate =
          getEffectiveValueOnly(
            section.service_price_overrides?.[serviceId],
            context.estimate?.default_service_price_overrides?.[serviceId],
            service.hourly_rate,
          ) || 0;
        const cost = roundToHundredth(roundedHours * rate);

        costsByService[serviceId] = {
          hours: roundedHours,
          rate: rate,
          cost,
          name: service.service_name,
          isIncluded: servicesIncluded[serviceId] !== false, // Default to true
        };

        // Only add to total if service is included
        if (servicesIncluded[serviceId] !== false) {
          totalLaborCost += cost;
        }
      }
    });

    return {
      costsByService,
      totalLaborCost,
    };
  };

  const laborCosts = getLaborCosts();

  const subTotalPrice = partsTotalPrice + laborCosts.totalLaborCost;

  const sectionProfit = subTotalPrice * (section.profit / 100);
  const sectionCommission = subTotalPrice * (section.commission / 100);
  const sectionDiscount = subTotalPrice * (section.discount / 100);

  const roundPriceUpTo5 =
    Math.ceil(
      (sectionProfit + sectionCommission + subTotalPrice - sectionDiscount) / 5,
    ) * 5;

  const totalPrice =
    roundPriceUpTo5 * (section.quantity != null ? section.quantity : 1);

  // Calculate total accessories count and price (including glass from faces)
  const accessoriesCount =
    Object.values(accessoriesTotal)
      .filter((item) => typeof item === "object" && item.count !== undefined)
      .reduce((sum, item) => sum + item.count, 0) +
    (cabinetTotals.glassCount || 0);

  const accessoriesTotalPrice =
    Object.values(accessoriesTotal)
      .filter((item) => typeof item === "object" && item.total !== undefined)
      .reduce((sum, item) => sum + item.total, 0) +
    (cabinetTotals.glassTotal || 0);

  // Calculate other items count
  const otherCount = (section.other || []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0);
  }, 0);

  return {
    totalPrice,
    subTotalPrice,
    partsTotalPrice,
    faceCounts: cabinetTotals.faceCounts,
    facePrices: cabinetTotals.facePrices,
    boxTotal: cabinetTotals.boxPrice,
    boxCount: cabinetTotals.boxCount,
    hoodCount: cabinetTotals.hoodCount || 0,
    laborCosts,
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
    woodTotal: cabinetTotals.woodTotal + lengthTotals.materialTotal,
    woodCount: roundToHundredth(cabinetTotals.woodCount),
    lengthsTotal: lengthTotals.materialTotal,
    lengthsCount: (section.lengths || []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    ),
    fillerCount: cabinetTotals.fillerCount,
    accessoriesCount,
    accessoriesTotal: accessoriesTotalPrice,
    otherCount,
    otherTotal,
    quantity: section.quantity,
    profit: sectionProfit,
    profitRate: section.profit,
    commission: sectionCommission,
    commissionRate: section.commission,
    discount: sectionDiscount,
    discountRate: section.discount,
    partsIncluded: partsIncluded, // Pass through for UI to know what's included
    servicesIncluded: section.services_included || {}, // Pass through for UI
    // Face frame component breakdown (for detailed breakdown view only)
    faceFrameWoodTotal: cabinetTotals.faceFramePrices?.woodTotal || 0,
    faceFrameWoodCount: cabinetTotals.faceFramePrices?.boardFeet || 0,
    fillerWoodTotal: cabinetTotals.fillerMaterials?.woodTotal || 0,
    fillerWoodCount: cabinetTotals.fillerMaterials?.boardFeet || 0,
    endPanelNosingWoodTotal:
      cabinetTotals.endPanelNosingMaterials?.woodTotal || 0,
    endPanelNosingWoodCount:
      cabinetTotals.endPanelNosingMaterials?.boardFeet || 0,
    // Per-category hours for breakdown display
    categoryHours: {
      boxes: cabinetTotals.categoryHours?.boxes || {},
      faces: cabinetTotals.categoryHours?.faces || {},
      // Individual face types
      door: cabinetTotals.categoryHours?.door || {},
      pair_door: cabinetTotals.categoryHours?.pair_door || {},
      drawer_front: cabinetTotals.categoryHours?.drawer_front || {},
      false_front: cabinetTotals.categoryHours?.false_front || {},
      panel: cabinetTotals.categoryHours?.panel || {},
      // Special cabinet types
      endPanel: cabinetTotals.categoryHours?.endPanel || {},
      appliancePanel: cabinetTotals.categoryHours?.appliancePanel || {},
      hood: cabinetTotals.categoryHours?.hood || {},
      // Hardware
      hardware: cabinetTotals.categoryHours?.hardware || {},
      hinges: cabinetTotals.categoryHours?.hinges || {},
      slides: cabinetTotals.categoryHours?.slides || {},
      pulls: cabinetTotals.categoryHours?.pulls || {},
      // Wood/face frame
      wood: cabinetTotals.categoryHours?.wood || {},
      faceFrame: cabinetTotals.categoryHours?.faceFrame || {},
      fillers: cabinetTotals.categoryHours?.fillers || {},
      nosing: cabinetTotals.categoryHours?.nosing || {},
      panelMods: cabinetTotals.categoryHours?.panelMods || {},
      // Other categories
      lengths: lengthTotals.hoursByService || {},
      accessories: accessoriesTotal.hoursByService || {},
    },
  };
};

// Calculate roll-out dimensions based on face dimensions and cabinet depth
export const calculateRollOutDimensions = (
  style,
  faceWidth,
  cabinetDepth,
  faceHeight,
  type,
  isRollout,
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
  const depth = cabinetDepth < 2 ? 21 : Math.floor(maxDepth / 3) * 3;

  return { width, height, depth, rollOut: type === "rollOut" };
};
