import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuid } from "uuid";

import { fetchAccessoriesCatalog } from "../../redux/actions/accessories";
import {
  calculateAccessoryQuantity,
  calculateAccessoryPrice,
  filterAccessoriesByContext,
  getUnitLabel,
} from "../../utils/accessoryCalculations";
import { ITEM_FORM_WIDTHS } from "../../utils/constants.js";

import SectionItemList from "./SectionItemList.jsx";

const AccessoryItemForm = ({ item = {}, onSave, onCancel, onDeleteItem }) => {
  const dispatch = useDispatch();
  const { catalog, loading } = useSelector((state) => state.accessories);

  const [formData, setFormData] = useState({
    accessory_catalog_id: item.accessory_catalog_id || "",
    quantity: item.quantity || 1,
    calculated_quantity: item.calculated_quantity || null,
    price: item.price || 0,
    width: item.width || null,
    height: item.height || null,
    depth: item.depth || null,
    notes: item.notes || "",
    temp_id: item.temp_id || uuid(),
    id: item.id || undefined,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchAccessoriesCatalog());
  }, [dispatch]);

  // Auto-calculate when accessory or dimensions change
  useEffect(() => {
    if (formData.accessory_catalog_id && catalog.length > 0) {
      const selectedAccessory = catalog.find(
        (acc) => acc.id === formData.accessory_catalog_id
      );

      if (selectedAccessory) {
        const dimensions = {
          width: formData.width,
          height: formData.height,
          depth: formData.depth,
        };

        const calculatedQty = calculateAccessoryQuantity(
          selectedAccessory,
          dimensions,
          formData.quantity
        );

        const calculatedPrice = calculateAccessoryPrice(
          selectedAccessory,
          calculatedQty
        );

        setFormData((prev) => ({
          ...prev,
          calculated_quantity: calculatedQty,
          price: calculatedPrice,
        }));
      }
    }
  }, [
    formData.accessory_catalog_id,
    formData.width,
    formData.height,
    formData.depth,
    formData.quantity,
    catalog,
  ]);

  const selectedAccessory = catalog.find(
    (acc) => acc.id === formData.accessory_catalog_id
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle numeric inputs
    if (["quantity", "width", "height", "depth"].includes(name)) {
      const numValue = value === "" ? null : Number(value);
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

    if (!formData.accessory_catalog_id) {
      newErrors.accessory_catalog_id = "Accessory type is required";
    }

    if (!formData.quantity || formData.quantity < 0) {
      newErrors.quantity = "Quantity must be at least 0";
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

  // Get standalone accessories
  const standaloneAccessories = filterAccessoriesByContext(
    catalog,
    "standalone"
  );

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <h4 className="text-sm font-medium text-slate-700 mb-3">
        Accessory Item
      </h4>

      <div className="flex flex-col">
        <div className="space-y-3">
          {/* Accessory Selector */}
          <div>
            <label
              htmlFor="accessory_catalog_id"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Accessory Type <span className="text-red-500">*</span>
            </label>
            <select
              id="accessory_catalog_id"
              name="accessory_catalog_id"
              value={formData.accessory_catalog_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                errors.accessory_catalog_id
                  ? "border-red-500"
                  : "border-slate-300"
              } rounded-md text-sm`}
              disabled={loading}
            >
              <option value="">Select accessory...</option>
              {standaloneAccessories.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({getUnitLabel(acc.calculation_type)})
                </option>
              ))}
            </select>
            {errors.accessory_catalog_id && (
              <p className="text-red-500 text-xs mt-1">
                {errors.accessory_catalog_id}
              </p>
            )}
          </div>

          {/* Show accessory details */}
          {selectedAccessory && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <p>
                <strong>Type:</strong> {selectedAccessory.type}
              </p>
              <p>
                <strong>Calculation:</strong>{" "}
                {selectedAccessory.calculation_type}
              </p>
              {selectedAccessory.default_price_per_unit && (
                <p>
                  <strong>Price:</strong> $
                  {selectedAccessory.default_price_per_unit}/
                  {getUnitLabel(selectedAccessory.calculation_type)}
                </p>
              )}
              {selectedAccessory.description && (
                <p className="mt-1">{selectedAccessory.description}</p>
              )}
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label
              htmlFor="quantity"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              {selectedAccessory?.calculation_type === "unit"
                ? "Quantity"
                : "Base Quantity"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`w-full px-3 py-2 border ${
                errors.quantity ? "border-red-500" : "border-slate-300"
              } rounded-md text-sm`}
              readOnly={
                selectedAccessory?.calculation_type !== "unit" &&
                !selectedAccessory?.width &&
                !selectedAccessory?.height
              }
            />
            {errors.quantity && (
              <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
            )}
          </div>

          {/* Dimension inputs for area/length/perimeter calculations */}
          {selectedAccessory &&
            selectedAccessory.calculation_type !== "unit" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Width (in)
                  </label>
                  <input
                    type="number"
                    name="width"
                    value={formData.width || ""}
                    onChange={handleChange}
                    step="0.0625"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Height (in)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height || ""}
                    onChange={handleChange}
                    step="0.0625"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Depth (in)
                  </label>
                  <input
                    type="number"
                    name="depth"
                    value={formData.depth || ""}
                    onChange={handleChange}
                    step="0.0625"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            )}

          {/* Calculated Quantity Display */}
          {selectedAccessory && formData.calculated_quantity !== null && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p>
                <strong>Calculated:</strong> {formData.calculated_quantity}{" "}
                {getUnitLabel(selectedAccessory.calculation_type)}
              </p>
              {formData.price > 0 && (
                <p>
                  <strong>Price:</strong> ${formData.price.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
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
              placeholder="Optional notes..."
            />
          </div>
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
  const { catalog } = useSelector((state) => state.accessories);

  const getAccessoryName = (accessoryCatalogId) => {
    const accessory = catalog.find((acc) => acc.id === accessoryCatalogId);
    return accessory ? accessory.name : "Unknown";
  };

  const columns = [
    {
      key: "accessory",
      label: "Accessory",
      width: ITEM_FORM_WIDTHS.DEFAULT,
      render: (item) => getAccessoryName(item.accessory_catalog_id),
    },
    {
      key: "calculated_quantity",
      label: "Qty",
      width: ITEM_FORM_WIDTHS.QUANTITY,
      render: (item) => {
        const accessory = catalog.find(
          (acc) => acc.id === item.accessory_catalog_id
        );
        const qty = item.calculated_quantity || item.quantity;
        return accessory
          ? `${qty} ${getUnitLabel(accessory.calculation_type)}`
          : qty;
      },
    },
    {
      key: "price",
      label: "Price",
      width: ITEM_FORM_WIDTHS.QUANTITY,
      render: (item) => (item.price ? `$${item.price.toFixed(2)}` : "-"),
    },
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
