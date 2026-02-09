import { isEqual } from "lodash";
import PropTypes from "prop-types";
import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { v4 as uuid } from "uuid";

import { getItemTypeConfig } from "../../config/cabinetItemTypes";
import {
  CAN_HAVE_PULLS,
  FACE_NAMES,
  ITEM_FORM_WIDTHS,
  SPLIT_DIRECTIONS,
  CAN_BE_BEADED,
  ITEM_TYPES,
  PART_NAMES,
} from "../../utils/constants.js";

import CabinetFaceDivider from "./CabinetFaceDivider.jsx";
import SectionItemList from "./SectionItemList.jsx";

const CabinetItemForm = ({
  item = {},
  onSave,
  onCancel,
  cabinetStyleId,
  onDeleteItem,
}) => {
  const cabinetTypes = useSelector((state) => state.cabinetTypes.types);
  // const cabinetAnchors = useSelector(
  //   (state) => state.cabinetAnchors.itemsByType
  // );
  const cabinetStyles = useSelector((state) => state.cabinetStyles.styles);

  // Get current item type configuration from cabinetTypeId
  const currentCabinetType = cabinetTypes.find(
    (t) => t.cabinet_type_id === item.type,
  );

  const [nosingOrFinish, setNosingOrFinish] = useState(
    currentCabinetType?.cabinet_type_id === 10 ? "Nosing" : "Finish",
  );
  const itemType = currentCabinetType?.item_type || "cabinet";
  const [itemTypeConfig, setItemTypeConfig] = useState(
    getItemTypeConfig(itemType),
  );

  // Initialize face_config with proper structure for new cabinets
  const getInitialFaceConfig = () => {
    if (item.face_config) return item.face_config;

    // For new cabinets, initialize with null (will be set when type is selected)
    return null;
  };

  const [formData, setFormData] = useState({
    type: item.type || "",
    width: item.width || "",
    height: item.height || "",
    depth: item.depth || "",
    quantity: item.quantity != null ? item.quantity : 1,
    face_config: getInitialFaceConfig(),
    temp_id: item.temp_id || uuid(),
    id: item.id || undefined,
    finished_interior: item.finished_interior,
    finished_left: item.finished_left,
    finished_right: item.finished_right,
    finished_top: item.finished_top,
    finished_bottom: item.finished_bottom,
    finished_back: item.finished_back,
    cabinet_style_override: item.cabinet_style_override,
    updated_at: item.updated_at,
    type_specific_options: item.type_specific_options || {},
  });

  // Temporary input values for dimensions that will only update formData on commit
  const [inputValues, setInputValues] = useState({
    width: item.width || "",
    height: item.height || "",
    depth: item.depth || "",
  });

  const [errors, setErrors] = useState({});

  // Helper to get the effective cabinet style ID (considers override)
  const getEffectiveCabinetStyleId = () => {
    if (
      formData.cabinet_style_override &&
      formData.cabinet_style_override !== -1
    ) {
      return formData.cabinet_style_override;
    }
    return cabinetStyleId;
  };

  // Sync rootReveals when cabinet_style_override is null and section style changes
  useEffect(() => {
    console.log(
      "[EstimateCabinetManager] useEffect triggered - cabinetStyleId:",
      cabinetStyleId,
      "override:",
      formData.cabinet_style_override,
    );
    // Only run if cabinet_style_override is null (using section default)
    if (
      (formData.cabinet_style_override === null ||
        formData.cabinet_style_override === undefined) &&
      formData.face_config &&
      formData.type &&
      cabinetStyles.length > 0 &&
      cabinetStyleId
    ) {
      // Find the style and type config for the section's style
      const style = cabinetStyles.find(
        (s) => s.cabinet_style_id === cabinetStyleId,
      );
      const typeConfig = style?.types?.find(
        (t) => t.cabinet_type_id === formData.type,
      );

      console.log(
        "[EstimateCabinetManager] Found typeConfig:",
        typeConfig?.config,
      );
      console.log(
        "[EstimateCabinetManager] Current rootReveals:",
        formData.face_config?.rootReveals,
      );

      // Update rootReveals - CabinetFaceDivider will handle dimension recalculation
      // Only update if reveals are different to prevent infinite loop
      if (
        typeConfig?.config &&
        !isEqual(formData.face_config?.rootReveals, typeConfig.config)
      ) {
        console.log(
          "[EstimateCabinetManager] Updating rootReveals to:",
          typeConfig.config,
        );
        console.log("----------------------------------------------");
        console.log("----------------------------------------------");
        console.log("----------------------------------------------");
        setFormData((prev) => ({
          ...prev,
          face_config: {
            ...prev.face_config,
            rootReveals: typeConfig.config,
          },
        }));
      } else {
        console.log(
          "[EstimateCabinetManager] Reveals already match - skipping update",
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cabinetStyleId,
    formData.cabinet_style_override,
    formData.type,
    cabinetStyles,
  ]);

  // Update itemTypeConfig when formData.type changes
  useEffect(() => {
    const selectedType = cabinetTypes.find(
      (t) => t.cabinet_type_id === formData.type,
    );
    const derivedItemType = selectedType?.item_type || ITEM_TYPES.CABINET.type;
    const newCabinetTypeId = selectedType?.cabinet_type_id;
    const previousCabinetTypeId = currentCabinetType?.cabinet_type_id;

    setItemTypeConfig(getItemTypeConfig(derivedItemType));
    setNosingOrFinish(
      newCabinetTypeId === 10 || derivedItemType === ITEM_TYPES.FACE_FRAME.type
        ? "Nosing"
        : "Finish",
    );

    // Clear finished fields when changing to or from type 10 (end panel)
    // Type 10 uses these fields for nosing, other types use them for finish
    if (
      (previousCabinetTypeId === 10 && newCabinetTypeId !== 10) ||
      (previousCabinetTypeId !== 10 && newCabinetTypeId === 10)
    ) {
      setFormData((prev) => ({
        ...prev,
        finished_top: false,
        finished_bottom: false,
        finished_left: false,
        finished_right: false,
      }));
    }
  }, [formData.type, cabinetTypes, currentCabinetType]);

  // Handle regular input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // For non-dimension fields
    if (!["width", "height", "depth"].includes(name)) {
      // Handle numeric fields
      if (
        name === "quantity" ||
        name === "type" ||
        name === "cabinet_style_override"
      ) {
        const numValue = value === "" ? "" : Number(value);

        // When cabinet_style_override or type changes, update rootReveals in face_config
        if (name === "cabinet_style_override" || name === "type") {
          // Determine which style to use
          const effectiveStyleId =
            name === "cabinet_style_override"
              ? numValue === -1
                ? cabinetStyleId
                : numValue
              : formData.cabinet_style_override === -1 ||
                  !formData.cabinet_style_override
                ? cabinetStyleId
                : formData.cabinet_style_override;

          // Determine which type to use
          const effectiveTypeId = name === "type" ? numValue : formData.type;

          // Find the style and type config
          const style = cabinetStyles.find(
            (s) => s.cabinet_style_id === effectiveStyleId,
          );
          const typeConfig = style?.types?.find(
            (t) => t.cabinet_type_id === effectiveTypeId,
          );

          // Build the updates object
          const updates = { [name]: numValue };
          const inputUpdates = {};

          // If type is changing, always set dimensions to defaults, reset face_config, and clear type_specific_options
          if (name === "type" && numValue) {
            const selectedType = cabinetTypes.find(
              (t) => t.cabinet_type_id === numValue,
            );

            if (selectedType) {
              // Always set dimensions to defaults when type changes
              if (selectedType.default_width) {
                updates.width = selectedType.default_width;
                inputUpdates.width = String(selectedType.default_width);
              }
              if (selectedType.default_height) {
                updates.height = selectedType.default_height;
                inputUpdates.height = String(selectedType.default_height);
              }
              if (selectedType.default_depth) {
                updates.depth = selectedType.default_depth;
                inputUpdates.depth = String(selectedType.default_depth);
              }

              // Reset face_config to null when type changes
              // CabinetFaceDivider will reinitialize it with the correct defaultFaceType
              updates.face_config = null;

              // Clear type_specific_options when type changes
              updates.type_specific_options = {};
            }

            // Update inputValues with dimension defaults
            if (Object.keys(inputUpdates).length > 0) {
              setInputValues((prev) => ({
                ...prev,
                ...inputUpdates,
              }));
            }
          } else if (name === "cabinet_style_override") {
            // For style changes only, update rootReveals - CabinetFaceDivider will handle dimensions
            if (
              typeConfig?.config &&
              formData.face_config &&
              formData.face_config.id
            ) {
              updates.face_config = {
                ...formData.face_config,
                rootReveals: typeConfig.config,
              };
            }
          }

          // Single state update with all changes
          setFormData({
            ...formData,
            ...updates,
          });
        } else if (name !== "type") {
          // For other numeric fields (quantity, cabinet_style_override)
          setFormData({
            ...formData,
            [name]: numValue,
          });
        }
      } else if (type === "checkbox") {
        setFormData({
          ...formData,
          [name]: checked,
        });
      } else {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
    }

    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  // Handle dimension input changes without immediately committing
  const handleDimensionChange = (e) => {
    const { name, value } = e.target;

    setInputValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  // Commit dimension value on blur or Enter key
  const commitDimensionValue = (name) => {
    const value = inputValues[name];
    const numValue = value === "" ? "" : Number(value);

    setFormData((prev) => ({
      ...prev,
      [name]: numValue,
    }));
  };

  // Handle input blur event
  const handleBlur = (e) => {
    commitDimensionValue(e.target.name);
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      commitDimensionValue(e.target.name);
    }
  };

  // Handle type-specific options changes
  const handleTypeSpecificOptionChange = (optionName, value) => {
    setFormData((prev) => ({
      ...prev,
      type_specific_options: {
        ...prev.type_specific_options,
        [optionName]: value,
      },
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.type) {
      newErrors.type = "Cabinet Type is required";
    }

    if (!formData.width) {
      newErrors.width = "Width is required";
    }

    if (!formData.height) {
      newErrors.height = "Height is required";
    }

    if (!formData.depth) {
      newErrors.depth = "Depth is required";
    }

    if (
      formData.quantity === null ||
      formData.quantity === undefined ||
      formData.quantity < 0
    ) {
      newErrors.quantity = "Quantity must be 0 or greater";
    }

    // Validate end panel nosing
    // Rules:
    // 1. If depth > 0.75, at least one nosing option must be selected
    // 2. If cabinetStyleId !== 13, at least one nosing option must be selected
    if (formData.type === 10) {
      const hasNosing =
        formData.finished_top ||
        formData.finished_bottom ||
        formData.finished_left ||
        formData.finished_right;

      const effectiveStyleId = getEffectiveCabinetStyleId();
      const requiresNosing = formData.depth > 0.75 || effectiveStyleId !== 13;

      if (!hasNosing && requiresNosing) {
        if (formData.depth > 0.75 && effectiveStyleId !== 13) {
          newErrors.nosing =
            'At least one nosing option must be selected (depth > 0.75" and cabinet style requires nosing)';
        } else if (formData.depth > 0.75) {
          newErrors.nosing =
            'At least one nosing option must be selected when depth is greater than 0.75"';
        } else {
          newErrors.nosing =
            "At least one nosing option must be selected for this cabinet style";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }

    // Commit all dimension values before validation
    commitDimensionValue("width");
    commitDimensionValue("height");
    commitDimensionValue("depth");

    // Now validate with updated formData
    if (validateForm()) {
      // Calculate face summary and box summary before saving
      const finalFormData = { ...formData };

      // Convert cabinet_style_override to null if default option (-1) is selected
      if (formData.cabinet_style_override === -1) {
        finalFormData.cabinet_style_override = null;
      }

      // Determine effective style ID (use override if set, otherwise section default)
      const effectiveStyleId =
        formData.cabinet_style_override &&
        formData.cabinet_style_override !== -1
          ? formData.cabinet_style_override
          : cabinetStyleId;

      // Save the style ID this cabinet was configured with
      // This allows accurate error detection when section style changes
      finalFormData.saved_style_id = effectiveStyleId;

      // Include type_specific_options in the saved data
      finalFormData.type_specific_options =
        formData.type_specific_options || {};

      const itemType = cabinetTypes.find(
        (t) => t.cabinet_type_id === formData.type,
      );

      if (formData.face_config) {
        // Handle drawer_box items (type 15) - convert dimensions based on rollout_scoop checkbox
        if (formData.type === 15) {
          const isRollout =
            formData.type_specific_options?.rollout_scoop === true;
          const style = cabinetStyles.find(
            (s) => s.cabinet_style_id === effectiveStyleId,
          );

          if (isRollout) {
            // Convert to rollOutDimensions
            finalFormData.face_config = {
              ...formData.face_config,
              rollOutDimensions: {
                width: formData.width,
                height: formData.height,
                depth: formData.depth,
                rollOut: true,
              },
            };
            // Remove drawerBoxDimensions if it exists
            delete finalFormData.face_config.drawerBoxDimensions;
          } else {
            // Convert to drawerBoxDimensions
            finalFormData.face_config = {
              ...formData.face_config,
              drawerBoxDimensions: {
                width: formData.width,
                height: formData.height,
                depth: formData.depth,
                rollOut: false,
              },
            };
            // Remove rollOutDimensions if it exists
            delete finalFormData.face_config.rollOutDimensions;
          }
        }

        const boxSummary = calculateBoxSummary(
          itemType.item_type,
          formData.width,
          formData.height,
          formData.depth,
          formData.quantity,
          finalFormData.face_config || formData.face_config,
          effectiveStyleId,
          formData.type,
          formData.finished_left,
          formData.finished_right,
          formData.finished_top,
          formData.finished_bottom,
          formData.finished_interior,
          formData.finished_back,
          formData.type_specific_options?.corner_45 || false,
        );

        finalFormData.face_config = {
          ...(finalFormData.face_config || formData.face_config),
          faceSummary: calculateFaceSummary(
            finalFormData.face_config || formData.face_config,
            itemType.item_type,
            formData.width,
            formData.height,
            formData.depth,
          ),
          boxSummary: boxSummary,
        };
      }

      onSave(finalFormData);
    }
  };

  // Helper function to round to nearest 1/16"
  const roundTo16th = (value) => {
    return Math.round(value * 16) / 16;
  };

  // Recursive helper to calculate total shelf area from face_config
  const countFaceHardware = (node, itemType = null) => {
    let totalHinges = 0;
    let totalDoorPulls = 0;
    let totalDrawerPulls = 0;
    let totalAppliancePulls = 0;
    let totalSlides = 0;

    if (node.type === FACE_NAMES.DOOR) {
      const usableHeight = Math.max(node.height - 8, 0); // inset 4" top and bottom
      totalHinges += 2 + Math.floor(usableHeight / 33);
    }
    if (node.type === FACE_NAMES.PAIR_DOOR) {
      const usableHeight = Math.max(node.height - 8, 0); // inset 4" top and bottom
      totalHinges += 2 * (2 + Math.floor(usableHeight / 33));
    }

    if (node.type === FACE_NAMES.DRAWER_FRONT) {
      totalSlides += 1;
    }

    if (node.rollOutQty > 0) {
      totalSlides += node.rollOutQty;
    }

    if (
      node.type === FACE_NAMES.DRAWER_FRONT ||
      node.type === FACE_NAMES.FALSE_FRONT
    ) {
      totalDrawerPulls += 1;
    } else if (node.type === FACE_NAMES.PAIR_DOOR) {
      totalDoorPulls += 2;
    } else if (node.type === FACE_NAMES.DOOR) {
      totalDoorPulls += 1;
    } else if (itemType === ITEM_TYPES.APPLIANCE_PANEL.type) {
      totalAppliancePulls += 1;
    }

    if (node.children) {
      node.children.forEach((child) => {
        const childResult = countFaceHardware(child, itemType);
        totalHinges += childResult.totalHinges;
        totalDoorPulls += childResult.totalDoorPulls;
        totalDrawerPulls += childResult.totalDrawerPulls;
        totalAppliancePulls += childResult.totalAppliancePulls;
        totalSlides += childResult.totalSlides;
      });
    }

    return {
      totalHinges,
      totalDoorPulls,
      totalDrawerPulls,
      totalAppliancePulls,
      totalSlides,
    };
  };

  // Recursive helper to calculate total shelf area from face_config
  const calculateShelfArea = (node) => {
    let totalArea = 0;
    let shelfBandingLength = 0;
    let shelfCount = 0;
    let shelfPerimeterLength = 0;
    let shelfDrillHoles = 0;

    const shelfHoleSpacing = 1.25;

    if (node.shelfQty && node.shelfDimensions) {
      const shelfWidth = roundTo16th(node.shelfDimensions.width);
      const shelfHeight = roundTo16th(node.shelfDimensions.height); // User calls it height, but it's depth
      totalArea += node.shelfQty * (shelfWidth * shelfHeight);
      shelfBandingLength += (node.shelfQty || 0) * shelfWidth;
      shelfCount += node.shelfQty;
      shelfPerimeterLength += node.shelfQty * (2 * (shelfWidth + shelfHeight));
      shelfDrillHoles += Math.ceil((node.height - 4) / shelfHoleSpacing) * 4;
    }

    if (node.children) {
      node.children.forEach((child) => {
        const childResult = calculateShelfArea(child);
        totalArea += childResult.totalArea;
        shelfBandingLength += childResult.shelfBandingLength;
        shelfCount += childResult.shelfCount;
        shelfPerimeterLength += childResult.shelfPerimeterLength;
        shelfDrillHoles += childResult.shelfDrillHoles;
      });
    }

    return {
      totalArea,
      shelfBandingLength,
      shelfCount,
      shelfPerimeterLength,
      shelfDrillHoles,
    };
  };

  // Recursive helper to calculate partition area from face_config
  const calculatePartitionArea = (node, depth, cabStyleId) => {
    let totalArea = 0;
    let partitionBandingLength = 0;
    let partitionCount = 0;
    let partitionPerimeterLength = 0;

    if (node && node.children && node.children.length > 1) {
      // Check for partitions between siblings
      for (let i = 0; i < node.children.length; i++) {
        const currentChild = node.children[i];

        // A partition is represented by a 'reveal' between two other nodes
        if (currentChild.type === FACE_NAMES.REVEAL) {
          const prevSibling = node.children[i - 1];
          const nextSibling = node.children[i + 1];

          // Only count a partition if it's between two valid siblings
          if (prevSibling && nextSibling) {
            // Exception: Don't count partitions between two drawer fronts stacked vertically
            if (
              node.splitDirection === SPLIT_DIRECTIONS.VERTICAL &&
              (prevSibling.type === FACE_NAMES.DRAWER_FRONT ||
                prevSibling.type === FACE_NAMES.FALSE_FRONT)
            ) {
              continue; // Skip this partition
            }

            // Partition dimensions depend on split direction
            const partitionWidth = roundTo16th(
              node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
                ? currentChild.height
                : currentChild.width,
            );

            totalArea += partitionWidth * depth;
            // Banding partitions is only for cabinet style 13 (European)
            if (cabStyleId === 13) {
              partitionBandingLength += partitionWidth;
            }
            partitionCount += 1;
            partitionPerimeterLength += 2 * (partitionWidth + depth);

            // double vertical partitions for cabinet style 14 (Inset Face Frame)
            if (
              cabStyleId === 14 &&
              node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
            ) {
              partitionCount += 1;
              totalArea += partitionWidth * depth;
            }
          }
        }
      }

      // Recursively check children for more partitions
      node.children.forEach((child) => {
        const childResult = calculatePartitionArea(child, depth, cabStyleId);
        totalArea += childResult.totalArea;
        partitionBandingLength += childResult.partitionBandingLength;
        partitionCount += childResult.partitionCount;
        partitionPerimeterLength += childResult.partitionPerimeterLength;
      });
    }

    return {
      totalArea,
      partitionBandingLength,
      partitionCount,
      partitionPerimeterLength,
    };
  };

  // Recursive helper to calculate face frame parts from face_config
  const calculateFaceFrames = (
    node,
    cabinetWidth,
    cabinetHeight,
    isRoot = false,
  ) => {
    let totalBoardFeet = 0;
    let holeCount = 0;
    let beadLength = 0;
    let framePieces = [];

    // At root level only, count the reveals as frame parts
    if (isRoot && node.rootReveals) {
      const reveals = node.rootReveals;

      // Left frame part
      if (reveals.left && reveals.reveal) {
        // Width: reveals.reveal, Height: cabinetHeight
        const partLength = cabinetHeight;
        framePieces.push({
          type: PART_NAMES.LEFT,
          length: partLength,
          width: reveals.reveal,
        });
      }

      // Right frame part
      if (reveals.right && reveals.reveal) {
        // Width: reveals.reveal, Height: cabinetHeight
        const partLength = cabinetHeight;
        framePieces.push({
          type: PART_NAMES.RIGHT,
          length: partLength,
          width: reveals.reveal,
        });
      }

      // Top frame part
      if (reveals.top && reveals.reveal) {
        // Width: reveals.reveal, Height: cabinetWidth - reveals.left - reveals.right
        const partLength =
          cabinetWidth - (reveals.left || 0) - (reveals.right || 0);
        holeCount += 2;
        framePieces.push({
          type: PART_NAMES.TOP,
          length: partLength,
          width: reveals.reveal,
        });
      }

      // Bottom frame part
      if (reveals.bottom && reveals.reveal) {
        // Width: reveals.reveal, Height: cabinetWidth - reveals.left - reveals.right
        const partLength =
          cabinetWidth - (reveals.left || 0) - (reveals.right || 0);
        holeCount += 2;
        framePieces.push({
          type: PART_NAMES.BOTTOM,
          length: partLength,
          width: reveals.reveal,
        });
      }
    }

    if (node.children) {
      node.children.forEach((child) => {
        if (CAN_BE_BEADED.includes(child.type)) {
          beadLength += 2 * child.width + 2 * child.height;
        }
      });
      const frame = node.children[1];
      holeCount += 2;
      if (node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL) {
        framePieces.push({
          type: SPLIT_DIRECTIONS.VERTICAL,
          length: frame.height,
          width: frame.width,
        });
      } else {
        framePieces.push({
          type: SPLIT_DIRECTIONS.HORIZONTAL,
          length: frame.width,
          width: frame.height,
        });
      }
    }

    // Recursively process children
    if (node.children) {
      node.children.forEach((child) => {
        const childResult = calculateFaceFrames(
          child,
          cabinetWidth,
          cabinetHeight,
          false,
        );
        totalBoardFeet += childResult.totalBoardFeet;
        holeCount += childResult.holeCount;
        beadLength += childResult.beadLength;
        framePieces.push(...childResult.framePieces);
      });
    }

    return {
      totalBoardFeet,
      holeCount,
      beadLength,
      framePieces,
    };
  };

  // Calculate box material summary (sides, top, bottom, back)
  // Now type-aware to handle different item types
  const calculateBoxSummary = (
    itemType = "cabinet",
    width,
    height,
    depth,
    quantity = 0,
    faceConfig,
    cabinetStyleId,
    cabinetTypeId,
    finishedLeft = false,
    finishedRight = false,
    finishedTop = false,
    finishedBottom = false,
    finishedInterior = false,
    finishedBack = false,
    isCorner45 = false,
  ) => {
    // Round dimensions to nearest 1/16"
    const w = roundTo16th(Number(width));
    const h = roundTo16th(Number(height));
    const d = roundTo16th(Number(depth));
    const qty = Number(quantity);

    // Handle item types that don't need box material
    // door_front, drawer_front, end_panel, appliance_panel - no box parts, just faces
    if (
      itemType === ITEM_TYPES.DOOR_FRONT.type ||
      itemType === ITEM_TYPES.DRAWER_FRONT.type ||
      itemType === ITEM_TYPES.END_PANEL.type ||
      itemType === ITEM_TYPES.APPLIANCE_PANEL.type ||
      itemType === ITEM_TYPES.FACE_FRAME.type
    ) {
      let frameParts = {};
      // Face frames always calculate frame parts regardless of cabinetStyleId
      const isFaceFrame = itemType === ITEM_TYPES.FACE_FRAME.type;
      if (
        (isFaceFrame ||
          (cabinetStyleId !== 13 &&
            (itemType === ITEM_TYPES.END_PANEL.type ||
              itemType === ITEM_TYPES.APPLIANCE_PANEL.type))) &&
        !formData.type_specific_options?.shop_built // Skip face frames for shop-built end panels
      ) {
        frameParts = calculateFaceFrames(faceConfig, width, height, true);
      }

      const hardware = countFaceHardware(faceConfig, itemType);

      // Calculate nosing for end panels (type 10)
      let boxPartsList = [];
      if (
        itemType === ITEM_TYPES.END_PANEL.type ||
        itemType === ITEM_TYPES.FACE_FRAME.type
      ) {
        // For depth === 0.75, add nosing with width 0 for selected edges
        if (d === 0.75) {
          // Top nosing with width 0
          if (formData.finished_top) {
            boxPartsList.push({
              type: PART_NAMES.NOSING,
              side: "top_nosing",
              width: 0,
              height: roundTo16th(w),
              area: 0,
              quantity: 1,
              finish: true,
            });
          }

          // Bottom nosing with width 0
          if (formData.finished_bottom) {
            boxPartsList.push({
              type: PART_NAMES.NOSING,
              side: "bottom_nosing",
              width: 0,
              height: roundTo16th(w),
              area: 0,
              quantity: 1,
              finish: true,
            });
          }

          // Left nosing with width 0
          if (formData.finished_left) {
            boxPartsList.push({
              type: PART_NAMES.NOSING,
              side: "left_nosing",
              width: 0,
              height: roundTo16th(h),
              area: 0,
              quantity: 1,
              finish: true,
            });
          }

          // Right nosing with width 0
          if (formData.finished_right) {
            boxPartsList.push({
              type: PART_NAMES.NOSING,
              side: "right_nosing",
              width: 0,
              height: roundTo16th(h),
              area: 0,
              quantity: 1,
              finish: true,
            });
          }
        }
        // For depth > 0.75, add nosing with actual dimensions (main piece + return)
        else if (d > 0.75) {
          const returnWidth = 6; // Return piece width

          // Top nosing - main piece (depth width) + return (6" width)
          if (formData.finished_top) {
            boxPartsList.push({
              type: PART_NAMES.NOSING,
              side: "top_nosing",
              width: roundTo16th(d),
              height: roundTo16th(w),
              area: roundTo16th(d * w),
              quantity: 1,
              finish: true,
            });
            if (itemType === ITEM_TYPES.END_PANEL.type) {
              boxPartsList.push({
                type: PART_NAMES.NOSING,
                side: "top_return",
                width: roundTo16th(returnWidth),
                height: roundTo16th(w),
                area: roundTo16th(returnWidth * w),
                quantity: 1,
                finish: true,
              });
            }
          }

          // Bottom nosing - main piece (depth width) + return (6" width)
          if (formData.finished_bottom) {
            boxPartsList.push({
              type: PART_NAMES.NOSING,
              side: "bottom_nosing",
              width: roundTo16th(d),
              height: roundTo16th(w),
              area: roundTo16th(d * w),
              quantity: 1,
              finish: true,
            });
            if (itemType === ITEM_TYPES.END_PANEL.type) {
              boxPartsList.push({
                type: PART_NAMES.NOSING,
                side: "bottom_return",
                width: roundTo16th(returnWidth),
                height: roundTo16th(w),
                area: roundTo16th(returnWidth * w),
                quantity: 1,
                finish: true,
              });
            }
          }

          // Left nosing - main piece (depth width) + return (6" width)
          if (formData.finished_left) {
            boxPartsList.push({
              type: PART_NAMES.NOSING,
              side: "left_nosing",
              width: roundTo16th(d),
              height: roundTo16th(h),
              area: roundTo16th(d * h),
              quantity: 1,
              finish: true,
            });
            if (itemType === ITEM_TYPES.END_PANEL.type) {
              boxPartsList.push({
                type: PART_NAMES.NOSING,
                side: "left_return",
                width: roundTo16th(returnWidth),
                height: roundTo16th(h),
                area: roundTo16th(returnWidth * h),
                quantity: 1,
                finish: true,
              });
            }
          }

          // Right nosing - main piece (depth width) + return (6" width)
          if (formData.finished_right) {
            boxPartsList.push({
              type: PART_NAMES.NOSING,
              side: "right_nosing",
              width: roundTo16th(d),
              height: roundTo16th(h),
              area: roundTo16th(d * h),
              quantity: 1,
              finish: true,
            });
            if (itemType === ITEM_TYPES.END_PANEL.type) {
              boxPartsList.push({
                type: PART_NAMES.NOSING,
                side: "right_return",
                width: roundTo16th(returnWidth),
                height: roundTo16th(h),
                area: roundTo16th(returnWidth * h),
                quantity: 1,
                finish: true,
              });
            }
          }
        }
      }

      return {
        pieces: { sides: 0, topBottom: 0, back: 0 },
        cabinetCount: qty,
        areaPerCabinet: 0,
        partitionArea: 0,
        bandingLength: 0,
        singleBoxPartsCount: 0,
        singleBoxPerimeterLength: 0,
        boxHardware: hardware,
        shelfDrillHoles: 0,
        boxPartsList,
        frameParts: frameParts,
        openingsCount: 0,
      };
    }

    // Handle filler - L-shape (itemType === 5)
    if (itemType === ITEM_TYPES.FILLER.type) {
      const sideArea = roundTo16th(h * d);
      const facearea = roundTo16th(w * h);
      const boxPartsList = [
        {
          type: ITEM_TYPES.FILLER.type,
          side: "face",
          width: roundTo16th(w),
          height: roundTo16th(h),
          area: facearea,
          quantity: 1,
          finish: true,
        },
        {
          type: ITEM_TYPES.FILLER.type,
          side: "return",
          width: roundTo16th(d),
          height: roundTo16th(h),
          area: sideArea,
          quantity: 1,
          finish: true,
        },
      ];

      return {
        pieces: { sides: 1 * qty, topBottom: 0, back: 0 },
        cabinetCount: qty,
        areaPerCabinet: sideArea + facearea,
        partitionArea: 0,
        bandingLength: 0,
        singleBoxPartsCount: 1,
        singleBoxPerimeterLength: 0,
        boxHardware: { hingeCount: 0, drawerSlideCount: 0, pullCount: 0 },
        shelfDrillHoles: 0,
        boxPartsList,
        frameParts: {},
        openingsCount: 0,
      };
    }

    // Handle drawer_box and rollout - minimal data, counted separately
    if (itemType === "drawer_box" || itemType === "rollout") {
      // Drawer boxes need 1 slide each
      const boxHardware = {
        totalHinges: 0,
        totalDoorPulls: 0,
        totalDrawerPulls: 0,
        totalAppliancePulls: 0,
        totalSlides: 1, // Each drawer box needs 1 slide
      };

      return {
        pieces: { sides: 0, topBottom: 0, back: 0 },
        cabinetCount: qty,
        areaPerCabinet: 0,
        partitionArea: 0,
        bandingLength: 0,
        singleBoxPartsCount: 0,
        singleBoxPerimeterLength: 0,
        boxHardware, // Will have slide count for drawers/rollouts
        shelfDrillHoles: 0,
        boxPartsList: [],
        frameParts: {},
        openingsCount: 0,
      };
    }

    // Handle hood - no box parts, only face materials and service hours
    // Service hours are calculated via 3D volume interpolation in getSectionCalculations
    if (itemType === ITEM_TYPES.HOOD.type) {
      const hardware = countFaceHardware(faceConfig, itemType);

      return {
        pieces: { sides: 0, topBottom: 0, back: 0 },
        cabinetCount: qty,
        areaPerCabinet: 0,
        partitionArea: 0,
        bandingLength: 0,
        singleBoxPartsCount: 0,
        singleBoxPerimeterLength: 0,
        boxHardware: hardware,
        shelfDrillHoles: 0,
        boxPartsList: [], // No box parts for hoods
        frameParts: {},
        openingsCount: 0,
      };
    }

    // Full cabinet - continue with existing complex logic
    let sideArea, topBottomArea, backArea;
    let sidePerimeterLength, topBottomPerimeterLength, backPerimeterLength;
    let boxPerimeterLength, boxPartsCount;
    let openingsCount = 1;

    if (isCorner45) {
      // Corner 45° cabinet geometry
      // w = diagonal face width (where doors go)
      // d = depth of each side
      // h = height

      const sideCutout = w / Math.sqrt(2);

      // Calculate back width using your equation: depth + width/√2
      const backWidth = Math.ceil(roundTo16th(d + sideCutout));

      // Top/Bottom area calculation
      const triangleCutout = roundTo16th(0.5 * sideCutout * sideCutout);
      topBottomArea = roundTo16th(backWidth * backWidth - triangleCutout);

      // Each side panel: height × depth
      sideArea = roundTo16th(h * d);

      // Each back panel: height × backWidth
      backArea = roundTo16th(h * backWidth);

      // Perimeter calculations for corner 45
      sidePerimeterLength = roundTo16th(2 * 2 * (h + d));

      const topBottomPerimeter = roundTo16th(w + d + d + backWidth + backWidth);
      topBottomPerimeterLength = roundTo16th(2 * topBottomPerimeter);

      backPerimeterLength = roundTo16th(2 * 2 * (h + backWidth));

      boxPerimeterLength = roundTo16th(
        sidePerimeterLength + topBottomPerimeterLength + backPerimeterLength,
      );

      boxPartsCount = 6; // 2 sides, 2 tops/bottoms, 2 backs
    } else {
      // Standard rectangular cabinet
      sideArea = h * d;
      topBottomArea = w * d;
      backArea = w * h;

      sidePerimeterLength = 2 * (2 * (h + d));
      topBottomPerimeterLength = 2 * (2 * (w + d));
      backPerimeterLength = 2 * (w + h);

      boxPerimeterLength =
        sidePerimeterLength + topBottomPerimeterLength + backPerimeterLength;
      boxPartsCount = 5;
    }

    let bandingLength = 0;
    // Banding front edges is only for cabinet style 13 (European)
    if (cabinetStyleId === 13) {
      bandingLength = 2 * h + 2 * w;
    }
    // Banding bottom edges is only for cabinet type 2 (Upper)
    if (cabinetTypeId === 2) {
      bandingLength += 2 * d;
    }

    // Calculate total shelf area from the face config
    const {
      totalArea: totalShelfArea,
      shelfBandingLength,
      shelfCount,
      shelfPerimeterLength,
      shelfDrillHoles,
    } = faceConfig
      ? calculateShelfArea(faceConfig)
      : {
          totalArea: 0,
          shelfBandingLength: 0,
          shelfCount: 0,
          shelfPerimeterLength: 0,
          shelfDrillHoles: 0,
        };

    // Calculate total partition area from the face config
    const {
      totalArea: totalPartitionArea,
      partitionBandingLength,
      partitionCount,
      partitionPerimeterLength,
    } = faceConfig
      ? calculatePartitionArea(faceConfig, d, cabinetStyleId)
      : {
          totalArea: 0,
          partitionBandingLength: 0,
          partitionCount: 0,
          partitionPerimeterLength: 0,
        };

    const boxHardware = countFaceHardware(faceConfig, itemType);

    let frameParts = {};

    if (cabinetStyleId !== 13) {
      frameParts = calculateFaceFrames(faceConfig, width, height, true);
    }

    // All parts will have finish boolean - no need to calculate counts

    // Total area calculation for a single cabinet
    let singleCabinetArea;
    if (isCorner45) {
      // Corner 45 has: 2 sides, 2 top/bottoms, 2 backs
      singleCabinetArea =
        2 * sideArea +
        2 * topBottomArea +
        2 * backArea + // Two back panels for corner 45
        totalShelfArea +
        totalPartitionArea;
    } else {
      // Standard cabinet has: 2 sides, 2 top/bottoms, 1 back
      singleCabinetArea =
        2 * sideArea +
        2 * topBottomArea +
        backArea +
        totalShelfArea +
        totalPartitionArea;
    }

    // Total area for all cabinets
    // const totalBoxPartsArea = singleCabinetArea * qty;
    const totalBandingLength =
      bandingLength + shelfBandingLength + partitionBandingLength;

    // Count of pieces per cabinet type
    const pieces = isCorner45
      ? {
          sides: 2 * qty,
          topBottom: 2 * qty,
          back: 2 * qty, // Two backs for corner 45
        }
      : {
          sides: 2 * qty,
          topBottom: 2 * qty,
          back: 1 * qty,
        };

    const singleBoxPartsCount = boxPartsCount + shelfCount + partitionCount;
    const singleBoxPerimeterLength =
      boxPerimeterLength + shelfPerimeterLength + partitionPerimeterLength;

    // Build boxPartsList for packing algorithm
    const boxPartsList = [];

    // Add left side
    boxPartsList.push({
      type: PART_NAMES.SIDE,
      side: PART_NAMES.LEFT,
      width: roundTo16th(d),
      height: roundTo16th(h),
      area: roundTo16th(sideArea),
      quantity: 1,
      finish: finishedInterior || finishedLeft,
    });

    // Add right side
    boxPartsList.push({
      type: PART_NAMES.SIDE,
      side: PART_NAMES.RIGHT,
      width: roundTo16th(d),
      height: roundTo16th(h),
      area: roundTo16th(sideArea),
      quantity: 1,
      finish: finishedInterior || finishedRight,
    });

    // Add top and bottom
    if (isCorner45) {
      const sideCutout = w / Math.sqrt(2);
      const backWidth = Math.ceil(roundTo16th(d + sideCutout));

      // Add top
      boxPartsList.push({
        type: PART_NAMES.TOP_BOTTOM,
        side: PART_NAMES.TOP,
        width: roundTo16th(backWidth),
        height: roundTo16th(backWidth),
        area: roundTo16th(topBottomArea),
        quantity: 1,
        finish: finishedInterior || finishedTop,
        isCorner45: true,
      });

      // Add bottom
      boxPartsList.push({
        type: PART_NAMES.TOP_BOTTOM,
        side: PART_NAMES.BOTTOM,
        width: roundTo16th(backWidth),
        height: roundTo16th(backWidth),
        area: roundTo16th(topBottomArea),
        quantity: 1,
        finish: finishedInterior || finishedBottom,
        isCorner45: true,
      });
    } else {
      // Add top
      boxPartsList.push({
        type: PART_NAMES.TOP_BOTTOM,
        side: PART_NAMES.TOP,
        width: roundTo16th(d),
        height: roundTo16th(w),
        area: roundTo16th(topBottomArea),
        quantity: 1,
        finish: finishedInterior || finishedTop,
      });

      // Add bottom
      boxPartsList.push({
        type: PART_NAMES.TOP_BOTTOM,
        side: PART_NAMES.BOTTOM,
        width: roundTo16th(d),
        height: roundTo16th(w),
        area: roundTo16th(topBottomArea),
        quantity: 1,
        finish: finishedInterior || finishedBottom,
      });
    }

    // Add back(s)
    if (isCorner45) {
      // Corner 45 has two back panels
      const backWidth = Math.ceil(d + w / Math.sqrt(2));
      boxPartsList.push({
        type: PART_NAMES.BACK,
        width: roundTo16th(backWidth),
        height: roundTo16th(h),
        area: roundTo16th(backArea),
        quantity: 2, // Two backs for corner 45
        finish: finishedInterior || finishedBack,
      });
    } else {
      boxPartsList.push({
        type: PART_NAMES.BACK,
        width: roundTo16th(w),
        height: roundTo16th(h),
        area: roundTo16th(backArea),
        quantity: 1,
        finish: finishedInterior || finishedBack,
      });
    }

    // Add shelves from face config
    if (faceConfig) {
      const collectShelves = (node) => {
        if (node.glassShelves) {
          return [];
        }
        const shelves = [];

        if (node.shelfQty && node.shelfDimensions) {
          const shelfWidth = roundTo16th(node.shelfDimensions.width);
          const shelfDepth = roundTo16th(node.shelfDimensions.height); // User calls it height, but it's depth
          const shelfArea = roundTo16th(shelfWidth * shelfDepth);

          shelves.push({
            type: PART_NAMES.SHELF,
            width: shelfWidth,
            height: shelfDepth,
            area: shelfArea,
            quantity: node.shelfQty,
            finish: finishedInterior,
          });

          // Add nosing parts if shelfNosing is specified and glassShelves is not set
          // Only add nosing for box material shelves, not glass shelves
          if (node.shelfNosing && node.shelfNosing > 0 && !node.glassShelves) {
            const nosingWidth = roundTo16th(node.shelfNosing);
            const nosingHeight = roundTo16th(node.shelfDimensions.height); // Same as shelf depth
            const nosingArea = roundTo16th(nosingWidth * nosingHeight);

            shelves.push({
              type: PART_NAMES.NOSING,
              width: nosingWidth,
              height: nosingHeight,
              area: nosingArea,
              quantity: node.shelfQty,
              finish: finishedInterior,
            });
          }
        }

        if (node.children) {
          node.children.forEach((child) => {
            shelves.push(...collectShelves(child));
          });
        }

        return shelves;
      };

      const shelves = collectShelves(faceConfig);
      boxPartsList.push(...shelves);
    }

    // Add partitions from face config
    if (faceConfig) {
      const collectPartitions = (node) => {
        const partitions = [];
        let localOpeningsCount = 0;

        if (node && node.children && node.children.length > 1) {
          for (let i = 0; i < node.children.length; i++) {
            const currentChild = node.children[i];

            if (currentChild.type === FACE_NAMES.REVEAL) {
              const prevSibling = node.children[i - 1];
              const nextSibling = node.children[i + 1];

              if (prevSibling && nextSibling) {
                // Skip partitions between stacked drawer fronts
                if (
                  node.splitDirection === SPLIT_DIRECTIONS.VERTICAL &&
                  (prevSibling.type === FACE_NAMES.DRAWER_FRONT ||
                    prevSibling.type === FACE_NAMES.FALSE_FRONT)
                ) {
                  continue;
                }

                const partitionWidth = roundTo16th(
                  node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
                    ? currentChild.height
                    : currentChild.width,
                );
                const partitionArea = roundTo16th(partitionWidth * d);

                // Count double partitions for Inset Face Frame style
                const partitionQty =
                  cabinetStyleId !== 13 &&
                  node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
                    ? 2
                    : 1;

                localOpeningsCount++;

                partitions.push({
                  type: PART_NAMES.PARTITION,
                  width: roundTo16th(d),
                  height: partitionWidth,
                  area: partitionArea,
                  quantity: partitionQty,
                  finish: finishedInterior,
                });
              }
            }
          }

          node.children.forEach((child) => {
            const childResult = collectPartitions(child);
            partitions.push(...childResult.partitions);
            localOpeningsCount += childResult.openingsCount;
          });
        }

        return { partitions, openingsCount: localOpeningsCount };
      };

      const { partitions, openingsCount: partitionOpeningsCount } =
        collectPartitions(faceConfig);
      openingsCount += partitionOpeningsCount;
      boxPartsList.push(...partitions);
    }

    return {
      pieces,
      cabinetCount: qty,
      areaPerCabinet: singleCabinetArea,
      partitionArea: totalPartitionArea,
      bandingLength: totalBandingLength,
      singleBoxPartsCount,
      singleBoxPerimeterLength,
      boxHardware,
      shelfDrillHoles,
      boxPartsList, // List of all individual parts with finish boolean
      frameParts,
      openingsCount,
    };
  };

  // Calculate face type summary
  const calculateFaceSummary = (node, itemType, width, height, depth) => {
    const summary = {};

    // Update accessory dimensions throughout the tree
    const updateAccessoryDimensions = (node) => {
      if (!node) return;

      // Update accessories on this node with current node dimensions
      if (node.accessories && Array.isArray(node.accessories)) {
        node.accessories.forEach((accessory) => {
          // For pair doors, use half width (individual door width)
          if (node.type === FACE_NAMES.PAIR_DOOR) {
            accessory.width = roundTo16th(node.width / 2);
            accessory.height = roundTo16th(node.height);
          } else {
            accessory.width = roundTo16th(node.width);
            accessory.height = roundTo16th(node.height);
          }
          // depth comes from the accessory definition, not the face
        });
      }

      // Recurse through children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child) => updateAccessoryDimensions(child));
      }
    };

    // Update all accessory dimensions first
    updateAccessoryDimensions(node);

    const processNode = (node) => {
      // Only count leaf nodes (actual faces, not containers)
      if (!node.children) {
        let faceType = node.type;

        // Handle pair doors specially - count them as two separate doors
        if (faceType === FACE_NAMES.PAIR_DOOR) {
          faceType = FACE_NAMES.DOOR; // Count as regular doors

          if (!summary[faceType]) {
            summary[faceType] = {
              count: 0,
              totalArea: 0,
              faces: [],
              glass: [],
            };
          }

          // Calculate dimensions for each door in the pair (split horizontally)
          const doorWidth = roundTo16th(node.width / 2);
          const doorHeight = roundTo16th(node.height);
          const doorArea = roundTo16th(doorWidth * doorHeight);

          // Add left door
          summary[faceType].count += 1;
          summary[faceType].totalArea += doorArea;
          summary[faceType].faces.push({
            id: `${node.id}-L`,
            width: doorWidth,
            height: doorHeight,
            area: doorArea,
          });

          // Add right door
          summary[faceType].count += 1;
          summary[faceType].totalArea += doorArea;
          summary[faceType].faces.push({
            id: `${node.id}-R`,
            width: doorWidth,
            height: doorHeight,
            area: doorArea,
          });

          if (node.glassPanel) {
            const glassWidth = roundTo16th(doorWidth - 5);
            const glassHeight = roundTo16th(doorHeight - 5);
            const glassArea = roundTo16th(glassWidth * glassHeight);
            summary[faceType].glass.push({
              id: `${node.id}`,
              accessoryCatalogId: +node.glassPanel,
              width: glassWidth,
              height: glassHeight,
              area: glassArea,
              quantity: 2,
            });
          }

          // Accessories are stored on the node itself, no need to aggregate them here
        } else {
          // Handle all other face types normally
          if (!summary[faceType]) {
            summary[faceType] = {
              count: 0,
              totalArea: 0,
              faces: [],
              glass: [],
            };
          }

          // Round dimensions to nearest 1/16"
          const width = roundTo16th(node.width);
          const height = roundTo16th(node.height);

          // Calculate area (set to 0 for open and container types)
          const area =
            faceType === FACE_NAMES.OPEN || faceType === FACE_NAMES.CONTAINER
              ? 0
              : roundTo16th(width * height);

          // Add to summary
          summary[faceType].count += 1;
          summary[faceType].totalArea += area;
          summary[faceType].faces.push({
            id: node.id,
            width: width,
            height: height,
            area: area,
            shelfQty: node.glassShelves ? 0 : node.shelfQty || 0,
            rollOutQty: node.rollOutQty || 0,
          });

          if (node.glassPanel) {
            const glassWidth = roundTo16th(width - 5);
            const glassHeight = roundTo16th(height - 5);
            const glassArea = roundTo16th(glassWidth * glassHeight);
            summary[faceType].glass.push({
              id: `${node.id}`,
              accessoryCatalogId: +node.glassPanel,
              width: glassWidth,
              height: glassHeight,
              area: glassArea,
              quantity: 1,
            });
          }

          // Accessories are stored on the node itself, no need to aggregate them here
        }
        // Track faces with glass shelves for separate material calculation
        if (node.glassShelves && node.shelfQty > 0) {
          summary[faceType].glass.push({
            id: node.id,
            accessoryCatalogId: +node.glassShelves,
            quantity: node.shelfQty,
            width: depth, //cabinet depth
            height: width, //cabinet width
          });
        }
      } else {
        // Process children recursively
        node.children.forEach((child) => processNode(child));
      }
    };

    processNode(node);

    // Return face type summary (accessories are on individual nodes)
    return summary;
  };

  const handleFaceConfigSave = useCallback((faceConfig) => {
    console.log("[EstimateCabinetManager] handleFaceConfigSave called");
    console.log(
      "[EstimateCabinetManager] Incoming faceConfig.rootReveals:",
      faceConfig?.rootReveals,
    );
    console.log("[EstimateCabinetManager] Incoming faceConfig dimensions:", {
      width: faceConfig?.width,
      height: faceConfig?.height,
      x: faceConfig?.x,
      y: faceConfig?.y,
    });

    // Use functional update to avoid needing formData.face_config in dependencies
    setFormData((prevData) => {
      console.log(
        "[EstimateCabinetManager] Previous face_config.rootReveals:",
        prevData.face_config?.rootReveals,
      );
      console.log("[EstimateCabinetManager] Previous face_config dimensions:", {
        width: prevData.face_config?.width,
        height: prevData.face_config?.height,
        x: prevData.face_config?.x,
        y: prevData.face_config?.y,
      });

      // Only update if the face_config has actually changed
      if (JSON.stringify(prevData.face_config) !== JSON.stringify(faceConfig)) {
        console.log(
          "[EstimateCabinetManager] face_config changed - updating formData",
        );
        return {
          ...prevData,
          face_config: faceConfig,
        };
      } else {
        console.log(
          "[EstimateCabinetManager] face_config unchanged - skipping update",
        );
        return prevData;
      }
    });
  }, []); // Empty dependencies - stable reference

  const canEditFaces =
    formData.type &&
    formData.width &&
    formData.height &&
    formData.depth &&
    !errors.width &&
    !errors.height &&
    !errors.depth;

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <div className="flex gap-6">
        {/* Left side - Form (Narrower) */}
        <div className="w-64 flex flex-col">
          <h4 className="text-sm font-medium text-slate-700 mb-4">
            Cabinet Details
          </h4>

          <div className="space-y-4 flex-1 flex flex-col">
            {/* Basic Info Section */}
            <div className="pb-4 border-b border-slate-200 flex flex-col">
              {/* Cabinet Type */}
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center mb-2">
                <label
                  htmlFor="type"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type || ""}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.type ? "border-red-500" : "border-slate-300"
                  } rounded-md text-sm`}
                >
                  <option value="">Select Type</option>
                  {cabinetTypes
                    .filter((type) => type.is_active)
                    .map((type) => (
                      <option
                        key={type.cabinet_type_id}
                        value={type.cabinet_type_id}
                      >
                        {type.cabinet_type_name}
                      </option>
                    ))}
                </select>
                {errors.type && (
                  <p className="text-red-500 text-xs mt-1">{errors.type}</p>
                )}
              </div>

              {/* Cabinet Style */}
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center mb-2">
                <label
                  htmlFor="cabinet_style_override"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Style
                </label>
                <select
                  id="cabinet_style_override"
                  name="cabinet_style_override"
                  value={formData.cabinet_style_override || -1}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.cabinet_style_override
                      ? "border-red-500"
                      : "border-slate-300"
                  } rounded-md text-sm`}
                >
                  <option value={-1}>Match Section</option>
                  {cabinetStyles
                    .filter((style) => style.is_active)
                    .map((style) => (
                      <option
                        key={style.cabinet_style_id}
                        value={style.cabinet_style_id}
                      >
                        {style.cabinet_style_name}
                      </option>
                    ))}
                </select>
                {errors.cabinet_style_override && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.cabinet_style_override}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4 justify-around mb-4">
                <div className="flex gap-2 justify-around">
                  {/* Quantity */}
                  <div className="">
                    <label
                      htmlFor="quantity"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      min="0"
                      className={`w-full px-3 py-2 border ${
                        errors.quantity ? "border-red-500" : "border-slate-300"
                      } rounded-md text-sm max-w-[72px]`}
                    />
                    {errors.quantity && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.quantity}
                      </p>
                    )}
                  </div>

                  {/* Finished Interior - Only for cabinets */}
                  {itemTypeConfig.features.finishedInterior && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="finished_interior"
                        name="finished_interior"
                        checked={formData.finished_interior}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                      />
                      <label
                        htmlFor="finished_interior"
                        className="text-xs font-medium text-slate-700"
                      >
                        Finished Interior
                      </label>
                    </div>
                  )}
                </div>

                {/* Finish options - Conditionally show based on item type */}
                {(itemTypeConfig.features.finishedTop ||
                  itemTypeConfig.features.finishedBottom ||
                  itemTypeConfig.features.finishedLeft ||
                  itemTypeConfig.features.finishedRight) && (
                  <>
                    <div className="grid grid-cols-3 gap-2 justify-between">
                      <div className="col-span-3 text-xs font-medium text-slate-700 text-left">
                        {nosingOrFinish}:
                      </div>

                      {/* Finished Left */}
                      {itemTypeConfig.features.finishedLeft && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id="finished_left"
                            name="finished_left"
                            checked={formData.finished_left}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                          />
                          <label
                            htmlFor="finished_left"
                            className="text-xs font-medium text-slate-700"
                          >
                            Left
                          </label>
                        </div>
                      )}

                      {/* Finished Top */}
                      {itemTypeConfig.features.finishedTop && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id="finished_top"
                            name="finished_top"
                            checked={formData.finished_top}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                          />
                          <label
                            htmlFor="finished_top"
                            className="text-xs font-medium text-slate-700"
                          >
                            Top
                          </label>
                        </div>
                      )}

                      {/* Finished Back */}
                      {itemTypeConfig.features.finishedBack && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id="finished_back"
                            name="finished_back"
                            checked={formData.finished_back}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                          />
                          <label
                            htmlFor="finished_back"
                            className="text-xs font-medium text-slate-700"
                          >
                            Back
                          </label>
                        </div>
                      )}

                      {/* Finished Right */}
                      {itemTypeConfig.features.finishedRight && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id="finished_right"
                            name="finished_right"
                            checked={formData.finished_right}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                          />
                          <label
                            htmlFor="finished_right"
                            className="text-xs font-medium text-slate-700"
                          >
                            Right
                          </label>
                        </div>
                      )}

                      {/* Finished Bottom */}
                      {itemTypeConfig.features.finishedBottom && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id="finished_bottom"
                            name="finished_bottom"
                            checked={formData.finished_bottom}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                          />
                          <label
                            htmlFor="finished_bottom"
                            className="text-xs font-medium text-slate-700"
                          >
                            Bottom
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Nosing error message - below the grid */}
                    {errors.nosing && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.nosing}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Dynamic Type-Specific Options */}
              {itemTypeConfig.typeSpecificOptions?.map((option) => {
                const optionValue =
                  formData.type_specific_options?.[option.name] ??
                  option.defaultValue;

                if (option.type === "checkbox") {
                  return (
                    <div
                      key={option.name}
                      className="flex items-center gap-2 mt-4"
                    >
                      <input
                        type="checkbox"
                        id={option.name}
                        name={option.name}
                        checked={optionValue}
                        onChange={(e) =>
                          handleTypeSpecificOptionChange(
                            option.name,
                            e.target.checked,
                          )
                        }
                        className="w-5 h-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                      />
                      <label
                        htmlFor={option.name}
                        className="text-xs font-medium text-slate-700"
                        title={option.description}
                      >
                        {option.label}
                      </label>
                    </div>
                  );
                } else if (option.type === "number") {
                  return (
                    <div
                      key={option.name}
                      className="flex items-center gap-2 mt-4"
                    >
                      <label
                        htmlFor={option.name}
                        className="text-xs font-medium text-slate-700"
                        title={option.description}
                      >
                        {option.label}
                      </label>
                      <input
                        type="number"
                        id={option.name}
                        name={option.name}
                        value={optionValue}
                        onChange={(e) =>
                          handleTypeSpecificOptionChange(
                            option.name,
                            Number(e.target.value),
                          )
                        }
                        min={option.min ?? 0}
                        max={option.max}
                        step={option.step ?? 1}
                        className="w-20 px-2 py-1 border border-slate-300 rounded-md text-sm"
                      />
                    </div>
                  );
                } else if (option.type === "select") {
                  return (
                    <div
                      key={option.name}
                      className="flex items-center gap-2 mt-4"
                    >
                      <label
                        htmlFor={option.name}
                        className="text-xs font-medium text-slate-700"
                        title={option.description}
                      >
                        {option.label}
                      </label>
                      <select
                        id={option.name}
                        name={option.name}
                        value={optionValue}
                        onChange={(e) =>
                          handleTypeSpecificOptionChange(
                            option.name,
                            e.target.value,
                          )
                        }
                        className="px-2 py-1 border border-slate-300 rounded-md text-sm"
                      >
                        {option.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                } else if (option.type === "text") {
                  return (
                    <div
                      key={option.name}
                      className="flex items-center gap-2 mt-4"
                    >
                      <label
                        htmlFor={option.name}
                        className="text-xs font-medium text-slate-700"
                        title={option.description}
                      >
                        {option.label}
                      </label>
                      <input
                        type="text"
                        id={option.name}
                        name={option.name}
                        value={optionValue}
                        onChange={(e) =>
                          handleTypeSpecificOptionChange(
                            option.name,
                            e.target.value,
                          )
                        }
                        className="px-2 py-1 border border-slate-300 rounded-md text-sm"
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Dimensions Section */}
            <div className="pb-4 flex-1">
              <h5 className="text-xs font-medium text-slate-600 mb-3 uppercase tracking-wide">
                Dimensions (inches)
              </h5>

              {/* Width */}
              <div className="mb-3 grid grid-cols-[1fr_2fr]">
                <label
                  htmlFor="width"
                  className="block text-xs font-medium text-slate-700 my-auto"
                >
                  {formData.type_specific_options?.corner_45
                    ? "Face Width"
                    : "Width"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="width"
                  name="width"
                  value={inputValues.width}
                  onChange={handleDimensionChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  min="0"
                  step="1"
                  className={`w-full px-3 py-2 border ${
                    errors.width ? "border-red-500" : "border-slate-300"
                  } rounded-md text-sm`}
                />
                {errors.width && (
                  <p className="text-red-500 text-xs mt-1 col-span-2">
                    {errors.width}
                  </p>
                )}
              </div>

              {/* Height */}
              <div className="mb-3 grid grid-cols-[1fr_2fr]">
                <label
                  htmlFor="height"
                  className="block text-xs font-medium text-slate-700 my-auto"
                >
                  Height <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={inputValues.height}
                  onChange={handleDimensionChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  min="0"
                  step="1"
                  className={`w-full px-3 py-2 border ${
                    errors.height ? "border-red-500" : "border-slate-300"
                  } rounded-md text-sm`}
                />
                {errors.height && (
                  <p className="text-red-500 text-xs mt-1 col-span-2">
                    {errors.height}
                  </p>
                )}
              </div>

              {/* Depth */}
              <div className="mb-3 grid grid-cols-[1fr_2fr]">
                <label
                  htmlFor="depth"
                  className="block text-xs font-medium text-slate-700 my-auto"
                >
                  {formData.type_specific_options?.corner_45
                    ? "Side Depth"
                    : "Depth"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="depth"
                  name="depth"
                  value={inputValues.depth}
                  onChange={handleDimensionChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  min="0"
                  step="1"
                  className={`w-full px-3 py-2 border ${
                    errors.depth ? "border-red-500" : "border-slate-300"
                  } rounded-md text-sm`}
                />
                {errors.depth && (
                  <p className="text-red-500 text-xs mt-1 col-span-2">
                    {errors.depth}
                  </p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col space-y-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
              >
                Save Cabinet
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Face Divider (More space) */}
        <div className="flex-1 border-l border-slate-200 pl-6">
          {canEditFaces ? (
            <CabinetFaceDivider
              cabinetWidth={formData.width}
              cabinetHeight={formData.height}
              cabinetDepth={formData.depth}
              cabinetStyleId={
                formData.cabinet_style_override &&
                formData.cabinet_style_override !== -1
                  ? formData.cabinet_style_override
                  : cabinetStyleId
              }
              cabinetTypeId={formData.type}
              faceConfig={formData.face_config}
              onSave={handleFaceConfigSave}
              disabled={false}
              onDimensionChange={handleChange}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              <div className="text-center w-[318px]">
                <p className="mb-2">Please fill in all required fields:</p>
                <ul className="text-left inline-block">
                  {!formData.type && <li>• Cabinet Type</li>}
                  {!formData.width && <li>• Width</li>}
                  {!formData.height && <li>• Height</li>}
                  {!formData.depth && <li>• Depth</li>}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

CabinetItemForm.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  cabinetStyleId: PropTypes.number,
  cabinetTypeId: PropTypes.number,
  onDeleteItem: PropTypes.func.isRequired,
  cabinetTypes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const EstimateCabinetManager = ({
  items,
  onUpdateItems,
  onReorderItems,
  onDuplicateItem,
  onMoveItem,
  cabinetStyleId,
  onDeleteItem,
  cabinetTypes,
  currentTaskId,
  currentSectionId,
}) => {
  const columns = [
    { key: "quantity", label: "Qty", width: ITEM_FORM_WIDTHS.QUANTITY },
    {
      key: "interior",
      label: "Interior",
      width: ITEM_FORM_WIDTHS.THREE_FOURTHS,
    },
    { key: "type", label: "Type", width: ITEM_FORM_WIDTHS.DEFAULT },
    { key: "width", label: "Width", width: ITEM_FORM_WIDTHS.DEFAULT },
    { key: "height", label: "Height", width: ITEM_FORM_WIDTHS.DEFAULT },
    { key: "depth", label: "Depth", width: ITEM_FORM_WIDTHS.DEFAULT },
    { key: "actions", label: "Actions", width: ITEM_FORM_WIDTHS.ACTIONS },
  ];

  const handleSaveItem = async (item, itemIndex = -1) => {
    try {
      const updatedItems = [...items];
      if (itemIndex === -1) {
        // New item
        updatedItems.push(item);
      } else {
        // Update existing item
        updatedItems[itemIndex] = item;
      }
      onUpdateItems(updatedItems);
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  const handleDeleteItem = async (itemIndex) => {
    try {
      const itemToDelete = items[itemIndex];
      onDeleteItem(itemToDelete);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleReorderItems = (reorderedItems) => {
    onReorderItems(reorderedItems);
  };

  // Items already have errorState added by EstimateSectionManager
  return (
    <SectionItemList
      items={items}
      columns={columns}
      addButtonText="Add Cabinet Item"
      emptyStateText="No cabinet items added yet. Click the button below to add one."
      onSave={handleSaveItem}
      onDelete={handleDeleteItem}
      onReorder={handleReorderItems}
      onDuplicate={onDuplicateItem}
      onMove={onMoveItem}
      ItemForm={CabinetItemForm}
      formProps={{ cabinetStyleId, onDeleteItem, cabinetTypes }}
      listType={ITEM_TYPES.CABINET.type}
      currentTaskId={currentTaskId}
      currentSectionId={currentSectionId}
    />
  );
};

EstimateCabinetManager.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUpdateItems: PropTypes.func.isRequired,
  onReorderItems: PropTypes.func.isRequired,
  onDuplicateItem: PropTypes.func,
  onMoveItem: PropTypes.func,
  cabinetStyleId: PropTypes.number,
  cabinetTypeId: PropTypes.number,
  onDeleteItem: PropTypes.func.isRequired,
  cabinetTypes: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentTaskId: PropTypes.number,
  currentSectionId: PropTypes.number,
};

export default EstimateCabinetManager;
