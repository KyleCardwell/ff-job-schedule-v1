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
  saveLengthSettings,
} from "../../redux/actions/lengths";
import { LENGTH_TYPES } from "../../utils/constants";
import { LENGTH_RULE_REGISTRY } from "../../utils/lengthRuleEngine";

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

  // Rules state: { [lengthId]: { [ruleKey]: params | null } }
  // null means rule is disabled; object means enabled with those params
  const [rulesMap, setRulesMap] = useState({});

  useEffect(() => {
    dispatch(fetchLengthsCatalog());
  }, [dispatch]);

  useEffect(() => {
    if (isSaving) return; // Don't update during save
    
    setLocalCatalog(catalog || []);
    setOriginalCatalog(JSON.parse(JSON.stringify(catalog || [])));

    // Build service times map from embedded services
    // Key format: "<lengthId>-<serviceId>-<field>" where field is one of:
    //   time_per_unit, miter_minutes, cutout_minutes, base_minutes
    const servicesMap = {};
    (catalog || []).forEach((length) => {
      (length.services || []).forEach((service) => {
        const prefix = `${length.id}-${service.service_id}`;
        servicesMap[`${prefix}-time_per_unit`] = service.time_per_unit;
        servicesMap[`${prefix}-miter_minutes`] = service.miter_minutes;
        servicesMap[`${prefix}-cutout_minutes`] = service.cutout_minutes;
        servicesMap[`${prefix}-base_minutes`] = service.base_minutes;
      });
    });
    setLengthServicesMap(servicesMap);

    // Build rules map from embedded rules
    const rMap = {};
    (catalog || []).forEach((length) => {
      rMap[length.id] = {};
      (length.rules || []).forEach((rule) => {
        rMap[length.id][rule.rule_key] = rule.params || {};
      });
    });
    setRulesMap(rMap);
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
      // Compare only catalog columns (exclude services/rules — managed separately)
      const stripJoined = (items) => items.map(({ services, rules, ...rest }) => rest);
      const catalogChanged = !isEqual(stripJoined(localCatalog), stripJoined(originalCatalog));

      if (catalogChanged) {
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

      // Build batch data for services and rules — only include items that changed
      const activeServicesList = activeServices || [];
      const toNullable = (v) => (v === '' || v === undefined || v === null) ? null : Number(v);

      // Helper to find matching item (by name for new items, by ID for existing)
      const findOriginalItem = (savedItem, originalList) => {
        const byId = originalList.find((orig) => orig.id === savedItem.id);
        if (byId && !byId.isNew) return byId;
        return originalList.find((orig) => orig.isNew && orig.name === savedItem.name);
      };

      // Helper to check if services changed for a length item
      const servicesChanged = (lengthId, originalServices, currentRequiresMiters, currentRequiresCutouts) => {
        for (const service of activeServicesList) {
          const origSvc = (originalServices || []).find((s) => s.service_id === service.service_id);
          const fields = ['time_per_unit', 'base_minutes'];
          if (currentRequiresMiters) fields.push('miter_minutes');
          if (currentRequiresCutouts) fields.push('cutout_minutes');
          
          for (const field of fields) {
            const currentVal = toNullable(getServiceTime(lengthId, service.service_id, field));
            const origVal = origSvc ? toNullable(origSvc[field]) : null;
            if (currentVal !== origVal) return true;
          }
        }
        return false;
      };

      // Helper to check if rules changed for a length item
      const rulesChanged = (lengthId, originalRules) => {
        const currentRules = rulesMap[lengthId] || {};
        const origRulesMap = {};
        (originalRules || []).forEach((r) => { origRulesMap[r.rule_key] = r.params || {}; });
        
        const currentKeys = Object.keys(currentRules).filter((k) => currentRules[k] != null);
        const origKeys = Object.keys(origRulesMap);
        
        if (currentKeys.length !== origKeys.length) return true;
        for (const key of currentKeys) {
          if (!origRulesMap[key] || !isEqual(currentRules[key], origRulesMap[key])) return true;
        }
        return false;
      };

      const rpcItems = [];

      for (const length of result.data || []) {
        if (length.markedForDeletion) continue;

        const originalLength = findOriginalItem(length, localCatalog);
        const originalId = originalLength?.id || length.id;
        
        // Find the original catalog item to compare services/rules
        const origCatalogItem = originalCatalog.find((c) => c.id === originalId);
        
        // Skip if neither services nor rules changed (and not a new item)
        const isNewItem = originalLength?.isNew || !origCatalogItem;
        const svcChanged = servicesChanged(originalId, origCatalogItem?.services, length.requires_miters, length.requires_cutouts);
        const ruleChanged = rulesChanged(originalId, origCatalogItem?.rules);
        
        if (!isNewItem && !svcChanged && !ruleChanged) {
          continue; // No changes, skip this item
        }

        // Collect services for this item (one entry per service with all 4 fields)
        const itemServices = activeServicesList.map((service) => ({
          service_id: service.service_id,
          time_per_unit: toNullable(getServiceTime(originalId, service.service_id, 'time_per_unit')),
          miter_minutes: length.requires_miters
            ? toNullable(getServiceTime(originalId, service.service_id, 'miter_minutes'))
            : null,
          cutout_minutes: length.requires_cutouts
            ? toNullable(getServiceTime(originalId, service.service_id, 'cutout_minutes'))
            : null,
          base_minutes: toNullable(getServiceTime(originalId, service.service_id, 'base_minutes')),
        }));

        // Collect rules for this item
        const itemRules = rulesMap[originalId] || {};
        const rulesToSave = Object.entries(itemRules)
          .filter(([, params]) => params !== null && params !== undefined)
          .map(([ruleKey, params], idx) => ({
            rule_key: ruleKey,
            params: params,
            sort_order: idx,
          }));

        rpcItems.push({
          length_catalog_id: length.id,
          services: itemServices,
          rules: rulesToSave,
        });
      }

      // Save only changed services + rules in a single RPC call
      if (rpcItems.length > 0) {
        const settingsResult = await dispatch(saveLengthSettings(rpcItems));
        if (!settingsResult?.success) {
          console.error("Failed to save length settings");
        }
      }

      // Refetch to get fresh data with services and rules
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
    // Reset rules to match original catalog
    const rMap = {};
    (originalCatalog || []).forEach((length) => {
      rMap[length.id] = {};
      (length.rules || []).forEach((rule) => {
        rMap[length.id][rule.rule_key] = rule.params || {};
      });
    });
    setRulesMap(rMap);
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

  // Service time helpers — key format: "<lengthId>-<serviceId>-<field>"
  // field is one of: time_per_unit, miter_minutes, cutout_minutes, base_minutes
  const getServiceTime = (lengthId, serviceId, field) => {
    const key = `${lengthId}-${serviceId}-${field}`;
    const value = lengthServicesMap[key];
    return value === undefined || value === null ? '' : value;
  };

  const updateServiceTime = (lengthId, serviceId, value, field) => {
    const key = `${lengthId}-${serviceId}-${field}`;
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

  // Helper to create service time columns
  // Each service gets one column with up to 4 stacked inputs:
  //   time_per_unit (min/ft), base_minutes, miter_minutes, cutout_minutes
  const createServiceColumns = () => {
    return activeServices.map((service) => ({
      field: `service_${service.service_id}`,
      label: service.service_name || `Service ${service.service_id}`,
      width: "110px",
      type: "number",
      placeholder: "0",
      render: (item) => (
        <div className="flex flex-col gap-1">
          {/* Minutes per foot */}
          <input
            type="number"
            step="1"
            min="0"
            value={getServiceTime(item.id, service.service_id, 'time_per_unit')}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : parseFloat(e.target.value);
              updateServiceTime(item.id, service.service_id, value, 'time_per_unit');
            }}
            className="w-full bg-slate-600 text-slate-200 px-2 py-1 rounded"
            placeholder="Min/ft"
            disabled={item.markedForDeletion}
            title="Minutes per foot"
          />
          {/* Minimum minutes */}
          <input
            type="number"
            step="1"
            min="0"
            value={getServiceTime(item.id, service.service_id, 'base_minutes')}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : parseFloat(e.target.value);
              updateServiceTime(item.id, service.service_id, value, 'base_minutes');
            }}
            className="w-full bg-slate-700 text-emerald-300 px-2 py-1 rounded text-sm border border-emerald-600"
            placeholder="Min mins"
            disabled={item.markedForDeletion}
            title="Minimum minutes"
          />
          {/* Miter minutes (only show if requires_miters is true) */}
          {item.requires_miters && (
            <input
              type="number"
              step="1"
              min="0"
              value={getServiceTime(item.id, service.service_id, 'miter_minutes')}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                updateServiceTime(item.id, service.service_id, value, 'miter_minutes');
              }}
              className="w-full bg-slate-700 text-amber-300 px-2 py-1 rounded text-sm border border-amber-600"
              placeholder="Per miter"
              disabled={item.markedForDeletion}
              title="Minutes per miter"
            />
          )}
          {/* Cutout minutes (only show if requires_cutouts is true) */}
          {item.requires_cutouts && (
            <input
              type="number"
              step="1"
              min="0"
              value={getServiceTime(item.id, service.service_id, 'cutout_minutes')}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                updateServiceTime(item.id, service.service_id, value, 'cutout_minutes');
              }}
              className="w-full bg-slate-700 text-cyan-300 px-2 py-1 rounded text-sm border border-cyan-600"
              placeholder="Per cutout"
              disabled={item.markedForDeletion}
              title="Minutes per cutout"
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
    {
      field: "rules",
      label: "Rules",
      width: "200px",
      render: (item) => {
        const itemRules = rulesMap[item.id] || {};
        return (
          <div className="flex flex-col gap-1">
            {Object.entries(LENGTH_RULE_REGISTRY).map(([ruleKey, meta]) => {
              const isEnabled = itemRules[ruleKey] !== null && itemRules[ruleKey] !== undefined;
              const params = isEnabled ? itemRules[ruleKey] : meta.defaultParams;
              return (
                <div key={ruleKey} className="flex flex-col">
                  <label className="flex items-center gap-1 text-xs cursor-pointer" title={meta.description}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        setRulesMap((prev) => {
                          const updated = { ...prev };
                          if (!updated[item.id]) updated[item.id] = {};
                          updated[item.id] = { ...updated[item.id] };
                          if (e.target.checked) {
                            updated[item.id][ruleKey] = { ...meta.defaultParams };
                          } else {
                            const { [ruleKey]: _, ...rest } = updated[item.id];
                            updated[item.id] = rest;
                          }
                          return updated;
                        });
                      }}
                      disabled={item.markedForDeletion}
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={isEnabled ? "text-teal-200" : "text-slate-200"}>
                      {meta.label}
                    </span>
                  </label>
                  {isEnabled && Object.keys(meta.defaultParams).some(
                    (k) => typeof meta.defaultParams[k] === "number"
                  ) && (
                    <div className="ml-4 flex flex-wrap gap-1 mt-0.5">
                      {Object.entries(meta.defaultParams)
                        .filter(([, v]) => typeof v === "number")
                        .map(([paramKey, defaultVal]) => (
                          <div key={paramKey} className="flex items-center gap-0.5">
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {paramKey.replace(/_/g, " ")}:
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={params[paramKey] ?? defaultVal}
                              onChange={(e) => {
                                const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                                setRulesMap((prev) => {
                                  const updated = { ...prev };
                                  updated[item.id] = {
                                    ...updated[item.id],
                                    [ruleKey]: {
                                      ...updated[item.id]?.[ruleKey],
                                      [paramKey]: val,
                                    },
                                  };
                                  return updated;
                                });
                              }}
                              disabled={item.markedForDeletion}
                              className="w-12 bg-slate-700 text-slate-200 px-1 py-0 rounded text-[10px] border border-slate-600"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
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
                    width: 85,
                    format: (_, item) => {
                      const svc = (item.services || []).find(
                        (sv) => sv.service_id === s.service_id
                      );
                      const parts = [];
                      if (svc?.time_per_unit != null) parts.push(String(svc.time_per_unit));
                      else parts.push("-");
                      if (svc?.base_minutes != null) parts.push(`Min:${svc.base_minutes}`);
                      if (item.requires_miters && svc?.miter_minutes != null) parts.push(`M:${svc.miter_minutes}`);
                      if (item.requires_cutouts && svc?.cutout_minutes != null) parts.push(`C:${svc.cutout_minutes}`);
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
