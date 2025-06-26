import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiArrowLeft, FiSave, FiPlusCircle, FiTrash2 } from "react-icons/fi";
import { PATHS, ESTIMATE_STATUS } from "../../utils/constants";
import { 
  createEstimate, 
  fetchProjectsForSelection, 
  createProjectForEstimate,
  setCurrentEstimate
} from "../../redux/actions/estimates";
import EstimateTaskForm from "./EstimateTaskForm";

const NewEstimateForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { 
    loading, 
    error, 
    projectsForSelection, 
    projectsLoading, 
    projectsError,
    currentEstimate 
  } = useSelector((state) => state.estimates);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    projectType: "existing", // 'existing' or 'new'
    projectId: "",
    projectName: "",
    clientName: "",
  });
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch projects when component mounts
  useEffect(() => {
    dispatch(fetchProjectsForSelection());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.projectType === "existing" && !formData.projectId) {
      newErrors.projectId = "Please select a project";
    }
    
    if (formData.projectType === "new" && !formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }
    
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        let projectId = formData.projectId;
        
        // If creating a new project, create it first
        if (formData.projectType === "new") {
          const newProject = await dispatch(
            createProjectForEstimate({
              project_name: formData.projectName,
            })
          );
          projectId = newProject.project_id;
        }
        
        // Create the estimate
        const estimateData = {
          project_id: projectId,
          client_name: formData.clientName || null,
          status: ESTIMATE_STATUS.DRAFT,
        };
        
        // Dispatch the create estimate action
        const newEstimate = await dispatch(createEstimate(estimateData));
        
        // Set as current estimate
        dispatch(setCurrentEstimate(newEstimate));
        
        // Move to the next step instead of navigating away
        setCurrentStep(2);
      } catch (err) {
        console.error("Failed to create estimate:", err);
        // Error is already handled by the action and will be in the Redux state
      }
    }
  };
  
  // Handle adding a new task
  const handleAddTask = () => {
    setTasks([
      ...tasks,
      {
        id: `temp-${Date.now()}`,
        name: "",
        sections: [],
      },
    ]);
  };
  
  // Handle updating a task
  const handleUpdateTask = (updatedTask) => {
    setTasks(
      tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };
  
  // Handle removing a task
  const handleRemoveTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };
  
  // Handle saving all tasks
  const handleSaveTasks = () => {
    // Here you would dispatch an action to save tasks to the estimate
    // For now, just move to the next step
    setCurrentStep(3);
  };
  
  // Handle going back to previous step
  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Handle finishing the estimate process
  const handleFinish = () => {
    // Navigate to the estimates dashboard
    navigate(PATHS.ESTIMATES);
  };

  // Render the project information step
  const renderProjectInfoStep = () => {
    return (
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Project Type
          </label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="projectType"
                value="existing"
                checked={formData.projectType === "existing"}
                onChange={handleChange}
                className="form-radio h-4 w-4 text-blue-500"
              />
              <span className="ml-2">Existing Project</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="projectType"
                value="new"
                checked={formData.projectType === "new"}
                onChange={handleChange}
                className="form-radio h-4 w-4 text-blue-500"
              />
              <span className="ml-2">New Project</span>
            </label>
          </div>
        </div>

        {formData.projectType === "existing" ? (
          <div className="mb-6">
            <label 
              htmlFor="projectId" 
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              id="projectId"
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                validationErrors.projectId ? "border-red-500" : "border-slate-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={loading || projectsLoading}
            >
              <option value="">-- Select a project --</option>
              {projectsForSelection.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_name}
                  {project.project_completed_at ? " (Completed)" : ""}
                </option>
              ))}
            </select>
            {validationErrors.projectId && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.projectId}</p>
            )}
            {projectsLoading && (
              <p className="mt-1 text-sm text-slate-500">Loading projects...</p>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <label 
              htmlFor="projectName" 
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="projectName"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                validationErrors.projectName ? "border-red-500" : "border-slate-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter project name"
              disabled={loading}
            />
            {validationErrors.projectName && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.projectName}</p>
            )}
          </div>
        )}

        <div className="mb-6">
          <label 
            htmlFor="clientName" 
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Client Name <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            id="clientName"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter client name"
            disabled={loading}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(PATHS.ESTIMATES)}
            className="px-4 py-2 mr-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            disabled={loading || projectsLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center ${
              loading || projectsLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={loading || projectsLoading}
          >
            {loading || projectsLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                Continue to Tasks
              </>
            )}
          </button>
        </div>
      </form>
    );
  };
  
  // Render the tasks step
  const renderTasksStep = () => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Add Tasks</h2>
        <p className="text-slate-600 mb-6">
          Add tasks for this estimate. Each task can have multiple sections.
        </p>
        
        {tasks.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-8 text-center mb-6">
            <p className="text-slate-500 mb-4">No tasks added yet</p>
            <button
              type="button"
              onClick={handleAddTask}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center mx-auto"
            >
              <FiPlusCircle className="mr-2" />
              Add Your First Task
            </button>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {tasks.map((task) => (
              <EstimateTaskForm
                key={task.id}
                task={task}
                onUpdate={handleUpdateTask}
                onDelete={handleRemoveTask}
              />
            ))}
            
            <button
              type="button"
              onClick={handleAddTask}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center"
            >
              <FiPlusCircle className="mr-2" />
              Add Another Task
            </button>
          </div>
        )}
        
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={handlePrevStep}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Back
          </button>
          <div>
            <button
              type="button"
              onClick={() => navigate(PATHS.ESTIMATES)}
              className="px-4 py-2 mr-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Save & Exit
            </button>
            <button
              type="button"
              onClick={handleSaveTasks}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center"
              disabled={tasks.length === 0}
            >
              <FiSave className="mr-2" />
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the review step
  const renderReviewStep = () => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Review Estimate</h2>
        <p className="text-slate-600 mb-6">
          Review your estimate details before finalizing.
        </p>
        
        <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
          <h3 className="font-medium text-lg mb-4">Project Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-slate-500">Project Name</p>
              <p className="font-medium">
                {formData.projectType === "new" 
                  ? formData.projectName 
                  : projectsForSelection.find(p => p.project_id === formData.projectId)?.project_name || ""}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Client Name</p>
              <p className="font-medium">{formData.clientName || "N/A"}</p>
            </div>
          </div>
          
          <h3 className="font-medium text-lg mb-4">Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-slate-500">No tasks added</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div key={task.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <p className="font-medium">Task {index + 1}: {task.name || "Untitled Task"}</p>
                  {task.sections && task.sections.length > 0 ? (
                    <div className="ml-4 mt-2">
                      <p className="text-sm text-slate-700">{task.sections.length} section(s):</p>
                      <ul className="list-disc list-inside mt-1">
                        {task.sections.map((section, sectionIndex) => (
                          <li key={sectionIndex} className="text-sm text-slate-600">
                            {section.style} - {section.cabinetInterior}
                            {section.material && <span className="text-xs text-slate-500 ml-1">({section.material})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 ml-4 mt-1">No sections added</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={handlePrevStep}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Back to Tasks
          </button>
          <div>
            <button
              type="button"
              onClick={() => navigate(PATHS.ESTIMATES)}
              className="px-4 py-2 mr-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 flex items-center"
            >
              <FiSave className="mr-2" />
              Finalize Estimate
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderProjectInfoStep();
      case 2:
        return renderTasksStep();
      case 3:
        return renderReviewStep();
      default:
        return renderProjectInfoStep();
    }
  };
  
  // Render step indicators
  const renderStepIndicators = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div 
              className={`rounded-full h-8 w-8 flex items-center justify-center ${
                currentStep === step 
                  ? "bg-blue-500 text-white" 
                  : currentStep > step 
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-700"
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div 
                className={`h-1 w-12 ${
                  currentStep > step ? "bg-green-500" : "bg-slate-200"
                }`}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-800 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => currentStep === 1 ? navigate(PATHS.ESTIMATES) : handlePrevStep()}
              className="mr-4 text-slate-600 hover:text-slate-800"
              aria-label="Go back"
            >
              <FiArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">
              {currentStep === 1 ? "New Estimate" : 
               currentStep === 2 ? "Add Tasks" : 
               "Review Estimate"}
            </h1>
          </div>

          {(error || projectsError) && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error || projectsError}
            </div>
          )}
          
          {renderStepIndicators()}
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};

export default NewEstimateForm;
