import isEqual from "lodash/isEqual";
import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { GridLoader } from "react-spinners";
import { v4 as uuidv4 } from "uuid";

import {
  fetchAccessoriesCatalog,
  saveAccessoriesCatalog,
} from "../../redux/actions/accessories";
import { ACCESSORY_APPLIES_TO_OPTIONS, ACCESSORY_UNITS, ACCESSORY_TYPES } from "../../utils/constants";

import SettingsList from "./SettingsList.jsx";
import SettingsSection from "./SettingsSection.jsx";

const AccessoriesSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const { catalog, glass, insert, hardware, shop_built, organizer, other, loading, error } = useSelector(
    (state) => state.accessories
  );

  // Local state for editing
  const [localCatalog, setLocalCatalog] = useState([]);
  const [originalCatalog, setOriginalCatalog] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [focusItemId, setFocusItemId] = useState(null);
  const inputRefs = useRef({});

  useEffect(() => {
    dispatch(fetchAccessoriesCatalog());
  }, [dispatch]);

  useEffect(() => {
    setLocalCatalog(catalog || []);
    setOriginalCatalog(JSON.parse(JSON.stringify(catalog || [])));
  }, [catalog]);

  const handleCatalogChange = (id, field, value) => {
    setLocalCatalog((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    // Clear error for this field if it exists
    setValidationErrors((prev) => {
      const item = localCatalog.find((i) => i.id === id);
      if (!item) return prev;
      
      const itemKey = `catalog-${item.type}-${id}`;
      if (prev[itemKey]) {
        const { [field]: _, ...remainingErrors } = prev[itemKey];
        if (Object.keys(remainingErrors).length === 0) {
          const { [itemKey]: __, ...rest } = prev;
          return rest;
        }
        return { ...prev, [itemKey]: remainingErrors };
      }
      return prev;
    });
  };

  const handleAddAccessory = (type) => {
    const newItem = {
      id: uuidv4(),
      name: "",
      type: type,
      calculation_type: type === ACCESSORY_TYPES.SHOP_BUILT ? "volume" : "unit",
      applies_to: [],
      width: null,
      height: null,
      depth: null,
      default_price_per_unit: 0,
      matches_room_material: type === ACCESSORY_TYPES.SHOP_BUILT ? true : false,
      material_waste_factor: type === ACCESSORY_TYPES.SHOP_BUILT ? 1.25 : null,
      isNew: true,
    };
    setLocalCatalog((prev) => [...prev, newItem]);
    setFocusItemId(`catalog-${type}-${newItem.id}-name`);
  };

  const handleDeleteAccessory = (id) => {
    setLocalCatalog((prev) => {
      const item = prev.find((item) => item.id === id);
      if (item?.isNew) {
        return prev.filter((item) => item.id !== id);
      } else {
        return prev.map((item) =>
          item.id === id
            ? { ...item, markedForDeletion: !item.markedForDeletion }
            : item
        );
      }
    });
  };

  const handleCancelDeleteAccessory = (id) => {
    setLocalCatalog((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: false } : item
      )
    );
  };

  const validateInputs = () => {
    const newErrors = {};

    localCatalog.forEach((item) => {
      if (item.markedForDeletion) return;

      const itemErrors = {};
      if (!item.name || item.name.trim() === "") {
        itemErrors.name = "Name is required";
      }
      if (!item.type) {
        itemErrors.type = "Type is required";
      }
      if (!item.calculation_type) {
        itemErrors.calculation_type = "Calculation type is required";
      }
      // if (!item.applies_to || item.applies_to.length === 0) {
      //   itemErrors.applies_to = "At least one application is required";
      // }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[`catalog-${item.type}-${item.id}`] = itemErrors;
      }
    });

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateInputs()) {
      console.log("Validation failed");
      return;
    }

    try {
      let result;
      if (!isEqual(localCatalog, originalCatalog)) {
        // Clean up numeric fields: convert empty strings to null
        const cleanedCatalog = localCatalog.map((item) => ({
          ...item,
          width: item.width === "" || item.width === null ? null : Number(item.width),
          height: item.height === "" || item.height === null ? null : Number(item.height),
          depth: item.depth === "" || item.depth === null ? null : Number(item.depth),
          default_price_per_unit: item.default_price_per_unit === "" || item.default_price_per_unit === null 
            ? 0 
            : Number(item.default_price_per_unit),
          material_waste_factor: item.material_waste_factor === "" || item.material_waste_factor === null
            ? null
            : Number(item.material_waste_factor),
          matches_room_material: item.matches_room_material || false,
        }));

        result = await dispatch(
          saveAccessoriesCatalog(cleanedCatalog, originalCatalog)
        );

        if (!result || !result.success) {
          throw new Error(
            result?.error || "Failed to save accessories catalog"
          );
        }
      } else {
        result = { success: true, data: localCatalog };
      }

      console.log("Accessories catalog saved successfully");

      if (result.data) {
        setLocalCatalog(result.data);
        setOriginalCatalog(JSON.parse(JSON.stringify(result.data)));
      }

      setValidationErrors({});
    } catch (error) {
      console.error("Error saving accessories catalog:", error);
      throw error;
    }
  };

  const handleCancel = () => {
    setLocalCatalog(JSON.parse(JSON.stringify(originalCatalog)));
    setValidationErrors({});
  };

  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
  }));

  useEffect(() => {
    if (focusItemId && inputRefs.current[focusItemId]) {
      inputRefs.current[focusItemId].focus();
      setFocusItemId(null);
    }
  }, [focusItemId, localCatalog]);

  const getItemErrors = (itemId, type) => {
    return validationErrors[`catalog-${type}-${itemId}`] || {};
  };

  // Accessory type configurations
  const accessoryTypes = [
    { value: "glass", label: "Glass", items: glass },
    { value: "insert", label: "Inserts", items: insert },
    { value: "hardware", label: "Hardware", items: hardware },
    { value: "shop_built", label: "Shop-Built", items: shop_built },
    { value: "organizer", label: "Organizers", items: organizer },
    { value: "other", label: "Other", items: other },
  ];

  const getAccessoriesByType = (type) => {
    return localCatalog.filter((item) => item.type === type);
  };

  // Column definitions for Accessories Catalog (type-specific)
  const getCatalogColumns = (type) => [
    {
      field: "name",
      label: "Name",
      width: "180px",
      type: "text",
      placeholder: "Accessory name",
      hasError: (item) => !!getItemErrors(item.id, type).name,
    },
    {
      field: "calculation_type",
      label: "Calc Type",
      width: "110px",
      render: (item, onChange) => (
        <select
          value={item.calculation_type || "unit"}
          onChange={(e) => onChange("calculation_type", e.target.value)}
          className={`px-2 py-1 bg-slate-700 border ${
            getItemErrors(item.id, type).calculation_type
              ? "border-red-500"
              : "border-slate-600"
          } rounded text-sm text-white w-full`}
          disabled={item.markedForDeletion}
        >
          <option value={ACCESSORY_UNITS.AREA}>Area (sq ft)</option>
          <option value={ACCESSORY_UNITS.LENGTH}>Length (ft)</option>
          <option value={ACCESSORY_UNITS.PERIMETER}>Perimeter (ft)</option>
          <option value={ACCESSORY_UNITS.VOLUME}>Volume (cu ft)</option>
          <option value={ACCESSORY_UNITS.UNIT}>Unit Count</option>
        </select>
      ),
    },
    {
      field: "applies_to",
      label: "Applies To",
      width: "140px",
      render: (item, onChange) => {
        const currentValues = item.applies_to || [];
        const allValues = ACCESSORY_APPLIES_TO_OPTIONS.map((opt) => opt.value);
        const isAllSelected = currentValues.length === allValues.length;
        const displayText = currentValues.length > 0
          ? `${currentValues.length} selected`
          : "None selected";
        
        return (
          <div className="relative group">
            <div
              className={`px-2 py-1 bg-slate-700 border ${
                getItemErrors(item.id, type).applies_to
                  ? "border-red-500"
                  : "border-slate-600"
              } rounded text-sm text-white cursor-pointer`}
            >
              {displayText}
            </div>
            <div className="hidden group-hover:block absolute z-50 mt-1 p-2 bg-slate-700 border border-slate-600 rounded shadow-lg min-w-[180px]">
              {/* Select All Option */}
              <label
                className="flex items-center py-1 px-2 hover:bg-slate-600 rounded cursor-pointer text-sm text-white font-semibold border-b border-slate-600 mb-1"
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => {
                    const newValues = e.target.checked ? allValues : [];
                    onChange("applies_to", newValues);
                  }}
                  disabled={item.markedForDeletion}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Select All
              </label>
              
              {/* Individual Options */}
              {ACCESSORY_APPLIES_TO_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center py-1 px-2 hover:bg-slate-600 rounded cursor-pointer text-sm text-white"
                >
                  <input
                    type="checkbox"
                    checked={currentValues.includes(option.value)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v) => v !== option.value);
                      onChange("applies_to", newValues);
                    }}
                    disabled={item.markedForDeletion}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      field: "width",
      label: "Width",
      width: "70px",
      type: "number",
      placeholder: "",
      allowEmpty: true,
    },
    {
      field: "height",
      label: "Height",
      width: "70px",
      type: "number",
      placeholder: "",
      allowEmpty: true,
    },
    {
      field: "depth",
      label: "Depth",
      width: "70px",
      type: "number",
      placeholder: "",
      allowEmpty: true,
    },
    {
      field: "default_price_per_unit",
      label: "Price/Unit",
      width: "90px",
      type: "number",
      placeholder: "0",
    },
    // Shop-built specific columns
    ...(type === ACCESSORY_TYPES.SHOP_BUILT ? [
      {
        field: "matches_room_material",
        label: "Match Room",
        width: "120px",
        render: (item, onChange) => (
          <label className="flex items-center justify-center cursor-pointer">
            <input
              type="checkbox"
              checked={item.matches_room_material || false}
              onChange={(e) => onChange("matches_room_material", e.target.checked)}
              disabled={item.markedForDeletion}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        ),
      },
      {
        field: "material_waste_factor",
        label: "Waste Factor",
        width: "100px",
        type: "number",
        placeholder: "1.25",
        step: "0.01",
        allowEmpty: true,
      },
    ] : []),
  ];

  return (
    <div className="flex justify-center h-full pb-10">
      <div className={`flex-1 flex flex-col ${maxWidthClass}`}>
        <div className="sticky top-0 z-10 bg-slate-800 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">
              Manage Accessories
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-150px)]">
          {loading && (
            <div className="p-4 text-white">
              <GridLoader color="maroon" size={15} />
              <p>Loading...</p>
            </div>
          )}
          {error && <div className="p-4 text-red-500">Error: {error}</div>}
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-4 mb-4 bg-red-900/50 border border-red-700 rounded-md text-red-400">
              Please fill out all required fields correctly.
            </div>
          )}
          {!loading && !error && (
            <>
              {accessoryTypes.map((typeConfig) => {
                const typeItems = getAccessoriesByType(typeConfig.value);
                return (
                  <SettingsSection
                    key={typeConfig.value}
                    title={typeConfig.label}
                    maxWidthClass={maxWidthClass}
                  >
                    <SettingsList
                      items={typeItems}
                      columns={getCatalogColumns(typeConfig.value)}
                      onDelete={handleDeleteAccessory}
                      onCancelDelete={handleCancelDeleteAccessory}
                      onChange={handleCatalogChange}
                      onAdd={() => handleAddAccessory(typeConfig.value)}
                      addLabel={`+ Add ${typeConfig.label}`}
                      inputRefs={inputRefs}
                      itemPrefix={`catalog-${typeConfig.value}`}
                    />
                  </SettingsSection>
                );
              })}

              {/* TODO: Add time anchors section - one expandable section per accessory */}
              {/* <SettingsSection
                title="Labor Time Settings"
                maxWidthClass={maxWidthClass}
              >
                <div className="p-4 text-slate-400 text-sm">
                  Time anchor configuration per accessory and service will be added here.
                  This will allow you to set minutes per unit for each service type.
                </div>
              </SettingsSection> */}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

AccessoriesSettings.displayName = "AccessoriesSettings";

export default AccessoriesSettings;
