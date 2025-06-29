import React, { useState } from "react";
import { useSelector } from "react-redux";
import { FiSave, FiX, FiPlusCircle } from "react-icons/fi";
import EstimateSectionItem from "./EstimateSectionItem";

const EstimateSectionForm = ({ section = {}, onSave, onCancel }) => {
  // Get estimate data from Redux
  const estimateData = useSelector(
    (state) => state.estimates.currentEstimate?.estimate_data
  );

  // Use estimate data if available, otherwise use empty arrays/objects
  const MATERIAL_OPTIONS = estimateData?.materials?.options || [];
  const CABINET_INTERIOR_OPTIONS = estimateData?.boxMaterials?.options || [];
  const STYLE_OPTIONS = estimateData?.styles || [];
  const FINISH_OPTIONS = estimateData?.finishes || [];
  const DOOR_STYLE_OPTIONS = estimateData?.doorStyles?.options || [];
  const DRAWER_FRONT_STYLE_OPTIONS =
    estimateData?.drawerFrontStyles?.options || [];
  const DRAWER_BOX_OPTIONS = estimateData?.drawerBoxTypes || [];
  const DOOR_HINGE_OPTIONS = estimateData?.doorHingeTypes?.options || [];
  const DRAWER_SLIDE_OPTIONS =
    estimateData?.doorHingeTypes?.drawerSlideTypes?.options || [];

  const [formData, setFormData] = useState({
    style: section.style || "",
    cabinetInterior: section.cabinetInterior || "",
    material: section.material || "",
    finish: section.finish || [],
    doorStyle: section.doorStyle || "",
    drawerFrontStyle: section.drawerFrontStyle || "",
    doorInsideMolding: section.doorInsideMolding || false,
    doorOutsideMolding: section.doorOutsideMolding || false,
    drawerInsideMolding: section.drawerInsideMolding || false,
    drawerOutsideMolding: section.drawerOutsideMolding || false,
    doorHinge: section.doorHinge || "",
    drawerSlide: section.drawerSlide || "",
    drawerBoxes: section.drawerBoxes || "",
    notes: section.notes || "",
    items: section.items || [],
  });

  const [errors, setErrors] = useState({});
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleFinishChange = (option) => {
    const updatedFinish = [...formData.finish];

    if (updatedFinish.includes(option)) {
      // Remove option if already selected
      const index = updatedFinish.indexOf(option);
      updatedFinish.splice(index, 1);
    } else {
      // Add option if not already selected
      updatedFinish.push(option);
    }

    setFormData({
      ...formData,
      finish: updatedFinish,
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.style) {
      newErrors.style = "Style is required";
    }

    if (!formData.cabinetInterior) {
      newErrors.cabinetInterior = "Cabinet interior is required";
    }

    if (!formData.material) {
      newErrors.material = "Material is required";
    }

    if (!formData.doorStyle) {
      newErrors.doorStyle = "Door style is required";
    }

    if (!formData.doorHinge) {
      newErrors.doorHinge = "Door hinge type is required";
    }

    if (!formData.drawerSlide) {
      newErrors.drawerSlide = "Drawer slide type is required";
    }

    if (formData.finish.length === 0) {
      newErrors.finish = "At least one finish option is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formData);
    }
  };

  // Handle adding a new item
  const handleAddItem = () => {
    setShowItemForm(true);
    setEditingItemIndex(null);
  };

  // Handle editing an existing item
  const handleEditItem = (index) => {
    setShowItemForm(true);
    setEditingItemIndex(index);
  };

  // Handle saving an item
  const handleSaveItem = (item) => {
    const updatedItems = [...formData.items];

    if (editingItemIndex !== null) {
      // Update existing item
      updatedItems[editingItemIndex] = item;
    } else {
      // Add new item with unique ID
      updatedItems.push({
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });
    }

    setFormData({
      ...formData,
      items: updatedItems,
    });

    setShowItemForm(false);
    setEditingItemIndex(null);
  };

  // Handle deleting an item
  const handleDeleteItem = (index) => {
    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);

    setFormData({
      ...formData,
      items: updatedItems,
    });
  };

  // Handle canceling item form
  const handleCancelItemForm = () => {
    setShowItemForm(false);
    setEditingItemIndex(null);
  };

  return (
    <div className="bg-slate-50 border border-slate-400 rounded-lg p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Details - First Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg border-slate-200 p-2">
            <div className="mb-2">
              <label
                htmlFor="style"
                className="block text-sm font-medium text-slate-700"
              >
                Cabinet Style
              </label>
              <select
                id="style"
                name="style"
                value={formData.style}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md text-sm h-9 ${
                  errors.style ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select style</option>
                {STYLE_OPTIONS.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
              {errors.style && (
                <p className="mt-1 text-xs text-red-500">{errors.style}</p>
              )}
            </div>

            <div className="mb-2">
              <label
                htmlFor="material"
                className="block text-sm font-medium text-slate-700"
              >
                Cabinet Face Material
              </label>
              <select
                id="material"
                name="material"
                value={formData.material}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md text-sm h-9 ${
                  errors.material ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select material</option>
                {MATERIAL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} - ${option.price}/sqft
                  </option>
                ))}
              </select>
              {errors.material && (
                <p className="mt-1 text-xs text-red-500">{errors.material}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="cabinetInterior"
                className="block text-sm font-medium text-slate-700"
              >
                Cabinet Box Material
              </label>
              <select
                id="cabinetInterior"
                name="cabinetInterior"
                value={formData.cabinetInterior}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md text-sm h-9 ${
                  errors.cabinetInterior ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select interior</option>
                {CABINET_INTERIOR_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} - ${option.price}/sqft
                  </option>
                ))}
              </select>
              {errors.cabinetInterior && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.cabinetInterior}
                </p>
              )}
            </div>
          </div>
          <div className="border rounded-lg border-slate-200 p-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Finish
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {FINISH_OPTIONS.map((option) => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.finish.includes(option)}
                    onChange={() => handleFinishChange(option)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-slate-600">{option}</span>
                </label>
              ))}
            </div>
            {errors.finish && (
              <p className="mt-1 text-xs text-red-500">{errors.finish}</p>
            )}
          </div>
        </div>

        {/* Door and Drawer Styles - Second Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Door Style with Moldings */}
          <div className="border rounded-lg border-slate-200 p-2">
            <div className="space-y-2 mb-4">
              <label
                htmlFor="doorStyle"
                className="block text-sm font-medium text-slate-700"
              >
                Door Style
              </label>
              <select
                id="doorStyle"
                name="doorStyle"
                value={formData.doorStyle}
                onChange={handleChange}
                className={`block w-full rounded-md text-sm h-9  ${
                  errors.doorStyle ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select door style</option>
                {DOOR_STYLE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {errors.doorStyle && (
                <p className="text-xs text-red-500">{errors.doorStyle}</p>
              )}
            </div>

            <div className="flex gap-4 mb-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  name="doorInsideMolding"
                  checked={formData.doorInsideMolding}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "doorInsideMolding",
                        value: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300"
                />
                <span>Inside Molding</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  name="doorOutsideMolding"
                  checked={formData.doorOutsideMolding}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "doorOutsideMolding",
                        value: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300"
                />
                <span>Outside Molding</span>
              </label>
            </div>
            <div>
              <label
                htmlFor="doorHinge"
                className="block text-sm font-medium text-slate-700"
              >
                Door Hinges
              </label>
              <select
                id="doorHinge"
                name="doorHinge"
                value={formData.doorHinge}
                onChange={handleChange}
                className={`mt-1 block w-full h-9 rounded-md text-sm ${
                  errors.doorHinge ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select hinge type</option>
                {DOOR_HINGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} - ${option.price}/hinge
                  </option>
                ))}
              </select>
              {errors.doorHinge && (
                <p className="mt-1 text-xs text-red-500">{errors.doorHinge}</p>
              )}
            </div>
          </div>

          {/* Drawer Front Style with Moldings */}
          <div className="border rounded-lg border-slate-200 p-2">
            <div className="space-y-2 mb-4">
              <label
                htmlFor="drawerFrontStyle"
                className="block text-sm font-medium text-slate-700"
              >
                Drawer Front Style
              </label>
              <select
                id="drawerFrontStyle"
                name="drawerFrontStyle"
                value={formData.drawerFrontStyle}
                onChange={handleChange}
                className="block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select drawer front style</option>
                {DRAWER_FRONT_STYLE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 mb-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  name="drawerInsideMolding"
                  checked={formData.drawerInsideMolding}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "drawerInsideMolding",
                        value: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300"
                />
                <span>Inside Molding</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  name="drawerOutsideMolding"
                  checked={formData.drawerOutsideMolding}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "drawerOutsideMolding",
                        value: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300"
                />
                <span>Outside Molding</span>
              </label>
            </div>
            <div>
              <label
                htmlFor="drawerSlide"
                className="block text-sm font-medium text-slate-700"
              >
                Drawer Slides
              </label>
              <select
                id="drawerSlide"
                name="drawerSlide"
                value={formData.drawerSlide}
                onChange={handleChange}
                className={`mt-1 block w-full h-9 rounded-md text-sm ${
                  errors.drawerSlide ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select slide type</option>
                {DRAWER_SLIDE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} - ${option.price}/pair
                  </option>
                ))}
              </select>
              {errors.drawerSlide && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.drawerSlide}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notes - Fourth Row */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-slate-700"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="mt-1 p-2 block w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Any special requirements..."
          />
        </div>

        {/* Cabinet Items Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-slate-700">
              Cabinet Items
            </h4>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center"
            >
              <FiPlusCircle className="mr-1" />
              Add Item
            </button>
          </div>

          {formData.items.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              No cabinet items added yet
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {formData.items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="bg-slate-50 border border-slate-200 rounded-md p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-sm font-medium">{item.name}</h5>
                      <p className="text-xs text-slate-500">
                        {item.width}" × {item.height}" × {item.depth}" • Qty:{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditItem(index)}
                        className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(index)}
                        className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showItemForm && (
            <EstimateSectionItem
              item={
                editingItemIndex !== null
                  ? formData.items[editingItemIndex]
                  : {}
              }
              onSave={handleSaveItem}
              onCancel={handleCancelItemForm}
              onDelete={
                editingItemIndex !== null
                  ? () => {
                      handleDeleteItem(editingItemIndex);
                      setShowItemForm(false);
                      setEditingItemIndex(null);
                    }
                  : undefined
              }
            />
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center"
          >
            <FiX className="mr-1" size={12} />
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 flex items-center"
          >
            <FiSave className="mr-1" size={12} />
            Save Section
          </button>
        </div>
      </form>
    </div>
  );
};

export default EstimateSectionForm;
