import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { ESTIMATE_STATUS, PATHS } from "../../utils/constants";
import { 
  createEstimate, 
  fetchProjectsForSelection, 
  createProjectForEstimate,
  setCurrentEstimate
} from "../../redux/actions/estimates";

const NewEstimateForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { 
    loading, 
    error, 
    projectsForSelection, 
    projectsLoading, 
    projectsError 
  } = useSelector((state) => state.estimates);
  
  // Form state
  const [formData, setFormData] = useState({
    projectType: "existing", // 'existing' or 'new'
    projectId: "",
    projectName: "",
    clientName: "",
  });
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
        
        // Navigate to the estimates dashboard on success
        navigate(PATHS.ESTIMATES);
      } catch (err) {
        console.error("Failed to create estimate:", err);
        // Error is already handled by the action and will be in the Redux state
      }
    }
  };

  return (
    <div className="bg-slate-800 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate(PATHS.ESTIMATES)}
              className="mr-4 text-slate-600 hover:text-slate-800"
              aria-label="Go back"
            >
              <FiArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">New Estimate</h1>
          </div>

          {(error || projectsError) && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error || projectsError}
            </div>
          )}

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
                    Save and Continue
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewEstimateForm;
