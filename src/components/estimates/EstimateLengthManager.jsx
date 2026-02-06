import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuid } from "uuid";

import { fetchLengthsCatalog } from "../../redux/actions/lengths";
import { ITEM_FORM_WIDTHS } from "../../utils/constants.js";

import SectionItemList from "./SectionItemList.jsx";

const LengthItemForm = ({ item = {}, onSave, onCancel, onDeleteItem }) => {
  const dispatch = useDispatch();
  const { catalog, molding, base, shelf, top, other, loading } = useSelector(
    (state) => state.lengths
  );

  const [selectedType, setSelectedType] = useState("");
  const [formData, setFormData] = useState({
    length_catalog_id: item.length_catalog_id || "",
    length: item.length || "",
    quantity: item.quantity != null ? item.quantity : 1,
    miter_count: item.miter_count || 0,
    cutout_count: item.cutout_count || 0,
    temp_id: item.temp_id || uuid(),
    id: item.id || undefined,
  });

  const [errors, setErrors] = useState({});
  const [selectedLengthItem, setSelectedLengthItem] = useState(null);

  // Set initial type if editing existing item
  useEffect(() => {
    if (item.length_catalog_id && catalog.length > 0) {
      const lengthItem = catalog.find((l) => l.id === item.length_catalog_id);
      if (lengthItem) {
        setSelectedType(lengthItem.type);
      }
    }
  }, [item.length_catalog_id, catalog]);

  // Get length items by selected type
  const getLengthsByType = () => {
    if (!selectedType) return [];

    const typeMap = {
      molding,
      base,
      shelf,
      top,
      other,
    };

    return typeMap[selectedType] || [];
  };

  const filteredLengths = getLengthsByType();

  // Update selectedLengthItem when length_catalog_id changes
  useEffect(() => {
    if (formData.length_catalog_id) {
      const lengthItem = catalog.find(
        (l) => l.id === +formData.length_catalog_id
      );
      setSelectedLengthItem(lengthItem || null);
    } else {
      setSelectedLengthItem(null);
    }
  }, [formData.length_catalog_id, catalog]);

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setSelectedType(newType);
    // Reset length selection when type changes
    setFormData({
      ...formData,
      length_catalog_id: "",
    });
  };

  // Reset miter/cutout counts when length item changes and doesn't require them
  useEffect(() => {
    if (selectedLengthItem) {
      const updates = {};
      if (!selectedLengthItem.requires_miters && formData.miter_count > 0) {
        updates.miter_count = 0;
      }
      if (!selectedLengthItem.requires_cutouts && formData.cutout_count > 0) {
        updates.cutout_count = 0;
      }
      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Note: formData values intentionally excluded to prevent infinite loop
  }, [
    selectedLengthItem?.id,
    selectedLengthItem?.requires_miters,
    selectedLengthItem?.requires_cutouts,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle numeric inputs
    if (["quantity", "length", "miter_count", "cutout_count"].includes(name)) {
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

    if (!formData.length_catalog_id) {
      newErrors.length_catalog_id = "Length item is required";
    }

    if (!formData.length || formData.length <= 0) {
      newErrors.length = "Length must be greater than 0";
    }

    if (formData.quantity === null || formData.quantity === undefined || formData.quantity < 0) {
      newErrors.quantity = "Quantity must be 0 or greater";
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
      <h4 className="text-sm font-medium text-slate-700 mb-3">Length Item</h4>

      <div className="flex flex-col space-y-3">
        {/* Type and Item Selects */}
        <div className="space-y-3">
          <div className="flex space-x-3">
            {/* Type Selector */}
            <div className="flex-1">
              <label
                htmlFor="length_type"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Length Type <span className="text-red-500">*</span>
              </label>
              <select
                id="length_type"
                name="length_type"
                value={selectedType}
                onChange={handleTypeChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                disabled={loading}
              >
                <option value="">Select type...</option>
                <option value="molding">Molding</option>
                <option value="base">Base</option>
                <option value="shelf">Shelf</option>
                <option value="top">Top</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Item Selector */}
            <div className="flex-1">
              <label
                htmlFor="length_catalog_id"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Length Item <span className="text-red-500">*</span>
              </label>
              <select
                id="length_catalog_id"
                name="length_catalog_id"
                value={formData.length_catalog_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  errors.length_catalog_id
                    ? "border-red-500"
                    : "border-slate-300"
                } rounded-md text-sm`}
                disabled={
                  loading || filteredLengths.length === 0 || !selectedType
                }
              >
                <option value="">
                  {filteredLengths.length === 0
                    ? "First select a type"
                    : "Select item..."}
                </option>
                {filteredLengths.map((length) => (
                  <option key={length.id} value={length.id}>
                    {length.name}
                  </option>
                ))}
              </select>
              {errors.length_catalog_id && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.length_catalog_id}
                </p>
              )}
            </div>
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-4 gap-3">
            {/* Quantity */}
            <div>
              <label
                htmlFor="quantity"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity || ""}
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

            {/* Length */}
            <div>
              <label
                htmlFor="length"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Length (ft) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="length"
                name="length"
                value={formData.length || ""}
                onChange={handleChange}
                min="0"
                step="0.5"
                className={`w-full px-3 py-2 border ${
                  errors.length ? "border-red-500" : "border-slate-300"
                } rounded-md text-sm`}
              />
              {errors.length && (
                <p className="text-red-500 text-xs mt-1">{errors.length}</p>
              )}
            </div>

            {/* Miter Count */}
            <div>
              <label
                htmlFor="miter_count"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Miters
              </label>
              <input
                type="number"
                id="miter_count"
                name="miter_count"
                value={formData.miter_count || ""}
                onChange={handleChange}
                min="0"
                step="1"
                disabled={!selectedLengthItem?.requires_miters}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            {/* Cutout Count */}
            <div>
              <label
                htmlFor="cutout_count"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Cutouts
              </label>
              <input
                type="number"
                id="cutout_count"
                name="cutout_count"
                value={formData.cutout_count || ""}
                onChange={handleChange}
                min="0"
                step="1"
                disabled={!selectedLengthItem?.requires_cutouts}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>
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
    </div>
  );
};

LengthItemForm.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
};

const EstimateLengthManager = ({
  items,
  onUpdateItems,
  onReorderItems,
  onDuplicateItem,
  onMoveItem,
  onDeleteItem,
  currentTaskId,
  currentSectionId,
}) => {
  const { catalog } = useSelector((state) => state.lengths);

  const getLengthName = (lengthCatalogId) => {
    const lengthItem = catalog.find((l) => l.id === lengthCatalogId);
    return lengthItem ? lengthItem.name : "Unknown";
  };

  const getLengthType = (lengthCatalogId) => {
    const lengthItem = catalog.find((l) => l.id === lengthCatalogId);
    if (!lengthItem) return "Unknown";

    const typeLabels = {
      molding: "Molding",
      base: "Base",
      shelf: "Shelf",
      top: "Top",
      other: "Other",
    };

    return typeLabels[lengthItem.type] || lengthItem.type;
  };

  const columns = [
    {
      key: "type",
      label: "Type",
      width: "100px",
      render: (item) => getLengthType(item.length_catalog_id),
    },
    {
      key: "item",
      label: "Item",
      width: ITEM_FORM_WIDTHS.DEFAULT,
      render: (item) => getLengthName(item.length_catalog_id),
    },
    {
      key: "quantity",
      label: "Qty",
      width: ITEM_FORM_WIDTHS.QUANTITY,
      render: (item) => item.quantity || 0,
    },
    {
      key: "length",
      label: "Length",
      width: "80px",
      render: (item) => (item.length ? `${item.length} ft` : "-"),
    },
    {
      key: "miter_count",
      label: "Miters",
      width: "70px",
      render: (item) => item.miter_count || 0,
    },
    {
      key: "cutout_count",
      label: "Cutouts",
      width: "70px",
      render: (item) => item.cutout_count || 0,
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

  const handleReorderItems = (reorderedItems) => {
    onReorderItems(reorderedItems);
  };

  const getReorderItemName = (item) => {
    const lengthName = getLengthName(item.length_catalog_id);
    const length = item.length ? `${item.length} ft` : "";
    return `${lengthName}${length ? ` - ${length}` : ""}`;
  };

  return (
    <SectionItemList
      items={items}
      columns={columns}
      addButtonText="Add Length Item"
      emptyStateText="No length items added yet. Click the button below to add one."
      onSave={handleSaveItem}
      onDelete={handleDeleteItem}
      onReorder={handleReorderItems}
      onDuplicate={onDuplicateItem}
      onMove={onMoveItem}
      ItemForm={LengthItemForm}
      getReorderItemName={getReorderItemName}
      listType="length"
      currentTaskId={currentTaskId}
      currentSectionId={currentSectionId}
    />
  );
};

EstimateLengthManager.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUpdateItems: PropTypes.func.isRequired,
  onReorderItems: PropTypes.func.isRequired,
  onDuplicateItem: PropTypes.func,
  onMoveItem: PropTypes.func,
  onDeleteItem: PropTypes.func.isRequired,
  currentTaskId: PropTypes.number,
  currentSectionId: PropTypes.number,
};

export default EstimateLengthManager;
