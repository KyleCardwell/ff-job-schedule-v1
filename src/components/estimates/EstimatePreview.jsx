import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { fetchEstimateById } from "../../redux/actions/estimates";
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
  const estimates = useSelector((state) => state.estimates.estimates);
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

    const tasksTotal = orderedTasks.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
    const sections = orderedTasks.flatMap((t) => t.sections || []);
    
    // Calculate line items total
    let lineItemsTotal = 0;
    if (currentEstimate.line_items && Array.isArray(currentEstimate.line_items)) {
      currentEstimate.line_items.forEach((item) => {
        // Add parent item total if it has quantity and cost
        if (item.quantity && item.cost) {
          lineItemsTotal += parseFloat(item.quantity) * parseFloat(item.cost);
        }
        // Add sub-items totals
        if (item.subItems && Array.isArray(item.subItems)) {
          item.subItems.forEach((subItem) => {
            if (subItem.quantity && subItem.cost) {
              lineItemsTotal += parseFloat(subItem.quantity) * parseFloat(subItem.cost);
            }
          });
        }
      });
    }

    const grandTotal = tasksTotal + lineItemsTotal;
    return { grandTotal, allSections: sections, lineItemsTotal };
  }, [taskDataMap, currentEstimate]);

  useEffect(() => {
    const loadEstimate = async () => {
      if (estimateId) {
        const existingEstimate = estimates.find(
          (est) => est.est_project_id === estimateId
        );
        if (!existingEstimate) {
          await dispatch(fetchEstimateById(estimateId));
        }
      }
    };

    loadEstimate();
  }, [dispatch, estimateId, estimates]);
  
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

  if (!currentEstimate) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-slate-200">
        Loading...
      </div>
    );
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
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
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
                <h1 className="text-2xl font-bold">Estimate Preview</h1>
                <p className="text-slate-400 text-sm">
                  {currentEstimate.est_project_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Estimate Notes Section */}
        {teamDefaults?.default_estimate_notes && teamDefaults.default_estimate_notes.length > 0 && (
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
                        onChange={(e) => handleAlternativeChange(index, e.target.value)}
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
        {currentEstimate.line_items && currentEstimate.line_items.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-teal-400">Additional Line Items</h2>
            <div className="space-y-3">
              {currentEstimate.line_items.map((item, index) => (
                <div key={index} className="border-l-2 border-slate-600 pl-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-slate-200">{item.title || "Untitled Item"}</div>
                      {item.quantity && item.cost && (
                        <div className="text-sm text-slate-400">
                          {item.quantity} × {formatCurrency(item.cost)}
                        </div>
                      )}
                    </div>
                    {item.quantity && item.cost && (
                      <div className="text-lg font-semibold text-slate-200">
                        {formatCurrency(parseFloat(item.quantity) * parseFloat(item.cost))}
                      </div>
                    )}
                  </div>
                  {item.subItems && item.subItems.length > 0 && (
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-slate-700 pl-3">
                      {item.subItems.map((subItem, subIndex) => (
                        <div key={subIndex} className="flex justify-between items-center text-sm">
                          <div className="flex-1">
                            <div className="text-slate-300">{subItem.title || "Untitled Sub-item"}</div>
                            {subItem.quantity && subItem.cost && (
                              <div className="text-xs text-slate-500">
                                {subItem.quantity} × {formatCurrency(subItem.cost)}
                              </div>
                            )}
                          </div>
                          {subItem.quantity && subItem.cost && (
                            <div className="font-medium text-slate-300">
                              {formatCurrency(parseFloat(subItem.quantity) * parseFloat(subItem.cost))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
              <span className="text-lg font-semibold text-slate-300">Line Items Subtotal:</span>
              <span className="text-xl font-bold text-teal-400">{formatCurrency(lineItemsTotal)}</span>
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
