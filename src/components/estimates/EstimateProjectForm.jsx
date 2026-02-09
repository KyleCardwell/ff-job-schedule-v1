import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  updateEstimateProject,
  createEstimateProject,
  createEstimate,
} from "../../redux/actions/estimates";

const EstimateProjectForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const [errors, setErrors] = useState({});
  const [projectData, setProjectData] = useState({
    est_project_name: "",
    est_client_name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (currentEstimate) {
      setProjectData({
        est_project_name: currentEstimate.est_project_name || "",
        est_client_name: currentEstimate.est_client_name || "",
        street: currentEstimate.street || "",
        city: currentEstimate.city || "",
        state: currentEstimate.state || "",
        zip: currentEstimate.zip || "",
      });
    }
  }, [currentEstimate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!projectData.est_project_name.trim()) {
      newErrors.est_project_name = "Project name is required";
    }
    // if (!projectData.est_client_name.trim()) {
    //   newErrors.est_client_name = "Client name is required";
    // }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (currentEstimate?.est_project_id) {
        // Update existing project
        await dispatch(
          updateEstimateProject(currentEstimate.est_project_id, {
            ...projectData,
            est_project_id: currentEstimate.est_project_id,
          }),
        );
      } else {
        // Create new project
        const estimateProject = await dispatch(
          createEstimateProject(projectData),
        );
        const newEstimate = await dispatch(
          createEstimate(estimateProject.est_project_id),
        );
        // Navigate to the in-progress estimate
        navigate(`/estimates/in-progress/${newEstimate.estimate_id}`);
      }
    } catch (error) {
      console.error("Error saving project information:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-8">
        <div>
          <label
            htmlFor="est_client_name"
            className="block text-sm font-medium text-slate-200"
          >
            Client Name
          </label>
          <input
            type="text"
            id="est_client_name"
            name="est_client_name"
            value={projectData.est_client_name}
            onChange={handleInputChange}
            className={`mt-1 h-9 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.est_client_name ? "border-red-500" : ""
            }`}
          />
          {errors.est_client_name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.est_client_name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label
              htmlFor="est_project_name"
              className="block text-sm font-medium text-slate-200"
            >
              Project Name*
            </label>
            <input
              type="text"
              id="est_project_name"
              name="est_project_name"
              value={projectData.est_project_name}
              onChange={handleInputChange}
              className={`mt-1 h-9 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.est_project_name ? "border-red-500" : ""
              }`}
            />
            {errors.est_project_name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.est_project_name}
              </p>
            )}
          </div>

          <div className="col-span-2">
            <label
              htmlFor="street"
              className="block text-sm font-medium text-slate-200"
            >
              Street Address
            </label>
            <input
              type="text"
              id="street"
              name="street"
              value={projectData.street}
              onChange={handleInputChange}
              className="mt-1 h-9 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="col-span-2">
            <label
              htmlFor="city"
              className="text-sm font-medium text-slate-200"
            >
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={projectData.city}
              onChange={handleInputChange}
              className="mt-1 h-9 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="text-sm font-medium text-slate-200"
            >
              State
            </label>
            <input
              type="text"
              id="state"
              name="state"
              value={projectData.state}
              onChange={handleInputChange}
              className="mt-1 h-9 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="zip" className="text-sm font-medium text-slate-200">
              ZIP Code
            </label>
            <input
              type="text"
              id="zip"
              name="zip"
              value={projectData.zip}
              onChange={handleInputChange}
              className="mt-1 h-9 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default EstimateProjectForm;
