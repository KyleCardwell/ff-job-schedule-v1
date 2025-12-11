import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiEdit2, FiSave, FiX, FiXCircle } from "react-icons/fi";
import { useSelector } from "react-redux";

/**
 * Component for manually adding hours by service type to a section
 * Always visible, with edit/save/cancel functionality
 */
const AddHoursManager = ({ addHours, onSave }) => {
  const services = useSelector((state) => state.services?.allServices || []);
  
  // Filter to active services only
  const activeServices = services.filter((service) => service.is_active);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  
  // Initialize form data from addHours prop
  useEffect(() => {
    if (addHours && typeof addHours === 'object') {
      setFormData({ ...addHours });
    } else {
      // Initialize with zeros for all active services
      const initialData = {};
      activeServices.forEach((service) => {
        initialData[service.service_id] = 0;
      });
      setFormData(initialData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addHours]);
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    // Reset form data to original addHours
    if (addHours && typeof addHours === 'object') {
      setFormData({ ...addHours });
    } else {
      const initialData = {};
      activeServices.forEach((service) => {
        initialData[service.service_id] = 0;
      });
      setFormData(initialData);
    }
    setIsEditing(false);
  };
  
  const handleSave = () => {
    // Convert string values to numbers and filter out zeros
    const cleanedData = {};
    Object.entries(formData).forEach(([serviceId, hours]) => {
      const numericHours = parseFloat(hours) || 0;
      if (numericHours > 0) {
        cleanedData[serviceId] = numericHours;
      }
    });
    
    // Save to parent (pass null if no hours, otherwise pass the object)
    onSave(Object.keys(cleanedData).length > 0 ? cleanedData : null);
    setIsEditing(false);
  };
  
  const handleInputChange = (serviceId, value) => {
    setFormData((prev) => ({
      ...prev,
      [serviceId]: value,
    }));
  };
  
  const handleClearInput = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      [serviceId]: 0,
    }));
  };
  
  const getTotalHours = () => {
    return Object.values(formData).reduce((sum, hours) => {
      return sum + (parseFloat(hours) || 0);
    }, 0);
  };
  
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">Add Hours</h3>
          {!isEditing && (
            <span className="text-xs text-slate-200">
              ({getTotalHours().toFixed(2)} total hours)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              <FiEdit2 size={14} />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-slate-600 transition-colors"
              >
                <FiX size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
              >
                <FiSave size={14} />
                Save
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Service Inputs */}
      <div className="space-y-2">
        {activeServices.map((service) => (
          <div
            key={service.service_id}
            className="grid grid-cols-[4fr_5fr] gap-4 items-center"
          >
            <label
              htmlFor={`service-${service.service_id}`}
              className="text-sm text-right text-white font-medium"
            >
              {service.service_name}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`service-${service.service_id}`}
                type="number"
                min="0"
                step="0.25"
                value={formData[service.service_id] || 0}
                onChange={(e) => handleInputChange(service.service_id, e.target.value)}
                disabled={!isEditing}
                className={`
                  w-24 px-2 py-1 text-sm border rounded
                  ${isEditing 
                    ? 'border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed'
                  }
                `}
              />
              <span className="text-xs text-slate-200 w-12">{`hour${formData[service.service_id] !== 1 ? 's' : ''}`}</span>
              {isEditing && parseFloat(formData[service.service_id] || 0) > 0 && (
                <button
                  onClick={() => handleClearInput(service.service_id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Clear"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Total Display (when editing) */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
          <span className="text-sm font-medium text-white">Total:</span>
          <span className="text-sm font-bold text-teal-400">
            {getTotalHours().toFixed(2)} hour{getTotalHours() !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

AddHoursManager.propTypes = {
  addHours: PropTypes.object, // { service_id: hours }
  onSave: PropTypes.func.isRequired,
};

export default AddHoursManager;
