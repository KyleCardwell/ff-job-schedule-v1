import PropTypes from "prop-types";
import { useState } from "react";
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useDispatch } from "react-redux";

import { updateTeamDefaults } from "../../redux/actions/teamEstimateDefaults";

/**
 * Component for managing default estimate notes
 * Notes structure: [{ id: string, options: [{ id: string, text: string }] }]
 * - Parent array contains note objects with unique IDs
 * - Each note has an options array
 * - Single option = plain text display, multiple options = dropdown selector
 */
const DefaultEstimateNotesForm = ({ teamDefaults }) => {
  const dispatch = useDispatch();
  const [notes, setNotes] = useState(
    teamDefaults?.default_estimate_notes || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(new Set());

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedNotes(newExpanded);
  };

  const addNote = () => {
    const newNote = {
      id: `note-${Date.now()}`,
      options: [{ id: `opt-${Date.now()}-0`, text: "" }],
    };
    setNotes([...notes, newNote]);
    setExpandedNotes(new Set([...expandedNotes, notes.length]));
  };

  const removeNote = (index) => {
    setNotes(notes.filter((_, i) => i !== index));
    const newExpanded = new Set(expandedNotes);
    newExpanded.delete(index);
    setExpandedNotes(newExpanded);
  };

  const updateOptionText = (noteIndex, optionIndex, text) => {
    const updatedNotes = [...notes];
    const updatedOptions = [...updatedNotes[noteIndex].options];
    updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], text };
    updatedNotes[noteIndex] = { ...updatedNotes[noteIndex], options: updatedOptions };
    setNotes(updatedNotes);
  };

  const addOption = (noteIndex) => {
    const updatedNotes = [...notes];
    const newOption = {
      id: `opt-${Date.now()}-${updatedNotes[noteIndex].options.length}`,
      text: "",
    };
    updatedNotes[noteIndex] = {
      ...updatedNotes[noteIndex],
      options: [...updatedNotes[noteIndex].options, newOption],
    };
    setNotes(updatedNotes);
  };

  const removeOption = (noteIndex, optIndex) => {
    const updatedNotes = [...notes];
    // Don't allow removing the last option
    if (updatedNotes[noteIndex].options.length <= 1) return;
    
    updatedNotes[noteIndex] = {
      ...updatedNotes[noteIndex],
      options: updatedNotes[noteIndex].options.filter(
        (_, i) => i !== optIndex
      ),
    };
    setNotes(updatedNotes);
  };


  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Filter out notes with all empty options
      const validNotes = notes
        .map((note) => ({
          id: note.id,
          options: note.options
            .map((opt) => ({
              id: opt.id,
              text: opt.text.trim(),
            }))
            .filter((opt) => opt.text),
        }))
        .filter((note) => note.options.length > 0);

      await dispatch(
        updateTeamDefaults(teamDefaults.team_id, {
          ...teamDefaults,
          default_estimate_notes: validNotes,
        })
      );
    } catch (error) {
      alert("Failed to save default notes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-200">
          Default Estimate Notes
        </h2>
        <button
          onClick={addNote}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-slate-400 text-center py-4">
            No default notes yet. Click &quot;Add Note&quot; to create one.
          </p>
        ) : (
          notes.map((note, noteIndex) => (
            <div
              key={note.id}
              className="bg-slate-700 rounded-lg p-4 border border-slate-600"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleExpanded(noteIndex)}
                  className="text-slate-400 hover:text-slate-200 mt-2"
                >
                  {expandedNotes.has(noteIndex) ? (
                    <FiChevronUp className="w-5 h-5" />
                  ) : (
                    <FiChevronDown className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {note.options.length === 1 ? "Note Text" : "Note Options"}
                      </label>
                      {note.options.map((option, optIndex) => (
                        <div key={option.id} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOptionText(noteIndex, optIndex, e.target.value)}
                            placeholder={note.options.length === 1 ? "Enter note text..." : `Option ${optIndex + 1}...`}
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                          />
                          {note.options.length > 1 && (
                            <button
                              onClick={() => removeOption(noteIndex, optIndex)}
                              className="text-red-400 hover:text-red-300"
                              title="Remove option"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => removeNote(noteIndex)}
                      className="text-red-400 hover:text-red-300 mt-8"
                      title="Remove note"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {expandedNotes.has(noteIndex) && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-slate-300">
                          {note.options.length === 1 ? "Add Alternative Options" : "Options"}
                        </label>
                        <button
                          onClick={() => addOption(noteIndex)}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded transition-colors"
                        >
                          <FiPlus className="w-3 h-3" />
                          Add Option
                        </button>
                      </div>
                      <p className="text-slate-500 text-sm italic">
                        {note.options.length === 1
                          ? "Single option will display as plain text. Add more options to show a dropdown selector."
                          : "Multiple options will display as a dropdown selector in the estimate preview."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
        >
          {isSaving ? "Saving..." : "Save Default Notes"}
        </button>
      </div>
    </div>
  );
};

DefaultEstimateNotesForm.propTypes = {
  teamDefaults: PropTypes.object.isRequired,
};

export default DefaultEstimateNotesForm;
