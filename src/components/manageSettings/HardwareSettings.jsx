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
} from "../../redux/actions/hardware";

import SettingsList from "./SettingsList.jsx";
import SettingsSection from "./SettingsSection.jsx";

const HardwareSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const { hinges, pulls, slides, loading, error } = useSelector(
    (state) => state.hardware
  );

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

  useEffect(() => {
    dispatch(fetchHinges());
    dispatch(fetchPulls());
    dispatch(fetchSlides());
  }, [dispatch]);

  // Update local state when Redux state changes
  useEffect(() => {
    setLocalHinges(hinges || []);
    setOriginalHinges(JSON.parse(JSON.stringify(hinges || [])));
  }, [hinges]);

  useEffect(() => {
    setLocalPulls(pulls || []);
    setOriginalPulls(JSON.parse(JSON.stringify(pulls || [])));
  }, [pulls]);

  useEffect(() => {
    setLocalSlides(slides || []);
    setOriginalSlides(JSON.parse(JSON.stringify(slides || [])));
  }, [slides]);

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

      // Update local and original state with fresh data
      if (hingesResult.data) {
        setLocalHinges(hingesResult.data);
        setOriginalHinges(JSON.parse(JSON.stringify(hingesResult.data)));
      }
      if (pullsResult.data) {
        setLocalPulls(pullsResult.data);
        setOriginalPulls(JSON.parse(JSON.stringify(pullsResult.data)));
      }
      if (slidesResult.data) {
        setLocalSlides(slidesResult.data);
        setOriginalSlides(JSON.parse(JSON.stringify(slidesResult.data)));
      }

      setValidationErrors({});
    } catch (error) {
      console.error("Error saving hardware:", error);
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
  ];

  return (
    <div className="mt-6 flex justify-center h-full pb-10">
      <div className={`flex-1 flex flex-col ${maxWidthClass}`}>
        <div className="sticky top-0 z-10 bg-slate-800 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">
              Manage Hardware
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
