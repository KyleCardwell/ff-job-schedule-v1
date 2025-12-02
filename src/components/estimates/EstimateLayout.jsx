import { useState, useEffect, useMemo } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { LuArrowDownUp } from "react-icons/lu";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

import { fetchAccessoriesCatalog } from "../../redux/actions/accessories.js";
import { fetchCabinetAnchors } from "../../redux/actions/cabinetAnchors.js";
import { fetchTeamCabinetStyles } from "../../redux/actions/cabinetStyles.js";
import { fetchCabinetTypes } from "../../redux/actions/cabinetTypes.js";
import {
  fetchEstimateById,
  setCurrentEstimate,
  updateTaskOrder,
} from "../../redux/actions/estimates";
import { fetchFinishes } from "../../redux/actions/finishes.js";
import { fetchHinges, fetchPulls, fetchSlides } from "../../redux/actions/hardware.js";
import { fetchDrawerBoxMaterials, fetchSheetGoods } from "../../redux/actions/materials.js";
import { fetchPartsList } from "../../redux/actions/partsList.js";
import { fetchPartsListAnchors } from "../../redux/actions/partsListAnchors.js";
import { PATHS } from "../../utils/constants";
import ReorderModal from "../common/ReorderModal.jsx";

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
  const estimates = useSelector((state) => state.estimates.estimates);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showEstimateDefaultsForm, setShowEstimateDefaultsForm] = useState(false);
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

  const handleAddTask = () => {
    setSelectedTaskId(null);
    setShowProjectInfo(false);
    setIsNewTask(true);
  };

  const handleTaskSaved = (taskId) => {
    setSelectedTaskId(taskId);
    setIsNewTask(false);
  };

  const handleTaskCanceled = () => {
    setIsNewTask(false);
  };

  const handleSaveTaskOrder = (orderedTaskIds) => {
    if (currentEstimate?.estimate_id) {
      dispatch(updateTaskOrder(currentEstimate.estimate_id, orderedTaskIds));
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
                      onSelect={() => {
                        setSelectedTaskId(task.est_task_id);
                        setSelectedSectionId(
                          task.sections?.[0]?.est_section_id
                        );
                        setShowProjectInfo(false);
                        setShowSectionForm(false);
                        setShowEstimateDefaultsForm(false);
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
        estimate_data={currentEstimate?.estimate_data}
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
        onAddSection={(templateSection) => {
          if (selectedTaskId) {
            setSelectedSectionId(null);
            // If we have a template section, pass its section_data as the initial data
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
                  section_data: {
                    ...templateSection.section_data,
                  },
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
      <div className="flex-1 p-6 overflow-y-auto">
        {showProjectInfo || !currentEstimate ? (
          <div className="max-w-3xl mx-auto">
            <EstimateProjectForm estimate={currentEstimate} />
          </div>
        ) : showEstimateDefaultsForm ? (
          <div className="max-w-4xl mx-auto">
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
        ) : showSectionForm ? (
          <div className="max-w-4xl mx-auto">
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
        ) : selectedTaskId && selectedSectionId ? (
          <>
            {selectedSection ? (
              <div className="flex gap-6 h-full">
                <EstimateSectionManager
                  taskId={selectedTaskId}
                  sectionId={selectedSectionId}
                  section={selectedSection}
                />
                <EstimateSectionPrice section={selectedSection} />
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
