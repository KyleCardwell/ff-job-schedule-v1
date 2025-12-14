import PropTypes from "prop-types";
import { useState } from "react";
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useDispatch } from "react-redux";

import { updateTeamDefaults } from "../../redux/actions/teamEstimateDefaults";

/**
 * Component for managing default estimate notes
 * Notes structure: { text: string, alternatives: string[] }
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
    setNotes([...notes, { text: "", alternatives: [] }]);
    setExpandedNotes(new Set([...expandedNotes, notes.length]));
  };

  const removeNote = (index) => {
    setNotes(notes.filter((_, i) => i !== index));
    const newExpanded = new Set(expandedNotes);
    newExpanded.delete(index);
    setExpandedNotes(newExpanded);
  };

  const updateNoteText = (index, text) => {
    const updatedNotes = [...notes];
    updatedNotes[index] = { ...updatedNotes[index], text };
    setNotes(updatedNotes);
  };

  const addAlternative = (noteIndex) => {
    const updatedNotes = [...notes];
    updatedNotes[noteIndex] = {
      ...updatedNotes[noteIndex],
      alternatives: [...(updatedNotes[noteIndex].alternatives || []), ""],
    };
    setNotes(updatedNotes);
  };

  const removeAlternative = (noteIndex, altIndex) => {
    const updatedNotes = [...notes];
    updatedNotes[noteIndex] = {
      ...updatedNotes[noteIndex],
      alternatives: updatedNotes[noteIndex].alternatives.filter(
        (_, i) => i !== altIndex
      ),
    };
    setNotes(updatedNotes);
  };

  const updateAlternative = (noteIndex, altIndex, value) => {
    const updatedNotes = [...notes];
    const alternatives = [...updatedNotes[noteIndex].alternatives];
    alternatives[altIndex] = value;
    updatedNotes[noteIndex] = { ...updatedNotes[noteIndex], alternatives };
    setNotes(updatedNotes);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Filter out notes with empty text
      const validNotes = notes
        .filter((note) => note.text.trim())
        .map((note) => ({
          text: note.text.trim(),
          alternatives: (note.alternatives || [])
            .map((alt) => alt.trim())
            .filter((alt) => alt),
        }));

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
              key={noteIndex}
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
                        Note Text
                      </label>
                      <input
                        type="text"
                        value={note.text}
                        onChange={(e) => updateNoteText(noteIndex, e.target.value)}
                        placeholder="Enter default note text..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />
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
                          Alternatives (Optional)
                        </label>
                        <button
                          onClick={() => addAlternative(noteIndex)}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded transition-colors"
                        >
                          <FiPlus className="w-3 h-3" />
                          Add Alternative
                        </button>
                      </div>

                      {note.alternatives && note.alternatives.length > 0 ? (
                        <div className="space-y-2">
                          {note.alternatives.map((alt, altIndex) => (
                            <div key={altIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={alt}
                                onChange={(e) =>
                                  updateAlternative(
                                    noteIndex,
                                    altIndex,
                                    e.target.value
                                  )
                                }
                                placeholder={`Alternative ${altIndex + 1}...`}
                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                              />
                              <button
                                onClick={() =>
                                  removeAlternative(noteIndex, altIndex)
                                }
                                className="text-red-400 hover:text-red-300"
                                title="Remove alternative"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm italic">
                          No alternatives added. If this note has multiple
                          options, add them here.
                        </p>
                      )}
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
