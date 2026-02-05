import { useState, useEffect, useMemo } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { LuArrowDownUp } from "react-icons/lu";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

import { fetchAccessoriesCatalog, fetchAccessoryTimeAnchors } from "../../redux/actions/accessories.js";
import { fetchCabinetAnchors } from "../../redux/actions/cabinetAnchors.js";
import { fetchTeamCabinetStyles } from "../../redux/actions/cabinetStyles.js";
import { fetchCabinetTypes } from "../../redux/actions/cabinetTypes.js";
import {
  fetchEstimateById,
  setCurrentEstimate,
  updateTaskOrder,
  updateSection,
} from "../../redux/actions/estimates";
import { fetchFinishes } from "../../redux/actions/finishes.js";
import { fetchHinges, fetchPulls, fetchSlides } from "../../redux/actions/hardware.js";
import { fetchLengthsCatalog } from "../../redux/actions/lengths.js";
import { fetchDrawerBoxMaterials, fetchSheetGoods } from "../../redux/actions/materials.js";
import { fetchPartsList } from "../../redux/actions/partsList.js";
import { fetchPartsListAnchors } from "../../redux/actions/partsListAnchors.js";
import { fetchTeamDefaults } from "../../redux/actions/teamEstimateDefaults.js";
import { PATHS } from "../../utils/constants";
import { createSectionContext } from "../../utils/createSectionContext";
import { getEffectiveValueOnly } from "../../utils/estimateDefaults";
import { getSectionCalculations } from "../../utils/getSectionCalculations";
import ReorderModal from "../common/ReorderModal.jsx";

import EstimateLineItemsEditor from "./EstimateLineItemsEditor.jsx";
import EstimateProjectForm from "./EstimateProjectForm.jsx";
import EstimateSectionForm from "./EstimateSectionForm.jsx";
import EstimateSectionInfo from "./EstimateSectionInfo.jsx";
import EstimateSectionManager from "./EstimateSectionManager.jsx"; // Import EstimateSectionManager
import EstimateSectionPrice from "./EstimateSectionPrice.jsx";
import EstimateTask from "./EstimateTask.jsx";

const EstimateLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { estimateId } = useParams();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults
  );
  const estimates = useSelector((state) => state.estimates.estimates);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showEstimateDefaultsForm, setShowEstimateDefaultsForm] = useState(false);
  const [showLineItemsEditor, setShowLineItemsEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNewTask, setIsNewTask] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  useEffect(() => {
    const loadEstimate = async () => {
      try {
        if (estimateId) {
          const existingEstimate = estimates.find(
            (est) => est.est_project_id === estimateId
          );
          if (existingEstimate) {
            dispatch(setCurrentEstimate(existingEstimate));
            setLoading(false);
            return;
          }

          const result = await dispatch(fetchEstimateById(estimateId));
          if (!result) {
            navigate(PATHS.IN_PROGRESS_ESTIMATES);
            return;
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading estimate:", error);
        navigate(PATHS.IN_PROGRESS_ESTIMATES);
        setLoading(false);
      }
    };

    loadEstimate();
  }, [dispatch, estimateId, navigate, estimates]);

  useEffect(() => {
    dispatch(fetchTeamDefaults());
    dispatch(fetchSheetGoods());
    dispatch(fetchDrawerBoxMaterials());
    dispatch(fetchHinges())
    dispatch(fetchPulls())
    dispatch(fetchSlides())
    dispatch(fetchCabinetTypes());
    dispatch(fetchCabinetAnchors())
    dispatch(fetchTeamCabinetStyles())
    dispatch(fetchPartsList())
    dispatch(fetchPartsListAnchors())
    dispatch(fetchFinishes())
    dispatch(fetchAccessoriesCatalog())
    dispatch(fetchAccessoryTimeAnchors());
    dispatch(fetchLengthsCatalog())
  }, []);

  useEffect(() => {
    // Close section form when task changes
    setShowSectionForm(false);
  }, [selectedTaskId]);

  useEffect(() => {}, [currentEstimate]);

  // Memoize the selected task and section to avoid recalculating on every render
  const selectedTask = useMemo(() => {
    return currentEstimate?.tasks?.find(
      (task) => task.est_task_id === selectedTaskId
    );
  }, [currentEstimate?.tasks, selectedTaskId]);

  const selectedSection = useMemo(() => {
    return selectedTask?.sections?.find(
      (section) => section.est_section_id === selectedSectionId
    );
  }, [selectedTask?.sections, selectedSectionId]);

  // Get all catalog data from Redux
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector((state) => state.materials);
  const services = useSelector((state) => state.services?.allServices || []);
  const finishTypes = useSelector((state) => state.finishes?.finishes || []);
  const cabinetStyles = useSelector((state) => state.cabinetStyles?.styles.filter((style) => style.is_active) || []);
  const cabinetTypes = useSelector((state) => state.cabinetTypes?.types.filter((type) => type.is_active) || []);
  const { hardware, accessories, lengths } = useSelector((state) => state);
  const partsListAnchors = useSelector((state) => state.partsListAnchors?.itemsByPartsList || []);
  const cabinetAnchors = useSelector((state) => state.cabinetAnchors?.itemsByType || []);

  // Calculate section calculations for the selected section
  const sectionCalculations = useMemo(() => {
    if (!selectedSection) return null;

    const catalogData = {
      boxMaterials,
      faceMaterials,
      drawerBoxMaterials,
      finishTypes,
      cabinetStyles,
      cabinetTypes,
      hardware,
      partsListAnchors,
      cabinetAnchors,
      globalServices: services,
      lengthsCatalog: lengths?.catalog || [],
      accessories,
      teamDefaults,
    };

    const { context, effectiveSection } = createSectionContext(selectedSection, currentEstimate, catalogData);
    return getSectionCalculations(effectiveSection, context);
  }, [
    selectedSection,
    currentEstimate,
    boxMaterials,
    faceMaterials,
    drawerBoxMaterials,
    finishTypes,
    cabinetStyles,
    cabinetTypes,
    hardware,
    partsListAnchors,
    cabinetAnchors,
    services,
    lengths,
    accessories,
    teamDefaults,
  ]);

  // Calculate which tasks have sections with cabinet errors
  // Use three-tier fallback for style comparison: section → estimate → team
  const tasksWithErrors = useMemo(() => {
    const errorTaskIds = new Set();
    
    currentEstimate?.tasks?.forEach((task) => {
      task.sections?.forEach((section) => {
        // Calculate the effective style using three-tier fallback
        const effectiveStyle = getEffectiveValueOnly(
          section?.cabinet_style_id,
          currentEstimate?.default_cabinet_style_id,
          teamDefaults?.default_cabinet_style_id
        ) || 13;

        // Check if any cabinets in this section have error state
        const hasErrorCabinets = section.cabinets?.some((cabinet) => {
          return (
            cabinet.cabinet_style_override === null &&
            cabinet.saved_style_id != null &&
            cabinet.saved_style_id !== effectiveStyle
          );
        });
        
        if (hasErrorCabinets) {
          errorTaskIds.add(task.est_task_id);
        }
      });
    });
    
    return errorTaskIds;
  }, [currentEstimate?.tasks, currentEstimate?.default_cabinet_style_id, teamDefaults?.default_cabinet_style_id]);

  const handleAddTask = () => {
    setSelectedTaskId(null);
    setShowProjectInfo(false);
    setIsNewTask(true);
  };

  const handleTaskSaved = (newTask) => {
    setSelectedTaskId(newTask.est_task_id);
    setIsNewTask(false);
    // Select the first section of the newly created task
    if (newTask?.sections?.[0]) {
      setSelectedSectionId(newTask.sections[0].est_section_id);
    }
  };

  const handleTaskCanceled = () => {
    setIsNewTask(false);
  };

  const handleSaveTaskOrder = (reorderedTasks) => {
    dispatch(updateTaskOrder(currentEstimate.estimate_id, reorderedTasks));
    setIsReorderModalOpen(false);
  };

  const handleSaveToggles = async (data) => {
    if (selectedTaskId && selectedSectionId && currentEstimate) {
      await dispatch(
        updateSection(
          currentEstimate.estimate_id,
          selectedTaskId,
          selectedSectionId,
          {
            parts_included: data.parts_included,
            services_included: data.services_included,
          }
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800 text-slate-200">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-800">
      {/* Preview Button - Fixed Top Right */}
      {currentEstimate && (
        <div className="fixed right-0 top-0 h-[50px] z-30 flex print:hidden">
          <button
            onClick={() => navigate(`/estimates/in-progress/${estimateId}/preview`)}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors"
          >
            Estimate Preview
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 flex-none bg-slate-900 border-t border-slate-200 flex flex-col">
        <div className="flex items-center justify-center py-4 text-slate-200 text-lg font-semibold relative">
          <button
            onClick={() => navigate(PATHS.IN_PROGRESS_ESTIMATES)}
            className="mr-4 hover:text-slate-300 left-[10px] absolute"
            aria-label="Go back"
          >
            <FiArrowLeft size={24} />
          </button>
          {currentEstimate?.est_project_name || "New Estimate"}
        </div>
        <nav className="flex flex-col flex-1 overflow-hidden">
          {/* Project Info Button */}
          <button
            onClick={() => {
              setShowProjectInfo(true);
              setSelectedTaskId(null);
              setSelectedSectionId(null);
            }}
            className={`
              py-3 px-4 text-sm font-medium text-left flex items-center space-x-2
              ${
                showProjectInfo
                  ? "bg-slate-800 text-teal-200 border-l-2 border-teal-200"
                  : "text-slate-200 hover:bg-slate-700 hover:text-teal-400"
              }
            `}
          >
            Project Information
          </button>

          {currentEstimate && (
            <>
              {/* Tasks List Header */}
              <div className="py-3 px-4 text-md font-medium text-slate-200 flex justify-between items-center border-b border-slate-200">
                <span className="font-semibold">Rooms</span>
                {currentEstimate?.tasks?.length > 1 && (
                  <button
                    onClick={() => setIsReorderModalOpen(true)}
                    className="text-slate-400 hover:text-teal-400"
                    aria-label="Reorder rooms"
                  >
                    <LuArrowDownUp size={20} />
                  </button>
                )}
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto">
                {currentEstimate?.tasks?.map((task) => (
                  <div key={task.est_task_id}>
                    <EstimateTask
                      task={task}
                      isSelected={selectedTaskId === task.est_task_id}
                      hasErrorState={tasksWithErrors.has(task.est_task_id)}
                      onSelect={() => {
                        setSelectedTaskId(task.est_task_id);
                        setSelectedSectionId(
                          task.sections?.[0]?.est_section_id
                        );
                        setShowProjectInfo(false);
                        setShowSectionForm(false);
                        setShowEstimateDefaultsForm(false);
                        setShowLineItemsEditor(false);
                      }}
                      onDelete={() => setSelectedTaskId(null)}
                      sections={task.sections || []}
                      selectedSectionId={selectedSectionId}
                      setSelectedSectionId={setSelectedSectionId}
                      setSelectedTaskId={setSelectedTaskId}
                      setShowSectionForm={setShowSectionForm}
                      setShowProjectInfo={setShowProjectInfo}
                      setShowEstimateDefaultsForm={setShowEstimateDefaultsForm}
                    />
                  </div>
                ))}

                {/* New Task Input */}
                {isNewTask && (
                  <EstimateTask
                    task={{
                      est_task_id: -1,
                      est_task_name: "",
                    }}
                    isNew={true}
                    onSave={handleTaskSaved}
                    onCancel={handleTaskCanceled}
                  />
                )}
              </div>

              {/* Add Task Button */}
              <button
                onClick={handleAddTask}
                className="mt-auto w-full py-3 px-4 text-sm font-medium text-teal-400 hover:text-teal-300 border-t border-slate-700 bg-slate-900 hover:bg-slate-800"
              >
                Add Room
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Sections Column */}
      <EstimateSectionInfo
        currentEstimate={currentEstimate}
        selectedTask={selectedTask}
        selectedSectionId={selectedSectionId}
        showProjectInfo={showProjectInfo}
        isNew={isNewTask}
        onTaskSaved={(taskId) => {
          setSelectedTaskId(taskId);
          setIsNewTask(false);
        }}
        onTaskDeleted={() => setSelectedTaskId(null)}
        onCancel={() => {
          setIsNewTask(false);
        }}
        onEditEstimateDefaults={() => {
          setShowEstimateDefaultsForm(true);
          setShowProjectInfo(false);
        }}
        onEditLineItems={() => {
          setShowLineItemsEditor(true);
          setShowProjectInfo(false);
        }}
        onAddSection={(templateSection) => {
          if (selectedTaskId) {
            setSelectedSectionId(null);
            // If we have a template section, pass its fields as the initial data
            const initialData = templateSection
              ? {
                  face_mat: templateSection.face_mat,
                  box_mat: templateSection.box_mat,
                  box_finish: templateSection.box_finish,
                  face_finish: templateSection.face_finish,
                  cabinet_style_id: templateSection.cabinet_style_id,
                  hinge_id: templateSection.hinge_id,
                  slide_id: templateSection.slide_id,
                  door_pull_id: templateSection.door_pull_id,
                  drawer_pull_id: templateSection.drawer_pull_id,
                  drawer_box_mat: templateSection.drawer_box_mat,
                  door_style: templateSection.door_style,
                  drawer_front_style: templateSection.drawer_front_style,
                  door_inside_molding: templateSection.door_inside_molding,
                  door_outside_molding: templateSection.door_outside_molding,
                  door_panel_mod_id: templateSection.door_panel_mod_id,
                  drawer_inside_molding: templateSection.drawer_inside_molding,
                  drawer_outside_molding: templateSection.drawer_outside_molding,
                  drawer_panel_mod_id: templateSection.drawer_panel_mod_id,
                  profit: templateSection.profit,
                  commission: templateSection.commission,
                  discount: templateSection.discount,
                }
              : {};
            setInitialData(initialData);
            setShowSectionForm(true);
          }
        }}
        onEditSection={(section) => {
          if (selectedTaskId) {
            setSelectedSectionId(section.est_section_id);
            setShowSectionForm(true);
          }
        }}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {showProjectInfo || !currentEstimate ? (
          <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-3xl mx-auto">
              <EstimateProjectForm estimate={currentEstimate} />
            </div>
          </div>
        ) : showEstimateDefaultsForm ? (
          <div className="px-6 h-full">
            <div className="max-w-5xl mx-auto h-full">
              <EstimateSectionForm
                editType="estimate"
                estimateData={currentEstimate}
                onCancel={() => {
                  setShowEstimateDefaultsForm(false);
                  setShowProjectInfo(true);
                }}
                onSave={() => {
                  setShowEstimateDefaultsForm(false);
                  setShowProjectInfo(true);
                }}
              />
            </div>
          </div>
        ) : showLineItemsEditor ? (
          <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-6xl mx-auto">
              <EstimateLineItemsEditor
                estimate={currentEstimate}
                onCancel={() => {
                  setShowLineItemsEditor(false);
                  setShowProjectInfo(true);
                }}
                onSave={() => {
                  setShowLineItemsEditor(false);
                  setShowProjectInfo(true);
                }}
              />
            </div>
          </div>
        ) : showSectionForm ? (
          <div className="p-6 h-full">
            <div className="max-w-5xl mx-auto h-full">
              <EstimateSectionForm
                taskId={selectedTaskId}
                section={
                  selectedTask?.sections?.find(
                    (s) => s.est_section_id === selectedSectionId
                  ) ||
                  initialData ||
                  {}
                }
                onCancel={() => {
                  setShowSectionForm(false);
                  // setSelectedSectionId(null);
                }}
                onSave={(sectionId) => {
                  setShowSectionForm(false);
                  setSelectedSectionId(sectionId);
                }}
              />
            </div>
          </div>
        ) : selectedTaskId && selectedSectionId ? (
          <>
            {selectedSection ? (
              <div className="flex h-full">
                <div className="flex-1 py-6 overflow-y-auto mx-auto">
                  <EstimateSectionManager
                    taskId={selectedTaskId}
                    sectionId={selectedSectionId}
                    section={selectedSection}
                    sectionCalculations={sectionCalculations}
                  />
                </div>
                <div className="w-80 p-6 overflow-y-auto border-l border-slate-700">
                  <EstimateSectionPrice 
                    section={selectedSection}
                    sectionCalculations={sectionCalculations}
                    onSaveToggles={handleSaveToggles}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-200">
                Section not found
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-200">
            {isNewTask
              ? "Enter room name"
              : "Select a room or create a new one"}
          </div>
        )}
      </div>
      <ReorderModal
        open={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        onSave={handleSaveTaskOrder}
        items={currentEstimate?.tasks}
        title="Reorder Rooms"
        idKey="est_task_id"
      />
    </div>
  );
};

export default EstimateLayout;
