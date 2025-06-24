import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { PATHS } from "../../utils/constants";
import { createEstimate } from "../../redux/actions/estimates";

const NewEstimateForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.estimates);
  
  const [formData, setFormData] = useState({
    projectName: "",
    clientName: "",
  });
  const [validationErrors, setValidationErrors] = useState({});

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
    
    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }
    
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        // Transform form data to match the database schema
        const estimateData = {
          project_name: formData.projectName,
          client_name: formData.clientName || null,
          status: 'new',
        };
        
        // Dispatch the create estimate action
        await dispatch(createEstimate(estimateData));
        
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

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                {loading ? (
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
