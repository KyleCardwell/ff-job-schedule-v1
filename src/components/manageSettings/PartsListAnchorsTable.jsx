import React, { useState } from "react";
import { FiPlus, FiTrash2, FiEdit, FiX } from "react-icons/fi";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

const AnchorRow = ({
  anchor,
  services,
  cabinetStyles,
  onDelete,
  onUndo,
  isNew,
  onCancelNew,
  onChange,
  errors = {},
  gridCols
}) => {
  const [isEditing, setIsEditing] = useState(isNew);

  const handleInputChange = (e, serviceId) => {
    const { name, value } = e.target;

    let updatedAnchor;
    if (serviceId) {
      const updatedServices = anchor.services.map((s) =>
        s.team_service_id === serviceId ? { ...s, minutes: value } : s
      );
      updatedAnchor = { ...anchor, services: updatedServices };
    } else {
      updatedAnchor = { ...anchor, [name]: value };
    }
    onChange(updatedAnchor);
  };

  const handleCancel = () => {
    if (isNew) {
      onCancelNew(anchor.id);
    } else {
      onChange(null, anchor.id); // Signal parent to revert this anchor's changes
      setIsEditing(false);
    }
  };

  if (anchor.markedForDeletion) {
    return (
      <div
        className="grid border-b border-slate-700/50 pb-2"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="px-4 py-2 text-red-200 bg-red-900/30 hover:bg-red-900/40 rounded-l-md">
          {anchor.width}
        </div>
        <div className="px-4 py-2 text-red-200 bg-red-900/30 hover:bg-red-900/40">
          {anchor.height}
        </div>
        <div className="px-4 py-2 text-red-200 bg-red-900/30 hover:bg-red-900/40">
          {anchor.depth}
        </div>
        <div className="px-4 py-2 text-red-200 bg-red-900/30 hover:bg-red-900/40">
          {anchor.cabinet_style_id 
            ? cabinetStyles.find(s => s.cabinet_style_id == parseInt(anchor.cabinet_style_id))?.cabinet_style_name || 'All'
            : 'All'}
        </div>
        {Array.isArray(services) &&
          services.map((s) => (
            <div
              key={s.team_service_id}
              className="px-4 py-2 text-red-200 bg-red-900/30 hover:bg-red-900/40"
            >
              {anchor.services.find(
                (ans) => ans.team_service_id === s.team_service_id
              )?.minutes || 0}
            </div>
          ))}
        <div className="px-4 py-2 text-right bg-red-900/30 hover:bg-red-900/40 rounded-r-md">
          <button
            onClick={() => onUndo(anchor.id)}
            className="text-slate-300 hover:text-white"
          >
            Undo
          </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        className="grid border-b border-slate-700/50 pb-2"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="p-2">
          <input
            type="number"
            name="width"
            value={anchor.width}
            onChange={handleInputChange}
            className={`w-full p-1 rounded-md ${
              errors && errors.width ? "border border-red-500" : ""
            }`}
          />
        </div>
        <div className="p-2">
          <input
            type="number"
            name="height"
            value={anchor.height}
            onChange={handleInputChange}
            className={`w-full p-1 rounded-md ${
              errors && errors.height ? "border border-red-500" : ""
            }`}
          />
        </div>
        <div className="p-2">
          <input
            type="number"
            name="depth"
            value={anchor.depth}
            onChange={handleInputChange}
            className={`w-full p-1 rounded-md ${
              errors && errors.depth ? "border border-red-500" : ""
            }`}
          />
        </div>
        <div className="p-2">
          <select
            name="cabinet_style_id"
            value={anchor.cabinet_style_id || ''}
            onChange={handleInputChange}
            className="w-full p-1 rounded-md bg-slate-600 text-white"
          >
            <option value="">All Styles</option>
            {cabinetStyles.map(style => (
              <option key={style.cabinet_style_id} value={style.cabinet_style_id}>
                {style.cabinet_style_name}
              </option>
            ))}
          </select>
        </div>
        {Array.isArray(services) &&
          services.map((s) => (
            <div key={s.team_service_id} className="p-2">
              <input
                type="number"
                value={
                  anchor.services.find(
                    (ans) => ans.team_service_id === s.team_service_id
                  )?.minutes || ""
                }
                onChange={(e) => handleInputChange(e, s.team_service_id)}
                className="w-full p-1 rounded-md"
              />
            </div>
          ))}
        <div className="p-2 text-right">
          <button
            onClick={() => setIsEditing(false)}
            className="p-2 text-green-400"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid border-b border-slate-700/50 pb-2 hover:bg-slate-600/50 text-slate-200"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="px-4 py-2 rounded-l-md flex items-center">
        {anchor.width}
      </div>
      <div className="px-4 py-2 flex items-center">{anchor.height}</div>
      <div className="px-4 py-2 flex items-center">{anchor.depth}</div>
      <div className="px-4 py-2 flex items-center">
        {anchor.cabinet_style_id 
          ? cabinetStyles.find(s => s.cabinet_style_id === parseInt(anchor.cabinet_style_id))?.cabinet_style_name || 'All'
          : 'All'}
      </div>
      {Array.isArray(services) &&
        services.map((s) => (
          <div
            key={s.team_service_id}
            className="px-4 py-2 flex items-center"
          >
            {anchor.services.find(
              (ans) => ans.team_service_id === s.team_service_id
            )?.minutes || 0}
          </div>
        ))}
      <div className="px-4 py-2 text-right rounded-r-md">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 text-slate-200 hover:text-teal-400"
        >
          <FiEdit />
        </button>
        {anchor.isNew ? (
          <button
            onClick={() => onDelete(anchor.id)}
            className="p-2 text-slate-200 hover:text-red-400 font-bold"
            title="Remove (not yet saved)"
          >
            <FiX className="stroke-2" />
          </button>
        ) : (
          <button
            onClick={() => onDelete(anchor.id)}
            className="p-2 text-slate-200 hover:text-red-400"
            title="Mark for deletion"
          >
            <FiTrash2 />
          </button>
        )}
      </div>
    </div>
  );
};

const PartsListAnchorsTable = ({
  partsListId,
  anchors,
  errors,
  onAnchorsChange,
}) => {
  const services = useSelector(
    (state) => state.services?.allServices.filter((s) => s.is_active) || []
  );
  const cabinetStyles = useSelector(
    (state) => state.cabinetStyles?.styles || []
  ).filter((s) => s.is_active);
  const gridCols = `repeat(${4 + services.length}, minmax(0, 1fr)) 100px`;

  const handleAddNew = (currentServices) => {
    const initialServices = currentServices.map((s) => ({
      id: s.id,
      team_service_id: s.team_service_id,
      minutes: "",
    }));
    const newAnchor = {
      id: uuidv4(),
      isNew: true,
      width: "",
      height: "",
      depth: "",
      cabinet_style_id: null,
      parts_list_id: partsListId,
      services: initialServices,
      markedForDeletion: false,
    };
    onAnchorsChange([...anchors, newAnchor]);
  };

  const handleRowChange = (updatedAnchor, anchorIdToRevert) => {
    if (updatedAnchor === null) {
      // Revert changes - this would need original data from parent
      // For now, just keep the current anchor unchanged
      return;
    } else {
      const updatedAnchors = anchors.map((a) =>
        a.id === updatedAnchor.id ? updatedAnchor : a
      );
      onAnchorsChange(updatedAnchors);
    }
  };

  const handleMarkForDeletion = (idToDelete) => {
    // Find the anchor to check if it's new
    const anchorToDelete = anchors.find(a => a.id === idToDelete);
    
    if (anchorToDelete && anchorToDelete.isNew) {
      // If it's a new anchor, remove it directly
      onAnchorsChange(anchors.filter(a => a.id !== idToDelete));
    } else {
      // Otherwise, mark it for deletion
      const updatedAnchors = anchors.map((a) =>
        a.id === idToDelete ? { ...a, markedForDeletion: true } : a
      );
      onAnchorsChange(updatedAnchors);
    }
  };

  const handleUndoDelete = (idToUndo) => {
    const updatedAnchors = anchors.map((a) =>
      a.id === idToUndo ? { ...a, markedForDeletion: false } : a
    );
    onAnchorsChange(updatedAnchors);
  };

  const handleCancelNew = (id) => {
    const updatedAnchors = anchors.filter((a) => a.id !== id);
    onAnchorsChange(updatedAnchors);
  };

  // Group anchors by cabinet_style_id
  const groupedAnchors = () => {
    if (!anchors || anchors.length === 0) return [];

    // Group by cabinet_style_id (null means "All Styles")
    const groups = {};
    anchors.forEach((anchor) => {
      const styleId = anchor.cabinet_style_id || 'all';
      if (!groups[styleId]) {
        groups[styleId] = [];
      }
      groups[styleId].push(anchor);
    });

    // Convert to array and sort: "All Styles" first, then by style name
    return Object.entries(groups)
      .sort(([styleIdA], [styleIdB]) => {
        if (styleIdA === 'all') return -1;
        if (styleIdB === 'all') return 1;
        const styleA = cabinetStyles.find(s => s.cabinet_style_id === parseInt(styleIdA));
        const styleB = cabinetStyles.find(s => s.cabinet_style_id === parseInt(styleIdB));
        return (styleA?.cabinet_style_name || '').localeCompare(styleB?.cabinet_style_name || '');
      })
      .map(([styleId, items]) => ({
        styleId,
        styleName: styleId === 'all' 
          ? 'All Styles' 
          : cabinetStyles.find(s => s.cabinet_style_id === parseInt(styleId))?.cabinet_style_name || 'Unknown',
        items
      }));
  };

  const anchorGroups = groupedAnchors();
  const hasMultipleGroups = anchorGroups.length > 1;

  return (
    <>
      {/* General error message for minimum anchor count */}
      {errors && errors["_general"] && (
        <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          {errors["_general"].message}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <div 
          className="grid border-b-2 border-slate-600 mb-2" 
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="px-4 py-2 flex items-center text-xs text-slate-400 uppercase font-semibold bg-slate-700">
            Width
          </div>
          <div className="px-4 py-2 flex items-center text-xs text-slate-400 uppercase font-semibold bg-slate-700">
            Height
          </div>
          <div className="px-4 py-2 flex items-center text-xs text-slate-400 uppercase font-semibold bg-slate-700">
            Depth
          </div>
          <div className="px-4 py-2 flex items-center text-xs text-slate-400 uppercase font-semibold bg-slate-700">
            Style
          </div>
          {Array.isArray(services) &&
            services.map((s) => (
              <div
                key={s.team_service_id}
                className="px-4 py-2 flex items-center text-xs text-slate-400 uppercase font-semibold bg-slate-700 whitespace-nowrap"
              >
                {s.service_name}
              </div>
            ))}
          <div className="px-4 py-2 flex items-center justify-end text-xs text-slate-400 uppercase font-semibold bg-slate-700">
            Actions
          </div>
        </div>

        {anchorGroups.map((group, groupIndex) => (
          <React.Fragment key={group.styleId}>
            {hasMultipleGroups && groupIndex > 0 && (
              <div className="col-span-full my-4 border-t-2 border-slate-600" />
            )}
            {group.items.map((anchor) => (
              <AnchorRow
                key={anchor.id}
                anchor={anchor}
                services={services}
                cabinetStyles={cabinetStyles}
                onDelete={handleMarkForDeletion}
                onUndo={handleUndoDelete}
                isNew={anchor.isNew}
                onCancelNew={handleCancelNew}
                onChange={handleRowChange}
                errors={errors[anchor.id]}
                gridCols={gridCols}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <button
        onClick={() => handleAddNew(services)}
        className="mt-4 flex items-center px-2 py-1 text-sm bg-slate-600 text-slate-200 rounded-md hover:bg-slate-500"
      >
        <FiPlus className="mr-2" /> Add Anchor
      </button>
    </>
  );
};

export default PartsListAnchorsTable;
