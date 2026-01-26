import PropTypes from "prop-types";
import { useState } from "react";
import { FiSave, FiX, FiTrash2, FiEdit } from "react-icons/fi";

const EstimateSectionItem = ({ item = {}, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    name: item.name || "",
    width: item.width || "",
    height: item.height || "",
    depth: item.depth || "",
    quantity: item.quantity != null ? item.quantity : 1,
  });

  const [editing, setEditing] = useState(false);
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

    if (formData.quantity === null || formData.quantity === undefined || formData.quantity < 0) {
      newErrors.quantity = "Quantity must be 0 or greater";
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
    <>
      {editing ? (
        <div className="bg-white border border-slate-200 rounded-md p-4 mb-3">
          <h4 className="text-sm font-medium text-slate-700 mb-3">
            Cabinet Item
          </h4>

          <div>
            {/* Name */}
            <div className="mb-3">
              <label
                htmlFor="name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
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
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {/* Width */}
              <div>
                <label
                  htmlFor="width"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
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
                {errors.width && (
                  <p className="text-red-500 text-xs mt-1">{errors.width}</p>
                )}
              </div>

              {/* Height */}
              <div>
                <label
                  htmlFor="height"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
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
                {errors.height && (
                  <p className="text-red-500 text-xs mt-1">{errors.height}</p>
                )}
              </div>

              {/* Depth */}
              <div>
                <label
                  htmlFor="depth"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
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
                {errors.depth && (
                  <p className="text-red-500 text-xs mt-1">{errors.depth}</p>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label
                htmlFor="quantity"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                className={`w-full px-3 py-2 border ${
                  errors.quantity ? "border-red-500" : "border-slate-300"
                } rounded-md text-sm`}
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
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
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: item.name,
                      width: item.width,
                      height: item.height,
                      depth: item.depth,
                      quantity: item.quantity,
                    });
                  }}
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
      ) : (
        <div
          key={item.id}
          className="grid grid-cols-[.5fr_1fr_1fr_1fr_1fr_0.5fr] gap-4 py-4 px-3 hover:bg-slate-50 transition-colors items-center"
        >
          <div>{item.quantity}</div>
          <div>{item.name}</div>
          <div>{item.width}</div>
          <div>{item.height}</div>
          <div>{item.depth}</div>
          <div className="text-sm font-medium">
            <button
              onClick={() => setEditing(true)}
              className="text-blue-600 hover:text-blue-900 mr-4"
              aria-label="Edit estimate"
            >
              <FiEdit />
            </button>
            <button
              // onClick={() => setShowConfirmDelete(estimate.estimate_id)}
              className="text-red-600 hover:text-red-900"
              aria-label="Delete estimate"
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

EstimateSectionItem.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
  onDelete: PropTypes.func,
};

export default EstimateSectionItem;
