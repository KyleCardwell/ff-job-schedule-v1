import React, { useState } from "react";
import { FiSave, FiX, FiTrash2 } from "react-icons/fi";

const EstimateSectionItem = ({ item = {}, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    name: item.name || "",
    width: item.width || "",
    height: item.height || "",
    depth: item.depth || "",
    quantity: item.quantity || 1,
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs
    if (["width", "height", "depth", "quantity"].includes(name)) {
      const numValue = value === "" ? "" : Number(value);
      setFormData({
        ...formData,
        [name]: numValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.width) {
      newErrors.width = "Width is required";
    }
    
    if (!formData.height) {
      newErrors.height = "Height is required";
    }
    
    if (!formData.depth) {
      newErrors.depth = "Depth is required";
    }
    
    if (!formData.quantity || formData.quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault(); // Still prevent default if event is passed
    }
    
    if (validateForm()) {
      onSave(formData);
    }
  };
  
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 mb-3">
      <h4 className="text-sm font-medium text-slate-700 mb-3">Cabinet Item</h4>
      
      <div>
        {/* Name */}
        <div className="mb-3">
          <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.name ? "border-red-500" : "border-slate-300"
            } rounded-md text-sm`}
            placeholder="Base Cabinet, Wall Cabinet, etc."
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        
        {/* Dimensions */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Width */}
          <div>
            <label htmlFor="width" className="block text-xs font-medium text-slate-700 mb-1">
              Width (in) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="width"
              name="width"
              value={formData.width}
              onChange={handleChange}
              min="0"
              step="0.125"
              className={`w-full px-3 py-2 border ${
                errors.width ? "border-red-500" : "border-slate-300"
              } rounded-md text-sm`}
            />
            {errors.width && <p className="text-red-500 text-xs mt-1">{errors.width}</p>}
          </div>
          
          {/* Height */}
          <div>
            <label htmlFor="height" className="block text-xs font-medium text-slate-700 mb-1">
              Height (in) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="height"
              name="height"
              value={formData.height}
              onChange={handleChange}
              min="0"
              step="0.125"
              className={`w-full px-3 py-2 border ${
                errors.height ? "border-red-500" : "border-slate-300"
              } rounded-md text-sm`}
            />
            {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
          </div>
          
          {/* Depth */}
          <div>
            <label htmlFor="depth" className="block text-xs font-medium text-slate-700 mb-1">
              Depth (in) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="depth"
              name="depth"
              value={formData.depth}
              onChange={handleChange}
              min="0"
              step="0.125"
              className={`w-full px-3 py-2 border ${
                errors.depth ? "border-red-500" : "border-slate-300"
              } rounded-md text-sm`}
            />
            {errors.depth && <p className="text-red-500 text-xs mt-1">{errors.depth}</p>}
          </div>
        </div>
        
        {/* Quantity */}
        <div className="mb-4">
          <label htmlFor="quantity" className="block text-xs font-medium text-slate-700 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min="1"
            className={`w-full px-3 py-2 border ${
              errors.quantity ? "border-red-500" : "border-slate-300"
            } rounded-md text-sm`}
          />
          {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 flex items-center"
            >
              <FiTrash2 className="mr-1" />
              Delete
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center"
            >
              <FiX className="mr-1" />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center"
          >
            <FiSave className="mr-1" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstimateSectionItem;
