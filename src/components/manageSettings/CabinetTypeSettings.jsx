import isEqual from "lodash/isEqual";
import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { FiPlus } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import {
  fetchCabinetAnchors,
  saveCabinetAnchors,
} from "../../redux/actions/cabinetAnchors";
import {
  fetchCabinetTypes,
  addCabinetType,
  updateCabinetType,
} from "../../redux/actions/cabinetTypes";

import CabinetAnchorsTable from "./CabinetAnchorsTable.jsx";
import CabinetTypeCard from "./CabinetTypeCard.jsx";
import SettingsSection from "./SettingsSection.jsx";

const CabinetTypeSettings = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const { types, loading, error } = useSelector((state) => state.cabinetTypes);
  const { itemsByType: anchorsByType } = useSelector(
    (state) => state.cabinetAnchors
  ) || { itemsByType: {} };
  const { teamId } = useSelector((state) => state.auth);

  // All state managed in parent
  const [localTypes, setLocalTypes] = useState([]);
  const [localAnchors, setLocalAnchors] = useState({});
  const [originalAnchors, setOriginalAnchors] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [anchorErrors, setAnchorErrors] = useState({});

  useEffect(() => {
    dispatch(fetchCabinetTypes());
    if (teamId) {
      dispatch(fetchCabinetAnchors());
    }
  }, [dispatch, teamId]);

  useEffect(() => {
    const activeTypes = types || [];
    setLocalTypes(activeTypes);
  }, [types]);

  useEffect(() => {
    // Process anchors by type - they're already grouped by cabinet_type_id in the new structure
    const processedAnchors = {};
    const originalProcessed = {};

    // Iterate through each cabinet type
    Object.entries(anchorsByType).forEach(([typeId, anchors]) => {
      processedAnchors[typeId] = anchors.map((anchor) => ({
        ...anchor,
        markedForDeletion: false,
      }));
      originalProcessed[typeId] = JSON.parse(
        JSON.stringify(processedAnchors[typeId])
      );
    });

    setLocalAnchors(processedAnchors);
    setOriginalAnchors(originalProcessed);
  }, [anchorsByType]);

  const handleInputChange = (id, field, value) => {
    setLocalTypes((prev) =>
      prev.map((type) => (type.id === id ? { ...type, [field]: value } : type))
    );
  };

  const toggleActiveState = (id) => {
    setLocalTypes((prev) =>
      prev.map((type) =>
        type.id === id ? { ...type, is_active: !type.is_active } : type
      )
    );
  };

  const handleAddNew = () => {
    const newType = {
      id: uuidv4(),
      name: "",
      default_width: 0,
      default_height: 0,
      default_depth: 0,
      isNew: true,
      is_active: true,
    };
    setLocalTypes((prev) => [...prev, newType]);
  };

  // Anchor management functions
  const handleAnchorChange = (cabinetTypeId, anchors) => {
    setLocalAnchors((prev) => ({
      ...prev,
      [cabinetTypeId]: anchors,
    }));
  };

  const validateAllAnchors = () => {
    const newAnchorErrors = {};
    let hasAnchorErrors = false;

    Object.entries(localAnchors).forEach(([typeId, anchors]) => {
      anchors.forEach((anchor) => {
        if (anchor.markedForDeletion) return;

        const anchorErrors = {};
        if (anchor.width === "" || anchor.width === null)
          anchorErrors.width = "Required";
        if (anchor.height === "" || anchor.height === null)
          anchorErrors.height = "Required";
        if (anchor.depth === "" || anchor.depth === null)
          anchorErrors.depth = "Required";

        if (Object.keys(anchorErrors).length > 0) {
          if (!newAnchorErrors[typeId]) newAnchorErrors[typeId] = {};
          newAnchorErrors[typeId][anchor.id] = anchorErrors;
          hasAnchorErrors = true;
        }
      });
    });

    setAnchorErrors(newAnchorErrors);
    return !hasAnchorErrors;
  };

  const parseAnchorValues = (anchor) => {
    const parseNumeric = (val) => {
      if (val === "" || val === null || val === undefined) {
        return null;
      }
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    return {
      ...anchor,
      width: parseNumeric(anchor.width),
      height: parseNumeric(anchor.height),
      depth: parseNumeric(anchor.depth),
      services:
        anchor.services?.map((s) => ({
          ...s,
          hours:
            s.hours === "" || s.hours === null ? 0 : parseFloat(s.hours) || 0,
        })) || [],
    };
  };

  const handleSave = async () => {
    // Validate cabinet types
    const newErrors = {};
    let hasTypeErrors = false;

    localTypes.forEach((type) => {
      const errors = {};
      if (!type.name) errors.name = true;
      if (type.default_width == null || type.default_width === "")
        errors.default_width = true;
      if (type.default_height == null || type.default_height === "")
        errors.default_height = true;
      if (type.default_depth == null || type.default_depth === "")
        errors.default_depth = true;

      if (Object.keys(errors).length > 0) {
        newErrors[type.id] = errors;
        hasTypeErrors = true;
      }
    });

    setValidationErrors(newErrors);

    // Validate all anchors
    const anchorsValid = validateAllAnchors();

    if (hasTypeErrors || !anchorsValid) {
      console.log("Validation failed - stopping save");
      return;
    }

    try {
      // Save cabinet types first
      const typesToUpdate = [];
      const typesToAdd = localTypes.filter((t) => t.isNew);

      localTypes.forEach((localType) => {
        if (!localType.isNew) {
          const originalType = types.find((t) => t.id === localType.id);
          if (JSON.stringify(originalType) !== JSON.stringify(localType)) {
            typesToUpdate.push(localType);
          }
        }
      });

      typesToUpdate.forEach((type) => {
        const { id, ...data } = type;
        dispatch(updateCabinetType(id, data));
      });

      typesToAdd.forEach((type) => {
        const { id, isNew, ...data } = type;
        dispatch(addCabinetType({ ...data, is_active: true }));
      });

      // Save all anchors
      for (const [typeId, anchors] of Object.entries(localAnchors)) {
        const parsedAnchors = anchors.map(parseAnchorValues);
        const originalTypeAnchors = originalAnchors[typeId] || [];

        const newAnchors = parsedAnchors
          .filter((anchor) => anchor.isNew && !anchor.markedForDeletion)
          .map((anchor) => ({
            ...anchor,
            cabinet_type_id: typeId,
          }));

        const updatedAnchors = parsedAnchors
          .filter((localAnchor) => {
            if (localAnchor.isNew || localAnchor.markedForDeletion)
              return false;
            const original = originalTypeAnchors.find(
              (oa) => oa.id === localAnchor.id
            );
            return original && !isEqual(original, localAnchor);
          })
          .map((anchor) => ({
            ...anchor,
            cabinet_type_id: typeId,
          }));

        const deletedIds = parsedAnchors
          .filter((anchor) => !anchor.isNew && anchor.markedForDeletion)
          .map((anchor) => anchor.id);

        if (
          newAnchors.length > 0 ||
          updatedAnchors.length > 0 ||
          deletedIds.length > 0
        ) {
          await dispatch(
            saveCabinetAnchors(newAnchors, updatedAnchors, deletedIds)
          );
        }
      }

      console.log("Save completed successfully");
    } catch (error) {
      console.error("Error during save:", error);
    }
  };

  const handleCancel = () => {
    setLocalTypes(types || []);
    setValidationErrors({});
    setLocalAnchors(JSON.parse(JSON.stringify(originalAnchors)));
    setAnchorErrors({});
  };

  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
  }));

  return (
    <div className="flex flex-col h-full pb-10">
      <div className="sticky top-0 z-10 bg-slate-800 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200">
            Manage Cabinet Types
          </h2>
          <button
            onClick={handleAddNew}
            className="flex items-center px-2 py-2 text-sm bg-slate-600 text-slate-200 hover:bg-slate-500"
          >
            <FiPlus className="h-5 w-5 mr-2" />
            Add Type
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-150px)]">
        {loading && <div className="p-4 text-white">Loading...</div>}
        {error && <div className="p-4 text-red-500">Error: {error}</div>}
        {(Object.keys(validationErrors).length > 0 ||
          Object.keys(anchorErrors).length > 0) && (
          <div className="p-2 my-2 text-red-400 bg-red-900/50 border border-red-700 rounded-md">
            Please fill out all required fields.
          </div>
        )}
        {!loading && !error && (
          <>
            <SettingsSection
              title={
                localTypes.some((t) => !t.is_active)
                  ? "Active Cabinet Types"
                  : ""
              }
            >
              <div className="space-y-2 p-1">
                <div className="grid grid-cols-6 gap-4 px-4 font-bold text-slate-400 items-end">
                  <div className="col-span-2">Name</div>
                  <div className="col-span-3 flex flex-col">
                    <div className="text-center">Default Dimensions</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>Width</div>
                      <div>Height</div>
                      <div>Depth</div>
                    </div>
                  </div>
                  <div className="text-right">Actions</div>
                </div>

                {localTypes
                  .filter((t) => t.is_active)
                  .map((type) => (
                    <div key={type.id}>
                      <CabinetTypeCard
                        type={type}
                        onInputChange={handleInputChange}
                        onRemove={() => toggleActiveState(type.id)}
                        errors={validationErrors[type.id]}
                      />
                    </div>
                  ))}
              </div>
            </SettingsSection>

            {localTypes.some((t) => !t.is_active) && (
              <SettingsSection title="Inactive Cabinet Types">
                <div className="space-y-2 p-1">
                  <div className="grid grid-cols-6 gap-4 px-4 font-bold text-slate-400 items-end">
                    <div className="col-span-2">Name</div>
                    <div>Width</div>
                    <div>Height</div>
                    <div>Depth</div>
                    <div className="text-right">Actions</div>
                  </div>

                  {localTypes
                    .filter((t) => !t.is_active)
                    .map((type) => (
                      <div
                        key={type.id}
                        className="grid grid-cols-6 gap-4 items-center bg-slate-800 p-2 rounded-md text-slate-500"
                      >
                        <div className="col-span-2">{type.name}</div>
                        <div className="">{type.default_width}</div>
                        <div className="">{type.default_height}</div>
                        <div className="">{type.default_depth}</div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => toggleActiveState(type.id)}
                            className="p-2 text-slate-400 hover:text-white"
                          >
                            Reactivate
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </SettingsSection>
            )}
            {localTypes.some((t) => t.isNew) && (
              <div className="p-2 mt-0 text-red-300 bg-red-900/50 border border-red-700 rounded-md">
                To add anchors for a newly added cabinet type, please Save
                Changes first
              </div>
            )}
          </>
        )}
      </div>

      <div className="z-10 bg-slate-800 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200">
            Manage Cabinet Anchors
          </h2>
        </div>
      </div>

      {localTypes
        .filter((t) => t.is_active && !t.isNew)
        .map((type) => (
          <SettingsSection key={type.id} title={type.name}>
            <CabinetAnchorsTable
              cabinetTypeId={type.id}
              anchors={localAnchors[type.id] || []}
              errors={anchorErrors[type.id] || {}}
              onAnchorsChange={(anchors) =>
                handleAnchorChange(type.id, anchors)
              }
            />
          </SettingsSection>
        ))}
    </div>
  );
});

CabinetTypeSettings.displayName = "CabinetTypeSettings";

export default CabinetTypeSettings;
