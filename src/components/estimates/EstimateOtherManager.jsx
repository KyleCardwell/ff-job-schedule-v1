import PropTypes from "prop-types";
import { useState } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { v4 as uuid } from "uuid";

import SectionItemList from "./SectionItemList.jsx";

const OtherItemForm = ({ item = {}, onSave, onCancel, onDeleteItem }) => {
  const [formData, setFormData] = useState({
    name: item.name || "",
    quantity: item.quantity ?? 1,
    price: item.price ?? 0,
    temp_id: item.temp_id || uuid(),
    id: item.id || undefined,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle numeric inputs
    if (["quantity", "price"].includes(name)) {
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

    if (formData.quantity === "" || formData.quantity < 0) {
      newErrors.quantity = "Quantity must be 0 or greater";
    }

    if (formData.price === "" || formData.price < 0) {
      newErrors.price = "Cost must be 0 or greater";
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

  const total = (formData.quantity || 0) * (formData.price || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <h4 className="text-sm font-medium text-slate-700 mb-3">
        Other Item
      </h4>

      <div className="grid grid-cols-[1fr,1fr,1fr,1fr] gap-3 items-start">
        {/* Quantity */}
        <div>
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
            step="1"
            className={`w-full px-3 py-2 border ${
              errors.quantity ? "border-red-500" : "border-slate-300"
            } rounded-md text-sm`}
          />
          {errors.quantity && (
            <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
          )}
        </div>

        {/* Name */}
        <div className="col-span-2">
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
            placeholder="Item name..."
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        {/* Cost */}
        <div>
          <label
            htmlFor="price"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Cost <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border ${
              errors.price ? "border-red-500" : "border-slate-300"
            } rounded-md text-sm`}
            placeholder="0.00"
          />
          {errors.price && (
            <p className="text-red-500 text-xs mt-1">{errors.price}</p>
          )}
        </div>
      </div>

      {/* Total Display */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end items-center">
        <span className="text-sm font-medium text-slate-700 mr-2">Total:</span>
        <span className="text-lg font-bold text-teal-600">
          ${total.toFixed(2)}
        </span>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 mt-4">
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
  );
};

OtherItemForm.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
};

const EstimateOtherManager = ({ items, onUpdateItems, onDeleteItem }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const columns = [
    { key: "quantity", label: "Qty", width: ".5fr" },
    { key: "name", label: "Item", width: "2fr" },
    { key: "price", label: "Cost", width: ".75fr", render: (item) => formatCurrency(item.price || 0) },
    { key: "total", label: "Total", width: ".75fr", render: (item) => formatCurrency((item.quantity || 0) * (item.price || 0)) },
    { key: "actions", label: "Actions", width: "0.5fr" },
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
    onUpdateItems(reorderedItems);
  };

  return (
    <SectionItemList
      items={items}
      columns={columns}
      addButtonText="Add Other Item"
      emptyStateText="No other items added yet. Click the button below to add one."
      onSave={handleSaveItem}
      onDelete={handleDeleteItem}
      onReorder={handleReorderItems}
      ItemForm={OtherItemForm}
    />
  );
};

EstimateOtherManager.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUpdateItems: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
};

export default EstimateOtherManager;
