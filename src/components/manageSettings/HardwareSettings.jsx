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
  fetchHinges,
  fetchPulls,
  fetchSlides,
  saveHinges,
  savePulls,
  saveSlides,
  saveHardwareServices,
} from "../../redux/actions/hardware";
import { fetchServices } from "../../redux/actions/services";

import GenerateSettingsPdf from "./GenerateSettingsPdf.jsx";
import SettingsList from "./SettingsList.jsx";
import SettingsSection from "./SettingsSection.jsx";

const HardwareSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const { hinges, pulls, slides, loading, error } = useSelector(
    (state) => state.hardware
  );
  const { allServices } = useSelector((state) => state.services);

  // Local state for editing
  const [localHinges, setLocalHinges] = useState([]);
  const [localPulls, setLocalPulls] = useState([]);
  const [localSlides, setLocalSlides] = useState([]);
  const [originalHinges, setOriginalHinges] = useState([]);
  const [originalPulls, setOriginalPulls] = useState([]);
  const [originalSlides, setOriginalSlides] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [focusItemId, setFocusItemId] = useState(null);
  const inputRefs = useRef({});
  const [hardwareServicesMap, setHardwareServicesMap] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchHinges());
    dispatch(fetchPulls());
    dispatch(fetchSlides());
    dispatch(fetchServices());
  }, [dispatch]);

  // Update local state when Redux state changes (but not during save)
  useEffect(() => {
    if (!isSaving) {
      setLocalHinges(hinges || []);
      setOriginalHinges(JSON.parse(JSON.stringify(hinges || [])));
    }
  }, [hinges, isSaving]);

  useEffect(() => {
    if (!isSaving) {
      setLocalPulls(pulls || []);
      setOriginalPulls(JSON.parse(JSON.stringify(pulls || [])));
    }
  }, [pulls, isSaving]);

  useEffect(() => {
    if (!isSaving) {
      setLocalSlides(slides || []);
      setOriginalSlides(JSON.parse(JSON.stringify(slides || [])));
    }
  }, [slides, isSaving]);

  // Build hardware services map from embedded services: { hardwareType-hardwareId-serviceId: time_per_unit }
  useEffect(() => {
    // Don't rebuild map during save to prevent flash of old data
    if (isSaving) return;
    
    const map = {};
    
    // Process hinges
    hinges.forEach((hinge) => {
      (hinge.services || []).forEach((service) => {
        const key = `hinge-${hinge.id}-${service.service_id}`;
        map[key] = service.time_per_unit;
      });
    });
    
    // Process pulls
    pulls.forEach((pull) => {
      (pull.services || []).forEach((service) => {
        const key = `pull-${pull.id}-${service.service_id}`;
        map[key] = service.time_per_unit;
      });
    });
    
    // Process slides
    slides.forEach((slide) => {
      (slide.services || []).forEach((service) => {
        const key = `slide-${slide.id}-${service.service_id}`;
        map[key] = service.time_per_unit;
      });
    });
    
    setHardwareServicesMap(map);
  }, [hinges, pulls, slides, isSaving]);

  // Helper to get service time value for a hardware item
  const getServiceTime = (hardwareType, hardwareId, serviceId) => {
    const key = `${hardwareType}-${hardwareId}-${serviceId}`;
    const value = hardwareServicesMap[key];
    // Return empty string if undefined/null, otherwise return the value (could be 0 or a number)
    return value !== undefined && value !== null ? value : '';
  };

  // Helper to update service time in the map
  const updateServiceTime = (hardwareType, hardwareId, serviceId, value) => {
    const key = `${hardwareType}-${hardwareId}-${serviceId}`;
    setHardwareServicesMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Hinges handlers
  const handleHingeChange = (id, field, value) => {
    setLocalHinges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    // Clear error for this field if it exists
    setValidationErrors((prev) => {
      const itemKey = `hinge-${id}`;
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

  const handleAddHinge = () => {
    const newItem = {
      id: uuidv4(),
      name: "",
      price: 0,
      actual_cost: 0,
      isNew: true,
    };
    setLocalHinges((prev) => [...prev, newItem]);
    setFocusItemId(`hinge-${newItem.id}-name`);
  };

  const handleDeleteHinge = (id) => {
    setLocalHinges((prev) => {
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

  const handleCancelDeleteHinge = (id) => {
    setLocalHinges((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: false } : item
      )
    );
  };

  // Pulls handlers
  const handlePullChange = (id, field, value) => {
    setLocalPulls((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    // Clear error for this field if it exists
    setValidationErrors((prev) => {
      const itemKey = `pull-${id}`;
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

  const handleAddPull = () => {
    const newItem = {
      id: uuidv4(),
      name: "",
      price: 0,
      actual_cost: 0,
      isNew: true,
    };
    setLocalPulls((prev) => [...prev, newItem]);
    setFocusItemId(`pull-${newItem.id}-name`);
  };

  const handleDeletePull = (id) => {
    setLocalPulls((prev) => {
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

  const handleCancelDeletePull = (id) => {
    setLocalPulls((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: false } : item
      )
    );
  };

  // Slides handlers
  const handleSlideChange = (id, field, value) => {
    setLocalSlides((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    // Clear error for this field if it exists
    setValidationErrors((prev) => {
      const itemKey = `slide-${id}`;
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

  const handleAddSlide = () => {
    const newItem = {
      id: uuidv4(),
      name: "",
      price: 0,
      actual_cost: 0,
      isNew: true,
    };
    setLocalSlides((prev) => [...prev, newItem]);
    setFocusItemId(`slide-${newItem.id}-name`);
  };

  const handleDeleteSlide = (id) => {
    setLocalSlides((prev) => {
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

  const handleCancelDeleteSlide = (id) => {
    setLocalSlides((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: false } : item
      )
    );
  };

  const validateInputs = () => {
    const newErrors = {};

    // Validate hinges
    localHinges.forEach((item) => {
      if (item.markedForDeletion) return;

      const itemErrors = {};
      if (!item.name || item.name.trim() === "") {
        itemErrors.name = "Name is required";
      }
      if (item.price === "" || item.price === null || item.price < 0) {
        itemErrors.price = "Valid price is required (must be >= 0)";
      }
      if (
        item.actual_cost === "" ||
        item.actual_cost === null ||
        item.actual_cost < 0
      ) {
        itemErrors.actual_cost = "Valid actual cost is required (must be >= 0)";
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[`hinge-${item.id}`] = itemErrors;
      }
    });

    // Validate pulls
    localPulls.forEach((item) => {
      if (item.markedForDeletion) return;

      const itemErrors = {};
      if (!item.name || item.name.trim() === "") {
        itemErrors.name = "Name is required";
      }
      if (item.price === "" || item.price === null || item.price < 0) {
        itemErrors.price = "Valid price is required (must be >= 0)";
      }
      if (
        item.actual_cost === "" ||
        item.actual_cost === null ||
        item.actual_cost < 0
      ) {
        itemErrors.actual_cost = "Valid actual cost is required (must be >= 0)";
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[`pull-${item.id}`] = itemErrors;
      }
    });

    // Validate slides
    localSlides.forEach((item) => {
      if (item.markedForDeletion) return;

      const itemErrors = {};
      if (!item.name || item.name.trim() === "") {
        itemErrors.name = "Name is required";
      }
      if (item.price === "" || item.price === null || item.price < 0) {
        itemErrors.price = "Valid price is required (must be >= 0)";
      }
      if (
        item.actual_cost === "" ||
        item.actual_cost === null ||
        item.actual_cost < 0
      ) {
        itemErrors.actual_cost = "Valid actual cost is required (must be >= 0)";
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[`slide-${item.id}`] = itemErrors;
      }
    });

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Validate inputs first
    if (!validateInputs()) {
      console.log("Validation failed");
      return;
    }

    // Prevent useEffect from updating local state during save
    setIsSaving(true);

    try {
      // Save hinges (only if there are changes)
      let hingesResult;
      if (!isEqual(localHinges, originalHinges)) {
        hingesResult = await dispatch(saveHinges(localHinges, originalHinges));

        if (!hingesResult || !hingesResult.success) {
          throw new Error(hingesResult?.error || "Failed to save hinges");
        }
      } else {
        hingesResult = { success: true, data: localHinges };
      }

      // Save pulls (only if there are changes)
      let pullsResult;
      if (!isEqual(localPulls, originalPulls)) {
        pullsResult = await dispatch(savePulls(localPulls, originalPulls));

        if (!pullsResult || !pullsResult.success) {
          throw new Error(pullsResult?.error || "Failed to save pulls");
        }
      } else {
        pullsResult = { success: true, data: localPulls };
      }

      // Save slides (only if there are changes)
      let slidesResult;
      if (!isEqual(localSlides, originalSlides)) {
        slidesResult = await dispatch(saveSlides(localSlides, originalSlides));

        if (!slidesResult || !slidesResult.success) {
          throw new Error(slidesResult?.error || "Failed to save slides");
        }
      } else {
        slidesResult = { success: true, data: localSlides };
      }

      console.log("Hardware saved successfully");

      setValidationErrors({});

      // Save hardware services for all items (including newly saved items with fresh IDs)
      const activeServices = allServices.filter((s) => s.is_active);

      // Helper to find matching item (by name for new items, by ID for existing)
      const findOriginalItem = (savedItem, originalList) => {
        // For existing items, match by ID
        const byId = originalList.find((orig) => orig.id === savedItem.id);
        if (byId && !byId.isNew) return byId;
        
        // For new items, match by name (since ID changed from temp UUID to real BIGINT)
        return originalList.find(
          (orig) => orig.isNew && orig.name === savedItem.name
        );
      };

      // Save services for hinges using fresh data with real IDs
      for (const hinge of hingesResult.data || []) {
        if (!hinge.markedForDeletion) {
          const originalHinge = findOriginalItem(hinge, localHinges);
          const originalId = originalHinge?.id || hinge.id;
          
          const services = activeServices.map((service) => {
            const timeValue = getServiceTime("hinge", originalId, service.service_id);
            return {
              service_id: service.service_id,
              time_per_unit: timeValue === '' ? 0 : timeValue,
            };
          });
          await dispatch(saveHardwareServices("hinge", hinge.id, services));
        }
      }

      // Save services for pulls using fresh data with real IDs
      for (const pull of pullsResult.data || []) {
        if (!pull.markedForDeletion) {
          const originalPull = findOriginalItem(pull, localPulls);
          const originalId = originalPull?.id || pull.id;
          
          const services = activeServices.map((service) => {
            const timeValue = getServiceTime("pull", originalId, service.service_id);
            return {
              service_id: service.service_id,
              time_per_unit: timeValue === '' ? 0 : timeValue,
            };
          });
          await dispatch(saveHardwareServices("pull", pull.id, services));
        }
      }

      // Save services for slides using fresh data with real IDs
      for (const slide of slidesResult.data || []) {
        if (!slide.markedForDeletion) {
          const originalSlide = findOriginalItem(slide, localSlides);
          const originalId = originalSlide?.id || slide.id;
          
          const services = activeServices.map((service) => {
            const timeValue = getServiceTime("slide", originalId, service.service_id);
            return {
              service_id: service.service_id,
              time_per_unit: timeValue === '' ? 0 : timeValue,
            };
          });
          await dispatch(saveHardwareServices("slide", slide.id, services));
        }
      }

      // Refetch all hardware once at the end to get updated embedded services
      const hingesRefresh = await dispatch(fetchHinges());
      const pullsRefresh = await dispatch(fetchPulls());
      const slidesRefresh = await dispatch(fetchSlides());

      // Update local state directly with fresh data (bypassing useEffect)
      if (hingesRefresh?.data) {
        setLocalHinges(hingesRefresh.data);
        setOriginalHinges(JSON.parse(JSON.stringify(hingesRefresh.data)));
      }
      if (pullsRefresh?.data) {
        setLocalPulls(pullsRefresh.data);
        setOriginalPulls(JSON.parse(JSON.stringify(pullsRefresh.data)));
      }
      if (slidesRefresh?.data) {
        setLocalSlides(slidesRefresh.data);
        setOriginalSlides(JSON.parse(JSON.stringify(slidesRefresh.data)));
      }

      // Re-enable useEffect updates now that we have fresh data
      setIsSaving(false);
    } catch (error) {
      console.error("Error saving hardware:", error);
      // Re-enable useEffect updates even on error
      setIsSaving(false);
      throw error;
    }
  };

  const handleCancel = () => {
    setLocalHinges(JSON.parse(JSON.stringify(originalHinges)));
    setLocalPulls(JSON.parse(JSON.stringify(originalPulls)));
    setLocalSlides(JSON.parse(JSON.stringify(originalSlides)));
    setValidationErrors({});
  };

  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
  }));

  // Focus on newly added item's name input
  useEffect(() => {
    if (focusItemId && inputRefs.current[focusItemId]) {
      inputRefs.current[focusItemId].focus();
      setFocusItemId(null);
    }
  }, [focusItemId, localHinges, localPulls, localSlides]);

  // Helper to get errors for a specific item
  const getItemErrors = (itemId, prefix) => {
    return validationErrors[`${prefix}-${itemId}`] || {};
  };

  // Get active services for column generation
  const activeServices = allServices.filter((s) => s.is_active);

  // Helper to create service columns
  const createServiceColumns = (hardwareType) => {
    return activeServices.map((service) => ({
      field: `service_${service.service_id}`,
      label: service.service_name || `Service ${service.service_id}`,
      width: "100px",
      type: "number",
      placeholder: "0",
      render: (item) => (
        <input
          type="number"
          step="0.01"
          min="0"
          value={getServiceTime(hardwareType, item.id, service.service_id)}
          onChange={(e) => {
            // Allow empty string, otherwise parse as float
            const value = e.target.value === '' ? '' : parseFloat(e.target.value);
            updateServiceTime(
              hardwareType,
              item.id,
              service.service_id,
              value
            );
          }}
          className="w-full bg-slate-600 text-slate-200 px-2 py-1 my-2"
          placeholder="0"
          disabled={item.markedForDeletion}
        />
      ),
    }));
  };

  // Column definitions for Hinges
  const hingesColumns = [
    {
      field: "name",
      label: "Name",
      width: "300px",
      type: "text",
      placeholder: "Hinge name",
      hasError: (item) => !!getItemErrors(item.id, "hinge").name,
    },
    {
      field: "price",
      label: "Price",
      width: "120px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "hinge").price,
    },
    {
      field: "actual_cost",
      label: "Actual Cost",
      width: "120px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "hinge").actual_cost,
    },
    ...createServiceColumns("hinge"),
  ];

  // Column definitions for Pulls
  const pullsColumns = [
    {
      field: "name",
      label: "Name",
      width: "300px",
      type: "text",
      placeholder: "Pull name",
      hasError: (item) => !!getItemErrors(item.id, "pull").name,
    },
    {
      field: "price",
      label: "Price",
      width: "120px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "pull").price,
    },
    {
      field: "actual_cost",
      label: "Actual Cost",
      width: "120px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "pull").actual_cost,
    },
    ...createServiceColumns("pull"),
  ];

  // Column definitions for Slides
  const slidesColumns = [
    {
      field: "name",
      label: "Name",
      width: "300px",
      type: "text",
      placeholder: "Slide name",
      hasError: (item) => !!getItemErrors(item.id, "slide").name,
    },
    {
      field: "price",
      label: "Price",
      width: "120px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "slide").price,
    },
    {
      field: "actual_cost",
      label: "Actual Cost",
      width: "120px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "slide").actual_cost,
    },
    ...createServiceColumns("slide"),
  ];

  return (
    <div className="mt-6 flex justify-center h-full pb-10">
      <div className={`flex-1 flex flex-col ${maxWidthClass}`}>
        <div className="sticky top-0 z-10 bg-slate-800 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">
              Manage Hardware
            </h2>
            <GenerateSettingsPdf
              title="Hardware Settings"
              fileName="Hardware Settings"
              orientation="auto"
              sections={[
                {
                  label: "Hinges",
                  columns: [
                    { field: "name", label: "Name", width: "*" },
                    { field: "price", label: "Price", width: 60, format: (v) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
                    { field: "actual_cost", label: "Actual Cost", width: 70, format: (v) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
                    ...activeServices.map((s) => ({
                      field: `_service_${s.service_id}`,
                      label: s.service_name,
                      width: 60,
                      format: (_, item) => {
                        const svc = (item.services || []).find((sv) => sv.service_id === s.service_id);
                        return svc?.time_per_unit ? String(svc.time_per_unit) : "-";
                      },
                    })),
                  ],
                  items: localHinges,
                },
                {
                  label: "Pulls",
                  columns: [
                    { field: "name", label: "Name", width: "*" },
                    { field: "price", label: "Price", width: 60, format: (v) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
                    { field: "actual_cost", label: "Actual Cost", width: 70, format: (v) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
                    ...activeServices.map((s) => ({
                      field: `_service_${s.service_id}`,
                      label: s.service_name,
                      width: 60,
                      format: (_, item) => {
                        const svc = (item.services || []).find((sv) => sv.service_id === s.service_id);
                        return svc?.time_per_unit ? String(svc.time_per_unit) : "-";
                      },
                    })),
                  ],
                  items: localPulls,
                },
                {
                  label: "Slides",
                  columns: [
                    { field: "name", label: "Name", width: "*" },
                    { field: "price", label: "Price", width: 60, format: (v) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
                    { field: "actual_cost", label: "Actual Cost", width: 70, format: (v) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
                    ...activeServices.map((s) => ({
                      field: `_service_${s.service_id}`,
                      label: s.service_name,
                      width: 60,
                      format: (_, item) => {
                        const svc = (item.services || []).find((sv) => sv.service_id === s.service_id);
                        return svc?.time_per_unit ? String(svc.time_per_unit) : "-";
                      },
                    })),
                  ],
                  items: localSlides,
                },
              ]}
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
              <SettingsSection title="Hinges" maxWidthClass={maxWidthClass}>
                <SettingsList
                  items={localHinges}
                  columns={hingesColumns}
                  onDelete={handleDeleteHinge}
                  onCancelDelete={handleCancelDeleteHinge}
                  onChange={handleHingeChange}
                  onAdd={handleAddHinge}
                  addLabel="+ Add Hinge"
                  inputRefs={inputRefs}
                  itemPrefix="hinge"
                />
              </SettingsSection>

              <SettingsSection title="Pulls" maxWidthClass={maxWidthClass}>
                <SettingsList
                  items={localPulls}
                  columns={pullsColumns}
                  onDelete={handleDeletePull}
                  onCancelDelete={handleCancelDeletePull}
                  onChange={handlePullChange}
                  onAdd={handleAddPull}
                  addLabel="+ Add Pull"
                  inputRefs={inputRefs}
                  itemPrefix="pull"
                />
              </SettingsSection>

              <SettingsSection title="Slides" maxWidthClass={maxWidthClass}>
                <SettingsList
                  items={localSlides}
                  columns={slidesColumns}
                  onDelete={handleDeleteSlide}
                  onCancelDelete={handleCancelDeleteSlide}
                  onChange={handleSlideChange}
                  onAdd={handleAddSlide}
                  addLabel="+ Add Slide"
                  inputRefs={inputRefs}
                  itemPrefix="slide"
                />
              </SettingsSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

HardwareSettings.displayName = "HardwareSettings";

export default HardwareSettings;
