import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  updateEstimateProject,
  createEstimateProject,
  createEstimate,
  fetchEstimateProjects,
} from "../../redux/actions/estimates";
import { PATHS } from "../../utils/constants";

const EstimateProjectForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const estimateProjectsList = useSelector(
    (state) => state.estimates.estimateProjectsList,
  );
  const estimateProjectsLoading = useSelector(
    (state) => state.estimates.estimateProjectsLoading,
  );
  const [errors, setErrors] = useState({});
  const [mode, setMode] = useState("new");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectsLoadError, setProjectsLoadError] = useState("");
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

  useEffect(() => {
    if (!currentEstimate?.est_project_id) {
      setProjectsLoadError("");
      dispatch(fetchEstimateProjects()).catch((error) => {
        setProjectsLoadError(error?.message || "Failed to load estimate projects");
      });
    }
  }, [dispatch, currentEstimate?.est_project_id]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return estimateProjectsList;
    }

    return estimateProjectsList.filter((project) => {
      const projectName = (project.est_project_name || "").toLowerCase();
      const clientName = (project.est_client_name || "").toLowerCase();

      return (
        projectName.includes(normalizedSearch) ||
        clientName.includes(normalizedSearch)
      );
    });
  }, [estimateProjectsList, searchTerm]);

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

    try {
      if (currentEstimate?.est_project_id) {
        if (!validateForm()) return;

        // Update existing project
        await dispatch(
          updateEstimateProject(currentEstimate.est_project_id, {
            ...projectData,
            est_project_id: currentEstimate.est_project_id,
          }),
        );
      } else if (mode === "existing") {
        if (!selectedProjectId) return;

        const newEstimate = await dispatch(createEstimate(selectedProjectId));
        navigate(`${PATHS.IN_PROGRESS_ESTIMATES}/${newEstimate.estimate_id}`);
      } else {
        if (!validateForm()) return;

        // Create new project
        const estimateProject = await dispatch(
          createEstimateProject(projectData),
        );
        const newEstimate = await dispatch(
          createEstimate(estimateProject.est_project_id),
        );
        // Navigate to the in-progress estimate
        navigate(`${PATHS.IN_PROGRESS_ESTIMATES}/${newEstimate.estimate_id}`);
      }
    } catch (error) {
      console.error("Error saving project information:", error);
    }
  };

  const isEditMode = Boolean(currentEstimate?.est_project_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isEditMode && (
        <div className="inline-flex rounded-lg border border-slate-600 bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "new"
                ? "bg-teal-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            New Project
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "existing"
                ? "bg-teal-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Existing Project
          </button>
        </div>
      )}

      {isEditMode || mode === "new" ? (
        <>
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
        </>
      ) : (
        <>
          <div>
            <label
              htmlFor="existing-project-search"
              className="block text-sm font-medium text-slate-200"
            >
              Existing Estimate Projects
            </label>
            <input
              id="existing-project-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search project or client..."
              className="mt-1 h-9 p-2 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-slate-600 bg-slate-900">
            {estimateProjectsLoading ? (
              <div className="p-3 text-sm text-slate-300">Loading projects...</div>
            ) : projectsLoadError ? (
              <div className="p-3 text-sm text-red-400">{projectsLoadError}</div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-3 text-sm text-slate-300">No projects found.</div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = selectedProjectId === project.est_project_id;

                return (
                  <button
                    key={project.est_project_id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.est_project_id)}
                    className={`w-full border-b border-slate-700 px-3 py-2 text-left transition-colors last:border-b-0 ${
                      isSelected
                        ? "bg-teal-700/40 text-teal-100"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="font-medium">{project.est_project_name || "Untitled Project"}</div>
                    <div className="text-xs text-slate-400">
                      {project.est_client_name || "No client name"}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedProjectId}
              className="inline-flex justify-center rounded-md border border-transparent bg-teal-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Estimate
            </button>
          </div>
        </>
      )}
    </form>
  );
};

export default EstimateProjectForm;
