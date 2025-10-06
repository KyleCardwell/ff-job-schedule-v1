import PropTypes from "prop-types";
import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { v4 as uuid } from "uuid";

import {
  CAN_HAVE_PULLS,
  FACE_NAMES,
  ITEM_FORM_WIDTHS,
  SPLIT_DIRECTIONS,
} from "../../utils/constants.js";
import { getCabinetHours } from "../../utils/estimateHelpers.js";

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
  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors.itemsByType
  );
  const cabinetStyles = useSelector((state) => state.cabinetStyles.styles);
  
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
    quantity: item.quantity || 1,
    face_config: getInitialFaceConfig(),
    temp_id: item.temp_id || uuid(),
    id: item.id || undefined,
    finished_interior: item.finished_interior,
    finished_left: item.finished_left,
    finished_right: item.finished_right,
    cabinet_style_override: item.cabinet_style_override,
  });

  // Temporary input values for dimensions that will only update formData on commit
  const [inputValues, setInputValues] = useState({
    width: item.width || "",
    height: item.height || "",
    depth: item.depth || "",
  });

  const [errors, setErrors] = useState({});

  // Sync rootReveals on mount if cabinet_style_override is null
  useEffect(() => {
    // Only run if cabinet_style_override is null (using section default)
    if (
      (item.cabinet_style_override === null ||
        item.cabinet_style_override === undefined) &&
      item.face_config &&
      item.type &&
      cabinetStyles.length > 0
    ) {
      // Find the style and type config for the section's style
      const style = cabinetStyles.find(
        (s) => s.cabinet_style_id === cabinetStyleId
      );
      const typeConfig = style?.types?.find(
        (t) => t.cabinet_type_id === item.type
      );

      // Update rootReveals to match the section's style config
      if (typeConfig?.config) {
        setFormData((prev) => ({
          ...prev,
          face_config: {
            ...prev.face_config,
            rootReveals: typeConfig.config,
          },
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
            (s) => s.cabinet_style_id === effectiveStyleId
          );
          const typeConfig = style?.types?.find(
            (t) => t.cabinet_type_id === effectiveTypeId
          );

          // Build the updates object
          const updates = { [name]: numValue };
          const inputUpdates = {};
          
          // If type is changing, populate default dimensions if empty
          if (name === "type" && numValue) {
            const selectedType = cabinetTypes.find(
              (t) => t.cabinet_type_id === numValue
            );
            
            if (selectedType) {
              if (!formData.width && selectedType.default_width) {
                updates.width = selectedType.default_width;
                inputUpdates.width = String(selectedType.default_width);
              }
              if (!formData.height && selectedType.default_height) {
                updates.height = selectedType.default_height;
                inputUpdates.height = String(selectedType.default_height);
              }
              if (!formData.depth && selectedType.default_depth) {
                updates.depth = selectedType.default_depth;
                inputUpdates.depth = String(selectedType.default_depth);
              }
            }
            
            // Update inputValues if we set any dimension defaults
            if (Object.keys(inputUpdates).length > 0) {
              setInputValues((prev) => ({
                ...prev,
                ...inputUpdates,
              }));
            }
          }

          // Update face_config rootReveals if config exists
          // Only update if face_config already has structure (not null/empty)
          if (typeConfig?.config && formData.face_config && formData.face_config.id) {
            updates.face_config = {
              ...formData.face_config,
              rootReveals: typeConfig.config,
            };
          }
          // For new cabinets (face_config is null), don't set it here
          // Let CabinetFaceDivider initialize it with proper structure
          
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

    if (!formData.quantity || formData.quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
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

      if (formData.face_config) {
        // Determine effective style ID (use override if set, otherwise section default)
        const effectiveStyleId =
          formData.cabinet_style_override &&
          formData.cabinet_style_override !== -1
            ? formData.cabinet_style_override
            : cabinetStyleId;

        const boxSummary = calculateBoxSummary(
          formData.width,
          formData.height,
          formData.depth,
          formData.quantity,
          formData.face_config,
          effectiveStyleId,
          formData.type,
          formData.finished_left,
          formData.finished_right
        );

        finalFormData.face_config = {
          ...formData.face_config,
          faceSummary: calculateFaceSummary(formData.face_config),
          boxSummary: boxSummary,
        };

        finalFormData.cabinetHours = getCabinetHours(
          formData.width,
          formData.height,
          formData.depth,
          formData.finished_interior,
          cabinetAnchors[formData.type]
        );
      }

      onSave(finalFormData);
    }
  };

  // Helper function to round to nearest 1/16"
  const roundTo16th = (value) => {
    return Math.round(value * 16) / 16;
  };

  // Recursive helper to calculate total shelf area from face_config
  const countFaceHardware = (node) => {
    let totalHinges = 0;
    let totalPulls = 0;
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

    if (CAN_HAVE_PULLS.includes(node.type)) {
      totalPulls += 1;
    }

    if (node.children) {
      node.children.forEach((child) => {
        const childResult = countFaceHardware(child);
        totalHinges += childResult.totalHinges;
        totalPulls += childResult.totalPulls;
        totalSlides += childResult.totalSlides;
      });
    }

    return { totalHinges, totalPulls, totalSlides };
  };

  // Recursive helper to calculate total shelf area from face_config
  const calculateShelfArea = (node) => {
    let totalArea = 0;
    let shelfBandingLength = 0;
    let shelfCount = 0;
    let shelfPerimeterLength = 0;

    if (node.shelfQty && node.shelfDimensions) {
      const shelfWidth = roundTo16th(node.shelfDimensions.width);
      const shelfHeight = roundTo16th(node.shelfDimensions.height); // User calls it height, but it's depth
      totalArea += node.shelfQty * (shelfWidth * shelfHeight);
      shelfBandingLength += (node.shelfQty || 0) * shelfWidth;
      shelfCount += node.shelfQty;
      shelfPerimeterLength += node.shelfQty * (2 * (shelfWidth + shelfHeight));
    }

    if (node.children) {
      node.children.forEach((child) => {
        const childResult = calculateShelfArea(child);
        totalArea += childResult.totalArea;
        shelfBandingLength += childResult.shelfBandingLength;
        shelfCount += childResult.shelfCount;
        shelfPerimeterLength += childResult.shelfPerimeterLength;
      });
    }

    return { totalArea, shelfBandingLength, shelfCount, shelfPerimeterLength };
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
                : currentChild.width
            );

            totalArea += partitionWidth * depth;
            // Banding partitions is only for cabinet style 13 (European)
            if (cabStyleId === 13) {
              partitionBandingLength += partitionWidth;
            }
            partitionCount += 1;
            partitionPerimeterLength += 2 * (partitionWidth + depth);

            // double vertical partitions for cabinet style 14 (Inset Face Frame)
            if (cabStyleId === 14 && node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL) {
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

  // Calculate box material summary (sides, top, bottom, back)
  const calculateBoxSummary = (
    width,
    height,
    depth,
    quantity = 1,
    faceConfig,
    cabinetStyleId,
    cabinetTypeId,
    finishedLeft = false,
    finishedRight = false
  ) => {
    // Round dimensions to nearest 1/16"
    const w = roundTo16th(Number(width));
    const h = roundTo16th(Number(height));
    const d = roundTo16th(Number(depth));
    const qty = Number(quantity);

    // Calculate areas for each component (for a single cabinet)
    const sideArea = h * d; // One side panel
    const topBottomArea = w * d; // One top/bottom panel
    const backArea = w * h; // Back panel

    const sidePerimeterLength = 2 * (2 * (h + d));
    const topBottomPerimeterLength = 2 * (2 * (w + d));
    const backPerimeterLength = 2 * (w + h);

    const boxPerimeterLength =
      sidePerimeterLength + topBottomPerimeterLength + backPerimeterLength;
    const boxPartsCount = 5;

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
    } = faceConfig
      ? calculateShelfArea(faceConfig)
      : {
          totalArea: 0,
          shelfBandingLength: 0,
          shelfCount: 0,
          shelfPerimeterLength: 0,
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

    const boxHardware = countFaceHardware(faceConfig);

    // Calculate finished sides area (to be added to face material calculation)
    let finishedSidesCount = 0;
    if (finishedLeft) finishedSidesCount++;
    if (finishedRight) finishedSidesCount++;
    const finishedSidesArea = finishedSidesCount * sideArea;

    // Calculate box sides count (exclude finished sides from box material)
    const boxSidesCount = 2 - finishedSidesCount;

    // Total area calculation for a single cabinet
    const singleCabinetArea =
      boxSidesCount * sideArea +
      2 * topBottomArea +
      backArea +
      totalShelfArea +
      totalPartitionArea;

    // Total area for all cabinets
    // const totalBoxPartsArea = singleCabinetArea * qty;
    const totalBandingLength =
      bandingLength + shelfBandingLength + partitionBandingLength;

    // Count of pieces per cabinet type
    const pieces = {
      sides: boxSidesCount * qty,
      topBottom: 2 * qty,
      back: 1 * qty,
    };

    // Individual dimensions of each piece with quantity factored in
    const components = [
      { type: "side", width: d, height: h, area: sideArea, quantity: boxSidesCount * qty },
      {
        type: "topBottom",
        width: w,
        height: d,
        area: topBottomArea,
        quantity: 2 * qty,
      },
      { type: "back", width: w, height: h, area: backArea, quantity: 1 * qty },
    ];

    const singleBoxPartsCount = boxPartsCount + shelfCount + partitionCount;
    const singleBoxPerimeterLength =
      boxPerimeterLength + shelfPerimeterLength + partitionPerimeterLength;

    return {
      // totalBoxPartsArea,
      pieces,
      components,
      cabinetCount: qty,
      areaPerCabinet: singleCabinetArea,
      partitionArea: totalPartitionArea, // Add for clarity
      bandingLength: totalBandingLength,
      singleBoxPartsCount,
      singleBoxPerimeterLength,
      boxHardware,
      finishedSidesArea: finishedSidesArea, // Area to be calculated with face material
      finishedSidesCount: finishedSidesCount, // Number of finished sides per cabinet
    };
  };

  // Calculate face type summary
  const calculateFaceSummary = (node) => {
    const summary = {};

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
        } else {
          // Handle all other face types normally
          if (!summary[faceType]) {
            summary[faceType] = {
              count: 0,
              totalArea: 0,
              faces: [],
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
          });
        }
      } else {
        // Process children recursively
        node.children.forEach((child) => processNode(child));
      }
    };

    processNode(node);
    return summary;
  };

  const handleFaceConfigSave = useCallback(
    (faceConfig) => {
      // Only update if the face_config has actually changed
      if (JSON.stringify(formData.face_config) !== JSON.stringify(faceConfig)) {
        setFormData((prevData) => ({
          ...prevData,
          face_config: faceConfig,
        }));
      }
    },
    [formData.face_config]
  );

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
        <div className="w-64">
          <h4 className="text-sm font-medium text-slate-700 mb-4">
            Cabinet Details
          </h4>

          <div className="space-y-4">
            {/* Basic Info Section */}
            <div className="pb-4 border-b border-slate-200 flex flex-col">
              <div className="flex gap-2 justify-around">
                {/* Quantity */}
                <div className="mb-3">
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
                    min="1"
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
                <div className="flex flex-col gap-2">
                  {/* Finished Interior */}
                  <div className="flex items-center gap-2 mb-2">
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

                  {/* Finished Left */}
                  <div className="flex items-center gap-2 mb-2">
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
                      Finished Left
                    </label>
                  </div>

                  {/* Finished Right */}
                  <div className="flex items-center gap-2 mb-3">
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
                      Finished Right
                    </label>
                  </div>
                </div>
              </div>

              {/* Cabinet Style */}
              <div>
                <label
                  htmlFor="cabinet_style_override"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Cabinet Style
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

              {/* Cabinet Type */}
              <div className="mt-2">
                <label
                  htmlFor="type"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Cabinet Type <span className="text-red-500">*</span>
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
                  <option value="">Select Cabinet Type</option>
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
            </div>

            {/* Dimensions Section */}
            <div className="pb-4">
              <h5 className="text-xs font-medium text-slate-600 mb-3 uppercase tracking-wide">
                Dimensions (inches)
              </h5>

              {/* Width */}
              <div className="mb-3">
                <label
                  htmlFor="width"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Width <span className="text-red-500">*</span>
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
                  step="0.125"
                  className={`w-full px-3 py-2 border ${
                    errors.width ? "border-red-500" : "border-slate-300"
                  } rounded-md text-sm`}
                />
                {errors.width && (
                  <p className="text-red-500 text-xs mt-1">{errors.width}</p>
                )}
              </div>

              {/* Height */}
              <div className="mb-3">
                <label
                  htmlFor="height"
                  className="block text-xs font-medium text-slate-700 mb-1"
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
                  step="0.125"
                  className={`w-full px-3 py-2 border ${
                    errors.height ? "border-red-500" : "border-slate-300"
                  } rounded-md text-sm`}
                />
                {errors.height && (
                  <p className="text-red-500 text-xs mt-1">{errors.height}</p>
                )}
              </div>

              {/* Depth */}
              <div>
                <label
                  htmlFor="depth"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Depth <span className="text-red-500">*</span>
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
                  step="0.125"
                  className={`w-full px-3 py-2 border ${
                    errors.depth ? "border-red-500" : "border-slate-300"
                  } rounded-md text-sm`}
                />
                {errors.depth && (
                  <p className="text-red-500 text-xs mt-1">{errors.depth}</p>
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
                formData.cabinet_style_override && formData.cabinet_style_override !== -1
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
  cabinetStyleId,
  onDeleteItem,
  cabinetTypes,
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

  return (
    <SectionItemList
      items={items}
      columns={columns}
      addButtonText="Add Cabinet Item"
      emptyStateText="No cabinet items added yet. Click the button below to add one."
      onSave={handleSaveItem}
      onDelete={handleDeleteItem}
      onReorder={handleReorderItems}
      ItemForm={CabinetItemForm}
      formProps={{ cabinetStyleId, onDeleteItem, cabinetTypes }}
    />
  );
};

EstimateCabinetManager.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUpdateItems: PropTypes.func.isRequired,
  onReorderItems: PropTypes.func.isRequired,
  cabinetStyleId: PropTypes.number,
  cabinetTypeId: PropTypes.number,
  onDeleteItem: PropTypes.func.isRequired,
  cabinetTypes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default EstimateCabinetManager;
