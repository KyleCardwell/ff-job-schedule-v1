import PropTypes from "prop-types";
import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";

import ConfirmationModal from "../common/ConfirmationModal.jsx";

const CustomNotesSection = ({
  customNotes,
  selectedCustomNotes,
  onToggleNote,
  onEditNote,
  onDeleteNote,
  isEditingCustomNotes,
  customNotesText,
  editingCustomNoteId,
  onCustomNotesTextChange,
  onSaveCustomNote,
  onCancelCustomNote,
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    noteId: null,
    noteText: "",
  });

  const handleDeleteClick = (note) => {
    setDeleteConfirmation({
      isOpen: true,
      noteId: note.id,
      noteText: note.text,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.noteId) {
      onDeleteNote(deleteConfirmation.noteId);
    }
    setDeleteConfirmation({ isOpen: false, noteId: null, noteText: "" });
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, noteId: null, noteText: "" });
  };

  if (!customNotes?.length && !isEditingCustomNotes) {
    return null;
  }

  return (
    <>
      <div className="mt-6 pt-4 border-t border-slate-700">
        {customNotes?.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              Custom Notes
            </h3>
            {customNotes.map((note) => (
              <div key={note.id} className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={selectedCustomNotes[note.id] || false}
                  onChange={() => onToggleNote(note.id)}
                  className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
                />
                <div className="flex-1 text-slate-300 text-left">
                  {note.text}
                </div>
                <button
                  onClick={() => onEditNote(note)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-teal-400 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(note)}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </>
        )}

        {isEditingCustomNotes && (
          <div className={customNotes?.length > 0 ? "mt-4 pt-4 border-t border-slate-700" : ""}>
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              {editingCustomNoteId ? "Edit Custom Note" : "Add Custom Note"}
            </h3>
            <input
              type="text"
              value={customNotesText}
              onChange={(e) => onCustomNotesTextChange(e.target.value)}
              placeholder="Enter custom note text..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={onSaveCustomNote}
                disabled={!customNotesText.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={onCancelCustomNote}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Custom Note"
        message={`Are you sure you want to delete this note? "${deleteConfirmation.noteText}"`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        cancelButtonClass="bg-slate-600 hover:bg-slate-700"
      />
    </>
  );
};

CustomNotesSection.propTypes = {
  customNotes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    })
  ),
  selectedCustomNotes: PropTypes.object.isRequired,
  onToggleNote: PropTypes.func.isRequired,
  onEditNote: PropTypes.func.isRequired,
  onDeleteNote: PropTypes.func.isRequired,
  isEditingCustomNotes: PropTypes.bool.isRequired,
  customNotesText: PropTypes.string.isRequired,
  editingCustomNoteId: PropTypes.string,
  onCustomNotesTextChange: PropTypes.func.isRequired,
  onSaveCustomNote: PropTypes.func.isRequired,
  onCancelCustomNote: PropTypes.func.isRequired,
};

export default CustomNotesSection;
