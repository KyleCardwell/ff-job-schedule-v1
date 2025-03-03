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

  const handleEmployeeTypeChange = (id, field, value) => {
    setEmployeeTypes(prev => 
      prev.map(type => 
        type.id === id ? { ...type, [field]: value } : type
      )
    );
    if (errors.employeeTypes) {
      setErrors(prev => ({ ...prev, employeeTypes: null }));
    }
  };

  const handleRemoveEmployeeType = (id) => {
    setEmployeeTypes(prev => prev.filter(type => type.id !== id));
  };

  const handleAddEmployeeType = () => {
    setEmployeeTypes(prev => [...prev, { id: uuidv4(), name: '', rate: 0 }]);
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
        if (typeof type === 'string') {
          return { id: uuidv4(), name: type, rate: 0 }; // Convert old string format
        }
        return { ...type, rate: type.rate || 0 }; // Keep existing object format with rate
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
          name: type.name.trim(),
          rate: type.rate
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
        if (typeof type === 'string') {
          return { id: uuidv4(), name: type, rate: 0 }; // Convert old string format
        }
        return { ...type, rate: type.rate || 0 }; // Keep existing object format with rate
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

          <div className="space-y-4 mb-4">
            <h3 className="text-lg font-semibold">Employee Types</h3>
            {errors.employeeTypes && (
              <p className="text-sm text-red-500">{errors.employeeTypes}</p>
            )}
            <div className="flex flex-col items-center">
              <div className="grid grid-cols-[20ch_15ch_5ch] gap-2 mb-2">
                <label className="block text-sm font-bold text-gray-700">Category</label>
                <label className="block text-sm font-bold text-gray-700">Hourly Rate</label>
                <div></div>
              </div>
              {employeeTypes.map((type) => (
                <div key={type.id} className="grid grid-cols-[20ch_15ch_5ch] gap-2 mb-2">
                  <input
                    type="text"
                    value={type.name}
                    onChange={(e) => handleEmployeeTypeChange(type.id, "name", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[20ch]"
                  />
                  <input
                    type="number"
                    value={type.rate || ""}
                    onChange={(e) => handleEmployeeTypeChange(type.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm max-w-[15ch]"
                  />
                  <button
                    onClick={() => handleRemoveEmployeeType(type.id)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <svg className="h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddEmployeeType}
                className="mt-2 inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Add Employee Type
              </button>
            </div>
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
