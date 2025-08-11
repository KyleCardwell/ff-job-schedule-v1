import PropTypes from "prop-types";
import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";

import { ITEM_FORM_WIDTHS } from "../../utils/constants.js";
import { getCabinetHours } from "../../utils/estimateHelpers.js";

import CabinetFaceDivider from "./CabinetFaceDivider.jsx";
import SectionItemList from "./SectionItemList.jsx";

const CabinetItemForm = ({ item = {}, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: item.name || "",
    width: item.width || "",
    height: item.height || "",
    depth: item.depth || "",
    quantity: item.quantity || 1,
    face_config: item.face_config || [],
    temp_id: item.temp_id || uuid(),
    id: item.id || undefined,
    finished_interior: item.finished_interior,
  });

  // Temporary input values for dimensions that will only update formData on commit
  const [inputValues, setInputValues] = useState({
    width: item.width || "",
    height: item.height || "",
    depth: item.depth || "",
  });

  const [errors, setErrors] = useState({});

  // Handle regular input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // For non-dimension fields
    if (!["width", "height", "depth"].includes(name)) {
      // Handle quantity as numeric
      if (name === "quantity") {
        const numValue = value === "" ? "" : Number(value);
        setFormData({
          ...formData,
          [name]: numValue,
        });
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

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
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

      if (formData.face_config) {
        const boxSummary = calculateBoxSummary(
          formData.width,
          formData.height,
          formData.depth,
          formData.quantity
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
          formData.finished_interior
        );
      }

      onSave(finalFormData);
    }
  };

  // Helper function to round to nearest 1/16"
  const roundTo16th = (value) => {
    return Math.round(value * 16) / 16;
  };

  // Calculate box material summary (sides, top, bottom, back)
  const calculateBoxSummary = (width, height, depth, quantity = 1) => {
    // Round dimensions to nearest 1/16"
    const w = roundTo16th(Number(width));
    const h = roundTo16th(Number(height));
    const d = roundTo16th(Number(depth));
    const qty = Number(quantity);

    // Calculate areas for each component (for a single cabinet)
    const sideArea = h * d; // One side panel
    const topBottomArea = w * d; // One top/bottom panel
    const backArea = w * h; // Back panel

    // Total area calculation for a single cabinet
    const singleCabinetArea = 2 * sideArea + 2 * topBottomArea + backArea;

    // Total area for all cabinets
    const totalArea = singleCabinetArea * qty;

    // Count of pieces per cabinet type
    const pieces = {
      sides: 2 * qty,
      topBottom: 2 * qty,
      back: 1 * qty,
    };

    // Individual dimensions of each piece with quantity factored in
    const components = [
      { type: "side", width: d, height: h, area: sideArea, quantity: 2 * qty },
      {
        type: "topBottom",
        width: w,
        height: d,
        area: topBottomArea,
        quantity: 2 * qty,
      },
      { type: "back", width: w, height: h, area: backArea, quantity: 1 * qty },
    ];

    return {
      totalArea,
      pieces,
      components,
      cabinetCount: qty,
      areaPerCabinet: singleCabinetArea,
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
        if (faceType === "pair_door") {
          faceType = "door"; // Count as regular doors

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
            faceType === "open" || faceType === "container"
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
      console.log("faceConfig Save");

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
            <div className="pb-4 border-b border-slate-200">
              <div className="flex gap-6 items-center justify-between mb-3">
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

                {/* Finished Interior */}
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
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Finished Interior
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.name ? "border-red-500" : "border-slate-300"
                  } rounded-md text-sm`}
                  placeholder="Base Cabinet, Wall Cabinet, etc."
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
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
          <CabinetFaceDivider
            cabinetWidth={formData.width || 24} // Default width if empty
            cabinetHeight={formData.height || 30} // Default height if empty
            cabinetDepth={formData.depth || 24} // Default depth if empty
            faceConfig={formData.face_config}
            onSave={handleFaceConfigSave}
            disabled={!canEditFaces}
            onDimensionChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
};

CabinetItemForm.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const EstimateCabinetManager = ({ items, onUpdateItems }) => {
  const columns = [
    { key: "quantity", label: "Qty", width: ITEM_FORM_WIDTHS.QUANTITY },
    { key: "interior", label: "Interior", width: ITEM_FORM_WIDTHS.THREE_FOURTHS },
    { key: "name", label: "Cabinet", width: ITEM_FORM_WIDTHS.DEFAULT },
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
      const updatedItems = items.filter((_, index) => index !== itemIndex);
      onUpdateItems(updatedItems);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  return (
    <SectionItemList
      items={items}
      columns={columns}
      addButtonText="Add Cabinet Item"
      emptyStateText="No cabinet items added yet. Click the button below to add one."
      onSave={handleSaveItem}
      onDelete={handleDeleteItem}
      ItemForm={CabinetItemForm}
    />
  );
};

EstimateCabinetManager.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUpdateItems: PropTypes.func.isRequired,
};

export default EstimateCabinetManager;
