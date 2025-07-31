import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { v4 as uuid } from "uuid";

import { ITEM_FORM_WIDTHS } from "../../utils/constants.js";

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
  });

  const [errors, setErrors] = useState({});
  const [showFaceDivider, setShowFaceDivider] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle numeric inputs
    if (["width", "height", "depth", "quantity"].includes(name)) {
      const numValue = value === "" ? "" : Number(value);
      setFormData({
        ...formData,
        [name]: numValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
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

    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleFaceConfigSave = (faceConfig) => {
    setFormData({
      ...formData,
      face_config: faceConfig,
    });
    setShowFaceDivider(false);
  };

  const canShowFaceDivider =
    formData.width &&
    formData.height &&
    formData.depth &&
    !errors.width &&
    !errors.height &&
    !errors.depth;

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <div className="flex">
        {/* Left side - Form */}
        <div className="flex-1 pr-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">
            Cabinet Item
          </h4>

          <div>
            {/* Name */}
            <div className="mb-3">
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

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {/* Width */}
              <div>
                <label
                  htmlFor="width"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Width (in) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="width"
                  name="width"
                  value={formData.width}
                  onChange={handleChange}
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
              <div>
                <label
                  htmlFor="height"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Height (in) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
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
                  Depth (in) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="depth"
                  name="depth"
                  value={formData.depth}
                  onChange={handleChange}
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

            {/* Quantity */}
            <div className="mb-4">
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
                } rounded-md text-sm`}
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Face Configuration */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-slate-700">
                  Face Configuration
                </label>
                <button
                  type="button"
                  onClick={() => canShowFaceDivider && setShowFaceDivider(!showFaceDivider)}
                  disabled={!canShowFaceDivider}
                  className={`px-2 py-1 text-xs rounded ${
                    canShowFaceDivider
                      ? "text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      : "text-slate-400 cursor-not-allowed bg-slate-50"
                  }`}
                  title={!canShowFaceDivider ? "Please enter valid width, height, and depth first" : ""}
                >
                  {showFaceDivider ? "Hide Designer" : "Design Face"}
                </button>
              </div>
              {!canShowFaceDivider && (
                <div className="text-xs text-slate-500 mb-2">
                  Enter width, height, and depth to design the cabinet face
                </div>
              )}
              {formData.face_config && formData.face_config.length > 0 && (
                <div className="text-xs text-slate-500 mb-2">
                  Face configured with{" "}
                  {Array.isArray(formData.face_config) 
                    ? formData.face_config.reduce((total, row) => total + row.length, 0)
                    : "custom layout"
                  }{" "}
                  sections
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center"
              >
                <FiX className="mr-1" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center"
              >
                <FiSave className="mr-1" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Face Divider */}
        {showFaceDivider && canShowFaceDivider && (
          <div className="w-80 border-l border-slate-200 pl-4">
            <CabinetFaceDivider
              cabinetWidth={formData.width}
              cabinetHeight={formData.height}
              faceConfig={formData.face_config}
              onSave={handleFaceConfigSave}
              onCancel={() => setShowFaceDivider(false)}
            />
          </div>
        )}
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
