import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiPlus, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { updateCustomNotes } from "../../redux/actions/estimates";
import { fetchTeamDefaults } from "../../redux/actions/teamEstimateDefaults";
import { fetchTeamData, getTeamLogoSignedUrl } from "../../redux/actions/teams";

import CustomNotesSection from "./CustomNotesSection.jsx";
import EstimatePreviewIndex from "./EstimatePreviewIndex.jsx";
import EstimatePreviewTask from "./EstimatePreviewTask.jsx";
import GenerateEstimatePdf from "./GenerateEstimatePdf.jsx";

const EstimatePreview = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { estimateId } = useParams();

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const teamId = useSelector((state) => state.auth.teamId);
  const { teamDefaults } = useSelector((state) => state.teamEstimateDefaults);
  const { teamData } = useSelector((state) => state.teams);

  // Track all task data - children will report their complete data up
  const [taskDataMap, setTaskDataMap] = useState({});
  const [taskBreakdownMap, setTaskBreakdownMap] = useState({});
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  // Track selected notes: { noteId: { selected: bool, selectedOptionId: string|null } }
  const [selectedNotes, setSelectedNotes] = useState({});
  const notesInitialized = useRef(false);

  // Track selected sections: { sectionId: boolean }
  const [selectedSections, setSelectedSections] = useState({});
  const sectionsInitialized = useRef(false);

  // Track selected line items: { lineItemIndex: boolean }
  const [selectedLineItems, setSelectedLineItems] = useState({});
  const lineItemsInitialized = useRef(false);

  // Track custom notes state
  const [isEditingCustomNotes, setIsEditingCustomNotes] = useState(false);
  const [customNotesText, setCustomNotesText] = useState("");
  const [editingCustomNoteId, setEditingCustomNoteId] = useState(null);
  const [selectedCustomNotes, setSelectedCustomNotes] = useState({});
  const customNotesInitialized = useRef(false);

  // Track expanded breakdown state
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);

  // Refs for scrolling functionality
  const scrollContainerRef = useRef(null);
  const sectionRefs = useRef({});
  const lineItemsSectionRef = useRef(null);

  // Fetch team data and logo for PDF
  useEffect(() => {
    if (teamId) {
      fetchTeamData(dispatch, teamId);
    }
  }, [dispatch, teamId]);

  // Convert logo to data URL for PDF embedding
  useEffect(() => {
    const loadLogoForPdf = async () => {
      if (teamData?.logo_path && teamId) {
        try {
          // Get signed URL
          const signedUrl = await getTeamLogoSignedUrl(
            teamId,
            teamData.logo_path
          );

          if (signedUrl) {
            // Fetch the image and convert to data URL
            const response = await fetch(signedUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch logo: ${response.status}`);
            }

            const blob = await response.blob();
            console.log("Logo blob type:", blob.type);

            // Verify it's an image
            if (!blob.type.startsWith("image/")) {
              console.error("Invalid blob type:", blob.type);
              return;
            }

            // If SVG, convert to PNG for pdfMake compatibility
            if (blob.type === "image/svg+xml") {
              const svgText = await blob.text();
              const img = new Image();
              const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
              const url = URL.createObjectURL(svgBlob);

              img.onload = () => {
                // Get original dimensions
                const originalWidth = img.width || img.naturalWidth;
                const originalHeight = img.height || img.naturalHeight;

                // Target dimensions for PDF (100x80 in PDF, but use higher res for quality)
                const targetMaxWidth = 1200;
                const targetMaxHeight = 960;

                // Calculate aspect ratio
                const aspectRatio = originalWidth / originalHeight;

                // Calculate scaled dimensions maintaining aspect ratio
                let canvasWidth, canvasHeight;
                if (aspectRatio > targetMaxWidth / targetMaxHeight) {
                  // Width is the limiting factor
                  canvasWidth = targetMaxWidth;
                  canvasHeight = targetMaxWidth / aspectRatio;
                } else {
                  // Height is the limiting factor
                  canvasHeight = targetMaxHeight;
                  canvasWidth = targetMaxHeight * aspectRatio;
                }

                // Create canvas with calculated dimensions
                const canvas = document.createElement("canvas");
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext("2d");

                // Draw SVG maintaining aspect ratio
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

                // Convert to PNG data URL
                const pngDataUrl = canvas.toDataURL("image/png");
                console.log(
                  `SVG converted to PNG (${Math.round(
                    canvasWidth
                  )}x${Math.round(canvasHeight)}), length:`,
                  pngDataUrl.length
                );
                setLogoDataUrl(pngDataUrl);
                URL.revokeObjectURL(url);
              };

              img.onerror = () => {
                console.error("Failed to load SVG image");
                URL.revokeObjectURL(url);
                setLogoDataUrl(null);
              };

              img.src = url;
            } else {
              // For PNG/JPEG, use directly
              const reader = new FileReader();
              reader.onloadend = () => {
                console.log(
                  "Logo data URL created, length:",
                  reader.result?.length
                );
                setLogoDataUrl(reader.result);
              };
              reader.onerror = () => {
                console.error("FileReader error");
              };
              reader.readAsDataURL(blob);
            }
          }
        } catch (error) {
          console.error("Error loading logo for PDF:", error);
          setLogoDataUrl(null); // Clear on error
        }
      } else {
        setLogoDataUrl(null); // Clear if no logo
      }
    };

    loadLogoForPdf();
  }, [teamData, teamId]);

  const handleTaskDataChange = useCallback((taskData) => {
    setTaskDataMap((prev) => ({ ...prev, [taskData.taskId]: taskData }));
  }, []);

  const handleTaskBreakdownChange = useCallback((taskBreakdown) => {
    setTaskBreakdownMap((prev) => ({ ...prev, [taskBreakdown.taskId]: taskBreakdown }));
  }, []);

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

  const handleToggleSection = useCallback((sectionId) => {
    setSelectedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const handleToggleAllSections = useCallback((selectAll) => {
    setSelectedSections((prev) => {
      const newSelection = { ...prev };
      Object.keys(newSelection).forEach((sectionId) => {
        newSelection[sectionId] = selectAll;
      });
      return newSelection;
    });
  }, []);

  const handleToggleLineItem = useCallback((lineItemKey) => {
    setSelectedLineItems((prev) => ({
      ...prev,
      [lineItemKey]: !prev[lineItemKey],
    }));
  }, []);

  const scrollToLineItems = useCallback(() => {
    if (lineItemsSectionRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elementTop = lineItemsSectionRef.current.offsetTop;
      container.scrollTo({
        top: elementTop - 150,
        behavior: "smooth",
      });
    }
  }, []);

  const handleToggleAllLineItems = useCallback((selectAll) => {
    setSelectedLineItems((prev) => {
      const newSelection = { ...prev };
      Object.keys(newSelection).forEach((index) => {
        newSelection[index] = selectAll;
      });
      return newSelection;
    });
  }, []);

  const handleToggleCustomNote = useCallback((noteId) => {
    setSelectedCustomNotes((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  }, []);

  const handleAddCustomNote = useCallback(() => {
    setIsEditingCustomNotes(true);
    setCustomNotesText("");
    setEditingCustomNoteId(null);
  }, []);

  const handleEditCustomNote = useCallback((note) => {
    setIsEditingCustomNotes(true);
    setCustomNotesText(note.text);
    setEditingCustomNoteId(note.id);
  }, []);

  const handleSaveCustomNote = useCallback(async () => {
    if (!customNotesText.trim()) return;

    const existingNotes = currentEstimate?.custom_notes || [];
    let updatedNotes;

    if (editingCustomNoteId) {
      updatedNotes = existingNotes.map((note) =>
        note.id === editingCustomNoteId
          ? { ...note, text: customNotesText.trim() }
          : note
      );
    } else {
      const newNote = {
        id: `custom_note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: customNotesText.trim(),
      };
      updatedNotes = [...existingNotes, newNote];
      setSelectedCustomNotes((prev) => ({
        ...prev,
        [newNote.id]: true,
      }));
    }

    try {
      await dispatch(updateCustomNotes(currentEstimate.estimate_id, updatedNotes));
      setIsEditingCustomNotes(false);
      setCustomNotesText("");
      setEditingCustomNoteId(null);
    } catch (error) {
      alert("Failed to save custom note. Please try again.");
    }
  }, [customNotesText, editingCustomNoteId, currentEstimate, dispatch]);

  const handleCancelCustomNote = useCallback(() => {
    setIsEditingCustomNotes(false);
    setCustomNotesText("");
    setEditingCustomNoteId(null);
  }, []);

  const handleDeleteCustomNote = useCallback(
    async (noteId) => {
      const existingNotes = currentEstimate?.custom_notes || [];
      const updatedNotes = existingNotes.filter((note) => note.id !== noteId);

      try {
        await dispatch(updateCustomNotes(currentEstimate.estimate_id, updatedNotes));
        setSelectedCustomNotes((prev) => {
          const newSelection = { ...prev };
          delete newSelection[noteId];
          return newSelection;
        });
      } catch (error) {
        alert("Failed to delete custom note. Please try again.");
      }
    },
    [currentEstimate, dispatch]
  );

  // Build selected notes for PDF (including custom notes)
  const selectedNotesForPdf = useMemo(() => {
    const defaultNotes = [];
    const customNotes = [];

    if (teamDefaults?.default_estimate_notes) {
      teamDefaults.default_estimate_notes.forEach((note) => {
        const selection = selectedNotes[note.id];
        if (selection?.selected) {
          if (note.options && note.options.length > 0) {
            const selectedOption = note.options.find(
              (opt) => opt.id === selection.selectedOptionId
            );
            const text = selectedOption?.text || note.options[0]?.text;
            if (text) defaultNotes.push(text);
          }
        }
      });
    }

    if (currentEstimate?.custom_notes) {
      currentEstimate.custom_notes.forEach((note) => {
        if (selectedCustomNotes[note.id]) {
          customNotes.push(note.text);
        }
      });
    }

    return [...defaultNotes, ...customNotes];
  }, [teamDefaults, selectedNotes, currentEstimate, selectedCustomNotes]);

  // Calculate grand total from task data and prepare all sections for PDF
  // Use currentEstimate.tasks to maintain original order
  // Only include selected sections in calculations
  const { grandTotal, allSections, lineItemsTotal, breakdown } = useMemo(() => {
    if (!currentEstimate?.tasks) {
      return { grandTotal: 0, allSections: [], lineItemsTotal: 0, breakdown: null };
    }

    // Iterate through tasks in their original order
    const orderedTasks = currentEstimate.tasks
      .map((task) => taskDataMap[task.est_task_id])
      .filter(Boolean); // Remove any undefined tasks

    // Filter sections to only include selected ones
    const selectedSectionsArray = orderedTasks.flatMap((t) =>
      (t.sections || []).filter(
        (section) => selectedSections[section.sectionId]
      )
    );

    const tasksTotal = selectedSectionsArray.reduce(
      (sum, section) => sum + (section.totalPrice || 0),
      0
    );

    // Calculate line items total (only selected items)
    let lineItemsTotal = 0;
    if (
      currentEstimate.line_items &&
      Array.isArray(currentEstimate.line_items)
    ) {
      currentEstimate.line_items.forEach((item, index) => {
        // Add parent item total if selected and has quantity and cost
        const parentKey = String(index);
        if (selectedLineItems[parentKey] && item.quantity && item.cost) {
          lineItemsTotal += parseFloat(item.quantity) * parseFloat(item.cost);
        }
        
        // Add sub-items totals if selected
        if (item.subItems && Array.isArray(item.subItems)) {
          item.subItems.forEach((subItem, subIndex) => {
            const childKey = `${index}-${subIndex}`;
            if (selectedLineItems[childKey] && subItem.quantity && subItem.cost) {
              lineItemsTotal +=
                parseFloat(subItem.quantity) * parseFloat(subItem.cost);
            }
          });
        }
      });
    }

    const grandTotal = tasksTotal + lineItemsTotal;
    
    // Calculate detailed breakdown by aggregating from taskBreakdownMap
    const breakdown = {
      services: {},
      partsTotal: 0,
      subtotal: 0,
      profit: 0,
      commission: 0,
      discount: 0,
    };

    // Aggregate breakdown data from all tasks
    Object.values(taskBreakdownMap).forEach((taskBreakdown) => {
      // Aggregate services
      if (taskBreakdown.services) {
        Object.entries(taskBreakdown.services).forEach(([serviceId, data]) => {
          if (!breakdown.services[serviceId]) {
            breakdown.services[serviceId] = {
              name: data.name,
              hours: 0,
              cost: 0,
            };
          }
          breakdown.services[serviceId].hours += data.hours || 0;
          breakdown.services[serviceId].cost += data.cost || 0;
        });
      }

      // Aggregate other totals
      breakdown.partsTotal += taskBreakdown.partsTotal || 0;
      breakdown.subtotal += taskBreakdown.subtotal || 0;
      breakdown.profit += taskBreakdown.profit || 0;
      breakdown.commission += taskBreakdown.commission || 0;
      breakdown.discount += taskBreakdown.discount || 0;
    });

    return { grandTotal, allSections: selectedSectionsArray, lineItemsTotal, breakdown };
  }, [taskDataMap, taskBreakdownMap, currentEstimate, selectedSections, selectedLineItems]);

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
      teamDefaults.default_estimate_notes.forEach((note) => {
        initialSelection[note.id] = {
          selected: true,
          selectedOptionId: note.options?.[0]?.id || null,
        };
      });
      setSelectedNotes(initialSelection);
      notesInitialized.current = true;
    }
  }, [teamDefaults]);

  // Initialize all custom notes as selected when they load
  useEffect(() => {
    if (currentEstimate?.custom_notes && !customNotesInitialized.current) {
      const initialSelection = {};
      currentEstimate.custom_notes.forEach((note) => {
        initialSelection[note.id] = true;
      });
      setSelectedCustomNotes(initialSelection);
      customNotesInitialized.current = true;
    }
  }, [currentEstimate]);

  // Initialize all sections as selected when taskDataMap changes
  useEffect(() => {
    const allSectionIds = Object.values(taskDataMap).flatMap((task) =>
      (task.sections || []).map((section) => section.sectionId)
    );

    if (allSectionIds.length > 0) {
      setSelectedSections((prev) => {
        const newSelection = { ...prev };
        let hasChanges = false;

        allSectionIds.forEach((sectionId) => {
          if (!(sectionId in newSelection)) {
            newSelection[sectionId] = true;
            hasChanges = true;
          }
        });

        return hasChanges ? newSelection : prev;
      });

      if (!sectionsInitialized.current && allSectionIds.length > 0) {
        sectionsInitialized.current = true;
      }
    }
  }, [taskDataMap]);

  // Initialize all line items as selected when currentEstimate changes
  useEffect(() => {
    if (currentEstimate?.line_items && Array.isArray(currentEstimate.line_items)) {
      setSelectedLineItems((prev) => {
        const newSelection = { ...prev };
        let hasChanges = false;

        currentEstimate.line_items.forEach((item, index) => {
          // Initialize parent item
          const parentKey = String(index);
          if (!(parentKey in newSelection)) {
            newSelection[parentKey] = true;
            hasChanges = true;
          }
          
          // Initialize child items
          if (item.subItems && Array.isArray(item.subItems)) {
            item.subItems.forEach((_, subIndex) => {
              const childKey = `${index}-${subIndex}`;
              if (!(childKey in newSelection)) {
                newSelection[childKey] = true;
                hasChanges = true;
              }
            });
          }
        });

        if (hasChanges) {
          if (!lineItemsInitialized.current) {
            lineItemsInitialized.current = true;
          }
          return newSelection;
        }
        return prev;
      });
    }
  }, [currentEstimate]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
        teamData={teamData}
        logoDataUrl={logoDataUrl}
        selectedLineItems={selectedLineItems}
        disabled={
          !currentEstimate ||
          (allSections.length === 0 && lineItemsTotal === 0)
        }
      />
      <div className="bg-slate-800 border-b border-slate-700 sticky top-12 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
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

      {/* Main Content with Index */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {/* Left Index Panel */}
        <EstimatePreviewIndex
          taskDataMap={taskDataMap}
          tasksOrder={currentEstimate.tasks_order}
          selectedItems={selectedSections}
          onToggleItem={handleToggleSection}
          onToggleAll={handleToggleAllSections}
          scrollContainerRef={scrollContainerRef}
          sectionRefs={sectionRefs}
          scrollOffset={150}
          scrollOffsetSingleSection={220}
          lineItems={currentEstimate.line_items || []}
          selectedLineItems={selectedLineItems}
          onToggleLineItem={handleToggleLineItem}
          onToggleAllLineItems={handleToggleAllLineItems}
          onScrollToLineItems={scrollToLineItems}
        />

        {/* Right Content Panel */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]"
        >
          {/* Estimate Notes Section */}
          {(teamDefaults?.default_estimate_notes?.length > 0 ||
            currentEstimate?.custom_notes?.length > 0 ||
            isEditingCustomNotes) && (
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Estimate Notes</h2>
                {!isEditingCustomNotes && (
                  <button
                    onClick={handleAddCustomNote}
                    className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Custom Note
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {teamDefaults?.default_estimate_notes?.map((note) => {
                  const hasMultipleOptions =
                    note.options && note.options.length > 1;

                  return (
                    <div key={note.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedNotes[note.id]?.selected || false}
                        onChange={() => handleNoteToggle(note.id)}
                        className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2 flex-shrink-0"
                      />
                      <div className="flex-1 text-left">
                        {hasMultipleOptions ? (
                          <select
                            value={
                              selectedNotes[note.id]?.selectedOptionId ||
                              note.options[0]?.id
                            }
                            onChange={(e) =>
                              handleOptionChange(note.id, e.target.value)
                            }
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-teal-500"
                            disabled={!selectedNotes[note.id]?.selected}
                          >
                            {note.options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.text}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-300">
                            {note.options?.[0]?.text || ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <CustomNotesSection
                  customNotes={currentEstimate?.custom_notes}
                  selectedCustomNotes={selectedCustomNotes}
                  onToggleNote={handleToggleCustomNote}
                  onEditNote={handleEditCustomNote}
                  onDeleteNote={handleDeleteCustomNote}
                  isEditingCustomNotes={isEditingCustomNotes}
                  customNotesText={customNotesText}
                  editingCustomNoteId={editingCustomNoteId}
                  onCustomNotesTextChange={setCustomNotesText}
                  onSaveCustomNote={handleSaveCustomNote}
                  onCancelCustomNote={handleCancelCustomNote}
                />
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
                onTaskBreakdownChange={handleTaskBreakdownChange}
                sectionRefs={sectionRefs}
                selectedSections={selectedSections}
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
              <div ref={lineItemsSectionRef} className="bg-slate-800 rounded-lg p-6 mb-8">
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
                                parseFloat(item.quantity) *
                                  parseFloat(item.cost)
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

          {/* Grand Total with Expandable Breakdown */}
          <div className="bg-slate-800 rounded-lg p-6 sticky bottom-0 border-t-4 border-teal-500">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Total Estimate</h2>
                {isBreakdownExpanded ? (
                  <FiChevronDown className="text-teal-400" size={24} />
                ) : (
                  <FiChevronUp className="text-teal-400" size={24} />
                )}
              </div>
              <p className="text-3xl font-bold text-teal-400">
                {formatCurrency(grandTotal)}
              </p>
            </div>

            {/* Expandable Breakdown */}
            {isBreakdownExpanded && breakdown && (
              <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
                {/* Services Breakdown */}
                {Object.keys(breakdown.services).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-3">Services</h3>
                    <div className="space-y-2">
                      {Object.entries(breakdown.services).map(([serviceId, data]) => (
                        <div key={serviceId} className="flex justify-between items-center text-slate-300">
                          <div className="flex items-center gap-2">
                            <span>{data.name}</span>
                            <span className="text-sm text-slate-500">
                              ({formatNumber(data.hours)} hrs)
                            </span>
                          </div>
                          <span className="font-medium">{formatCurrency(data.cost)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700 font-semibold text-slate-200">
                        <span>Total Services</span>
                        <span>
                          {formatCurrency(
                            Object.values(breakdown.services).reduce(
                              (sum, s) => sum + s.cost,
                              0
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Parts Total */}
                {breakdown.partsTotal > 0 && (
                  <div className="flex justify-between items-center text-slate-200 font-semibold">
                    <span>Parts Total</span>
                    <span>{formatCurrency(breakdown.partsTotal)}</span>
                  </div>
                )}

                {/* Subtotal */}
                {breakdown.subtotal > 0 && (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-700 text-lg font-semibold text-slate-100">
                    <span>Subtotal</span>
                    <span>{formatCurrency(breakdown.subtotal)}</span>
                  </div>
                )}

                {/* Profit */}
                {breakdown.profit > 0 && (
                  <div className="flex justify-between items-center text-green-400">
                    <span>Profit</span>
                    <span>+{formatCurrency(breakdown.profit)}</span>
                  </div>
                )}

                {/* Commission */}
                {breakdown.commission > 0 && (
                  <div className="flex justify-between items-center text-blue-400">
                    <span>Commission</span>
                    <span>+{formatCurrency(breakdown.commission)}</span>
                  </div>
                )}

                {/* Discount */}
                {breakdown.discount > 0 && (
                  <div className="flex justify-between items-center text-red-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(breakdown.discount)}</span>
                  </div>
                )}

                {/* Line Items (if present) */}
                {lineItemsTotal > 0 && (
                  <div className="flex justify-between items-center text-slate-200 font-semibold">
                    <span>Additional Line Items</span>
                    <span>{formatCurrency(lineItemsTotal)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatePreview;
