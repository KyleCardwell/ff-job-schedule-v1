import React, { useState } from "react";
import { FiSave, FiX } from "react-icons/fi";

// Constants for dropdown options
const STYLE_OPTIONS = ["Euro", "Face Frame", "Furniture"];
const CABINET_INTERIOR_OPTIONS = ["White Melamine", "Maple", "UV Clear", "Stained", "Custom"];
const MATERIAL_OPTIONS = ["Maple", "Cherry", "Walnut", "Oak", "Birch", "MDF", "Custom"];
const FINISH_OPTIONS = ["Clear Coat", "Stain", "Paint", "Distressed", "Glazed", "Custom"];
const DOOR_STYLE_OPTIONS = ["Shaker", "Raised Panel", "Flat Panel", "Slab", "Inset", "Custom"];
const DRAWER_BOX_OPTIONS = ["Dovetail", "Doweled", "Melamine", "Metal", "Custom"];

const EstimateSectionForm = ({ section = {}, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    style: section.style || "",
    cabinetInterior: section.cabinetInterior || "",
    material: section.material || "",
    finish: section.finish || [],
    doorStyle: section.doorStyle || "",
    drawerBoxes: section.drawerBoxes || "",
    notes: section.notes || "",
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };
  
  const handleFinishChange = (option) => {
    const updatedFinish = [...formData.finish];
    
    if (updatedFinish.includes(option)) {
      // Remove option if already selected
      const index = updatedFinish.indexOf(option);
      updatedFinish.splice(index, 1);
    } else {
      // Add option if not already selected
      updatedFinish.push(option);
    }
    
    setFormData({
      ...formData,
      finish: updatedFinish,
    });
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.style) {
      newErrors.style = "Style is required";
    }
    
    if (!formData.cabinetInterior) {
      newErrors.cabinetInterior = "Cabinet interior is required";
    }
    
    if (!formData.material) {
      newErrors.material = "Material is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };
  
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-4">
      <h4 className="text-sm font-medium text-slate-700 mb-3">Section Details</h4>
      
      <form onSubmit={handleSubmit}>
        {/* Style */}
        <div className="mb-3">
          <label htmlFor="style" className="block text-xs font-medium text-slate-700 mb-1">
            Style <span className="text-red-500">*</span>
          </label>
          <select
            id="style"
            name="style"
            value={formData.style}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm border ${
              errors.style ? "border-red-500" : "border-slate-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">-- Select Style --</option>
            {STYLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.style && (
            <p className="mt-1 text-xs text-red-500">{errors.style}</p>
          )}
        </div>
        
        {/* Cabinet Interior */}
        <div className="mb-3">
          <label htmlFor="cabinetInterior" className="block text-xs font-medium text-slate-700 mb-1">
            Cabinet Interior <span className="text-red-500">*</span>
          </label>
          <select
            id="cabinetInterior"
            name="cabinetInterior"
            value={formData.cabinetInterior}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm border ${
              errors.cabinetInterior ? "border-red-500" : "border-slate-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">-- Select Cabinet Interior --</option>
            {CABINET_INTERIOR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.cabinetInterior && (
            <p className="mt-1 text-xs text-red-500">{errors.cabinetInterior}</p>
          )}
        </div>
        
        {/* Material */}
        <div className="mb-3">
          <label htmlFor="material" className="block text-xs font-medium text-slate-700 mb-1">
            Material <span className="text-red-500">*</span>
          </label>
          <select
            id="material"
            name="material"
            value={formData.material}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm border ${
              errors.material ? "border-red-500" : "border-slate-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">-- Select Material --</option>
            {MATERIAL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.material && (
            <p className="mt-1 text-xs text-red-500">{errors.material}</p>
          )}
        </div>
        
        {/* Finish (Checkbox List) */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Finish
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FINISH_OPTIONS.map((option) => (
              <label key={option} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.finish.includes(option)}
                  onChange={() => handleFinishChange(option)}
                  className="form-checkbox h-4 w-4 text-blue-500"
                />
                <span className="ml-2 text-xs">{option}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Door Style */}
        <div className="mb-3">
          <label htmlFor="doorStyle" className="block text-xs font-medium text-slate-700 mb-1">
            Door Style
          </label>
          <select
            id="doorStyle"
            name="doorStyle"
            value={formData.doorStyle}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Door Style --</option>
            {DOOR_STYLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        
        {/* Drawer Boxes */}
        <div className="mb-3">
          <label htmlFor="drawerBoxes" className="block text-xs font-medium text-slate-700 mb-1">
            Drawer Boxes
          </label>
          <select
            id="drawerBoxes"
            name="drawerBoxes"
            value={formData.drawerBoxes}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Drawer Boxes --</option>
            {DRAWER_BOX_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        
        {/* Notes */}
        <div className="mb-4">
          <label htmlFor="notes" className="block text-xs font-medium text-slate-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional details..."
          />
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center"
          >
            <FiX className="mr-1" size={12} />
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 flex items-center"
          >
            <FiSave className="mr-1" size={12} />
            Save Section
          </button>
        </div>
      </form>
    </div>
  );
};

export default EstimateSectionForm;
