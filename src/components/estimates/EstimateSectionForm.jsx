import PropTypes from "prop-types";
import { useEffect, useState, useMemo } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { addSection, updateSection } from "../../redux/actions/estimates";

const EstimateSectionForm = ({ section = {}, onCancel, onSave, taskId }) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const materials = useSelector((state) => state.materials);
  const { styles: cabinetStyles } = useSelector((state) => state.cabinetStyles);
  const estimateData = currentEstimate?.estimate_data;
  const sectionData =
    section?.section_data || currentEstimate?.estimateDefault || {};

  const FACE_MATERIAL_OPTIONS = materials?.faceMaterials || [];
  const BOX_MATERIAL_OPTIONS = materials?.boxMaterials || [];
  const STYLE_OPTIONS = cabinetStyles || [];
  const FINISH_OPTIONS = estimateData?.finishes || [];
  const DOOR_STYLE_OPTIONS = estimateData?.doorStyles?.options || [];
  const DRAWER_BOX_OPTIONS = materials?.drawerBoxMaterials || [];
  const DOOR_HINGE_OPTIONS = estimateData?.doorHingeTypes || [];
  const DRAWER_SLIDE_OPTIONS = estimateData?.drawerSlideTypes || [];

  const [mustSelectFaceFinish, setMustSelectFaceFinish] = useState(false);
  const [mustSelectBoxFinish, setMustSelectBoxFinish] = useState(false);
  const [selectedFaceMaterial, setSelectedFaceMaterial] = useState(null);
  const [selectedBoxMaterial, setSelectedBoxMaterial] = useState(null);

  const [formData, setFormData] = useState({
    style: section.cabinet_style_id || "",
    boxMaterial: section.box_mat || "",
    boxFinish: sectionData.boxFinish || [],
    faceMaterial: section.face_mat || "",
    faceFinish: sectionData.faceFinish || [],
    doorStyle: sectionData.doorStyle || "",
    drawerFrontStyle: sectionData.drawerFrontStyle || "",
    doorInsideMolding: sectionData.doorInsideMolding || false,
    doorOutsideMolding: sectionData.doorOutsideMolding || false,
    drawerInsideMolding: sectionData.drawerInsideMolding || false,
    drawerOutsideMolding: sectionData.drawerOutsideMolding || false,
    doorHinge: sectionData.doorHinge || "",
    drawerSlide: sectionData.drawerSlide || "",
    drawer_box_mat: section.drawer_box_mat || "",
    notes: sectionData.notes || "",
  });

  const [errors, setErrors] = useState({});

  const clearFinishes = (section) => {
    setFormData({
      ...formData,
      [section]: [],
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Convert to number for fields that should have numerical values
    const numericFields = [
      "style",
      "boxMaterial",
      "faceMaterial",
      "drawer_box_mat",
    ];
    const processedValue =
      numericFields.includes(name) && value !== "" ? +value : value;

    setFormData({
      ...formData,
      [name]: processedValue,
    });

    if (name === "faceMaterial") {
      const selectedMaterial = FACE_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +value
      );
      setSelectedFaceMaterial(selectedMaterial);
    }

    if (name === "boxMaterial") {
      const selectedMaterial = BOX_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +value
      );
      setSelectedBoxMaterial(selectedMaterial);
    }

    // Clear error when field is updated
    const updatedErrors = { ...errors };
    if (updatedErrors[name]) {
      delete updatedErrors[name];
    }
    
    // Clear finish errors when material changes
    if (name === "faceMaterial" && updatedErrors.faceFinish) {
      delete updatedErrors.faceFinish;
    }
    if (name === "boxMaterial" && updatedErrors.boxFinish) {
      delete updatedErrors.boxFinish;
    }
    
    setErrors(updatedErrors);
  };

  const handleFinishChange = (option, finishType = "faceFinish") => {
    const updatedFinish = [...formData[finishType]];

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
      [finishType]: updatedFinish,
    });

    // Clear error when field is updated
    if (errors[finishType] && updatedFinish.length > 0) {
      setErrors({
        ...errors,
        [finishType]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.style) {
      newErrors.style = "Style is required";
    }

    if (!formData.boxMaterial) {
      newErrors.boxMaterial = "Cabinet interior is required";
    }

    if (!formData.faceMaterial) {
      newErrors.faceMaterial = "Face material is required";
    }

    if (!formData.doorStyle) {
      newErrors.doorStyle = "Door style is required";
    }

    if (!formData.doorHinge) {
      newErrors.doorHinge = "Door hinge type is required";
    }

    if (!formData.drawerFrontStyle) {
      newErrors.drawerFrontStyle = "Drawer front style is required";
    }
    if (!formData.drawerSlide) {
      newErrors.drawerSlide = "Drawer slide type is required";
    }

    if (!formData.drawer_box_mat) {
      newErrors.drawer_box_mat = "Drawer box material is required";
    }

    if (mustSelectFaceFinish && formData.faceFinish.length === 0) {
      newErrors.faceFinish = "At least one finish option is required";
    }

    if (mustSelectBoxFinish && formData.boxFinish.length === 0) {
      newErrors.boxFinish = "At least one finish option is required";
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
          await dispatch(
            updateSection(
              currentEstimate.estimate_id,
              taskId,
              section.est_section_id,
              formData
            )
          );
        } else {
          // Create new section
          const newSection = await dispatch(
            addSection(currentEstimate.estimate_id, taskId, formData)
          );
          onSave?.(newSection.est_section_id);
        }
        onCancel?.();
      } catch (error) {
        console.error("Error saving section:", error);
      }
    }
  };

  useEffect(() => {
    if (formData.faceMaterial) {
      const selectedMaterial = FACE_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +formData.faceMaterial
      );
      setSelectedFaceMaterial(selectedMaterial);

      // Handle finish requirements
      if (!selectedMaterial?.needs_finish) {
        clearFinishes("faceFinish");
        setMustSelectFaceFinish(false);
      } else {
        setMustSelectFaceFinish(true);
      }
    } else {
      setSelectedFaceMaterial(null);
      setMustSelectFaceFinish(false);
    }
  }, [formData.faceMaterial, FACE_MATERIAL_OPTIONS]);

  useEffect(() => {
    if (formData.boxMaterial) {
      const selectedMaterial = BOX_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +formData.boxMaterial
      );
      setSelectedBoxMaterial(selectedMaterial);

      // Handle finish requirements
      if (!selectedMaterial?.needs_finish) {
        clearFinishes("boxFinish");
        setMustSelectBoxFinish(false);
      } else {
        setMustSelectBoxFinish(true);
      }
    } else {
      setSelectedBoxMaterial(null);
      setMustSelectBoxFinish(false);
    }
  }, [formData.boxMaterial, BOX_MATERIAL_OPTIONS]);

  const filteredDoorStyleOptions = useMemo(() => {
    if (!selectedFaceMaterial) return DOOR_STYLE_OPTIONS;

    return DOOR_STYLE_OPTIONS.filter((option) => {
      // If material supports 5-piece, include both 5_piece_hardwood and slab_hardwood
      if (selectedFaceMaterial.five_piece === true) {
        if (option.id === "5_piece_hardwood" || option.id === "slab_hardwood") {
          return true;
        }
      }

      // If material supports slab doors, include slab_sheet
      if (selectedFaceMaterial.slab_door === true) {
        if (option.id === "slab_sheet") {
          return true;
        }
      }

      return false;
    });
  }, [selectedFaceMaterial, DOOR_STYLE_OPTIONS]);

  useEffect(() => {
    // If current door style is not in filtered options, reset it
    if (formData.doorStyle && filteredDoorStyleOptions.length > 0) {
      const isValidOption = filteredDoorStyleOptions.some(
        (option) => option.id === formData.doorStyle
      );

      if (!isValidOption) {
        setFormData((prev) => ({
          ...prev,
          doorStyle: "",
        }));
      }
    }
  }, [filteredDoorStyleOptions, formData.doorStyle]);

  useEffect(() => {
    // If current drawer front style is not in filtered options, reset it
    if (formData.drawerFrontStyle && filteredDoorStyleOptions.length > 0) {
      const isValidOption = filteredDoorStyleOptions.some(
        (option) => option.id === formData.drawerFrontStyle
      );

      if (!isValidOption) {
        setFormData((prev) => ({
          ...prev,
          drawerFrontStyle: "",
        }));
      }
    }
  }, [filteredDoorStyleOptions, formData.drawerFrontStyle]);

  return (
    <div className="bg-slate-50 border border-slate-400 rounded-lg p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cabinet Style Section */}
        <div className="grid grid-cols-[1fr_9fr] gap-2 items-center">
          <h3 className="text-md font-medium text-slate-700">Cabinet Style</h3>
          <div className="border rounded-lg border-slate-400 p-3">
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center">
                <label
                  htmlFor="style"
                  className="text-right text-sm font-medium text-slate-700"
                >
                  Style
                </label>
                <select
                  id="style"
                  name="style"
                  value={formData.style}
                  onChange={handleChange}
                  className={`block w-full rounded-md text-sm h-9 ${
                    errors.style ? "border-red-500" : "border-slate-300"
                  } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="">Select style...</option>
                  {STYLE_OPTIONS.map((style) => (
                    <option
                      key={style.cabinet_style_id}
                      value={style.cabinet_style_id}
                    >
                      {style.cabinet_style_name}
                    </option>
                  ))}
                </select>
                {errors.style && (
                  <p className="text-xs text-red-500 col-span-2">
                    {errors.style}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cabinet Box Material Section (with Finish)*/}
        <div className="grid grid-cols-[1fr_9fr] gap-2 items-center">
          <h3 className="text-md font-medium text-slate-700">Cabinet Box</h3>
          <div className="border rounded-lg border-slate-400 p-3">
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center">
                <label
                  htmlFor="boxMaterial"
                  className="text-right text-sm font-medium text-slate-700"
                >
                  Material
                </label>
                <select
                  id="boxMaterial"
                  name="boxMaterial"
                  value={formData.boxMaterial}
                  onChange={handleChange}
                  className={`block w-full rounded-md text-sm h-9 ${
                    errors.boxMaterial ? "border-red-500" : "border-slate-300"
                  } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="">Select interior material...</option>
                  {BOX_MATERIAL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {`${option.name} - $${option.sheet_price}/sheet`}
                    </option>
                  ))}
                </select>
                {errors.boxMaterial && (
                  <p className="text-xs text-red-500 col-span-2">
                    {errors.boxMaterial}
                  </p>
                )}
              </div>
              <div>
                {!mustSelectBoxFinish && (
                  <p className="text-xs text-teal-700 col-span-2">
                    The selected box material does not require finish.
                  </p>
                )}
              </div>
              {/* Box Finish Options */}
              <div className="col-span-2">
                <div className="grid grid-cols-[1fr_7fr] gap-2 items-center">
                  <label className="text-right text-sm font-medium text-slate-700 mb-2">
                    Finish
                  </label>
                  <div className="grid grid-cols-4 gap-2 text-sm pl-2">
                    {FINISH_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          disabled={!mustSelectBoxFinish}
                          type="checkbox"
                          checked={formData.boxFinish.includes(option.id)}
                          onChange={() => handleFinishChange(option.id, "boxFinish")}
                          className="rounded border-slate-300"
                        />
                        <span className="text-slate-600">{option.name}</span>
                      </label>
                    ))}
                  </div>
                  {errors.boxFinish && (
                    <p className="text-xs text-red-500 col-span-2">
                      {errors.boxFinish}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cabinet Face Material Section (with Finish) */}
        <div className="grid grid-cols-[1fr_9fr] gap-2 items-center">
          <h3 className="text-md font-medium text-slate-700">Cabinet Face</h3>
          <div className="border rounded-lg border-slate-400 p-3">
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center">
                <label
                  htmlFor="faceMaterial"
                  className="text-right text-sm font-medium text-slate-700"
                >
                  Material
                </label>
                <select
                  id="faceMaterial"
                  name="faceMaterial"
                  value={formData.faceMaterial}
                  onChange={handleChange}
                  className={`block w-full rounded-md text-sm h-9 ${
                    errors.faceMaterial ? "border-red-500" : "border-slate-300"
                  } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="">Select face material...</option>
                  {FACE_MATERIAL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {`${option.name} - $${option.sheet_price}/sheet`}
                    </option>
                  ))}
                </select>
                {errors.faceMaterial && (
                  <p className="text-xs text-red-500 col-span-2">
                    {errors.faceMaterial}
                  </p>
                )}
              </div>
              <div>
                {!mustSelectFaceFinish && (
                  <p className="text-xs text-teal-700 col-span-2">
                    The selected face material does not require finish.
                  </p>
                )}
              </div>
              {/* Finish Options */}

              <div className="col-span-2">
                <div className="grid grid-cols-[1fr_7fr] gap-2 items-center">
                  <label className="text-right text-sm font-medium text-slate-700 mb-2">
                    Finish
                  </label>
                  <div className="grid grid-cols-4 gap-2 text-sm pl-2">
                    {FINISH_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          disabled={!mustSelectFaceFinish}
                          type="checkbox"
                          checked={formData.faceFinish.includes(option.id)}
                          onChange={() => handleFinishChange(option.id, "faceFinish")}
                          className="rounded border-slate-300"
                        />
                        <span className="text-slate-600">{option.name}</span>
                      </label>
                    ))}
                  </div>
                  {errors.faceFinish && (
                    <p className="text-xs text-red-500 col-span-2">
                      {errors.faceFinish}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Door Style Section */}
        <div className="grid grid-cols-[1fr_9fr] gap-2 items-center">
          <h3 className="text-md font-medium text-slate-700">Doors</h3>
          <div className="border rounded-lg border-slate-400 p-3">
            {/* <h3 className="text-sm font-medium text-slate-700 mb-2">Doors</h3> */}
            <div className="grid grid-cols-2 gap-2">
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center">
                <label
                  htmlFor="doorStyle"
                  className="text-right text-sm font-medium text-slate-700"
                >
                  Style
                </label>
                <select
                  id="doorStyle"
                  name="doorStyle"
                  value={formData.doorStyle}
                  onChange={handleChange}
                  className={`block w-full rounded-md text-sm h-9 ${
                    errors.doorStyle ? "border-red-500" : "border-slate-300"
                  } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="">Select door style...</option>
                  {filteredDoorStyleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {`${option.name}`}
                    </option>
                  ))}
                </select>
                {errors.doorStyle && (
                  <p className="text-xs text-red-500 col-span-2">
                    {errors.doorStyle}
                  </p>
                )}
              </div>
              {/* Door Moldings */}
              <div className="flex gap-8 items-center justify-center">
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
              {/* Door Hinges */}
              <div className="">
                <div className="grid grid-cols-[1fr_3fr] gap-2 items-center">
                  <label
                    htmlFor="doorHinge"
                    className="text-right text-sm font-medium text-slate-700"
                  >
                    Hinges
                  </label>
                  <select
                    id="doorHinge"
                    name="doorHinge"
                    value={formData.doorHinge}
                    onChange={handleChange}
                    className={`block w-full h-9 rounded-md text-sm ${
                      errors.doorHinge ? "border-red-500" : "border-slate-300"
                    } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                  >
                    <option value="">Select hinge type...</option>
                    {DOOR_HINGE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {`${option.name} - $${option.price}/pair`}
                      </option>
                    ))}
                  </select>
                  {errors.doorHinge && (
                    <p className="text-xs text-red-500 col-span-2">
                      {errors.doorHinge}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Front Style Section */}
        <div className="grid grid-cols-[1fr_9fr] gap-2 items-center">
          <h3 className="text-md font-medium text-slate-700">Drawer Fronts</h3>
          <div className="border rounded-lg border-slate-400 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center">
                <label
                  htmlFor="drawerFrontStyle"
                  className="text-right text-sm font-medium text-slate-700"
                >
                  Style
                </label>
                <select
                  id="drawerFrontStyle"
                  name="drawerFrontStyle"
                  value={formData.drawerFrontStyle}
                  onChange={handleChange}
                  className="block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select drawer front style...</option>
                  {filteredDoorStyleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {errors.drawerFrontStyle && (
                  <p className="text-xs text-red-500 col-span-2">
                    {errors.drawerFrontStyle}
                  </p>
                )}
              </div>
              {/* Drawer Front Moldings */}
              <div className="flex gap-8 items-center justify-center">
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

              {/* Drawer Box Material */}
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center">
                <label
                  htmlFor="drawer_box_mat"
                  className="text-right text-sm font-medium text-slate-700"
                >
                  Boxes
                </label>
                <select
                  id="drawer_box_mat"
                  name="drawer_box_mat"
                  value={formData.drawer_box_mat}
                  onChange={handleChange}
                  className={`block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                    errors.drawer_box_mat ? "border-red-500" : ""
                  }`}
                >
                  <option value="">Select drawer box material...</option>
                  {DRAWER_BOX_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {errors.drawer_box_mat && (
                  <p className="text-xs text-red-500 col-span-2">
                    {errors.drawer_box_mat}
                  </p>
                )}
              </div>

              {/* Drawer Slides */}
              <div className="grid grid-cols-[1fr_3fr] gap-2 items-center">
                <label
                  htmlFor="drawerSlide"
                  className="text-sm font-medium text-slate-700 text-right"
                >
                  Slides
                </label>
                <select
                  id="drawerSlide"
                  name="drawerSlide"
                  value={formData.drawerSlide}
                  onChange={handleChange}
                  className={`block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
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
                  <p className="text-xs text-red-500 col-span-2">
                    {errors.drawerSlide}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
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
