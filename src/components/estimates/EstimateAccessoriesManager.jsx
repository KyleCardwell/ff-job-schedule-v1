import PropTypes from "prop-types";
import { useState } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { v4 as uuid } from "uuid";

import { ITEM_FORM_WIDTHS } from "../../utils/constants.js";

import SectionItemList from "./SectionItemList.jsx";

const AccessoryItemForm = ({ item = {}, onSave, onCancel, onDeleteItem }) => {
  const [formData, setFormData] = useState({
    name: item.name || "",
    quantity: item.quantity || 1,
    // notes: item.notes || "",
    temp_id: item.temp_id || uuid(),
    id: item.id || undefined,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle numeric inputs
    if (["quantity"].includes(name)) {
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

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <h4 className="text-sm font-medium text-slate-700 mb-3">
        Accessory Item
      </h4>

      <div className="flex flex-col">
        <div className="grid grid-cols-2 gap-4">
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
              } rounded-md text-sm`}
            />
            {errors.quantity && (
              <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
            )}
          </div>
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
              placeholder="Hinges, Pulls, etc."
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Notes
        <div className="mb-4">
          <label
            htmlFor="notes"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            placeholder="Optional notes about this accessory..."
          />
        </div> */}
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
  );
};

AccessoryItemForm.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
};

const EstimateAccessoriesManager = ({ items, onUpdateItems, onReorderItems, onDeleteItem }) => {
  const columns = [
    { key: "quantity", label: "Qty", width: ITEM_FORM_WIDTHS.QUANTITY },
    { key: "name", label: "Accessory", width: ITEM_FORM_WIDTHS.DEFAULT },
    // { key: "notes", label: "Notes", width: "1fr" },
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

  const handleReorderItems = (orderedIds) => {
    onReorderItems(orderedIds);
  };

  return (
    <SectionItemList
      items={items}
      columns={columns}
      addButtonText="Add Accessory Item"
      emptyStateText="No accessory items added yet. Click the button below to add one."
      onSave={handleSaveItem}
      onDelete={handleDeleteItem}
      onReorder={handleReorderItems}
      ItemForm={AccessoryItemForm}
    />
  );
};

EstimateAccessoriesManager.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUpdateItems: PropTypes.func.isRequired,
  onReorderItems: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
};

export default EstimateAccessoriesManager;
