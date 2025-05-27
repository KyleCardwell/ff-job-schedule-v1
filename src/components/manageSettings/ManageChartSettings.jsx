import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { GridLoader } from "react-spinners";
import { v4 as uuidv4 } from "uuid";
import { buttonClass } from "../../assets/tailwindConstants";
import { saveSettings } from "../../redux/actions/chartConfig";
import SettingsSection from "./SettingsSection";
import SettingsList from "./SettingsList";
import SettingsItem from "./SettingsItem";

const ManageChartSettings = () => {
  const dispatch = useDispatch();
  const chartConfig = useSelector((state) => state.chartConfig);
  const [settings, setSettings] = useState({});
  const [employeeTypes, setEmployeeTypes] = useState([]);
  const [estimateSections, setEstimateSections] = useState([]);
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
    if (!employeeTypes || employeeTypes.length < 1) {
      newErrors.employeeTypes = "At least one employee type is required";
    } else {
      const duplicateTypes = employeeTypes.filter(
        (type, index) =>
          employeeTypes.findIndex(
            (t) => t.name.toLowerCase() === type.name.toLowerCase()
          ) !== index
      );

      if (duplicateTypes.length > 0) {
        newErrors.employeeTypes = "Duplicate employee types are not allowed";
      }

      const emptyTypes = employeeTypes.some((type) => !type.name.trim());
      if (emptyTypes) {
        newErrors.employeeTypes = "Empty employee types are not allowed";
      }
    }

    // Validate estimate sections
    if (estimateSections.length > 0) {
      const duplicateSections = estimateSections.filter(
        (section, index) =>
          estimateSections.findIndex(
            (s) => s.name.toLowerCase() === section.name.toLowerCase()
          ) !== index
      );

      if (duplicateSections.length > 0) {
        newErrors.estimateSections = "Duplicate sections are not allowed";
      }

      const emptySections = estimateSections.some(
        (section) => !section.name.trim()
      );
      if (emptySections) {
        newErrors.estimateSections = "Empty sections are not allowed";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numValue = [
      "nextTaskNumber",
      "minTaskNumber",
      "maxTaskNumber",
    ].includes(name)
      ? parseInt(value, 10)
      : value;

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
    setEmployeeTypes((prev) =>
      prev.map((type) => (type.id === id ? { ...type, [field]: value } : type))
    );
    if (errors.employeeTypes) {
      setErrors((prev) => ({ ...prev, employeeTypes: null }));
    }
  };

  const handleRemoveEmployeeType = (id) => {
    setEmployeeTypes((prev) => prev.filter((type) => type.id !== id));
  };

  const handleAddEmployeeType = () => {
    setEmployeeTypes((prev) => [...prev, { id: uuidv4(), name: "", rate: 0 }]);
  };

  const handleEstimateSectionChange = (id, value) => {
    setEstimateSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, name: value } : section
      )
    );
    if (errors.estimateSections) {
      setErrors((prev) => ({ ...prev, estimateSections: null }));
    }
  };

  const handleRemoveEstimateSection = (id) => {
    setEstimateSections((prev) => prev.filter((section) => section.id !== id));
  };

  const handleAddEstimateSection = () => {
    setEstimateSections((prev) => [...prev, { id: uuidv4(), name: "" }]);
  };

  const handleCancel = () => {
    // Reset settings to original values
    setSettings({
      nextTaskNumber: chartConfig.next_task_number,
      minTaskNumber: chartConfig.min_task_number,
      maxTaskNumber: chartConfig.max_task_number,
      company_name: chartConfig.company_name,
    });
    setEmployeeTypes(
      (chartConfig.employee_type || []).map((type) => {
        if (typeof type === "string") {
          return { id: uuidv4(), name: type, rate: 0 }; // Convert old string format
        }
        return { ...type, rate: type.rate || 0 }; // Keep existing object format with rate
      })
    );
    setEstimateSections(
      (chartConfig.estimate_sections || []).map((section) => {
        if (typeof section === "string") {
          return { id: uuidv4(), name: section }; // Convert old string format
        }
        return section; // Keep existing object format
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
      await dispatch(
        saveSettings({
          ...settings,
          employee_type: employeeTypes.map((type) => ({
            id: type.id,
            name: type.name.trim(),
            rate: type.rate,
          })),
          estimate_sections: estimateSections.map((section) => ({
            id: section.id,
            name: section.name.trim(),
          })),
        })
      );
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      if (onDatabaseError) {
        onDatabaseError(error);
      }
      setErrors((prev) => ({
        ...prev,
        save: "Failed to save settings",
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
      company_name: chartConfig.company_name,
    });
    // Initialize from existing types, preserving their ids if they exist
    setEmployeeTypes(
      (chartConfig.employee_type || []).map((type) => {
        if (typeof type === "string") {
          return { id: uuidv4(), name: type, rate: 0 }; // Convert old string format
        }
        return { ...type, rate: type.rate || 0 }; // Keep existing object format with rate
      })
    );
    setEstimateSections(
      (chartConfig.estimate_sections || []).map((section) => {
        if (typeof section === "string") {
          return { id: uuidv4(), name: section }; // Convert old string format
        }
        return section; // Keep existing object format
      })
    );
  }, [chartConfig]);

  return (
    <div className="">
      {/* <div className={modalContainerClass}> */}
      {/* {isSaving && (
          <div className="loading-overlay absolute inset-0 bg-gray-200 bg-opacity-80 flex flex-col justify-center items-center z-[120]">
            <GridLoader color="maroon" size={15} />
            <p>Saving Tasks...</p>
          </div>
        )} */}
      {/* <h2 className="text-xl font-bold mb-4">Chart Settings</h2> */}
      
      <SettingsSection 
        title="Company Name" 
        error={errors.company_name}
      >
        <SettingsItem
          type="text"
          label="Company Name"
          value={settings.company_name || ""}
          name="company_name"
          onChange={handleInputChange}
        />
      </SettingsSection>

      <SettingsSection title="Task Numbers">
        <SettingsItem
          type="text"
          label="Next Task Number"
          value={settings.nextTaskNumber || ""}
          name="nextTaskNumber"
          onChange={handleInputChange}
        />
        <SettingsItem
          type="text"
          label="Min Task Number"
          value={settings.minTaskNumber || ""}
          name="minTaskNumber"
          onChange={handleInputChange}
        />
        <SettingsItem
          type="text"
          label="Max Task Number"
          value={settings.maxTaskNumber || ""}
          name="maxTaskNumber"
          onChange={handleInputChange}
        />
      </SettingsSection>

      <SettingsSection title="Employee Types" error={errors.employeeTypes}>
        <SettingsList
          items={employeeTypes}
          columns={[
            { field: 'name', label: 'Category', width: '200px', placeholder: 'Enter category' },
            { field: 'rate', label: 'Hourly Rate', width: '120px', placeholder: 'Enter rate' }
          ]}
          onDelete={handleRemoveEmployeeType}
          onChange={handleEmployeeTypeChange}
          onAdd={handleAddEmployeeType}
        />
      </SettingsSection>

      <SettingsSection title="Estimate Sections" error={errors.estimateSections}>
        <SettingsList
          items={estimateSections}
          columns={[
            { field: 'name', label: 'Section Name', width: '320px', placeholder: 'Enter section name' }
          ]}
          onDelete={handleRemoveEstimateSection}
          onChange={(id, field, value) => handleEstimateSectionChange(id, value)}
          onAdd={handleAddEstimateSection}
        />
      </SettingsSection>

      <div className="mt-6 flex justify-between space-x-3">
        <button onClick={handleCancel} className={`${buttonClass} bg-red-500`}>
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
    // </div>
  );
};

export default ManageChartSettings;
