import PropTypes from "prop-types";
import { useEffect, useState, useMemo } from "react";
import { FiSave, FiX, FiInfo } from "react-icons/fi";
import { useSelector } from "react-redux";

import { FACE_STYLES } from "../../utils/constants";
import { getEffectiveValue } from "../../utils/estimateDefaults";

/**
 * Reusable component for editing defaults at different levels
 * Can be used for:
 * - Team defaults (level='team', all fields required)
 * - Estimate defaults (level='estimate', fields optional, falls back to team)
 * - Section values (level='section', fields optional, falls back to estimate/team)
 */
const DefaultsEditor = ({ 
  level,              // 'team', 'estimate', or 'section'
  data = {},          // Current data to edit
  estimate = {},      // Estimate defaults (for fallback)
  team = {},          // Team defaults (for fallback)
  onSave,             // Save callback
  onCancel,           // Cancel callback
  title,              // Optional title override
}) => {
  const materials = useSelector((state) => state.materials);
  const hardware = useSelector((state) => state.hardware);
  const { styles: cabinetStyles } = useSelector((state) => state.cabinetStyles);
  const finishes = useSelector((state) => state.finishes);

  const FACE_MATERIAL_OPTIONS = materials?.faceMaterials || [];
  const BOX_MATERIAL_OPTIONS = materials?.boxMaterials || [];
  const STYLE_OPTIONS = cabinetStyles || [];
  const FINISH_OPTIONS = finishes?.finishes || [];
  const DOOR_STYLE_OPTIONS = FACE_STYLES || [];
  const DRAWER_BOX_OPTIONS = materials?.drawerBoxMaterials || [];
  const DOOR_HINGE_OPTIONS = hardware.hinges || [];
  const DRAWER_SLIDE_OPTIONS = hardware.slides || [];
  const PULL_OPTIONS = hardware.pulls || [];

  const isTeamLevel = level === 'team';
  const isEstimateLevel = level === 'estimate';
  const isSectionLevel = level === 'section';

  // Get field names based on level
  const getFieldName = (baseName) => {
    if (isTeamLevel || isEstimateLevel) {
      return `default_${baseName}`;
    }
    return baseName;
  };

  const [mustSelectFaceFinish, setMustSelectFaceFinish] = useState(false);
  const [mustSelectBoxFinish, setMustSelectBoxFinish] = useState(false);
  const [selectedFaceMaterial, setSelectedFaceMaterial] = useState(null);
  const [selectedBoxMaterial, setSelectedBoxMaterial] = useState(null);

  // Initialize form data based on level
  const [formData, setFormData] = useState({
    cabinet_style_id: data.cabinet_style_id || data.default_cabinet_style_id || "",
    box_mat: data.box_mat || data.default_box_mat || "",
    box_finish: data.box_finish || data.default_box_finish || [],
    face_mat: data.face_mat || data.default_face_mat || "",
    face_finish: data.face_finish || data.default_face_finish || [],
    door_style: data.door_style || data.default_door_style || "",
    drawer_front_style: data.drawer_front_style || data.default_drawer_front_style || "",
    door_inside_molding: data.door_inside_molding ?? data.default_door_inside_molding ?? false,
    door_outside_molding: data.door_outside_molding ?? data.default_door_outside_molding ?? false,
    drawer_inside_molding: data.drawer_inside_molding ?? data.default_drawer_inside_molding ?? false,
    drawer_outside_molding: data.drawer_outside_molding ?? data.default_drawer_outside_molding ?? false,
    door_panel_mod_id: data.door_panel_mod_id ?? data.default_door_panel_mod_id ?? "",
    drawer_panel_mod_id: data.drawer_panel_mod_id ?? data.default_drawer_panel_mod_id ?? "",
    hinge_id: data.hinge_id || data.default_hinge_id || "",
    slide_id: data.slide_id || data.default_slide_id || "",
    door_pull_id: data.door_pull_id || data.default_door_pull_id || "",
    drawer_pull_id: data.drawer_pull_id || data.default_drawer_pull_id || "",
    drawer_box_mat: data.drawer_box_mat || data.default_drawer_box_mat || "",
  });

  const [errors, setErrors] = useState({});

  // Get fallback value for display
  const getFallbackValue = (fieldName) => {
    if (isTeamLevel) return null; // Team level has no fallback
    
    const estimateFieldName = `default_${fieldName}`;
    const teamFieldName = `default_${fieldName}`;
    
    if (isEstimateLevel) {
      return team[teamFieldName];
    }
    
    if (isSectionLevel) {
      const estimateValue = estimate[estimateFieldName];
      const teamValue = team[teamFieldName];
      return getEffectiveValue(null, estimateValue, teamValue);
    }
    
    return null;
  };

  // Get fallback source name
  const getFallbackSource = (fieldName) => {
    if (isTeamLevel) return null;
    
    const currentValue = formData[fieldName];
    if (currentValue !== "" && currentValue !== null && currentValue !== undefined) {
      return null; // Has own value
    }
    
    if (isEstimateLevel) {
      return "team";
    }
    
    if (isSectionLevel) {
      const estimateFieldName = `default_${fieldName}`;
      const estimateValue = estimate[estimateFieldName];
      if (estimateValue !== null && estimateValue !== undefined) {
        return "estimate";
      }
      return "team";
    }
    
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const numericFields = [
      "cabinet_style_id",
      "box_mat",
      "face_mat",
      "drawer_box_mat",
      "door_pull_id",
      "drawer_pull_id",
      "slide_id",
      "hinge_id",
    ];
    
    let processedValue = value;
    if (numericFields.includes(name) && value !== "") {
      processedValue = +value;
    }

    setFormData({
      ...formData,
      [name]: processedValue,
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handleMultiSelectChange = (name, selectedOptions) => {
    setFormData({
      ...formData,
      [name]: selectedOptions,
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Team level: all fields required
    if (isTeamLevel) {
      if (!formData.cabinet_style_id) newErrors.cabinet_style_id = "Cabinet style is required";
      if (!formData.box_mat) newErrors.box_mat = "Box material is required";
      if (!formData.face_mat) newErrors.face_mat = "Face material is required";
      if (!formData.drawer_box_mat) newErrors.drawer_box_mat = "Drawer box material is required";
      if (!formData.hinge_id) newErrors.hinge_id = "Hinge is required";
      if (!formData.slide_id) newErrors.slide_id = "Slide is required";
      if (!formData.door_pull_id) newErrors.door_pull_id = "Door pull is required";
      if (!formData.drawer_pull_id) newErrors.drawer_pull_id = "Drawer pull is required";
      if (!formData.door_style) newErrors.door_style = "Door style is required";
      if (!formData.drawer_front_style) newErrors.drawer_front_style = "Drawer front style is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        // Convert form data to appropriate format for the level
        const dataToSave = { ...formData };
        
        // For estimate/team levels, convert field names to include 'default_' prefix
        if (isTeamLevel || isEstimateLevel) {
          const prefixedData = {};
          Object.keys(dataToSave).forEach(key => {
            prefixedData[`default_${key}`] = dataToSave[key];
          });
          await onSave(prefixedData);
        } else {
          await onSave(dataToSave);
        }
      } catch (error) {
        console.error(`Error saving ${level} defaults:`, error);
      }
    }
  };

  const getTitle = () => {
    if (title) return title;
    if (isTeamLevel) return "Team Defaults";
    if (isEstimateLevel) return "Estimate Defaults";
    return "Section Details";
  };

  const FallbackIndicator = ({ fieldName }) => {
    const source = getFallbackSource(fieldName);
    if (!source) return null;
    
    return (
      <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
        <FiInfo className="w-3 h-3" />
        <span>Using {source} default</span>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">{getTitle()}</h2>
      
      {!isTeamLevel && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <FiInfo className="inline w-4 h-4 mr-2" />
          Empty fields will use {isEstimateLevel ? 'team' : 'estimate or team'} defaults
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Cabinet Style */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Cabinet Style {isTeamLevel && <span className="text-red-500">*</span>}
          </label>
          <select
            name="cabinet_style_id"
            value={formData.cabinet_style_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="">-- Select Style --</option>
            {STYLE_OPTIONS.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
          <FallbackIndicator fieldName="cabinet_style_id" />
          {errors.cabinet_style_id && (
            <p className="text-red-500 text-xs mt-1">{errors.cabinet_style_id}</p>
          )}
        </div>

        {/* Add similar sections for all other fields */}
        {/* Box Material, Face Material, Hardware, Finishes, Molding options, etc. */}
        {/* This follows the same pattern as EstimateSectionForm */}

        {/* Form Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            <FiX />
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <FiSave />
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

DefaultsEditor.propTypes = {
  level: PropTypes.oneOf(['team', 'estimate', 'section']).isRequired,
  data: PropTypes.object,
  estimate: PropTypes.object,
  team: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export default DefaultsEditor;
