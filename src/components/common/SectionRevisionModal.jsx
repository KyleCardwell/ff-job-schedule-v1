import PropTypes from "prop-types";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSelector } from "react-redux";

import { createSectionContext } from "../../utils/createSectionContext";
import { getSectionCalculations } from "../../utils/getSectionCalculations";
import { supabase } from "../../utils/supabase";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatRevisionDate = (value) => {
  if (!value) return "—";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeRpcRevisions = (data) => {
  if (Array.isArray(data)) return data;

  if (typeof data === "string") {
    try {
      const parsedData = JSON.parse(data);
      return Array.isArray(parsedData) ? parsedData : [];
    } catch {
      return [];
    }
  }

  return [];
};

const SectionRevisionModal = ({ open, onClose, section, task, onSwitch }) => {
  const panelRef = useRef(null);

  const [revisions, setRevisions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const currentEstimate = useSelector((state) => state.estimates.currentEstimate);
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials,
  );
  const services = useSelector((state) => state.services?.allServices || []);
  const finishTypes = useSelector((state) => state.finishes?.finishes || []);
  const cabinetStyles = useSelector(
    (state) => state.cabinetStyles?.styles.filter((style) => style.is_active) || [],
  );
  const cabinetTypes = useSelector(
    (state) => state.cabinetTypes?.types.filter((type) => type.is_active) || [],
  );
  const { hardware, accessories, lengths } = useSelector((state) => state);
  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors?.itemsByPartsList || [],
  );
  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors?.itemsByType || [],
  );
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults?.teamDefaults,
  );

  useEffect(() => {
    if (!open) {
      setRevisions([]);
      setSelectedId(null);
      setError("");
      setIsLoading(false);
      setIsSaving(false);
      return;
    }

    setRevisions([]);
    setSelectedId(section?.est_section_id ?? null);
    setError("");

    if (!section?.section_lineage_id || !task?.est_task_id) {
      return;
    }

    let isCancelled = false;

    const fetchRevisions = async () => {
      setIsLoading(true);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_section_revisions",
          {
            p_lineage_id: section.section_lineage_id,
            p_task_id: task.est_task_id,
          },
        );

        if (rpcError) throw rpcError;

        if (!isCancelled) {
          setRevisions(normalizeRpcRevisions(data));
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setRevisions([]);
          setError(fetchError.message || "Failed to load section versions.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchRevisions();

    return () => {
      isCancelled = true;
    };
  }, [open, section, task]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open, onClose]);

  const revisionsWithPrice = useMemo(() => {
    if (!Array.isArray(revisions) || revisions.length === 0 || !currentEstimate) {
      return [];
    }

    const catalogData = {
      boxMaterials,
      faceMaterials,
      drawerBoxMaterials,
      finishTypes,
      cabinetStyles,
      cabinetTypes,
      hardware,
      partsListAnchors,
      cabinetAnchors,
      globalServices: services,
      lengthsCatalog: lengths?.catalog || [],
      accessories,
      teamDefaults,
    };

    return revisions.map((revision) => {
      try {
        const { context, effectiveSection } = createSectionContext(
          revision,
          currentEstimate,
          catalogData,
        );

        const calcs = getSectionCalculations(effectiveSection, context);

        const faceMaterialName =
          catalogData.faceMaterials?.find(
            (material) => material.id === effectiveSection.face_mat,
          )?.name || "—";

        const faceFinishNames =
          Array.isArray(effectiveSection.face_finish) &&
          effectiveSection.face_finish.length > 0
            ? effectiveSection.face_finish
                .map(
                  (finishId) =>
                    catalogData.finishTypes?.find(
                      (finishType) => finishType.id === finishId,
                    )?.name,
                )
                .filter(Boolean)
                .join(" + ") || "—"
            : "—";

        return {
          ...revision,
          unitPrice: Number(calcs?.unitPrice) || 0,
          faceMaterialName,
          faceFinishNames,
        };
      } catch {
        return {
          ...revision,
          unitPrice: 0,
          faceMaterialName: "—",
          faceFinishNames: "—",
        };
      }
    });
  }, [
    revisions,
    currentEstimate,
    boxMaterials,
    faceMaterials,
    drawerBoxMaterials,
    finishTypes,
    cabinetStyles,
    cabinetTypes,
    hardware,
    partsListAnchors,
    cabinetAnchors,
    services,
    lengths,
    accessories,
    teamDefaults,
  ]);

  const canSwitch =
    revisionsWithPrice.length > 1 &&
    selectedId &&
    selectedId !== section?.est_section_id &&
    !isSaving;

  const handleSwitch = async () => {
    if (!canSwitch) return;

    setIsSaving(true);

    try {
      await onSwitch(selectedId);
    } catch (switchError) {
      console.error("Error switching section version:", switchError);
    } finally {
      setIsSaving(false);
    }

    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-200">Section Versions</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Close section versions"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-3 overflow-y-auto flex-1 space-y-2">
          {isLoading ? (
            <p className="text-slate-400 text-sm text-center py-4">Loading...</p>
          ) : error ? (
            <p className="text-red-400 text-sm text-center py-4">{error}</p>
          ) : revisionsWithPrice.length <= 1 ? (
            <p className="text-slate-400 text-sm italic text-center py-4">
              No other versions available.
            </p>
          ) : (
            revisionsWithPrice.map((revision) => {
              const isSelected = selectedId === revision.est_section_id;
              const isActive = revision.est_section_id === section?.est_section_id;

              return (
                <div
                  key={revision.est_section_id}
                  onClick={() => setSelectedId(revision.est_section_id)}
                  className={`px-4 py-3 rounded-md cursor-pointer transition-colors border-l-2 ${
                    isSelected
                      ? "border-teal-400 bg-slate-700"
                      : "border-transparent hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-slate-200">
                      Version {revision.revision}
                      {isActive && (
                        <span className="ml-2 text-xs bg-teal-900/50 text-teal-400 rounded px-1.5 py-0.5">
                          active
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-200">
                      {formatCurrency(revision.unitPrice || 0)}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {`${revision.faceMaterialName || "—"} · ${revision.faceFinishNames || "—"} · ${formatRevisionDate(revision.created_at)}`}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 rounded-md hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSwitch}
            disabled={!canSwitch}
            className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Switching..." : "Switch Version"}
          </button>
        </div>
      </div>
    </div>
  );
};

SectionRevisionModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  section: PropTypes.shape({
    est_section_id: PropTypes.number,
    section_lineage_id: PropTypes.number,
    revision: PropTypes.number,
    section_name: PropTypes.string,
    created_at: PropTypes.string,
    est_task_id: PropTypes.number,
  }),
  task: PropTypes.shape({
    est_task_id: PropTypes.number,
  }),
  onSwitch: PropTypes.func.isRequired,
};

export default SectionRevisionModal;
