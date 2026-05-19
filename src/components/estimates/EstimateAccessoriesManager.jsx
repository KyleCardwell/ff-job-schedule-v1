import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuid } from "uuid";

import useMathInput from "../../hooks/useMathInput";
import { fetchAccessoriesCatalog } from "../../redux/actions/accessories";
import {
  fetchHinges,
  fetchPulls,
  fetchSlides,
} from "../../redux/actions/hardware";
import { getUnitLabel } from "../../utils/accessoryCalculations";
import { ITEM_FORM_WIDTHS } from "../../utils/constants.js";
import { decimalToFraction } from "../../utils/mathUtils";

import SectionItemList from "./SectionItemList.jsx";

const AccessoryItemForm = ({ item = {}, onSave, onCancel }) => {
  const dispatch = useDispatch();
  const {
    catalog,
    glass,
    insert,
    hardware: hardwareAccessories,
    shop_built,
    organizer,
    other,
    loading,
  } = useSelector((state) => state.accessories);
  const {
    pulls,
    hinges,
    slides,
    loading: hardwareLoading,
  } = useSelector((state) => state.hardware);

  const [selectedType, setSelectedType] = useState("");
  const [formData, setFormData] = useState({
    accessory_catalog_id:
      item.accessory_catalog_id !== undefined && item.accessory_catalog_id !== null
        ? item.accessory_catalog_id
        : null,
    hardware_pull_id:
      item.hardware_pull_id !== undefined && item.hardware_pull_id !== null
        ? item.hardware_pull_id
        : null,
    hardware_hinge_id:
      item.hardware_hinge_id !== undefined && item.hardware_hinge_id !== null
        ? item.hardware_hinge_id
        : null,
    hardware_slide_id:
      item.hardware_slide_id !== undefined && item.hardware_slide_id !== null
        ? item.hardware_slide_id
        : null,
    quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : 1,
    width: item.width !== undefined && item.width !== null ? item.width : "",
    height: item.height !== undefined && item.height !== null ? item.height : "",
    depth: item.depth !== undefined && item.depth !== null ? item.depth : "",
    temp_id: item.temp_id || uuid(),
    id: item.id !== undefined ? item.id : undefined,
  });

  const [errors, setErrors] = useState({});

  const mathInput = useMathInput(
    {
      width: item.width,
      height: item.height,
      depth: item.depth,
      quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : 1,
    },
    (fieldName, numValue) => {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: numValue !== null ? numValue : "",
      }));
    },
    { fractionalFields: ["width", "height", "depth"] }
  );

  useEffect(() => {
    dispatch(fetchAccessoriesCatalog());
    dispatch(fetchHinges());
    dispatch(fetchPulls());
    dispatch(fetchSlides());
  }, [dispatch]);

  // Set initial type if editing existing item
  useEffect(() => {
    if (item.hardware_pull_id) {
      setSelectedType("pulls");
      return;
    }

    if (item.hardware_hinge_id) {
      setSelectedType("hinges");
      return;
    }

    if (item.hardware_slide_id) {
      setSelectedType("slides");
      return;
    }

    if (item.accessory_catalog_id && catalog.length > 0) {
      const accessory = catalog.find(
        (acc) => acc.id === item.accessory_catalog_id
      );
      if (accessory) {
        setSelectedType(accessory.type);
      }
    }
  }, [
    item.accessory_catalog_id,
    item.hardware_hinge_id,
    item.hardware_pull_id,
    item.hardware_slide_id,
    catalog,
  ]);


  const selectedAccessory = catalog.find(
    (acc) => acc.id === formData.accessory_catalog_id
  );

  const getSelectedReferenceId = () => {
    if (selectedType === "pulls") return formData.hardware_pull_id;
    if (selectedType === "hinges") return formData.hardware_hinge_id;
    if (selectedType === "slides") return formData.hardware_slide_id;
    return formData.accessory_catalog_id;
  };

  // Get accessories by selected type
  const getAccessoriesByType = () => {
    if (!selectedType) return [];

    const typeMap = {
      glass,
      insert,
      hardware: hardwareAccessories,
      shop_built,
      organizer,
      other,
      pulls,
      hinges,
      slides,
    };

    // Return all accessories of the selected type (no filtering by context)
    return typeMap[selectedType] || [];
  };

  const filteredAccessories = getAccessoriesByType();

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setSelectedType(newType);
    // Reset accessory selection when type changes
    setFormData((prev) => ({
      ...prev,
      accessory_catalog_id: null,
      hardware_pull_id: null,
      hardware_hinge_id: null,
      hardware_slide_id: null,
    }));
    if (errors.accessory_catalog_id) {
      setErrors((prev) => ({
        ...prev,
        accessory_catalog_id: "",
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle math-enabled numeric inputs
    if (["quantity", "width", "height", "depth"].includes(name)) {
      mathInput.handleChange(name, value);
      // Clear error when field is updated
      if (errors[name]) {
        setErrors({
          ...errors,
          [name]: "",
        });
      }
      return;
    } else if (name === "accessory_catalog_id") {
      const numValue = value === "" ? null : Number(value);

      if (selectedType === "pulls") {
        setFormData({
          ...formData,
          accessory_catalog_id: null,
          hardware_pull_id: numValue,
          hardware_hinge_id: null,
          hardware_slide_id: null,
        });
      } else if (selectedType === "hinges") {
        setFormData({
          ...formData,
          accessory_catalog_id: null,
          hardware_pull_id: null,
          hardware_hinge_id: numValue,
          hardware_slide_id: null,
        });
      } else if (selectedType === "slides") {
        setFormData({
          ...formData,
          accessory_catalog_id: null,
          hardware_pull_id: null,
          hardware_hinge_id: null,
          hardware_slide_id: numValue,
        });
      } else {
        setFormData({
          ...formData,
          accessory_catalog_id: numValue,
          hardware_pull_id: null,
          hardware_hinge_id: null,
          hardware_slide_id: null,
        });
      }
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

    if (
      !formData.accessory_catalog_id
      && !formData.hardware_pull_id
      && !formData.hardware_hinge_id
      && !formData.hardware_slide_id
    ) {
      newErrors.accessory_catalog_id = "Accessory item is required";
    }

    if (formData.quantity === null || formData.quantity === undefined || formData.quantity < 0) {
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

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <h4 className="text-sm font-medium text-slate-700 mb-3">
        Accessory Item
      </h4>

      <div className="flex flex-col space-y-3">
        <div className="space-y-3">
          <div className="flex space-x-3">
            {/* Type Selector */}
            <div className="flex-1">
              <label
                htmlFor="accessory_type"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Accessory Type <span className="text-red-500">*</span>
              </label>
              <select
                id="accessory_type"
                name="accessory_type"
                value={selectedType}
                onChange={handleTypeChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                disabled={loading}
              >
                <option value="">Select type...</option>
                <option value="glass">Glass</option>
                <option value="insert">Inserts</option>
                <option value="hardware">Hardware</option>
                <option value="pulls">Pulls</option>
                <option value="hinges">Hinges</option>
                <option value="slides">Slides</option>
                <option value="shop_built">Shop-Built</option>
                <option value="organizer">Organizers</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex-1">
              <label
                htmlFor="accessory_catalog_id"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Accessory Item <span className="text-red-500">*</span>
              </label>
              <select
                id="accessory_catalog_id"
                name="accessory_catalog_id"
                value={getSelectedReferenceId() || ""}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  errors.accessory_catalog_id
                    ? "border-red-500"
                    : "border-slate-300"
                } rounded-md text-sm`}
                disabled={
                  loading
                  || hardwareLoading
                  || filteredAccessories.length === 0
                  || !selectedType
                }
              >
                <option value="">
                  {filteredAccessories.length === 0
                    ? "First select a type"
                    : "Select accessory..."}
                </option>
                {filteredAccessories.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({["pulls", "hinges", "slides"].includes(selectedType)
                      ? "unit"
                      : getUnitLabel(acc.calculation_type)})
                  </option>
                ))}
              </select>
              {errors.accessory_catalog_id && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.accessory_catalog_id}
                </p>
              )}
            </div>
          </div>

          {/* Shop-built material matching info */}
          {selectedAccessory?.matches_room_material && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Material Matching:</span> This shop-built item will use the room&apos;s face material for pricing and finish multipliers for labor.
              </p>
            </div>
          )}

          {/* Dimensions Grid - Always visible */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Width (in)
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="width"
                value={mathInput.inputValues.width || ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("width")}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Height (in)
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="height"
                value={mathInput.inputValues.height || ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("height")}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Depth (in)
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="depth"
                value={mathInput.inputValues.depth || ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("depth")}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                name="quantity"
                value={mathInput.inputValues.quantity}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("quantity")}
                className={`w-full px-3 py-2 border ${
                  errors.quantity ? "border-red-500" : "border-slate-300"
                } rounded-md text-sm`}
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
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

AccessoryItemForm.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const EstimateAccessoriesManager = ({
  items,
  onUpdateItems,
  onReorderItems,
  onDuplicateItem,
  onMoveItem,
  onDeleteItem,
  currentTaskId,
  currentSectionId,
}) => {
  const { catalog } = useSelector((state) => state.accessories);
  const { pulls, hinges, slides } = useSelector((state) => state.hardware);

  const getAccessoryName = (item) => {
    if (item.hardware_pull_id) {
      return pulls.find((pull) => pull.id === item.hardware_pull_id)?.name || "Unknown";
    }

    if (item.hardware_hinge_id) {
      return hinges.find((hinge) => hinge.id === item.hardware_hinge_id)?.name || "Unknown";
    }

    if (item.hardware_slide_id) {
      return slides.find((slide) => slide.id === item.hardware_slide_id)?.name || "Unknown";
    }

    const accessory = catalog.find((acc) => acc.id === item.accessory_catalog_id);
    return accessory ? accessory.name : "Unknown";
  };

  const getAccessoryType = (item) => {
    if (item.hardware_pull_id) return "Pull";
    if (item.hardware_hinge_id) return "Hinge";
    if (item.hardware_slide_id) return "Slide";

    const accessory = catalog.find((acc) => acc.id === item.accessory_catalog_id);
    if (!accessory) return "Unknown";

    const typeLabels = {
      glass: "Glass",
      insert: "Insert",
      hardware: "Hardware",
      shop_built: "Shop-Built",
      organizer: "Organizer",
      other: "Other",
    };

    return typeLabels[accessory.type] || accessory.type;
  };

  const columns = [
    {
      key: "quantity",
      label: "Qty",
      width: ITEM_FORM_WIDTHS.QUANTITY,
      render: (item) => item.quantity || 0,
    },
    {
      key: "type",
      label: "Type",
      width: "100px",
      render: (item) => getAccessoryType(item),
    },
    {
      key: "accessory",
      label: "Accessory",
      width: ITEM_FORM_WIDTHS.DEFAULT,
      render: (item) => getAccessoryName(item),
    },
    {
      key: "width",
      label: "W",
      width: "60px",
      render: (item) => (item.width ? decimalToFraction(item.width) : "-"),
    },
    {
      key: "height",
      label: "H",
      width: "60px",
      render: (item) => (item.height ? decimalToFraction(item.height) : "-"),
    },
    {
      key: "depth",
      label: "D",
      width: "60px",
      render: (item) => (item.depth ? decimalToFraction(item.depth) : "-"),
    },
    { key: "actions", label: "Actions", width: ITEM_FORM_WIDTHS.ACTIONS },
  ];

  const handleSaveItem = async (item, itemIndex = -1) => {
    try {
      // Clean up numeric fields: convert empty strings to null
      const cleanedItem = {
        ...item,
        width: item.width === "" || item.width === null || item.width === undefined ? null : Number(item.width),
        height: item.height === "" || item.height === null || item.height === undefined ? null : Number(item.height),
        depth: item.depth === "" || item.depth === null || item.depth === undefined ? null : Number(item.depth),
        quantity: item.quantity != null ? Number(item.quantity) : 1,
      };

      const updatedItems = [...items];
      if (itemIndex === -1) {
        // New item
        updatedItems.push(cleanedItem);
      } else {
        // Update existing item
        updatedItems[itemIndex] = cleanedItem;
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

  const getReorderItemName = (item) => {
    return getAccessoryName(item) || "Accessory";
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
      getReorderItemName={getReorderItemName}
      onDuplicate={onDuplicateItem}
      onMove={onMoveItem}
      ItemForm={AccessoryItemForm}
      listType="accessory"
      currentTaskId={currentTaskId}
      currentSectionId={currentSectionId}
    />
  );
};

EstimateAccessoriesManager.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUpdateItems: PropTypes.func.isRequired,
  onReorderItems: PropTypes.func.isRequired,
  onDuplicateItem: PropTypes.func,
  onMoveItem: PropTypes.func,
  onDeleteItem: PropTypes.func.isRequired,
  currentTaskId: PropTypes.number,
  currentSectionId: PropTypes.number,
};

export default EstimateAccessoriesManager;
