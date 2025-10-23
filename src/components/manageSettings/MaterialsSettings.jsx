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
  fetchSheetGoods,
  fetchDrawerBoxMaterials,
  saveSheetGoods,
  saveDrawerBoxMaterials,
} from "../../redux/actions/materials";

import SettingsList from "./SettingsList.jsx";
import SettingsSection from "./SettingsSection.jsx";

const MaterialsSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const { drawerBoxMaterials, loading, error } = useSelector(
    (state) => state.materials
  );

  // Local state for editing
  const [localSheetGoods, setLocalSheetGoods] = useState([]);
  const [localDrawerBoxMaterials, setLocalDrawerBoxMaterials] = useState([]);
  const [originalSheetGoods, setOriginalSheetGoods] = useState([]);
  const [originalDrawerBoxMaterials, setOriginalDrawerBoxMaterials] = useState(
    []
  );
  const [validationErrors, setValidationErrors] = useState({});
  const [focusItemId, setFocusItemId] = useState(null);
  const inputRefs = useRef({});

  useEffect(() => {
    dispatch(fetchSheetGoods());
    dispatch(fetchDrawerBoxMaterials());
  }, [dispatch]);

  // Fetch all sheet goods directly from Supabase to get the complete list
  useEffect(() => {
    const fetchAllSheetGoods = async () => {
      try {
        const { data, error } = await dispatch(fetchSheetGoods());
        if (!error && data) {
          setLocalSheetGoods(data);
          setOriginalSheetGoods(JSON.parse(JSON.stringify(data)));
        }
      } catch (err) {
        console.error("Error fetching sheet goods:", err);
      }
    };
    fetchAllSheetGoods();
  }, [dispatch]);

  useEffect(() => {
    setLocalDrawerBoxMaterials(drawerBoxMaterials || []);
    setOriginalDrawerBoxMaterials(
      JSON.parse(JSON.stringify(drawerBoxMaterials || []))
    );
  }, [drawerBoxMaterials]);

  // Sheet Goods handlers
  const handleSheetGoodChange = (id, field, value) => {
    setLocalSheetGoods((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    // Clear error for this field if it exists
    setValidationErrors((prev) => {
      const itemKey = `sheet-${id}`;
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

  const handleAddSheetGood = () => {
    const newItem = {
      id: uuidv4(),
      name: "",
      width: 0,
      height: 0,
      thickness: 0,
      sheet_price: 0,
      bd_ft_price: 0,
      box_mat: false,
      face_mat: false,
      five_piece: false,
      slab_door: false,
      needs_finish: false,
      isNew: true,
    };
    setLocalSheetGoods((prev) => [...prev, newItem]);
    setFocusItemId(`sheet-${newItem.id}-name`);
  };

  const handleDeleteSheetGood = (id) => {
    setLocalSheetGoods((prev) => {
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

  const handleCancelDeleteSheetGood = (id) => {
    setLocalSheetGoods((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: false } : item
      )
    );
  };

  // Drawer Box Materials handlers
  const handleDrawerBoxChange = (id, field, value) => {
    setLocalDrawerBoxMaterials((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    // Clear error for this field if it exists
    setValidationErrors((prev) => {
      const itemKey = `drawer-${id}`;
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

  const handleAddDrawerBox = () => {
    const newItem = {
      id: uuidv4(),
      name: "",
      width: 0,
      height: 0,
      thickness: 0,
      sheet_price: 0,
      isNew: true,
    };
    setLocalDrawerBoxMaterials((prev) => [...prev, newItem]);
    setFocusItemId(`drawer-${newItem.id}-name`);
  };

  const handleDeleteDrawerBox = (id) => {
    setLocalDrawerBoxMaterials((prev) => {
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

  const handleCancelDeleteDrawerBox = (id) => {
    setLocalDrawerBoxMaterials((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: false } : item
      )
    );
  };

  const validateInputs = () => {
    const newErrors = {};

    // Validate sheet goods
    localSheetGoods.forEach((item) => {
      if (item.markedForDeletion) return; // Skip validation for items marked for deletion

      const itemErrors = {};
      if (!item.name || item.name.trim() === "") {
        itemErrors.name = "Name is required";
      }
      if (item.width === "" || item.width === null || item.width <= 0) {
        itemErrors.width = "Valid width is required (must be > 0)";
      }
      if (item.height === "" || item.height === null || item.height <= 0) {
        itemErrors.height = "Valid height is required (must be > 0)";
      }
      if (
        item.thickness === "" ||
        item.thickness === null ||
        item.thickness <= 0
      ) {
        itemErrors.thickness = "Valid thickness is required (must be > 0)";
      }
      if (
        item.sheet_price === "" ||
        item.sheet_price === null ||
        item.sheet_price <= 0
      ) {
        itemErrors.sheet_price = "Valid sheet price is required";
      }
      //   if (item.bd_ft_price === "" || item.bd_ft_price === null || item.bd_ft_price < 0) {
      //     itemErrors.bd_ft_price = "Valid board foot price is required";
      //   }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[`sheet-${item.id}`] = itemErrors;
      }
    });

    // Validate drawer box materials
    localDrawerBoxMaterials.forEach((item) => {
      if (item.markedForDeletion) return;

      const itemErrors = {};
      if (!item.name || item.name.trim() === "") {
        itemErrors.name = "Name is required";
      }
      if (item.width === "" || item.width === null || item.width <= 0) {
        itemErrors.width = "Valid width is required (must be > 0)";
      }
      if (item.height === "" || item.height === null || item.height <= 0) {
        itemErrors.height = "Valid height is required (must be > 0)";
      }
      if (
        item.thickness === "" ||
        item.thickness === null ||
        item.thickness <= 0
      ) {
        itemErrors.thickness = "Valid thickness is required (must be > 0)";
      }
      if (
        item.sheet_price === "" ||
        item.sheet_price === null ||
        item.sheet_price < 0
      ) {
        itemErrors.sheet_price = "Valid sheet price is required";
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[`drawer-${item.id}`] = itemErrors;
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
      // Save sheet goods (only if there are changes)
      let sheetGoodsResult;
      if (!isEqual(localSheetGoods, originalSheetGoods)) {
        sheetGoodsResult = await dispatch(
          saveSheetGoods(localSheetGoods, originalSheetGoods)
        );

        if (!sheetGoodsResult || !sheetGoodsResult.success) {
          throw new Error(
            sheetGoodsResult?.error || "Failed to save sheet goods"
          );
        }
      } else {
        // No changes, use current data
        sheetGoodsResult = { success: true, data: localSheetGoods };
      }

      // Save drawer box materials (only if there are changes)
      let drawerBoxResult;
      if (!isEqual(localDrawerBoxMaterials, originalDrawerBoxMaterials)) {
        drawerBoxResult = await dispatch(
          saveDrawerBoxMaterials(
            localDrawerBoxMaterials,
            originalDrawerBoxMaterials
          )
        );

        if (!drawerBoxResult || !drawerBoxResult.success) {
          throw new Error(
            drawerBoxResult?.error || "Failed to save drawer box materials"
          );
        }
      } else {
        // No changes, use current data
        drawerBoxResult = { success: true, data: localDrawerBoxMaterials };
      }

      console.log("Materials saved successfully");

      // Update local and original state with fresh data
      if (sheetGoodsResult.data) {
        setLocalSheetGoods(sheetGoodsResult.data);
        setOriginalSheetGoods(
          JSON.parse(JSON.stringify(sheetGoodsResult.data))
        );
      }
      if (drawerBoxResult.data) {
        setLocalDrawerBoxMaterials(drawerBoxResult.data);
        setOriginalDrawerBoxMaterials(
          JSON.parse(JSON.stringify(drawerBoxResult.data))
        );
      }

      setValidationErrors({}); // Clear errors on successful save
    } catch (error) {
      console.error("Error saving materials:", error);
      throw error;
    }
  };

  const handleCancel = () => {
    setLocalSheetGoods(JSON.parse(JSON.stringify(originalSheetGoods)));
    setLocalDrawerBoxMaterials(
      JSON.parse(JSON.stringify(originalDrawerBoxMaterials))
    );
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
  }, [focusItemId, localSheetGoods, localDrawerBoxMaterials]);

  // Helper to get errors for a specific item
  const getItemErrors = (itemId, prefix) => {
    return validationErrors[`${prefix}-${itemId}`] || {};
  };

  // Column definitions for Sheet Goods
  const sheetGoodsColumns = [
    {
      field: "name",
      label: "Name",
      width: "240px",
      type: "text",
      placeholder: "Material name",
      hasError: (item) => !!getItemErrors(item.id, "sheet").name,
    },
    {
      field: "width",
      label: "Width",
      width: "70px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "sheet").width,
    },
    {
      field: "height",
      label: "Height",
      width: "70px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "sheet").height,
    },
    {
      field: "thickness",
      label: "Thickness",
      width: "80px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "sheet").thickness,
    },
    {
      field: "sheet_price",
      label: "Sheet $",
      width: "80px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "sheet").sheet_price,
    },
    {
      field: "bd_ft_price",
      label: "Bd Ft $",
      width: "80px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "sheet").bd_ft_price,
    },
    {
      field: "box_mat",
      label: "Box",
      width: "60px",
      render: (item, onChange) => (
        <input
          type="checkbox"
          checked={item.box_mat || false}
          onChange={(e) => onChange("box_mat", e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          disabled={item.markedForDeletion}
        />
      ),
    },
    {
      field: "face_mat",
      label: "Face",
      width: "60px",
      render: (item, onChange) => (
        <input
          type="checkbox"
          checked={item.face_mat || false}
          onChange={(e) => onChange("face_mat", e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          disabled={item.markedForDeletion}
        />
      ),
    },
    {
      field: "five_piece",
      label: "5 Piece",
      width: "70px",
      render: (item, onChange) => (
        <input
          type="checkbox"
          checked={item.five_piece || false}
          onChange={(e) => onChange("five_piece", e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          disabled={item.markedForDeletion}
        />
      ),
    },
    {
      field: "slab_door",
      label: "Slab",
      width: "60px",
      render: (item, onChange) => (
        <input
          type="checkbox"
          checked={item.slab_door || false}
          onChange={(e) => onChange("slab_door", e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          disabled={item.markedForDeletion}
        />
      ),
    },
    {
      field: "needs_finish",
      label: "Finish",
      width: "60px",
      render: (item, onChange) => (
        <input
          type="checkbox"
          checked={item.needs_finish || false}
          onChange={(e) => onChange("needs_finish", e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          disabled={item.markedForDeletion}
        />
      ),
    },
  ];

  // Column definitions for Drawer Box Materials
  const drawerBoxColumns = [
    {
      field: "name",
      label: "Name",
      width: "200px",
      type: "text",
      placeholder: "Material name",
      hasError: (item) => !!getItemErrors(item.id, "drawer").name,
    },
    {
      field: "width",
      label: "Width",
      width: "100px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "drawer").width,
    },
    {
      field: "height",
      label: "Height",
      width: "100px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "drawer").height,
    },
    {
      field: "thickness",
      label: "Thickness",
      width: "100px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "drawer").thickness,
    },
    {
      field: "sheet_price",
      label: "Sheet Price",
      width: "120px",
      type: "number",
      placeholder: "0",
      hasError: (item) => !!getItemErrors(item.id, "drawer").sheet_price,
    },
  ];

  return (
    <div className="flex justify-center h-full pb-10">
      <div className={`flex-1 flex flex-col ${maxWidthClass}`}>
        <div className="sticky top-0 z-10 bg-slate-800 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">
              Manage Materials
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
              <SettingsSection
                title="Sheet Goods"
                maxWidthClass={maxWidthClass}
              >
                <SettingsList
                  items={localSheetGoods}
                  columns={sheetGoodsColumns}
                  onDelete={handleDeleteSheetGood}
                  onCancelDelete={handleCancelDeleteSheetGood}
                  onChange={handleSheetGoodChange}
                  onAdd={handleAddSheetGood}
                  addLabel="+ Add Sheet Good"
                  inputRefs={inputRefs}
                  itemPrefix="sheet"
                />
              </SettingsSection>

              <SettingsSection
                title="Drawer Box Materials"
                maxWidthClass={maxWidthClass}
              >
                <SettingsList
                  items={localDrawerBoxMaterials}
                  columns={drawerBoxColumns}
                  onDelete={handleDeleteDrawerBox}
                  onCancelDelete={handleCancelDeleteDrawerBox}
                  onChange={handleDrawerBoxChange}
                  onAdd={handleAddDrawerBox}
                  addLabel="+ Add Drawer Box Material"
                  inputRefs={inputRefs}
                  itemPrefix="drawer"
                />
              </SettingsSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

MaterialsSettings.displayName = "MaterialsSettings";

export default MaterialsSettings;
