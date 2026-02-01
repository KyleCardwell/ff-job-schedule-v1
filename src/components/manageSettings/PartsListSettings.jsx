import isEqual from "lodash/isEqual";
import {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { FiBarChart } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { fetchTeamCabinetStyles } from "../../redux/actions/cabinetStyles";
import { fetchPartsList } from "../../redux/actions/partsList";
import {
  fetchPartsListAnchors,
  savePartsListAnchors,
} from "../../redux/actions/partsListAnchors";
import { fetchServices } from "../../redux/actions/services.js";
import ScrollableIndex from "../common/ScrollableIndex.jsx";

import PartsListAnchorsTable from "./PartsListAnchorsTable.jsx";
import PartsListTestCalculator from "./PartsListTestCalculator.jsx";
import SettingsSection from "./SettingsSection.jsx";

const PartsListSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const {
    items: partsList,
    loading,
    error,
  } = useSelector((state) => state.partsList);
  const { itemsByPartsList: anchorsByPartsList } = useSelector(
    (state) => state.partsListAnchors
  ) || { itemsByPartsList: {} };
  const { teamId } = useSelector((state) => state.auth);

  // All state managed in parent
  const [localAnchors, setLocalAnchors] = useState({});
  const [originalAnchors, setOriginalAnchors] = useState({});
  const [anchorErrors, setAnchorErrors] = useState({});
  const [highlightedPartId, setHighlightedPartId] = useState(null);
  const [showTestCalculator, setShowTestCalculator] = useState(false);

  // Refs for scrolling to sections
  const sectionRefs = useRef({});
  const scrollContainerRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  useEffect(() => {
    dispatch(fetchPartsList());
    dispatch(fetchServices())
    dispatch(fetchTeamCabinetStyles());
    if (teamId) {
      dispatch(fetchPartsListAnchors());
    }
  }, [dispatch, teamId]);

  // Handle highlight effect when clicking on index items
  const handleIndexItemClick = (partId) => {
    // Clear any existing timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Set highlighted part
    setHighlightedPartId(partId);

    // Clear highlight after 2 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedPartId(null);
    }, 2000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

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
            s.minutes === "" || s.minutes === null
              ? 0
              : parseInt(s.minutes) || 0,
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

  // Group and sort parts list by needs_finish
  const groupedPartsList = () => {
    if (!partsList || partsList.length === 0) return [];

    const unfinished = partsList
      .filter((part) => part.needs_finish === false)
      .sort((a, b) => a.name.localeCompare(b.name));

    const finished = partsList
      .filter((part) => part.needs_finish === true)
      .sort((a, b) => a.name.localeCompare(b.name));

    const groups = [];
    if (unfinished.length > 0) {
      groups.push({ type: 'group', label: 'Unfinished Parts', items: unfinished });
    }
    if (finished.length > 0) {
      groups.push({ type: 'group', label: 'Finished Parts', items: finished });
    }
    return groups;
  };

  const groupedParts = groupedPartsList();

  return (
    <div className="flex h-full pb-10 relative">
      <div className="flex">
        {/* Right Side Index Navigation */}
        {!loading && !error && partsList.length > 0 && (
          <ScrollableIndex
            groups={groupedParts}
            title="Parts List"
            scrollContainerRef={scrollContainerRef}
            sectionRefs={sectionRefs}
            scrollOffset={120}
            onItemClick={handleIndexItemClick}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col items-center">
        <div className={`flex-1 ${maxWidthClass}`}>
          <div className={`flex sticky top-0 z-10 bg-slate-800 py-4 justify-between items-center`}>
            <h2 className="align-self-start text-lg font-bold text-slate-200">
              Manage Parts List Anchors - Time (minutes)
            </h2>
            <button
              onClick={() => setShowTestCalculator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md transition-colors"
              title="Test parts time calculations"
            >
              <FiBarChart size={18} />
              Test Calculator
            </button>
          </div>

          <div className={`flex flex-1 gap-4`}>
            {/* Main Content */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto max-h-[calc(100vh-150px)] pr-4 -ml-2 pl-2"
            >
              {loading && <div className="p-4 text-white">Loading...</div>}
              {error && <div className="p-4 text-red-500">Error: {error}</div>}
              {Object.keys(anchorErrors).length > 0 && (
                <div className="p-2 my-2 text-red-400 bg-red-900/50 border border-red-700 rounded-md">
                  Please fill out all required fields.
                </div>
              )}
              {!loading && !error && (
                <>
                  {groupedParts.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-xl font-bold text-slate-100 mt-6 mb-4 pb-2 border-b border-slate-600 sticky top-0 z-10 bg-slate-800">
                        {group.label}
                      </h3>
                      {group.items.map((part) => (
                        <div
                          key={part.id}
                          ref={(el) => (sectionRefs.current[part.id] = el)}
                          data-section-id={part.id}
                          className={`transition-all duration-500 p-0.5 my-1 ${
                            highlightedPartId === part.id
                              ? "ring-2 ring-teal-400 rounded-lg bg-teal-900/20"
                              : ""
                          }`}
                        >
                          <SettingsSection title={`${part.name}${part.description ? ` ${part.description}` : ""}`}>
                            <PartsListAnchorsTable
                              partsListId={part.id}
                              anchors={localAnchors[part.id] || []}
                              errors={anchorErrors[part.id] || {}}
                              onAnchorsChange={(anchors) =>
                                handleAnchorChange(part.id, anchors)
                              }
                            />
                          </SettingsSection>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Test Calculator Modal */}
      {showTestCalculator && (
        <PartsListTestCalculator
          onClose={() => setShowTestCalculator(false)}
        />
      )}
    </div>
  );
});

PartsListSettings.displayName = "PartsListSettings";

export default PartsListSettings;
