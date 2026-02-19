import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiCalendar, FiCheckCircle } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { finalizeEstimate } from "../../redux/actions/estimates";
import { fetchTeamData, getTeamLogoSignedUrl } from "../../redux/actions/teams";
import { ESTIMATE_STATUS } from "../../utils/constants";

import EstimateNotesManager from "./EstimateNotesManager.jsx";
import EstimatePreviewBreakdown from "./EstimatePreviewBreakdown.jsx";
import EstimatePreviewIndex from "./EstimatePreviewIndex.jsx";
import EstimatePreviewTask from "./EstimatePreviewTask.jsx";
import GenerateEstimatePdf from "./GenerateEstimatePdf.jsx";

const EstimatePreview = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { estimateId } = useParams();
  const isFinalized = location.pathname.includes('/finalized');

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const teamId = useSelector((state) => state.auth.teamId);
  const { teamData } = useSelector((state) => state.teams);
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector((state) => state.materials);
  const finishTypes = useSelector((state) => state.finishes?.finishes || []);
  const hardware = useSelector((state) => state.hardware);
  const accessories = useSelector((state) => state.accessories);
  const teamDefaults = useSelector((state) => state.teamEstimateDefaults?.teamDefaults);

  const [isFinalizing, setIsFinalizing] = useState(false);

  // Track all task data - children will report their complete data up
  const [taskDataMap, setTaskDataMap] = useState({});
  const [taskBreakdownMap, setTaskBreakdownMap] = useState({});
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  // Selected notes text for PDF (driven by EstimateNotesManager callback)
  const [selectedNotesForPdf, setSelectedNotesForPdf] = useState([]);

  // Track selected sections: { sectionId: boolean }
  const [selectedSections, setSelectedSections] = useState({});
  const sectionsInitialized = useRef(false);

  // Track selected line items: { lineItemIndex: boolean }
  const [selectedLineItems, setSelectedLineItems] = useState({});
  const lineItemsInitialized = useRef(false);

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
      parts: {
        boxTotal: 0,
        boxCount: 0,
        facePrices: {},
        faceCounts: {},
        drawerBoxTotal: 0,
        drawerBoxCount: 0,
        rollOutTotal: 0,
        rollOutCount: 0,
        hingesTotal: 0,
        hingesCount: 0,
        slidesTotal: 0,
        slidesCount: 0,
        pullsTotal: 0,
        pullsCount: 0,
        woodTotal: 0,
        woodCount: 0,
        accessoriesTotal: 0,
        accessoriesCount: 0,
        otherTotal: 0,
        otherCount: 0,
      },
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

      // Aggregate parts breakdown
      if (taskBreakdown.parts) {
        const parts = taskBreakdown.parts;
        breakdown.parts.boxTotal += parts.boxTotal || 0;
        breakdown.parts.boxCount += parts.boxCount || 0;
        breakdown.parts.drawerBoxTotal += parts.drawerBoxTotal || 0;
        breakdown.parts.drawerBoxCount += parts.drawerBoxCount || 0;
        breakdown.parts.rollOutTotal += parts.rollOutTotal || 0;
        breakdown.parts.rollOutCount += parts.rollOutCount || 0;
        breakdown.parts.hingesTotal += parts.hingesTotal || 0;
        breakdown.parts.hingesCount += parts.hingesCount || 0;
        breakdown.parts.slidesTotal += parts.slidesTotal || 0;
        breakdown.parts.slidesCount += parts.slidesCount || 0;
        breakdown.parts.pullsTotal += parts.pullsTotal || 0;
        breakdown.parts.pullsCount += parts.pullsCount || 0;
        breakdown.parts.woodTotal += parts.woodTotal || 0;
        breakdown.parts.woodCount += parts.woodCount || 0;
        breakdown.parts.accessoriesTotal += parts.accessoriesTotal || 0;
        breakdown.parts.accessoriesCount += parts.accessoriesCount || 0;
        breakdown.parts.otherTotal += parts.otherTotal || 0;
        breakdown.parts.otherCount += parts.otherCount || 0;
        
        // Aggregate face prices and counts
        if (parts.facePrices) {
          Object.entries(parts.facePrices).forEach(([type, price]) => {
            breakdown.parts.facePrices[type] = (breakdown.parts.facePrices[type] || 0) + price;
          });
        }
        if (parts.faceCounts) {
          Object.entries(parts.faceCounts).forEach(([type, count]) => {
            breakdown.parts.faceCounts[type] = (breakdown.parts.faceCounts[type] || 0) + count;
          });
        }
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
      const basePath = isFinalized ? '/estimates/finalized' : '/estimates/in-progress';
      navigate(`${basePath}/${estimateId}`);
    }
  }, [currentEstimate, estimateId, navigate, isFinalized]);

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

  const handleFinalize = async () => {
    if (!currentEstimate || isFinalizing) return;
    setIsFinalizing(true);
    try {
      await dispatch(
        finalizeEstimate(currentEstimate.estimate_id, {
          boxMaterials,
          faceMaterials,
          drawerBoxMaterials,
          finishTypes,
          hardware,
          accessories,
          teamDefaults,
        })
      );
    } catch (error) {
      console.error("Error finalizing estimate:", error);
    } finally {
      setIsFinalizing(false);
    }
  };

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
    <div className="h-full bg-slate-900 text-slate-200 flex flex-col relative">
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
      >
        {currentEstimate?.status !== ESTIMATE_STATUS.FINALIZED && (
          <button
            onClick={handleFinalize}
            disabled={isFinalizing || !currentEstimate || (allSections.length === 0 && lineItemsTotal === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
          >
            <FiCheckCircle className="w-4 h-4" />
            {isFinalizing ? "Finalizing..." : "Finalize Estimate"}
          </button>
        )}
        {currentEstimate?.status === ESTIMATE_STATUS.FINALIZED && (
          <button
            onClick={() =>
              navigate(`/estimates/finalized/${currentEstimate.estimate_id}/schedule`)
            }
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
          >
            <FiCalendar className="w-4 h-4" />
            Add to Schedule
          </button>
        )}
        {currentEstimate?.status === ESTIMATE_STATUS.FINALIZED && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white">
            <FiCheckCircle className="w-4 h-4" />
            Finalized
          </div>
        )}
      </GenerateEstimatePdf>
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-8xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/estimates/${isFinalized ? 'finalized' : 'in-progress'}/${estimateId}`)}
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
      <div className="flex-1 px-6 flex gap-6 overflow-hidden mx-auto">
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
          scrollOffsetSingleSection={168}
          lineItems={currentEstimate.line_items || []}
          selectedLineItems={selectedLineItems}
          onToggleLineItem={handleToggleLineItem}
          onToggleAllLineItems={handleToggleAllLineItems}
          onScrollToLineItems={scrollToLineItems}
          hasEstimateNotes={true}
        />

        {/* Middle Content Panel */}
        <div
          ref={scrollContainerRef}
          className="w-[896px] py-8 overflow-y-auto"
        >
          {/* Estimate Notes Section */}
          <EstimateNotesManager
            estimateId={currentEstimate.estimate_id}
            onSelectedNotesChange={setSelectedNotesForPdf}
          />

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

        </div>

        {/* Right Breakdown Panel */}
        <EstimatePreviewBreakdown
          breakdown={breakdown}
          grandTotal={grandTotal}
          lineItemsTotal={lineItemsTotal}
        />
      </div>
    </div>
  );
};

export default EstimatePreview;
