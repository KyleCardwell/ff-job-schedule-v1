import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiSave, FiX } from "react-icons/fi";

const EMPTY_NOTES = ["", "", ""];

const normalizeNotes = (notes) => {
  if (Array.isArray(notes)) {
    return [notes[0] || "", notes[1] || "", notes[2] || ""];
  }

  if (typeof notes === "string" && notes.trim()) {
    return [notes, "", ""];
  }

  return [...EMPTY_NOTES];
};

const SectionNotesManager = ({ notes, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formNotes, setFormNotes] = useState(() => normalizeNotes(notes));
  const [savedNotes, setSavedNotes] = useState(() => normalizeNotes(notes));

  useEffect(() => {
    const normalized = normalizeNotes(notes);
    setSavedNotes(normalized);

    if (!isEditing) {
      setFormNotes(normalized);
    }
  }, [notes, isEditing]);

  const hasChanges = useMemo(() => {
    return (
      formNotes[0] !== savedNotes[0] ||
      formNotes[1] !== savedNotes[1] ||
      formNotes[2] !== savedNotes[2]
    );
  }, [formNotes, savedNotes]);

  const handleChange = (index, value) => {
    setFormNotes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleEdit = () => {
    setFormNotes(savedNotes);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormNotes(savedNotes);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const trimmedNotes = formNotes.map((value) => value.trim());
    const hasAnyText = trimmedNotes.some((value) => value.length > 0);
    const payload = hasAnyText ? trimmedNotes : null;

    try {
      await onSave(payload);
      setSavedNotes(trimmedNotes);
      setFormNotes(trimmedNotes);
      setIsEditing(false);
    } catch (error) {
      alert("Failed to save section notes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-slate-700">Section Notes</h4>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <FiEdit2 size={14} />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FiX size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FiSave size={14} />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start text-slate-700 px-1 gap-4">
        <div>
          <label htmlFor="section-notes-0" className="text-left text-sm font-bold flex items-center text-slate-700">
            Notes
          </label>
          <textarea
            id="section-notes-0"
            value={formNotes[0]}
            onChange={(e) => handleChange(0, e.target.value)}
            disabled={!isEditing}
            rows={3}
            className="mt-1 p-2 block w-full rounded-md border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y disabled:bg-slate-100 disabled:text-slate-500"
            placeholder="Any special notes..."
          />
        </div>
        <div>
          <label htmlFor="section-notes-1" className="text-left text-sm font-bold flex items-center text-slate-700">
            Includes
          </label>
          <textarea
            id="section-notes-1"
            value={formNotes[1]}
            onChange={(e) => handleChange(1, e.target.value)}
            disabled={!isEditing}
            rows={3}
            className="mt-1 p-2 block w-full rounded-md border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y disabled:bg-slate-100 disabled:text-slate-500"
            placeholder="What's included..."
          />
        </div>
        <div>
          <label htmlFor="section-notes-2" className="text-left text-sm font-bold flex items-center text-slate-700">
            Does Not Include
          </label>
          <textarea
            id="section-notes-2"
            value={formNotes[2]}
            onChange={(e) => handleChange(2, e.target.value)}
            disabled={!isEditing}
            rows={3}
            className="mt-1 p-2 block w-full rounded-md border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y disabled:bg-slate-100 disabled:text-slate-500"
            placeholder="What's not included..."
          />
        </div>
      </div>
    </div>
  );
};

SectionNotesManager.propTypes = {
  notes: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  onSave: PropTypes.func.isRequired,
};

export default SectionNotesManager;
