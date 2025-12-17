import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { fetchTeamDefaults } from "../../redux/actions/teamEstimateDefaults";
import { fetchTeamData, getTeamLogoSignedUrl } from "../../redux/actions/teams";

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

  // Refs for scrolling functionality
  const scrollContainerRef = useRef(null);
  const sectionRefs = useRef({});

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

  const handleToggleLineItem = useCallback((lineItemIndex) => {
    setSelectedLineItems((prev) => ({
      ...prev,
      [lineItemIndex]: !prev[lineItemIndex],
    }));
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

  // Build selected notes for PDF
  const selectedNotesForPdf = useMemo(() => {
    if (!teamDefaults?.default_estimate_notes) return [];

    return teamDefaults.default_estimate_notes
      .map((note) => {
        const selection = selectedNotes[note.id];
        if (!selection?.selected) return null;

        // Find the selected option
        if (note.options && note.options.length > 0) {
          const selectedOption = note.options.find(
            (opt) => opt.id === selection.selectedOptionId
          );
          // If no option selected or not found, use first option
          return selectedOption?.text || note.options[0]?.text;
        }

        return null;
      })
      .filter(Boolean);
  }, [teamDefaults, selectedNotes]);

  // Calculate grand total from task data and prepare all sections for PDF
  // Use currentEstimate.tasks to maintain original order
  // Only include selected sections in calculations
  const { grandTotal, allSections, lineItemsTotal } = useMemo(() => {
    if (!currentEstimate?.tasks) {
      return { grandTotal: 0, allSections: [], lineItemsTotal: 0 };
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
        // Only include if selected
        if (selectedLineItems[index]) {
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
        }
      });
    }

    const grandTotal = tasksTotal + lineItemsTotal;
    return { grandTotal, allSections: selectedSectionsArray, lineItemsTotal };
  }, [taskDataMap, currentEstimate, selectedSections, selectedLineItems]);

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

        currentEstimate.line_items.forEach((_, index) => {
          if (!(index in newSelection)) {
            newSelection[index] = true;
            hasChanges = true;
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
        />

        {/* Right Content Panel */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]"
        >
          {/* Estimate Notes Section */}
          {teamDefaults?.default_estimate_notes &&
            teamDefaults.default_estimate_notes.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Estimate Notes</h2>
                <div className="space-y-3">
                  {teamDefaults.default_estimate_notes.map((note) => {
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
    </div>
  );
};

export default EstimatePreview;
