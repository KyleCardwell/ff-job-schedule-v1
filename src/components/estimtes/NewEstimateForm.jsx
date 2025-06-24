import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { PATHS } from "../../utils/constants";

const NewEstimateForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    projectName: "",
    clientName: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // TODO: Save the estimate data to your state management or database
      console.log("Form submitted:", formData);
      
      // Navigate to the next step or back to estimates dashboard
      // For now, we'll just go back to the dashboard
      navigate(PATHS.ESTIMATES);
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
                  errors.projectName ? "border-red-500" : "border-slate-300"
                } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter project name"
              />
              {errors.projectName && (
                <p className="mt-1 text-sm text-red-500">{errors.projectName}</p>
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
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate(PATHS.ESTIMATES)}
                className="px-4 py-2 mr-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center"
              >
                <FiSave className="mr-2" />
                Save and Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewEstimateForm;
