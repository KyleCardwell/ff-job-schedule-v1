import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  buttonClass,
  modalContainerClass,
  modalOverlayClass,
} from "../assets/tailwindConstants";
import { saveSettings } from "../redux/actions/chartConfig";
import { GridLoader } from "react-spinners";
import { v4 as uuidv4 } from 'uuid';

const ChartSettingsModal = ({ isOpen, onClose, onDatabaseError }) => {
  const dispatch = useDispatch();
  const chartConfig = useSelector((state) => state.chartConfig);
  const [settings, setSettings] = useState({});
  const [employeeTypes, setEmployeeTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const validateSettings = () => {
    const newErrors = {};
    const { nextTaskNumber, minTaskNumber, maxTaskNumber } = settings;

    if (
      !nextTaskNumber ||
      nextTaskNumber < minTaskNumber ||
      nextTaskNumber > maxTaskNumber
    ) {
      newErrors.nextTaskNumber =
        "Next task number must be between min and max values";
    }

    if (!minTaskNumber || minTaskNumber < 0) {
      newErrors.minTaskNumber = "Min task number must be 0 or greater";
    }

    if (!maxTaskNumber || maxTaskNumber <= minTaskNumber) {
      newErrors.maxTaskNumber =
        "Max task number must be greater than min task number";
    }

    // Validate employee types
    const duplicateTypes = employeeTypes.filter(
      (type, index) => 
        employeeTypes.findIndex(t => t.name.toLowerCase() === type.name.toLowerCase()) !== index
    );
    
    if (duplicateTypes.length > 0) {
      newErrors.employeeTypes = "Duplicate employee types are not allowed";
    }

    const emptyTypes = employeeTypes.some(type => !type.name.trim());
    if (emptyTypes) {
      newErrors.employeeTypes = "Empty employee types are not allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);

    setSettings((prev) => ({
      ...prev,
      [name]: numValue,
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleEmployeeTypeChange = (id, name) => {
    setEmployeeTypes(prev => 
      prev.map(type => 
        type.id === id ? { ...type, name } : type
      )
    );
    if (errors.employeeTypes) {
      setErrors(prev => ({ ...prev, employeeTypes: null }));
    }
  };

  const handleAddEmployeeType = () => {
    setEmployeeTypes(prev => [...prev, { id: uuidv4(), name: '' }]);
  };

  const handleCancel = () => {
    // Reset settings to original values
    setSettings({
      nextTaskNumber: chartConfig.next_task_number,
      minTaskNumber: chartConfig.min_task_number,
      maxTaskNumber: chartConfig.max_task_number,
    });
    setEmployeeTypes(
      (chartConfig.employee_type || []).map(type => {
        return typeof type === 'string' 
          ? { id: uuidv4(), name: type } // Convert old string format
          : type; // Keep existing object format
      })
    );
    // Clear any errors
    setErrors({});
    onClose();
  };

  const handleSave = async () => {
    if (!validateSettings()) return;

    try {
      setIsSaving(true);
      await dispatch(saveSettings({
        ...settings,
        employee_type: employeeTypes.map(type => ({
          id: type.id,
          name: type.name.trim()
        }))
      }));
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      onDatabaseError("Failed to save settings. Please try again.");
      setErrors((prev) => ({
        ...prev,
        save: "Failed to save settings. Please try again.",
      }));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setSettings({
      nextTaskNumber: chartConfig.next_task_number,
      minTaskNumber: chartConfig.min_task_number,
      maxTaskNumber: chartConfig.max_task_number,
    });
    // Initialize from existing types, preserving their ids if they exist
    setEmployeeTypes(
      (chartConfig.employee_type || []).map(type => {
        return typeof type === 'string' 
          ? { id: uuidv4(), name: type } // Convert old string format
          : type; // Keep existing object format
      })
    );
  }, [chartConfig]);

  if (!isOpen) return null;

  return (
    <div className={modalOverlayClass}>
      <div className={modalContainerClass}>
        {isSaving && (
          <div className="loading-overlay absolute inset-0 bg-gray-200 bg-opacity-80 flex flex-col justify-center items-center z-[120]">
            <GridLoader color="maroon" size={15} />
            <p>Saving Tasks...</p>
          </div>
        )}
        <h2 className="text-xl font-bold mb-4">Chart Settings</h2>

        <div className="space-y-4">
          <div className="flex flex-row gap-4 w-full justify-center">
            <div className="flex flex-col">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Next Task Number
              </label>
              <input
                type="text"
                placeholder="Enter next task number"
                name="nextTaskNumber"
                value={settings.nextTaskNumber || ""}
                onChange={handleInputChange}
                className={`mt-1 block pl-2 rounded-md border-gray-500 shadow-md focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.nextTaskNumber ? "border-red-500" : ""
                }`}
              />
              {errors.nextTaskNumber && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.nextTaskNumber}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
            <div className="">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Min Task Number
              </label>
              <input
                type="text"
                name="minTaskNumber"
                value={settings.minTaskNumber || ""}
                onChange={handleInputChange}
                className={`mt-1 block pl-2 rounded-md border-gray-500 shadow-md focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.minTaskNumber ? "border-red-500" : ""
                }`}
              />
              {errors.minTaskNumber && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.minTaskNumber}
                </p>
              )}
            </div>
            <div className="">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Max Task Number
              </label>
              <input
                type="text"
                name="maxTaskNumber"
                value={settings.maxTaskNumber || ""}
                onChange={handleInputChange}
                className={`mt-1 block pl-2 rounded-md border-gray-500 shadow-md focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.maxTaskNumber ? "border-red-500" : ""
                }`}
              />
              {errors.maxTaskNumber && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.maxTaskNumber}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Employee Types
            </label>
            {employeeTypes.map((type) => (
              <div key={type.id} className="flex flex-row gap-2">
                <input
                  type="text"
                  value={type.name}
                  onChange={(e) => handleEmployeeTypeChange(type.id, e.target.value)}
                  placeholder="Enter employee type"
                  className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <button
              onClick={handleAddEmployeeType}
              className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Employee Type
            </button>
            {errors.employeeTypes && (
              <p className="mt-1 text-sm text-red-500">
                {errors.employeeTypes}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-between space-x-3">
          <button
            onClick={handleCancel}
            className={`${buttonClass} bg-red-500`}
          >
            Cancel
          </button>
          <button onClick={handleSave} className={`${buttonClass} bg-blue-500`}>
            Save
          </button>
        </div>
        {errors.save && (
          <div className="text-red-500 text-sm mt-2">{errors.save}</div>
        )}
      </div>
    </div>
  );
};

export default ChartSettingsModal;
