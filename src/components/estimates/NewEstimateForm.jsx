import { isEqual } from "lodash";
import { useState, useEffect } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";

import {
  createEstimateProject,
  createEstimate,
  fetchEstimateById,
  updateEstimateProject,
} from "../../redux/actions/estimates";

import EstimateTaskForm from "./EstimateTaskForm.jsx";

const STEPS = {
  PROJECT_INFO: 1,
  TASKS: 2,
  REVIEW: 3,
};

const NewEstimateForm = () => {
  const dispatch = useDispatch();
  const { estimateId } = useParams();

  const [currentStep, setCurrentStep] = useState(STEPS.PROJECT_INFO);
  const [projectData, setProjectData] = useState({
    est_project_name: "",
    est_client_name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  const [errors, setErrors] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userNavigatedToStep3, setUserNavigatedToStep3] = useState(false);

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const loading = useSelector((state) => state.estimates.loading);
  const error = useSelector((state) => state.estimates.error);

  useEffect(() => {
    if (estimateId && !dataLoaded) {
      loadEstimateData();
    }
  }, [estimateId, dataLoaded]);

  const loadEstimateData = async () => {
    try {
      const estimate = await dispatch(fetchEstimateById(estimateId));
      if (estimate) {
        setProjectData({
          est_project_name: estimate.est_project_name,
          est_client_name: estimate.est_client_name,
          street: estimate.street,
          city: estimate.city,
          state: estimate.state,
          zip: estimate.zip,
        });
        setDataLoaded(true);
      }
    } catch (error) {
      console.error("Error loading estimate:", error);
    }
  };

  const validateProjectInfo = () => {
    const newErrors = {};

    if (!projectData.est_project_name.trim()) {
      newErrors.est_project_name = "Project name is required";
    }

    if (!projectData.est_client_name.trim()) {
      newErrors.est_client_name = "Client name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProjectDataChange = (e) => {
    const { name, value } = e.target;
    setProjectData({
      ...projectData,
      [name]: value,
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleContinue = async () => {
    if (currentStep === STEPS.PROJECT_INFO) {
      if (validateProjectInfo()) {
        try {
          if (!estimateId) {
            // Create new estimate project and estimate
            const estimateProject = await dispatch(
              createEstimateProject(projectData),
            );
            const estimate = await dispatch(
              createEstimate(estimateProject.est_project_id),
            );
            if (estimate) {
              setCurrentStep(STEPS.TASKS);
            }
          } else {
            // For existing estimate, check if project data has changed
            const originalProjectData = {
              est_project_name: currentEstimate.est_project_name,
              est_client_name: currentEstimate.est_client_name,
              street: currentEstimate.street,
              city: currentEstimate.city,
              state: currentEstimate.state,
              zip: currentEstimate.zip,
            };

            // Only update if data has changed
            if (!isEqual(originalProjectData, projectData)) {
              await dispatch(
                updateEstimateProject(estimateId, {
                  ...projectData,
                  est_project_id: currentEstimate.est_project_id,
                }),
              );
            }
            setCurrentStep(STEPS.TASKS);
          }
        } catch (error) {
          console.error("Error updating estimate:", error);
        }
      }
    } else if (currentStep === STEPS.TASKS) {
      setCurrentStep(STEPS.REVIEW);
      setUserNavigatedToStep3(true);
    }
  };

  const handleBack = () => {
    if (currentStep > STEPS.PROJECT_INFO) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {estimateId ? "Edit Estimate" : "New Estimate"}
      </h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {["Project Info", "Tasks", "Review"].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === index + 1
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep === index + 1 ? "text-blue-500" : "text-gray-500"
                }`}
              >
                {stepName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        {currentStep === STEPS.PROJECT_INFO && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Project Information</h2>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="est_project_name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="est_project_name"
                    name="est_project_name"
                    value={projectData.est_project_name}
                    onChange={handleProjectDataChange}
                    className={`p-2 border border-gray-300 rounded-md ${
                      errors.est_project_name ? "border-red-500" : ""
                    }`}
                  />
                  {errors.est_project_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.est_project_name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="est_client_name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Client Name
                  </label>
                  <input
                    type="text"
                    id="est_client_name"
                    name="est_client_name"
                    value={projectData.est_client_name}
                    onChange={handleProjectDataChange}
                    className={`p-2 border border-gray-300 rounded-md ${
                      errors.est_client_name ? "border-red-500" : ""
                    }`}
                  />
                  {errors.est_client_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.est_client_name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="street"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Street
                </label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={projectData.street}
                  onChange={handleProjectDataChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={projectData.city}
                    onChange={handleProjectDataChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label
                    htmlFor="state"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={projectData.state}
                    onChange={handleProjectDataChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="zip"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={projectData.zip}
                  onChange={handleProjectDataChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === STEPS.TASKS && (
          <EstimateTaskForm
            estimateId={estimateId || currentEstimate?.estimate_id}
            onSave={() => {}}
          />
        )}

        {/* {currentStep === STEPS.REVIEW && (
          // <EstimateReview
          //   estimate={currentEstimate}
          //   onApprove={() => {}}
          //   onEdit={() => setCurrentStep(STEPS.TASKS)}
          // />
        )} */}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === STEPS.PROJECT_INFO}
          className={`px-4 py-2 flex items-center ${
            currentStep === STEPS.PROJECT_INFO
              ? "text-gray-400 cursor-not-allowed"
              : "text-blue-600 hover:text-blue-700"
          }`}
        >
          <FiArrowLeft className="mr-2" />
          Back
        </button>

        {currentStep < STEPS.REVIEW && (
          <button
            type="button"
            onClick={handleContinue}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            Continue
            <FiArrowRight className="ml-2" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NewEstimateForm;
