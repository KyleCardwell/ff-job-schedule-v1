import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { fetchTeamDefaults } from "../../redux/actions/teamEstimateDefaults";

import EstimatePreviewTask from "./EstimatePreviewTask.jsx";
import GenerateEstimatePdf from "./GenerateEstimatePdf.jsx";

const EstimatePreview = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { estimateId } = useParams();

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const { teamDefaults } = useSelector((state) => state.teamEstimateDefaults);

  // Track all task data - children will report their complete data up
  const [taskDataMap, setTaskDataMap] = useState({});

  // Track selected notes: { noteIndex: { selected: bool, alternativeIndex: number|null } }
  const [selectedNotes, setSelectedNotes] = useState({});
  const notesInitialized = useRef(false);

  const handleTaskDataChange = useCallback((taskData) => {
    setTaskDataMap((prev) => ({ ...prev, [taskData.taskId]: taskData }));
  }, []);

  const handleNoteToggle = useCallback((noteIndex) => {
    setSelectedNotes((prev) => ({
      ...prev,
      [noteIndex]: {
        selected: !prev[noteIndex]?.selected,
        alternativeIndex: prev[noteIndex]?.alternativeIndex ?? null,
      },
    }));
  }, []);

  const handleAlternativeChange = useCallback((noteIndex, altIndex) => {
    setSelectedNotes((prev) => ({
      ...prev,
      [noteIndex]: {
        selected: prev[noteIndex]?.selected ?? true,
        alternativeIndex: altIndex === "" ? null : parseInt(altIndex, 10),
      },
    }));
  }, []);

  // Build selected notes for PDF
  const selectedNotesForPdf = useMemo(() => {
    if (!teamDefaults?.default_estimate_notes) return [];

    return teamDefaults.default_estimate_notes
      .map((note, index) => {
        const selection = selectedNotes[index];
        if (!selection?.selected) return null;

        // If note has alternatives, check which option is selected
        if (note.alternatives?.length > 0) {
          const selectedIndex = selection.alternativeIndex ?? 0;
          // Index 0 is main text, index 1+ are alternatives
          if (selectedIndex === 0) {
            return note.text;
          }
          return note.alternatives[selectedIndex - 1];
        }

        // Otherwise use the main text
        return note.text;
      })
      .filter(Boolean);
  }, [teamDefaults, selectedNotes]);

  // Calculate grand total from task data and prepare all sections for PDF
  // Use currentEstimate.tasks to maintain original order
  const { grandTotal, allSections, lineItemsTotal } = useMemo(() => {
    if (!currentEstimate?.tasks) {
      return { grandTotal: 0, allSections: [], lineItemsTotal: 0 };
    }

    // Iterate through tasks in their original order
    const orderedTasks = currentEstimate.tasks
      .map((task) => taskDataMap[task.est_task_id])
      .filter(Boolean); // Remove any undefined tasks

    const tasksTotal = orderedTasks.reduce(
      (sum, t) => sum + (t.totalPrice || 0),
      0
    );
    const sections = orderedTasks.flatMap((t) => t.sections || []);

    // Calculate line items total
    let lineItemsTotal = 0;
    if (
      currentEstimate.line_items &&
      Array.isArray(currentEstimate.line_items)
    ) {
      currentEstimate.line_items.forEach((item) => {
        // Add parent item total if it has quantity and cost
        if (item.quantity && item.cost) {
          lineItemsTotal += parseFloat(item.quantity) * parseFloat(item.cost);
        }
        // Add sub-items totals
        if (item.subItems && Array.isArray(item.subItems)) {
          item.subItems.forEach((subItem) => {
            if (subItem.quantity && subItem.cost) {
              lineItemsTotal +=
                parseFloat(subItem.quantity) * parseFloat(subItem.cost);
            }
          });
        }
      });
    }

    const grandTotal = tasksTotal + lineItemsTotal;
    return { grandTotal, allSections: sections, lineItemsTotal };
  }, [taskDataMap, currentEstimate]);

  // Redirect to edit page if no currentEstimate exists
  useEffect(() => {
    if (!currentEstimate && estimateId) {
      navigate(`/estimates/in-progress/${estimateId}`);
    }
  }, [currentEstimate, estimateId, navigate]);

  // Fetch team defaults for estimate notes
  useEffect(() => {
    if (!teamDefaults) {
      dispatch(fetchTeamDefaults());
    }
  }, [dispatch, teamDefaults]);

  // Initialize all notes as selected when teamDefaults loads
  useEffect(() => {
    if (teamDefaults?.default_estimate_notes && !notesInitialized.current) {
      const initialSelection = {};
      teamDefaults.default_estimate_notes.forEach((note, index) => {
        initialSelection[index] = {
          selected: true,
          alternativeIndex: note.alternatives?.length > 0 ? 0 : null,
        };
      });
      setSelectedNotes(initialSelection);
      notesInitialized.current = true;
    }
  }, [teamDefaults]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // This should not render if currentEstimate is null due to the redirect above
  if (!currentEstimate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <GenerateEstimatePdf
        estimate={currentEstimate}
        allSections={allSections}
        grandTotal={grandTotal}
        selectedNotes={selectedNotesForPdf}
      />
      <div className="bg-slate-800 border-b border-slate-700 sticky top-12 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/estimates/in-progress/${estimateId}`)}
                className="hover:text-teal-400 transition-colors"
                aria-label="Back to estimate"
              >
                <FiArrowLeft size={24} />
              </button>
              <div>
                <h2 className="text-2xl font-bold">
                  {currentEstimate.est_project_name}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Estimate Notes Section */}
        {teamDefaults?.default_estimate_notes &&
          teamDefaults.default_estimate_notes.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Estimate Notes</h2>
              <div className="space-y-3">
                {teamDefaults.default_estimate_notes.map((note, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedNotes[index]?.selected || false}
                      onChange={() => handleNoteToggle(index)}
                      className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
                    />
                    <div className="flex-1 text-left">
                      {note.alternatives && note.alternatives.length > 0 ? (
                        <select
                          value={selectedNotes[index]?.alternativeIndex ?? 0}
                          onChange={(e) =>
                            handleAlternativeChange(index, e.target.value)
                          }
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-teal-500"
                          disabled={!selectedNotes[index]?.selected}
                        >
                          <option value={0}>{note.text}</option>
                          {note.alternatives.map((alt, altIndex) => (
                            <option key={altIndex} value={altIndex + 1}>
                              {alt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-300">{note.text}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Tasks and Sections */}
        {currentEstimate.tasks && currentEstimate.tasks.length > 0 ? (
          currentEstimate.tasks.map((task) => (
            <EstimatePreviewTask
              key={task.est_task_id}
              task={task}
              estimate={currentEstimate}
              onTaskDataChange={handleTaskDataChange}
            />
          ))
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400">No rooms in this estimate</p>
          </div>
        )}

        {/* Line Items Section */}
        {currentEstimate.line_items &&
          currentEstimate.line_items.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 text-teal-400">
                Additional Line Items
              </h2>
              <div className="space-y-1">
                {currentEstimate.line_items.map((item, index) => (
                  <div key={index}>
                    {/* Parent Line Item */}
                    <div className="grid grid-cols-[1fr_80px_120px_120px] gap-4 items-center py-2 border-b border-slate-700">
                      <div className="font-medium text-slate-200 text-left">
                        {item.title || "Untitled Item"}
                      </div>
                      <div className="text-slate-300 text-right">
                        {item.quantity || "-"}
                      </div>
                      <div className="text-slate-300 text-right">
                        {item.cost ? formatCurrency(item.cost) : "-"}
                      </div>
                      <div className="text-lg font-semibold text-slate-200 text-right">
                        {item.quantity && item.cost
                          ? formatCurrency(
                              parseFloat(item.quantity) * parseFloat(item.cost)
                            )
                          : "-"}
                      </div>
                    </div>

                    {/* Sub Items */}
                    {item.subItems && item.subItems.length > 0 && (
                      <div className="ml-8 border-l-2 border-slate-700 text-md">
                        {item.subItems.map((subItem, subIndex) => (
                          <div
                            key={subIndex}
                            className="grid grid-cols-[1fr_80px_120px_120px] gap-4 items-center py-2 pl-4 border-b border-slate-700/50"
                          >
                            <div className="text-slate-300 text-left">
                              {subItem.title || "Untitled Sub-item"}
                            </div>
                            <div className="text-slate-400 text-right">
                              {subItem.quantity || "-"}
                            </div>
                            <div className="text-slate-400 text-right">
                              {subItem.cost
                                ? formatCurrency(subItem.cost)
                                : "-"}
                            </div>
                            <div className="font-medium text-slate-300 text-right">
                              {subItem.quantity && subItem.cost
                                ? formatCurrency(
                                    parseFloat(subItem.quantity) *
                                      parseFloat(subItem.cost)
                                  )
                                : "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t-2 border-slate-600 grid grid-cols-[80px_1fr_120px_120px] gap-4 items-center">
                <div></div>
                <div className="text-lg font-semibold text-slate-300">
                  Line Items Subtotal:
                </div>
                <div></div>
                <div className="text-xl font-bold text-teal-400 text-right">
                  {formatCurrency(lineItemsTotal)}
                </div>
              </div>
            </div>
          )}

        {/* Grand Total */}
        <div className="bg-slate-800 rounded-lg p-6 sticky bottom-0 border-t-4 border-teal-500">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Total Estimate</h2>
            <p className="text-3xl font-bold text-teal-400">
              {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatePreview;
