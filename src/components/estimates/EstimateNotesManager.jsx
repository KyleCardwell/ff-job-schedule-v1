import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEdit2, FiPlus, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { updateCustomNotes } from "../../redux/actions/estimates";
import { fetchTeamDefaults } from "../../redux/actions/teamEstimateDefaults";

import CustomNotesSection from "./CustomNotesSection.jsx";

/**
 * Reusable component for managing estimate notes (default + custom).
 *
 * View mode: displays only included notes as text, passes them to PDF via callback.
 * Edit mode: checkboxes to include/exclude defaults, option dropdowns, custom note CRUD.
 * Save persists default_notes overrides + custom_notes to DB.
 * Cancel reverts to the last saved state.
 */
const EstimateNotesManager = ({
  estimateId,
  onSelectedNotesChange,
  marginTop = "",
}) => {
  const dispatch = useDispatch();

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const { teamDefaults } = useSelector((state) => state.teamEstimateDefaults);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Snapshot of saved state for cancel
  const savedStateRef = useRef(null);

  // Local state for default note selections
  // Shape: { [noteId]: { selected: bool, selectedOptionId: string|null } }
  const [selectedNotes, setSelectedNotes] = useState({});
  const notesInitialized = useRef(false);

  // Local state for custom notes being edited (copy of DB custom_notes array)
  const [localCustomNotes, setLocalCustomNotes] = useState([]);
  const customNotesInitialized = useRef(false);

  // Custom note inline editor state
  const [isAddingCustomNote, setIsAddingCustomNote] = useState(false);
  const [customNoteText, setCustomNoteText] = useState("");
  const [editingCustomNoteId, setEditingCustomNoteId] = useState(null);

  // Derived: the custom_notes object from the estimate
  const notesData = useMemo(() => {
    const cn = currentEstimate?.custom_notes;
    if (cn && typeof cn === "object" && !Array.isArray(cn)) {
      return cn;
    }
    return { default_notes: {}, custom_notes: [] };
  }, [currentEstimate?.custom_notes]);

  // Fetch team defaults if not loaded
  useEffect(() => {
    if (!teamDefaults) {
      dispatch(fetchTeamDefaults());
    }
  }, [dispatch, teamDefaults]);

  // Build selectedNotes from saved overrides + team defaults
  const buildSelectedNotes = useCallback(
    (savedOverrides) => {
      const selection = {};
      (teamDefaults?.default_estimate_notes || []).forEach((note) => {
        const override = savedOverrides?.[note.id];
        if (override) {
          selection[note.id] = {
            selected: override.included !== false,
            selectedOptionId:
              override.selectedOptionId || note.options?.[0]?.id || null,
          };
        } else {
          selection[note.id] = {
            selected: true,
            selectedOptionId: note.options?.[0]?.id || null,
          };
        }
      });
      return selection;
    },
    [teamDefaults],
  );

  // Initialize from DB on first load
  useEffect(() => {
    if (teamDefaults?.default_estimate_notes && !notesInitialized.current) {
      setSelectedNotes(buildSelectedNotes(notesData.default_notes));
      notesInitialized.current = true;
    }
  }, [teamDefaults, notesData.default_notes, buildSelectedNotes]);

  useEffect(() => {
    if (
      notesData.custom_notes?.length >= 0 &&
      !customNotesInitialized.current
    ) {
      setLocalCustomNotes(notesData.custom_notes || []);
      customNotesInitialized.current = true;
    }
  }, [notesData.custom_notes]);

  // Build text array of included notes for PDF output
  const selectedNotesForOutput = useMemo(() => {
    const texts = [];

    if (teamDefaults?.default_estimate_notes) {
      teamDefaults.default_estimate_notes.forEach((note) => {
        const sel = selectedNotes[note.id];
        if (sel?.selected && note.options?.length > 0) {
          const opt = note.options.find((o) => o.id === sel.selectedOptionId);
          const text = opt?.text || note.options[0]?.text;
          if (text) texts.push(text);
        }
      });
    }

    localCustomNotes.forEach((note) => {
      texts.push(note.text);
    });

    return texts;
  }, [teamDefaults, selectedNotes, localCustomNotes]);

  // Notify parent of changes
  useEffect(() => {
    if (onSelectedNotesChange) {
      onSelectedNotesChange(selectedNotesForOutput);
    }
  }, [selectedNotesForOutput, onSelectedNotesChange]);

  // --- Edit mode handlers ---

  const handleStartEdit = useCallback(() => {
    // Snapshot current state for cancel
    savedStateRef.current = {
      selectedNotes: JSON.parse(JSON.stringify(selectedNotes)),
      localCustomNotes: JSON.parse(JSON.stringify(localCustomNotes)),
    };
    setIsEditing(true);
  }, [selectedNotes, localCustomNotes]);

  const handleCancel = useCallback(() => {
    // Revert to snapshot
    if (savedStateRef.current) {
      setSelectedNotes(savedStateRef.current.selectedNotes);
      setLocalCustomNotes(savedStateRef.current.localCustomNotes);
    }
    setIsAddingCustomNote(false);
    setCustomNoteText("");
    setEditingCustomNoteId(null);
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!estimateId) return;
    setIsSaving(true);

    // Build default_notes overrides: only store diffs from defaults
    const defaultNotesOverrides = {};
    const defaultEstimateNotes = teamDefaults?.default_estimate_notes || [];

    Object.entries(selectedNotes).forEach(([noteId, state]) => {
      const teamNote = defaultEstimateNotes.find((n) => n.id === noteId);
      if (!teamNote) return;

      const defaultOptionId = teamNote.options?.[0]?.id || null;
      const isIncluded = state.selected === true;
      const isDefaultOption =
        !state.selectedOptionId || state.selectedOptionId === defaultOptionId;

      if (!isIncluded || !isDefaultOption) {
        defaultNotesOverrides[noteId] = {
          included: state.selected,
          ...(state.selectedOptionId &&
          state.selectedOptionId !== defaultOptionId
            ? { selectedOptionId: state.selectedOptionId }
            : {}),
        };
      }
    });

    const payload = {
      default_notes: defaultNotesOverrides,
      custom_notes: localCustomNotes,
    };

    try {
      await dispatch(updateCustomNotes(estimateId, payload));
      setIsAddingCustomNote(false);
      setCustomNoteText("");
      setEditingCustomNoteId(null);
      setIsEditing(false);
    } catch (error) {
      alert("Failed to save notes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [estimateId, selectedNotes, localCustomNotes, teamDefaults, dispatch]);

  // Default note toggle (edit mode only)
  const handleNoteToggle = useCallback((noteId) => {
    setSelectedNotes((prev) => ({
      ...prev,
      [noteId]: {
        selected: !prev[noteId]?.selected,
        selectedOptionId: prev[noteId]?.selectedOptionId ?? null,
      },
    }));
  }, []);

  const handleOptionChange = useCallback((noteId, optionId) => {
    setSelectedNotes((prev) => ({
      ...prev,
      [noteId]: {
        selected: prev[noteId]?.selected ?? true,
        selectedOptionId: optionId,
      },
    }));
  }, []);

  // Custom note CRUD (edit mode, local state only until save)
  const handleAddCustomNote = useCallback(() => {
    setIsAddingCustomNote(true);
    setCustomNoteText("");
    setEditingCustomNoteId(null);
  }, []);

  const handleEditCustomNote = useCallback((note) => {
    setIsAddingCustomNote(true);
    setCustomNoteText(note.text);
    setEditingCustomNoteId(note.id);
  }, []);

  const handleSaveCustomNote = useCallback(() => {
    if (!customNoteText.trim()) return;

    if (editingCustomNoteId) {
      setLocalCustomNotes((prev) =>
        prev.map((n) =>
          n.id === editingCustomNoteId
            ? { ...n, text: customNoteText.trim() }
            : n,
        ),
      );
    } else {
      const newNote = {
        id: `custom_note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: customNoteText.trim(),
      };
      setLocalCustomNotes((prev) => [...prev, newNote]);
    }

    setIsAddingCustomNote(false);
    setCustomNoteText("");
    setEditingCustomNoteId(null);
  }, [customNoteText, editingCustomNoteId]);

  const handleCancelCustomNote = useCallback(() => {
    setIsAddingCustomNote(false);
    setCustomNoteText("");
    setEditingCustomNoteId(null);
  }, []);

  const handleDeleteCustomNote = useCallback((noteId) => {
    setLocalCustomNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  // For CustomNotesSection compatibility: all custom notes are "selected"
  const allCustomNotesSelected = useMemo(() => {
    const sel = {};
    localCustomNotes.forEach((n) => {
      sel[n.id] = true;
    });
    return sel;
  }, [localCustomNotes]);

  const hasAnyNotes =
    teamDefaults?.default_estimate_notes?.length > 0 ||
    localCustomNotes.length > 0 ||
    isAddingCustomNote;

  if (!hasAnyNotes && !isEditing) return null;

  return (
    <div
      className={`bg-slate-800 rounded-lg p-6 mb-8 ${marginTop} border border-slate-600`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Estimate Notes</h2>
        {!isEditing ? (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
          >
            <FiEdit2 className="w-4 h-4" />
            Edit Notes
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {!isAddingCustomNote && (
              <button
                onClick={handleAddCustomNote}
                className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Add Custom Note
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded transition-colors"
            >
              <FiX className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Default notes */}
        {teamDefaults?.default_estimate_notes?.map((note) => {
          const sel = selectedNotes[note.id];
          const hasMultipleOptions = note.options && note.options.length > 1;

          // View mode: only show included notes
          if (!isEditing) {
            if (!sel?.selected) return null;

            const opt = note.options?.find(
              (o) => o.id === sel?.selectedOptionId,
            );
            const text = opt?.text || note.options?.[0]?.text || "";
            if (!text) return null;

            return (
              <div key={note.id} className="text-slate-300 text-left">
                • {text}
              </div>
            );
          }

          // Edit mode: checkboxes + option dropdowns
          return (
            <div key={note.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={sel?.selected || false}
                onChange={() => handleNoteToggle(note.id)}
                className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
              />
              <div className="flex-1 text-left">
                {hasMultipleOptions ? (
                  <select
                    value={sel?.selectedOptionId || note.options[0]?.id}
                    onChange={(e) =>
                      handleOptionChange(note.id, e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-teal-500"
                    disabled={!sel?.selected}
                  >
                    {note.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.text}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={
                      sel?.selected
                        ? "text-slate-300"
                        : "text-slate-500 line-through"
                    }
                  >
                    {note.options?.[0]?.text || ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Custom notes */}
        {isEditing ? (
          <CustomNotesSection
            customNotes={localCustomNotes}
            selectedCustomNotes={allCustomNotesSelected}
            onToggleNote={() => {}}
            onEditNote={handleEditCustomNote}
            onDeleteNote={handleDeleteCustomNote}
            isEditingCustomNotes={isAddingCustomNote}
            customNotesText={customNoteText}
            editingCustomNoteId={editingCustomNoteId}
            onCustomNotesTextChange={setCustomNoteText}
            onSaveCustomNote={handleSaveCustomNote}
            onCancelCustomNote={handleCancelCustomNote}
          />
        ) : (
          localCustomNotes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">
                Custom Notes
              </h3>
              {localCustomNotes.map((note) => (
                <div key={note.id} className="text-slate-300 text-left mb-1">
                  • {note.text}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

EstimateNotesManager.propTypes = {
  estimateId: PropTypes.string.isRequired,
  onSelectedNotesChange: PropTypes.func,
  marginTop: PropTypes.string,
};

export default EstimateNotesManager;
