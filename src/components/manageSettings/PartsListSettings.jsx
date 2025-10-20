import isEqual from "lodash/isEqual";
import {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchTeamCabinetStyles } from "../../redux/actions/cabinetStyles";
import { fetchPartsList } from "../../redux/actions/partsList";
import {
  fetchPartsListAnchors,
  savePartsListAnchors,
} from "../../redux/actions/partsListAnchors";

import PartsListAnchorsTable from "./PartsListAnchorsTable.jsx";
import SettingsSection from "./SettingsSection.jsx";

const PartsListSettings = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const { items: partsList, loading, error } = useSelector((state) => state.partsList);
  const { itemsByPartsList: anchorsByPartsList } = useSelector(
    (state) => state.partsListAnchors
  ) || { itemsByPartsList: {} };
  const { teamId } = useSelector((state) => state.auth);

  // All state managed in parent
  const [localAnchors, setLocalAnchors] = useState({});
  const [originalAnchors, setOriginalAnchors] = useState({});
  const [anchorErrors, setAnchorErrors] = useState({});

  useEffect(() => {
    dispatch(fetchPartsList());
    dispatch(fetchTeamCabinetStyles());
    if (teamId) {
      dispatch(fetchPartsListAnchors());
    }
  }, [dispatch, teamId]);

  useEffect(() => {
    // Process anchors by parts list - they're already grouped by parts_list_id in the new structure
    const processedAnchors = {};
    const originalProcessed = {};

    // Iterate through each parts list item
    Object.entries(anchorsByPartsList).forEach(([partsListId, anchors]) => {
      processedAnchors[partsListId] = anchors.map((anchor) => ({
        ...anchor,
        markedForDeletion: false,
      }));
      originalProcessed[partsListId] = JSON.parse(
        JSON.stringify(processedAnchors[partsListId])
      );
    });

    setLocalAnchors(processedAnchors);
    setOriginalAnchors(originalProcessed);
  }, [anchorsByPartsList]);

  // Anchor management functions
  const handleAnchorChange = (partsListId, anchors) => {
    setLocalAnchors((prev) => ({
      ...prev,
      [partsListId]: anchors,
    }));
  };

  const validateAllAnchors = () => {
    const newAnchorErrors = {};
    let hasAnchorErrors = false;

    Object.entries(localAnchors).forEach(([partsListId, anchors]) => {
      // Count valid anchors (not marked for deletion and not empty)
      const validAnchors = anchors.filter(
        (anchor) =>
          !anchor.markedForDeletion &&
          (anchor.width !== "" ||
            anchor.height !== "" ||
            anchor.depth !== "" ||
            anchor.cabinet_style_id !== null)
      );

      // Check if there's exactly 1 anchor - must have at least 2 for interpolation
      if (validAnchors.length === 1) {
        if (!newAnchorErrors[partsListId]) newAnchorErrors[partsListId] = {};
        newAnchorErrors[partsListId]["_general"] = {
          message:
            "Must have at least 2 anchors (a min and a larger one). Add another anchor or remove this one.",
        };
        hasAnchorErrors = true;
      }

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
          if (!newAnchorErrors[partsListId]) newAnchorErrors[partsListId] = {};
          newAnchorErrors[partsListId][anchor.id] = anchorErrors;
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
      cabinet_style_id: anchor.cabinet_style_id || null,
      services:
        anchor.services?.map((s) => ({
          ...s,
          minutes:
            s.minutes === "" || s.minutes === null ? 0 : parseInt(s.minutes) || 0,
        })) || [],
    };
  };

  const handleSave = async () => {
    // Validate all anchors
    const anchorsValid = validateAllAnchors();

    if (!anchorsValid) {
      return;
    }

    try {
      // Save all anchors
      for (const [partsListId, anchors] of Object.entries(localAnchors)) {
        const parsedAnchors = anchors.map(parseAnchorValues);
        const originalPartsListAnchors = originalAnchors[partsListId] || [];

        const newAnchors = parsedAnchors
          .filter((anchor) => anchor.isNew && !anchor.markedForDeletion)
          .map((anchor) => ({
            ...anchor,
            parts_list_id: partsListId,
          }));

        const updatedAnchors = parsedAnchors
          .filter((localAnchor) => {
            if (localAnchor.isNew || localAnchor.markedForDeletion)
              return false;
            const original = originalPartsListAnchors.find(
              (oa) => oa.id === localAnchor.id
            );
            return original && !isEqual(original, localAnchor);
          })
          .map((anchor) => ({
            ...anchor,
            parts_list_id: partsListId,
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
            savePartsListAnchors(newAnchors, updatedAnchors, deletedIds)
          );
        }
      }
    } catch (error) {
      // Error handling is done in Redux action
    }
  };

  const handleCancel = () => {
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
            Manage Parts List Anchors - Time (minutes)
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-150px)]">
        {loading && <div className="p-4 text-white">Loading...</div>}
        {error && <div className="p-4 text-red-500">Error: {error}</div>}
        {Object.keys(anchorErrors).length > 0 && (
          <div className="p-2 my-2 text-red-400 bg-red-900/50 border border-red-700 rounded-md">
            Please fill out all required fields.
          </div>
        )}
        {!loading && !error && (
          <>
            {partsList
              // .sort((a, b) => a.name.localeCompare(b.name))
              .map((part) => (
                <SettingsSection key={part.id} title={part.name}>
                  <PartsListAnchorsTable
                    partsListId={part.id}
                    anchors={localAnchors[part.id] || []}
                    errors={anchorErrors[part.id] || {}}
                    onAnchorsChange={(anchors) =>
                      handleAnchorChange(part.id, anchors)
                    }
                  />
                </SettingsSection>
              ))}
          </>
        )}
      </div>
    </div>
  );
});

PartsListSettings.displayName = "PartsListSettings";

export default PartsListSettings;
