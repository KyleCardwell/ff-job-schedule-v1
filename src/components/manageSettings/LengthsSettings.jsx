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
  fetchLengthsCatalog,
  saveLengthsCatalog,
  saveLengthServices,
} from "../../redux/actions/lengths";
import { LENGTH_TYPES } from "../../utils/constants";

import GenerateSettingsPdf from "./GenerateSettingsPdf.jsx";
import SettingsList from "./SettingsList.jsx";
import SettingsSection from "./SettingsSection.jsx";

const LengthsSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const { catalog, molding, base, shelf, top, other, loading, error } = useSelector(
    (state) => state.lengths
  );
  const { allServices } = useSelector((state) => state.services);

  // Local state for editing
  const [localCatalog, setLocalCatalog] = useState([]);
  const [originalCatalog, setOriginalCatalog] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [focusItemId, setFocusItemId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRefs = useRef({});

  // Service time state management (following hardware pattern)
  const [lengthServicesMap, setLengthServicesMap] = useState({});

  useEffect(() => {
    dispatch(fetchLengthsCatalog());
  }, [dispatch]);

  useEffect(() => {
    if (isSaving) return; // Don't update during save
    
    setLocalCatalog(catalog || []);
    setOriginalCatalog(JSON.parse(JSON.stringify(catalog || [])));

    // Build service times map from embedded services
    const servicesMap = {};
    (catalog || []).forEach((length) => {
      (length.services || []).forEach((service) => {
        const isMiterTime = service.is_miter_time || false;
        const isCutoutTime = service.is_cutout_time || false;
        // Create unique key: regular, miter, or cutout
        let timeType = 'regular';
        if (isMiterTime) timeType = 'miter';
        else if (isCutoutTime) timeType = 'cutout';
        
        const key = `${length.id}-${service.service_id}-${timeType}`;
        servicesMap[key] = service.time_per_unit;
      });
    });
    setLengthServicesMap(servicesMap);
  }, [catalog, isSaving]);

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

  const handleAddLength = (type) => {
    const newItem = {
      id: uuidv4(),
      name: "",
      type: type,
      requires_miters: false,
      requires_cutouts: false,
      default_width: null,
      default_thickness: null,
      description: "",
      isNew: true,
    };
    setLocalCatalog((prev) => [...prev, newItem]);
    setFocusItemId(`catalog-${type}-${newItem.id}-name`);
  };

  const handleDeleteLength = (id) => {
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

  const handleCancelDeleteLength = (id) => {
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

    // Prevent useEffect from updating local state during save
    setIsSaving(true);

    try {
      let result;
      if (!isEqual(localCatalog, originalCatalog)) {
        // Clean up numeric fields: convert empty strings to null
        const cleanedCatalog = localCatalog.map((item) => ({
          ...item,
          default_width: item.default_width === "" || item.default_width === null 
            ? null 
            : Number(item.default_width),
          default_thickness: item.default_thickness === "" || item.default_thickness === null 
            ? null 
            : Number(item.default_thickness),
        }));

        result = await dispatch(
          saveLengthsCatalog(cleanedCatalog, originalCatalog)
        );

        if (!result || !result.success) {
          throw new Error(
            result?.error || "Failed to save lengths catalog"
          );
        }
      } else {
        result = { success: true, data: localCatalog };
      }

      console.log("Lengths catalog saved successfully");

      // Save service times for all length items (including newly saved with fresh IDs)
      const activeServicesList = activeServices || [];
      
      // Helper to find matching item (by name for new items, by ID for existing)
      const findOriginalItem = (savedItem, originalList) => {
        const byId = originalList.find((orig) => orig.id === savedItem.id);
        if (byId && !byId.isNew) return byId;
        return originalList.find((orig) => orig.isNew && orig.name === savedItem.name);
      };

      // Save services for each length item
      for (const length of result.data || []) {
        if (!length.markedForDeletion) {
          const originalLength = findOriginalItem(length, localCatalog);
          const originalId = originalLength?.id || length.id;
          
          // Collect regular time services
          const regularServices = activeServicesList.map((service) => {
            const timeValue = getServiceTime(originalId, service.service_id, 'regular');
            return {
              service_id: service.service_id,
              time_per_unit: timeValue === '' ? 0 : timeValue,
              is_miter_time: false,
              is_cutout_time: false,
            };
          });

          // Collect miter time services (only if requires_miters is true)
          const miterServices = length.requires_miters
            ? activeServicesList.map((service) => {
                const timeValue = getServiceTime(originalId, service.service_id, 'miter');
                return {
                  service_id: service.service_id,
                  time_per_unit: timeValue === '' ? 0 : timeValue,
                  is_miter_time: true,
                  is_cutout_time: false,
                };
              })
            : [];

          // Collect cutout time services (only if requires_cutouts is true)
          const cutoutServices = length.requires_cutouts
            ? activeServicesList.map((service) => {
                const timeValue = getServiceTime(originalId, service.service_id, 'cutout');
                return {
                  service_id: service.service_id,
                  time_per_unit: timeValue === '' ? 0 : timeValue,
                  is_miter_time: false,
                  is_cutout_time: true,
                };
              })
            : [];

          const allServices = [...regularServices, ...miterServices, ...cutoutServices];
          
          const servicesResult = await dispatch(
            saveLengthServices(length.id, allServices)
          );
          
          if (!servicesResult || !servicesResult.success) {
            console.error(`Failed to save services for ${length.name}`);
          }
        }
      }

      // Refetch to get fresh data with services
      await dispatch(fetchLengthsCatalog());

      setValidationErrors({});
    } catch (error) {
      console.error("Error saving lengths catalog:", error);
      throw error;
    } finally {
      setIsSaving(false);
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

  // Service time helpers (following hardware pattern)
  const getServiceTime = (lengthId, serviceId, timeType = 'regular') => {
    // timeType can be 'regular', 'miter', or 'cutout'
    const key = `${lengthId}-${serviceId}-${timeType}`;
    const value = lengthServicesMap[key];
    return value === undefined || value === null ? '' : value;
  };

  const updateServiceTime = (lengthId, serviceId, value, timeType = 'regular') => {
    // timeType can be 'regular', 'miter', or 'cutout'
    const key = `${lengthId}-${serviceId}-${timeType}`;
    setLengthServicesMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Get active services for column generation
  const activeServices = (allServices || []).filter((s) => s.is_active);

  // Length type configurations
  const lengthTypes = [
    { value: LENGTH_TYPES.MOLDING, label: "Molding", items: molding },
    { value: LENGTH_TYPES.BASE, label: "Base", items: base },
    { value: LENGTH_TYPES.SHELF, label: "Shelves", items: shelf },
    { value: LENGTH_TYPES.TOP, label: "Tops", items: top },
    { value: LENGTH_TYPES.OTHER, label: "Other", items: other },
  ];

  const getLengthsByType = (type) => {
    return localCatalog.filter((item) => item.type === type);
  };

  // Helper to create service time columns (regular time per foot)
  const createServiceColumns = () => {
    return activeServices.map((service) => ({
      field: `service_${service.service_id}`,
      label: service.service_name || `Service ${service.service_id}`,
      width: "100px",
      type: "number",
      placeholder: "0",
      render: (item) => (
        <div className="flex flex-col gap-1">
          {/* Regular time per foot */}
          <input
            type="number"
            step="1"
            min="0"
            value={getServiceTime(item.id, service.service_id, 'regular')}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : parseFloat(e.target.value);
              updateServiceTime(item.id, service.service_id, value, 'regular');
            }}
            className="w-full bg-slate-600 text-slate-200 px-2 py-1 rounded"
            placeholder="0"
            disabled={item.markedForDeletion}
            title="Time per foot"
          />
          {/* Miter time (only show if requires_miters is true) */}
          {item.requires_miters && (
            <input
              type="number"
              step="1"
              min="0"
              value={getServiceTime(item.id, service.service_id, 'miter')}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                updateServiceTime(item.id, service.service_id, value, 'miter');
              }}
              className="w-full bg-slate-700 text-amber-300 px-2 py-1 rounded text-sm border border-amber-600"
              placeholder="Per miter"
              disabled={item.markedForDeletion}
              title="Time per miter"
            />
          )}
          {/* Cutout time (only show if requires_cutouts is true) */}
          {item.requires_cutouts && (
            <input
              type="number"
              step="1"
              min="0"
              value={getServiceTime(item.id, service.service_id, 'cutout')}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                updateServiceTime(item.id, service.service_id, value, 'cutout');
              }}
              className="w-full bg-slate-700 text-cyan-300 px-2 py-1 rounded text-sm border border-cyan-600"
              placeholder="Per cutout"
              disabled={item.markedForDeletion}
              title="Time per cutout"
            />
          )}
        </div>
      ),
    }));
  };

  // Column definitions for Lengths Catalog (type-specific)
  const getCatalogColumns = (type) => [
    {
      field: "name",
      label: "Name",
      width: "200px",
      type: "text",
      placeholder: "Length name",
      hasError: (item) => !!getItemErrors(item.id, type).name,
    },
    {
      field: "requires_miters",
      label: "Miters",
      width: "80px",
      render: (item, onChange) => (
        <input
          type="checkbox"
          checked={item.requires_miters || false}
          onChange={(e) => onChange("requires_miters", e.target.checked)}
          disabled={item.markedForDeletion}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      field: "requires_cutouts",
      label: "Cutouts",
      width: "80px",
      render: (item, onChange) => (
        <input
          type="checkbox"
          checked={item.requires_cutouts || false}
          onChange={(e) => onChange("requires_cutouts", e.target.checked)}
          disabled={item.markedForDeletion}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      field: "default_width",
      label: "Width (in)",
      width: "100px",
      type: "number",
      placeholder: "3.5",
      allowEmpty: true,
    },
    {
      field: "default_thickness",
      label: "Thickness (in)",
      width: "110px",
      type: "number",
      placeholder: "0.75",
      allowEmpty: true,
    },
    // {
    //   field: "description",
    //   label: "Description",
    //   width: "200px",
    //   type: "text",
    //   placeholder: "Optional description",
    // },
    ...createServiceColumns(),
  ];

  return (
    <div className="flex justify-center h-full pb-10">
      <div className={`flex-1 flex flex-col ${maxWidthClass}`}>
        <div className="sticky top-0 z-10 bg-slate-800 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">
              Manage Lengths
            </h2>
            <GenerateSettingsPdf
              title="Lengths Settings"
              fileName="Lengths Settings"
              orientation="auto"
              sections={lengthTypes.map((typeConfig) => ({
                label: typeConfig.label,
                columns: [
                  { field: "name", label: "Name", width: "*" },
                  { field: "requires_miters", label: "Miters", width: 45 },
                  { field: "requires_cutouts", label: "Cutouts", width: 50 },
                  { field: "default_width", label: "Width (in)", width: 55 },
                  { field: "default_thickness", label: "Thick (in)", width: 55 },
                  ...activeServices.map((s) => ({
                    field: `_service_${s.service_id}`,
                    label: s.service_name,
                    width: 70,
                    format: (_, item) => {
                      const regular = (item.services || []).find(
                        (sv) => sv.service_id === s.service_id && !sv.is_miter_time && !sv.is_cutout_time
                      );
                      const miter = (item.services || []).find(
                        (sv) => sv.service_id === s.service_id && sv.is_miter_time
                      );
                      const cutout = (item.services || []).find(
                        (sv) => sv.service_id === s.service_id && sv.is_cutout_time
                      );
                      const parts = [];
                      if (regular?.time_per_unit) parts.push(String(regular.time_per_unit));
                      else parts.push("-");
                      if (item.requires_miters) parts.push(`M:${miter?.time_per_unit || 0}`);
                      if (item.requires_cutouts) parts.push(`C:${cutout?.time_per_unit || 0}`);
                      return parts.join(" ");
                    },
                  })),
                ],
                items: getLengthsByType(typeConfig.value),
              }))}
            />
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
              {lengthTypes.map((typeConfig) => {
                const typeItems = getLengthsByType(typeConfig.value);
                return (
                  <SettingsSection
                    key={typeConfig.value}
                    title={typeConfig.label}
                    maxWidthClass={maxWidthClass}
                  >
                    <SettingsList
                      items={typeItems}
                      columns={getCatalogColumns(typeConfig.value)}
                      onDelete={handleDeleteLength}
                      onCancelDelete={handleCancelDeleteLength}
                      onChange={handleCatalogChange}
                      onAdd={() => handleAddLength(typeConfig.value)}
                      addLabel={`+ Add ${typeConfig.label}`}
                      inputRefs={inputRefs}
                      itemPrefix={`catalog-${typeConfig.value}`}
                    />
                  </SettingsSection>
                );
              })}

              {/* TODO: Add time anchors section - one expandable section per length */}
              {/* <SettingsSection
                title="Labor Time Settings"
                maxWidthClass={maxWidthClass}
              >
                <div className="p-4 text-slate-400 text-sm">
                  Time anchor configuration per length and service will be added here.
                  This will allow you to set minutes per foot for each service type.
                </div>
              </SettingsSection> */}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

LengthsSettings.displayName = "LengthsSettings";

export default LengthsSettings;
