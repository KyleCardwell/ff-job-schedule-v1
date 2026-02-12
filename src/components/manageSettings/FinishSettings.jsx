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
  fetchFinishes,
  saveFinishes,
} from "../../redux/actions/finishes";

import GenerateSettingsPdf from "./GenerateSettingsPdf.jsx";
import SettingsList from "./SettingsList.jsx";
import SettingsSection from "./SettingsSection.jsx";

const FinishSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const { finishes, loading, error } = useSelector((state) => state.finishes);

  // Local state for editing
  const [localFinishes, setLocalFinishes] = useState([]);
  const [originalFinishes, setOriginalFinishes] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [focusItemId, setFocusItemId] = useState(null);
  const inputRefs = useRef({});

  useEffect(() => {
    dispatch(fetchFinishes());
  }, [dispatch]);

  useEffect(() => {
    setLocalFinishes(finishes || []);
    setOriginalFinishes(JSON.parse(JSON.stringify(finishes || [])));
  }, [finishes]);

  // Finish handlers
  const handleFinishChange = (id, field, value) => {
    setLocalFinishes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    // Clear error for this field if it exists
    setValidationErrors((prev) => {
      const itemKey = `finish-${id}`;
      if (prev[itemKey]) {
        const { [field]: _, ...remainingErrors } = prev[itemKey];
        if (Object.keys(remainingErrors).length === 0) {
          // If no more errors for this item, remove the item key
          const { [itemKey]: __, ...rest } = prev;
          return rest;
        }
        return { ...prev, [itemKey]: remainingErrors };
      }
      return prev;
    });
  };

  const handleAddFinish = () => {
    const newItem = {
      id: uuidv4(),
      name: "",
      shop_markup: 0,
      finish_markup: 0,
      isNew: true,
    };
    setLocalFinishes((prev) => [...prev, newItem]);
    setFocusItemId(`finish-${newItem.id}-name`);
  };

  const handleDeleteFinish = (id) => {
    setLocalFinishes((prev) => {
      const item = prev.find((item) => item.id === id);
      if (item?.isNew) {
        // If new item, remove it completely
        return prev.filter((item) => item.id !== id);
      } else {
        // If existing item, toggle markedForDeletion
        return prev.map((item) =>
          item.id === id
            ? { ...item, markedForDeletion: !item.markedForDeletion }
            : item
        );
      }
    });
  };

  const handleCancelDeleteFinish = (id) => {
    setLocalFinishes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: false } : item
      )
    );
  };

  const validateInputs = () => {
    const newErrors = {};

    // Validate finishes
    localFinishes.forEach((item) => {
      if (item.markedForDeletion) return; // Skip validation for items marked for deletion

      const itemErrors = {};
      if (!item.name || item.name.trim() === "") {
        itemErrors.name = "Name is required";
      }
      if (item.shop_markup === "" || item.shop_markup === null || item.shop_markup < 0) {
        itemErrors.shop_markup = "Valid shop markup is required (must be >= 0)";
      }
      if (item.finish_markup === "" || item.finish_markup === null || item.finish_markup < 0) {
        itemErrors.finish_markup = "Valid finish markup is required (must be >= 0)";
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[`finish-${item.id}`] = itemErrors;
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
      // Save finishes (only if there are changes)
      if (!isEqual(localFinishes, originalFinishes)) {
        const result = await dispatch(
          saveFinishes(localFinishes, originalFinishes)
        );

        if (!result || !result.success) {
          throw new Error(result?.error || "Failed to save finishes");
        }

        // Update local and original state with fresh data
        if (result.data) {
          setLocalFinishes(result.data);
          setOriginalFinishes(JSON.parse(JSON.stringify(result.data)));
        }
      }

      console.log("Finishes saved successfully");
      setValidationErrors({}); // Clear errors on successful save
    } catch (error) {
      console.error("Error saving finishes:", error);
      throw error;
    }
  };

  const handleCancel = () => {
    setLocalFinishes(JSON.parse(JSON.stringify(originalFinishes)));
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
  }, [focusItemId, localFinishes]);

  // Helper to get errors for a specific item
  const getItemErrors = (itemId) => {
    return validationErrors[`finish-${itemId}`] || {};
  };

  // Column definitions for Finishes
  const finishColumns = [
    {
      field: "name",
      label: "Name",
      width: "300px",
      type: "text",
      placeholder: "Finish name",
      hasError: (item) => !!getItemErrors(item.id).name,
    },
    {
      field: "shop_markup",
      label: "Shop Markup (%)",
      width: "150px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id).shop_markup,
    },
    {
      field: "finish_markup",
      label: "Finish Markup (%)",
      width: "150px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id).finish_markup,
    },
  ];

  return (
    <div className="flex justify-center h-full pb-10">
      <div className={`flex-1 flex flex-col ${maxWidthClass}`}>
        <div className="sticky top-0 z-10 bg-slate-800 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">
              Manage Finishes
            </h2>
            <GenerateSettingsPdf
              title="Finishes Settings"
              fileName="Finishes Settings"
              sections={[
                {
                  label: "Finishes",
                  columns: [
                    { field: "name", label: "Name", width: "*" },
                    { field: "shop_markup", label: "Shop Markup (%)", width: 100, format: (v) => v != null ? `${v}%` : "-" },
                    { field: "finish_markup", label: "Finish Markup (%)", width: 100, format: (v) => v != null ? `${v}%` : "-" },
                  ],
                  items: localFinishes,
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
            <SettingsSection
              title="Finishes"
              maxWidthClass={maxWidthClass}
            >
              <SettingsList
                items={localFinishes}
                columns={finishColumns}
                onDelete={handleDeleteFinish}
                onCancelDelete={handleCancelDeleteFinish}
                onChange={handleFinishChange}
                onAdd={handleAddFinish}
                addLabel="+ Add Finish"
                inputRefs={inputRefs}
                itemPrefix="finish"
              />
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
});

FinishSettings.displayName = "FinishSettings";

export default FinishSettings;
