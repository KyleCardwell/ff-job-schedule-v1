import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiEdit2, FiSave, FiX, FiXCircle } from "react-icons/fi";
import { useSelector } from "react-redux";

/**
 * Component for manually adding hours by service type to a section
 * Always visible, with edit/save/cancel functionality
 */
const LaborAdjustmentssManager = ({ addHours, onSave }) => {
  const services = useSelector((state) => state.services?.allServices || []);

  // Filter to active services only
  const activeServices = services.filter((service) => service.is_active);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [setupHours, setSetupHours] = useState(1);

  // Initialize form data from props
  useEffect(() => {
    // Initialize add hours
    if (addHours && typeof addHours === "object") {
      // Extract setup_hours separately
      const { setup_hours, ...otherHours } = addHours;
      setSetupHours(setup_hours !== undefined ? setup_hours : 1);
      setFormData(otherHours);
    } else {
      const initialData = {};
      activeServices.forEach((service) => {
        initialData[service.service_id] = 0;
      });
      setFormData(initialData);
      setSetupHours(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addHours]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (addHours && typeof addHours === "object") {
      const { setup_hours, ...otherHours } = addHours;
      setSetupHours(setup_hours !== undefined ? setup_hours : 1);
      setFormData(otherHours);
    } else {
      const initialData = {};
      activeServices.forEach((service) => {
        initialData[service.service_id] = 0;
      });
      setFormData(initialData);
      setSetupHours(1);
    }

    setIsEditing(false);
  };

  const handleSave = () => {
    // Convert string values to numbers and filter out zeros for add_hours
    const cleanedData = {};
    Object.entries(formData).forEach(([serviceId, hours]) => {
      const numericHours = parseFloat(hours) || 0;
      if (numericHours > 0) {
        cleanedData[serviceId] = numericHours;
      }
    });

    // Add setup_hours to the object
    const numericSetupHours = parseFloat(setupHours);
    if (!isNaN(numericSetupHours) && numericSetupHours >= 0) {
      cleanedData.setup_hours = numericSetupHours;
    }

    // Save all data to parent
    onSave({
      add_hours: Object.keys(cleanedData).length > 0 ? cleanedData : null,
    });
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
    const serviceHours = Object.values(formData).reduce((sum, hours) => {
      return sum + (parseFloat(hours) || 0);
    }, 0);
    const setup = parseFloat(setupHours) || 0;
    return serviceHours + setup;
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">Labor Adjustments</h3>
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

      {/* Setup Hours Input */}
      <div className="mb-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label
              htmlFor="setup-hours"
              className="text-sm font-medium text-white block mb-1"
            >
              Setup/Cleanup Hours
            </label>
            <p className="text-xs text-slate-300">
              Added to Install hours. Defaults to 1 hour per section
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <input
              id="setup-hours"
              type="number"
              min="0"
              step="0.25"
              value={setupHours}
              onChange={(e) => setSetupHours(e.target.value)}
              disabled={!isEditing}
              className={`
                w-24 px-2 py-1 text-sm border rounded
                ${
                  isEditing
                    ? "border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    : "border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                }
              `}
              placeholder="1"
            />
            {isEditing && parseFloat(setupHours) > 0 && (
              <button
                onClick={() => setSetupHours(0)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Clear setup hours"
              >
                <FiXCircle size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Service Inputs - Single Column Layout */}
      <div className="space-y-3">
        {/* Header Row */}
        <div className="grid grid-cols-[3fr_2fr] gap-4 pb-2 border-b border-slate-300">
          <div className="text-xs font-semibold text-slate-300 text-center">
            Service Name
          </div>
          <div className="text-xs font-semibold text-slate-300 text-center">
            Add Hours
          </div>
        </div>

        {/* Service Rows */}
        {activeServices.map((service) => (
          <div
            key={service.service_id}
            className="grid grid-cols-[3fr_2fr] gap-4 items-center py-1"
          >
            {/* Service Name */}
            <label
              htmlFor={`hours-${service.service_id}`}
              className="text-sm text-white font-medium"
            >
              {service.service_name}
            </label>

            {/* Add Hours Input */}
            <div className="flex items-center gap-2">
              <input
                id={`hours-${service.service_id}`}
                type="number"
                min="0"
                step="0.25"
                value={formData[service.service_id] || 0}
                onChange={(e) =>
                  handleInputChange(service.service_id, e.target.value)
                }
                disabled={!isEditing}
                className={`
                  w-full px-2 py-1 text-sm border rounded
                  ${
                    isEditing
                      ? "border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      : "border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                  }
                `}
                placeholder="0"
              />
              {isEditing &&
                parseFloat(formData[service.service_id] || 0) > 0 && (
                  <button
                    onClick={() => handleClearInput(service.service_id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear hours"
                  >
                    <FiXCircle size={14} />
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
            {getTotalHours().toFixed(2)} hour{getTotalHours() !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
};

LaborAdjustmentssManager.propTypes = {
  addHours: PropTypes.object, // { service_id: hours }
  onSave: PropTypes.func.isRequired,
};

export default LaborAdjustmentssManager;
