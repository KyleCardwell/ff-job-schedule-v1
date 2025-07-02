import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import EstimateProjectForm from "./EstimateProjectForm";
import EstimateTaskForm from "./EstimateTaskForm";
import EstimateSectionForm from "./EstimateSectionForm";
import EstimateSectionInfo from "./EstimateSectionInfo";
import {
  addTask,
  addSection,
  fetchEstimateById,
  setCurrentEstimate,
  updateTask,
  updateSection,
} from "../../redux/actions/estimates";
import { FiArrowLeft } from "react-icons/fi";
import { PATHS } from "../../utils/constants";

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
  const [loading, setLoading] = useState(true);
  const [isNewTask, setIsNewTask] = useState(false);
  const [initialData, setInitialData] = useState({});

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
    // Close section form when task changes
    setShowSectionForm(false);
  }, [selectedTaskId]);

  useEffect(() => {}, [currentEstimate]);

  const selectedTask = currentEstimate?.tasks?.find(
    (task) => task.est_task_id === selectedTaskId
  );

  const handleAddTask = () => {
    setSelectedTaskId(null);
    setShowProjectInfo(false);
    setIsNewTask(true);
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
              <div className="py-3 px-4 text-sm font-medium text-slate-200">
                Rooms
              </div>

              {/* Tasks List */}
              <div className="overflow-y-auto flex-1">
                {currentEstimate?.tasks?.map((task) => (
                  <div key={task.est_task_id}>
                    {/* {task.sections?.length > 1 ? (
                      <div className="w-full py-3 px-4 text-sm font-medium text-left flex items-center space-x-2 text-slate-200">
                        {task.est_task_name}
                      </div>
                    ) : ( */}
                    <button
                      onClick={() => {
                        setSelectedTaskId(task.est_task_id);
                        setSelectedSectionId(
                          task.sections?.[0]?.est_section_id
                        );
                        setShowProjectInfo(false);
                        setShowSectionForm(false);
                      }}
                      className={`
                          w-full py-3 px-4 text-sm font-medium text-left flex items-center space-x-2
                          ${
                            selectedTaskId === task.est_task_id &&
                            task.sections?.length === 1
                              ? "bg-slate-800 text-teal-200 border-l-2 border-teal-200"
                              : "text-slate-200 hover:bg-slate-700 hover:text-teal-400"
                          }
                        `}
                    >
                      {task.est_task_name}
                    </button>
                    {/* // )} */}
                    {/* Sections List */}
                    {task.sections?.length > 1 && (
                      <div className="pl-6">
                        {task.sections.map((section, index) => (
                          <button
                            key={section.est_section_id}
                            onClick={() => {
                              setSelectedTaskId(task.est_task_id);
                              setSelectedSectionId(section.est_section_id);
                              setShowSectionForm(false);
                              setShowProjectInfo(false);
                            }}
                            className={`
                              w-full py-2 px-4 text-sm text-left flex items-center space-x-2
                              ${
                                selectedSectionId === section.est_section_id
                                  ? "bg-slate-800 text-teal-200 border-l-2 border-teal-200"
                                  : "text-slate-400 hover:text-teal-400"
                              }
                            `}
                          >
                            Section {index + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
        selectedTask={selectedTask}
        selectedSectionId={selectedSectionId}
        onAddSection={(templateSection) => {
          if (selectedTaskId) {
            setSelectedSectionId(null);
            // If we have a template section, pass its section_data as the initial data
            const initialData = templateSection
              ? { section_data: { ...templateSection.section_data } }
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
      <div className="flex-1 p-6">
        {showProjectInfo || !currentEstimate ? (
          <div className="max-w-3xl mx-auto">
            <EstimateProjectForm estimate={currentEstimate} />
          </div>
        ) : showSectionForm ? (
          <div className="max-w-3xl mx-auto">
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
                setSelectedSectionId(null);
              }}
              onSave={() => {
                setShowSectionForm(false);
              }}
            />
          </div>
        ) : selectedTask ? (
          <div className="max-w-3xl mx-auto">
            <EstimateTaskForm
              selectedTaskId={selectedTaskId}
              onTaskDeleted={() => setSelectedTaskId(null)}
            />
          </div>
        ) : isNewTask ? (
          <div className="max-w-3xl mx-auto">
            <EstimateTaskForm
              isNew={true}
              onTaskSaved={(taskId) => {
                setSelectedTaskId(taskId);
                setIsNewTask(false);
              }}
              onCancel={() => {
                setIsNewTask(false);
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-200">
            Select a room or create a new one
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimateLayout;
