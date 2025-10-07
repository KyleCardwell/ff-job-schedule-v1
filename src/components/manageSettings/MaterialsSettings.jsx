import isEqual from "lodash/isEqual";
import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import {
  fetchSheetGoods,
  fetchDrawerBoxMaterials,
} from "../../redux/actions/materials";

import SettingsList from "./SettingsList.jsx";
import SettingsSection from "./SettingsSection.jsx";

const MaterialsSettings = forwardRef((props, ref) => {
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
  const [allSheetGoods, setAllSheetGoods] = useState([]);

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
          setAllSheetGoods(data);
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
  };

  const handleDeleteSheetGood = (id) => {
    setLocalSheetGoods((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: true } : item
      )
    );
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
  };

  const handleDeleteDrawerBox = (id) => {
    setLocalDrawerBoxMaterials((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: true } : item
      )
    );
  };

  const handleCancelDeleteDrawerBox = (id) => {
    setLocalDrawerBoxMaterials((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, markedForDeletion: false } : item
      )
    );
  };

  const handleSave = async () => {
    try {
      // TODO: Implement save logic for sheet goods
      // - Insert new items (isNew === true)
      // - Update changed items
      // - Delete marked items (markedForDeletion === true)

      // TODO: Implement save logic for drawer box materials
      // - Insert new items (isNew === true)
      // - Update changed items
      // - Delete marked items (markedForDeletion === true)

      console.log("Save materials - to be implemented");
    } catch (error) {
      console.error("Error saving materials:", error);
    }
  };

  const handleCancel = () => {
    setLocalSheetGoods(JSON.parse(JSON.stringify(originalSheetGoods)));
    setLocalDrawerBoxMaterials(
      JSON.parse(JSON.stringify(originalDrawerBoxMaterials))
    );
  };

  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
  }));

  // Column definitions for Sheet Goods
  const sheetGoodsColumns = [
    {
      field: "name",
      label: "Name",
      width: "240px",
      type: "text",
      placeholder: "Material name",
    },
    {
      field: "width",
      label: "Width",
      width: "70px",
      type: "number",
      placeholder: "0",
    },
    {
      field: "height",
      label: "Height",
      width: "70px",
      type: "number",
      placeholder: "0",
    },
    {
      field: "thickness",
      label: "Thickness",
      width: "80px",
      type: "number",
      placeholder: "0",
    },
    {
      field: "sheet_price",
      label: "Sheet $",
      width: "80px",
      type: "number",
      placeholder: "0",
    },
    {
      field: "bd_ft_price",
      label: "Bd Ft $",
      width: "80px",
      type: "number",
      placeholder: "0",
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
      width: "240px",
      type: "text",
      placeholder: "Material name",
    },
    {
      field: "width",
      label: "Width",
      width: "100px",
      type: "number",
      placeholder: "0",
    },
    {
      field: "height",
      label: "Height",
      width: "100px",
      type: "number",
      placeholder: "0",
    },
    {
      field: "thickness",
      label: "Thickness",
      width: "100px",
      type: "number",
      placeholder: "0",
    },
    {
      field: "sheet_price",
      label: "Sheet Price",
      width: "120px",
      type: "number",
      placeholder: "0",
    },
  ];

  return (
    <div className="flex flex-col h-full pb-10">
      <div className="sticky top-0 z-10 bg-slate-800 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200">Manage Materials</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-150px)]">
        {loading && <div className="p-4 text-white">Loading...</div>}
        {error && <div className="p-4 text-red-500">Error: {error}</div>}
        {!loading && !error && (
          <>
            <SettingsSection
              title="Sheet Goods"
              maxWidthClass={props.maxWidthClass}
            >
              <SettingsList
                items={localSheetGoods}
                columns={sheetGoodsColumns}
                onDelete={handleDeleteSheetGood}
                onCancelDelete={handleCancelDeleteSheetGood}
                onChange={handleSheetGoodChange}
                onAdd={handleAddSheetGood}
                addLabel="+ Add Sheet Good"
              />
            </SettingsSection>

            <SettingsSection
              title="Drawer Box Materials"
              maxWidthClass={props.maxWidthClass}
            >
              <SettingsList
                items={localDrawerBoxMaterials}
                columns={drawerBoxColumns}
                onDelete={handleDeleteDrawerBox}
                onCancelDelete={handleCancelDeleteDrawerBox}
                onChange={handleDrawerBoxChange}
                onAdd={handleAddDrawerBox}
                addLabel="+ Add Drawer Box Material"
              />
            </SettingsSection>
          </>
        )}
      </div>
    </div>
  );
});

MaterialsSettings.displayName = "MaterialsSettings";

export default MaterialsSettings;
