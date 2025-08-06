import PropTypes from 'prop-types';
import { useState } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { addSection, updateSection } from "../../redux/actions/estimates";


const EstimateSectionForm = ({
  section = {},
  onCancel,
  onSave,
  taskId
}) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector((state) => state.estimates.currentEstimate);
  const materials = useSelector((state) => state.materials);
  const estimateData = currentEstimate?.estimate_data;
  const sectionData = section?.section_data || currentEstimate?.estimateDefault || {};

  const MATERIAL_OPTIONS = estimateData?.materials?.options || [];
  const BOX_MATERIAL_OPTIONS = materials?.boxMaterials || [];
  const STYLE_OPTIONS = estimateData?.styles || [];
  const FINISH_OPTIONS = estimateData?.finishes || [];
  const DOOR_STYLE_OPTIONS = estimateData?.doorStyles?.options || [];
  const DRAWER_FRONT_STYLE_OPTIONS =
    estimateData?.drawerFrontStyles?.options || [];
  const DRAWER_BOX_OPTIONS = estimateData?.drawerBoxTypes || [];
  const DOOR_HINGE_OPTIONS = estimateData?.doorHingeTypes || [];
  const DRAWER_SLIDE_OPTIONS =
    estimateData?.drawerSlideTypes || [];

  const [formData, setFormData] = useState({
    style: sectionData.style || "",
    boxMaterial: section.box_mat || "",
    material: sectionData.material || "",
    finish: sectionData.finish || [],
    doorStyle: sectionData.doorStyle || "",
    drawerFrontStyle: sectionData.drawerFrontStyle || "",
    doorInsideMolding: sectionData.doorInsideMolding || false,
    doorOutsideMolding: sectionData.doorOutsideMolding || false,
    drawerInsideMolding: sectionData.drawerInsideMolding || false,
    drawerOutsideMolding: sectionData.drawerOutsideMolding || false,
    doorHinge: sectionData.doorHinge || "",
    drawerSlide: sectionData.drawerSlide || "",
    drawerBoxes: sectionData.drawerBoxes || "",
    notes: sectionData.notes || "",
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

    if (!formData.boxMaterial) {
      newErrors.boxMaterial = "Cabinet interior is required";
    }

    if (!formData.material) {
      newErrors.material = "Material is required";
    }

    if (!formData.doorStyle) {
      newErrors.doorStyle = "Door style is required";
    }

    if (!formData.doorHinge) {
      newErrors.doorHinge = "Door hinge type is required";
    }

    if (!formData.drawerSlide) {
      newErrors.drawerSlide = "Drawer slide type is required";
    }

    if (!formData.drawerBoxes) {
      newErrors.drawerBoxes = "Drawer box type is required";
    }

    if (formData.finish.length === 0) {
      newErrors.finish = "At least one finish option is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        if (section?.est_section_id) {
          // Update existing section
          await dispatch(updateSection(
            currentEstimate.estimate_id,
            taskId,
            section.est_section_id,
            formData
          ));
        } else {
          // Create new section
          const newSection = await dispatch(addSection(
            currentEstimate.estimate_id,
            taskId,
            formData
          ));
          onSave?.(newSection.est_section_id);
        }
        onCancel?.();
      } catch (error) {
        console.error("Error saving section:", error);
      }
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-400 rounded-lg p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Details - First Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg border-slate-200 p-2">
            <div className="mb-2">
              <label
                htmlFor="style"
                className="block text-sm font-medium text-slate-700"
              >
                Cabinet Style
              </label>
              <select
                id="style"
                name="style"
                value={formData.style}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md text-sm h-9 ${
                  errors.style ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select style</option>
                {STYLE_OPTIONS.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
              {errors.style && (
                <p className="mt-1 text-xs text-red-500">{errors.style}</p>
              )}
            </div>

            <div className="mb-2">
              <label
                htmlFor="material"
                className="block text-sm font-medium text-slate-700"
              >
                Cabinet Face Material
              </label>
              <select
                id="material"
                name="material"
                value={formData.material}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md text-sm h-9 ${
                  errors.material ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select material</option>
                {MATERIAL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.name} - $${option.price}/sqft`}
                  </option>
                ))}
              </select>
              {errors.material && (
                <p className="mt-1 text-xs text-red-500">{errors.material}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="boxMaterial"
                className="block text-sm font-medium text-slate-700"
              >
                Cabinet Box Material
              </label>
              <select
                id="boxMaterial"
                name="boxMaterial"
                value={formData.boxMaterial}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md text-sm h-9 ${
                  errors.boxMaterial ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select interior</option>
                {BOX_MATERIAL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.name} - $${option.price}/sheet`}
                  </option>
                ))}
              </select>
              {errors.boxMaterial && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.boxMaterial}
                </p>
              )}
            </div>
          </div>
          <div className="border rounded-lg border-slate-200 p-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Finish
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {FINISH_OPTIONS.map((option) => (
                <label key={option.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.finish.includes(option.id)}
                    onChange={() => handleFinishChange(option.id)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-slate-600">{option.name}</span>
                </label>
              ))}
            </div>
            {errors.finish && (
              <p className="mt-1 text-xs text-red-500">{errors.finish}</p>
            )}
          </div>
        </div>

        {/* Door and Drawer Styles - Second Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Door Style with Moldings */}
          <div className="border rounded-lg border-slate-200 p-2">
            <div className="space-y-2 mb-2">
              <label
                htmlFor="doorStyle"
                className="block text-sm font-medium text-slate-700"
              >
                Door Style
              </label>
              <select
                id="doorStyle"
                name="doorStyle"
                value={formData.doorStyle}
                onChange={handleChange}
                className={`block w-full rounded-md text-sm h-9  ${
                  errors.doorStyle ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select door style</option>
                {DOOR_STYLE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.name} - $${option.price}/door`}
                  </option>
                ))}
              </select>
              {errors.doorStyle && (
                <p className="text-xs text-red-500">{errors.doorStyle}</p>
              )}
            </div>

            <div className="flex gap-4 mb-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  name="doorInsideMolding"
                  checked={formData.doorInsideMolding}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "doorInsideMolding",
                        value: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300"
                />
                <span>Inside Molding</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  name="doorOutsideMolding"
                  checked={formData.doorOutsideMolding}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "doorOutsideMolding",
                        value: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300"
                />
                <span>Outside Molding</span>
              </label>
            </div>
            <div>
              <label
                htmlFor="doorHinge"
                className="block text-sm font-medium text-slate-700"
              >
                Door Hinges
              </label>
              <select
                id="doorHinge"
                name="doorHinge"
                value={formData.doorHinge}
                onChange={handleChange}
                className={`mt-1 block w-full h-9 rounded-md text-sm ${
                  errors.doorHinge ? "border-red-500" : "border-slate-300"
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select hinge type</option>
                {DOOR_HINGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.name} - $${option.price}/pair`}
                  </option>
                ))}
              </select>
              {errors.doorHinge && (
                <p className="mt-1 text-xs text-red-500">{errors.doorHinge}</p>
              )}
            </div>
          </div>

          {/* Drawer Front Style with Moldings */}
          <div className="border rounded-lg border-slate-200 p-2">
            <div className="space-y-2 mb-2">
              <label
                htmlFor="drawerFrontStyle"
                className="block text-sm font-medium text-slate-700"
              >
                Drawer Front Style
              </label>
              <select
                id="drawerFrontStyle"
                name="drawerFrontStyle"
                value={formData.drawerFrontStyle}
                onChange={handleChange}
                className="block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select drawer front style</option>
                {DRAWER_FRONT_STYLE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.name} - $${option.price}/drawer`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 mb-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  name="drawerInsideMolding"
                  checked={formData.drawerInsideMolding}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "drawerInsideMolding",
                        value: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300"
                />
                <span>Inside Molding</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  name="drawerOutsideMolding"
                  checked={formData.drawerOutsideMolding}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "drawerOutsideMolding",
                        value: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300"
                />
                <span>Outside Molding</span>
              </label>
            </div>
            <div>
              <label
                htmlFor="drawerSlide"
                className="block text-sm font-medium text-slate-700"
              >
                Drawer Slide Type
              </label>
              <select
                id="drawerSlide"
                name="drawerSlide"
                value={formData.drawerSlide}
                onChange={handleChange}
                className={`mt-1 block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                  errors.drawerSlide ? "border-red-500" : ""
                }`}
              >
                <option value="">Select drawer slide type...</option>
                {DRAWER_SLIDE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.name} - $${option.price}/pair`}
                  </option>
                ))}
              </select>
              {errors.drawerSlide && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.drawerSlide}
                </p>
              )}
            </div>
            <div className="mt-2">
              <label
                htmlFor="drawerBoxes"
                className="block text-sm font-medium text-slate-700"
              >
                Drawer Box Type
              </label>
              <select
                id="drawerBoxes"
                name="drawerBoxes"
                value={formData.drawerBoxes}
                onChange={handleChange}
                className={`mt-1 block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                  errors.drawerBoxes ? "border-red-500" : ""
                }`}
              >
                <option value="">Select drawer box type...</option>
                {DRAWER_BOX_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {errors.drawerBoxes && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.drawerBoxes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notes - Fourth Row */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-slate-700"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="mt-1 p-2 block w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Any special requirements..."
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

EstimateSectionForm.propTypes = {
    section: PropTypes.object,
    taskId: PropTypes.number,
    onCancel: PropTypes.func,
    onSave: PropTypes.func,
};

export default EstimateSectionForm;
