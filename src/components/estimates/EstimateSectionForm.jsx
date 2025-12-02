import PropTypes from "prop-types";
import { useEffect, useState, useMemo } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import {
  addSection,
  updateSection,
  updateEstimateDefaults,
} from "../../redux/actions/estimates";
import { updateTeamDefaults } from "../../redux/actions/teamEstimateDefaults";
import { FACE_STYLES, FACE_STYLE_VALUES } from "../../utils/constants";
import {
  getNewSectionDefaults,
  getEffectiveValue,
  shouldApplyFinish,
} from "../../utils/estimateDefaults";

/**
 * Universal defaults/section form
 * @param {string} editType - 'team', 'estimate', or 'section' (default: 'section')
 * @param {object} section - Section data (for editType='section')
 * @param {object} estimateData - Estimate data (for editType='estimate')
 * @param {object} teamData - Team data (for editType='team')
 * @param {number} taskId - Task ID (for editType='section')
 * @param {function} onCancel - Cancel callback
 * @param {function} onSave - Save callback
 */
const EstimateSectionForm = ({
  editType = "section",
  section = {},
  estimateData = null,
  teamData = null,
  onCancel,
  onSave,
  taskId,
}) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate
  );
  const materials = useSelector((state) => state.materials);
  const hardware = useSelector((state) => state.hardware);
  const { styles: cabinetStyles } = useSelector((state) => state.cabinetStyles);
  const finishes = useSelector((state) => state.finishes);
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults
  );

  const FACE_MATERIAL_OPTIONS = materials?.faceMaterials || [];
  const BOX_MATERIAL_OPTIONS = materials?.boxMaterials || [];
  const STYLE_OPTIONS = cabinetStyles || [];
  const FINISH_OPTIONS = finishes?.finishes || [];
  const DOOR_STYLE_OPTIONS = FACE_STYLES || [];
  const DRAWER_BOX_OPTIONS = materials?.drawerBoxMaterials || [];
  const DOOR_HINGE_OPTIONS = hardware.hinges || [];
  const DRAWER_SLIDE_OPTIONS = hardware.slides || [];
  const PULL_OPTIONS = hardware.pulls || [];

  const isNewSection = !section.est_section_id;

  // Determine what data to use based on editType
  const editingData = useMemo(() => {
    if (editType === "team") return teamData;
    if (editType === "estimate") return estimateData || currentEstimate;
    return section; // 'section' mode
  }, [editType, teamData, estimateData, currentEstimate, section]);

  // Get default values for new sections using fallback logic
  const initialDefaults = useMemo(() => {
    if (editType === "section" && isNewSection) {
      return getNewSectionDefaults(currentEstimate, teamDefaults);
    }
    return {};
  }, [editType, isNewSection, currentEstimate, teamDefaults]);

  // Determine field name prefix (team and estimate use 'default_' prefix)
  const getFieldName = (baseName) => {
    if (editType === "team" || editType === "estimate") {
      return `default_${baseName}`;
    }
    return baseName;
  };

  // Get placeholder text based on edit type
  const getPlaceholder = (itemName) => {
    if (editType === "section") {
      return `Estimate Default`;
    } else if (editType === "estimate") {
      return `Team Default`;
    } else {
      return `Select ${itemName}`;
    }
  };

  // Get select value for boolean fields (converts boolean to string for select, handles null)
  const getBooleanSelectValue = (value) => {
    if (value === null || value === undefined) return "";
    return value ? "true" : "false";
  };

  // Get the effective default value to display
  const getEffectiveDefaultDisplay = (
    fieldValue,
    estimateKey,
    teamDefaultKey,
    formatter,
    isNumeric = false,
    isFinishField = false,
    materialField = null
  ) => {
    // Don't show for team edit type
    if (editType === "team") {
      return null;
    }

    // For finish fields, check if the effective material needs finish
    if (isFinishField && materialField) {
      const materialOptions = materialField === 'faceMaterial' ? FACE_MATERIAL_OPTIONS : BOX_MATERIAL_OPTIONS;
      const materialEstimateKey = materialField === 'faceMaterial' ? 'default_face_mat' : 'default_box_mat';
      
      const finishNeeded = shouldApplyFinish(
        formData[materialField] || null,
        currentEstimate?.[materialEstimateKey] || null,
        teamDefaults?.[materialEstimateKey] || null,
        materialOptions
      );

      // Don't show finish defaults if the effective material doesn't need finish
      if (!finishNeeded) {
        return null;
      }
    }

    // For numeric fields, check if it's truly empty (not 0 or negative)
    // For non-numeric fields, check for null, undefined, or empty string
    const isEmpty = isNumeric
      ? fieldValue === "" || fieldValue === null || fieldValue === undefined
      : fieldValue === "" || fieldValue === null || fieldValue === undefined;

    if (!isEmpty) {
      return null;
    }

    const estimateValue = currentEstimate?.[estimateKey];
    const teamValue = teamDefaults?.[teamDefaultKey];
    const { value, source } = getEffectiveValue(null, estimateValue, teamValue);

    // Don't show if there's no effective value
    if (value === null || value === undefined) return null;

    const displayValue = formatter ? formatter(value) : value;
    // const colorClass = source === 'estimate' ? 'text-teal-400' : 'text-amber-400';
    const colorClass = "text-teal-500";
    // const sourceText = source === 'estimate' ? 'Estimate' : 'Team';

    return (
      displayValue && (
        <span className={`text-xs ${colorClass} ml-2`}>({displayValue})</span>
      )
    );
  };

  // Formatters for different field types
  const formatStyleName = (id) =>
    STYLE_OPTIONS.find((s) => s.cabinet_style_id === id)?.cabinet_style_name ||
    "";
  const formatMaterialName = (id, options) =>
    options.find((m) => m.id === id)?.name || "";

  const formatPullName = (id) =>
    PULL_OPTIONS.find((p) => p.id === id)?.name || "";
  const formatSlideName = (id) =>
    DRAWER_SLIDE_OPTIONS.find((s) => s.id === id)?.name || "";
  const formatHingeName = (id) =>
    DOOR_HINGE_OPTIONS.find((h) => h.id === id)?.name || "";
  const formatDoorStyleName = (id) =>
    DOOR_STYLE_OPTIONS.find((s) => s.id === id)?.label || "";
  const formatBoolean = (value) => (value ? "Yes" : "No");
  const formatFinishArray = (finishIds) => {
    if (!finishIds || !Array.isArray(finishIds) || finishIds.length === 0) {
      return "None";
    }
    return finishIds
      .map((id) => FINISH_OPTIONS.find((f) => f.id === id)?.name || "")
      .filter(Boolean)
      .join(", ");
  };
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return "";
    return `${value}%`;
  };

  const [mustSelectFaceFinish, setMustSelectFaceFinish] = useState(false);
  const [mustSelectBoxFinish, setMustSelectBoxFinish] = useState(false);
  const [selectedFaceMaterial, setSelectedFaceMaterial] = useState(null);
  const [selectedBoxMaterial, setSelectedBoxMaterial] = useState(null);

  const [formData, setFormData] = useState(() => {
    const data = editingData || {};
    const styleField = getFieldName("cabinet_style_id");
    const boxMatField = getFieldName("box_mat");
    const faceMatField = getFieldName("face_mat");
    const doorStyleField = getFieldName("door_style");
    const drawerFrontStyleField = getFieldName("drawer_front_style");
    const doorInsideMoldingField = getFieldName("door_inside_molding");
    const doorOutsideMoldingField = getFieldName("door_outside_molding");
    const drawerInsideMoldingField = getFieldName("drawer_inside_molding");
    const drawerOutsideMoldingField = getFieldName("drawer_outside_molding");
    const doorReededPanelField = getFieldName("door_reeded_panel");
    const drawerReededPanelField = getFieldName("drawer_reeded_panel");
    const hingeField = getFieldName("hinge_id");
    const slideField = getFieldName("slide_id");
    const doorPullField = getFieldName("door_pull_id");
    const drawerPullField = getFieldName("drawer_pull_id");
    const drawerBoxMatField = getFieldName("drawer_box_mat");
    const boxFinishField = getFieldName("box_finish");
    const faceFinishField = getFieldName("face_finish");
    const profitField = getFieldName("profit");
    const commissionField = getFieldName("commission");
    const discountField = getFieldName("discount");

    return {
      style:
        data[styleField] ||
        data.cabinet_style_id ||
        initialDefaults.cabinet_style_id ||
        "",
      boxMaterial:
        data[boxMatField] || data.box_mat || initialDefaults.box_mat || "",
      boxFinish:
        data[boxFinishField] ||
        data.box_finish ||
        initialDefaults.box_finish ||
        [],
      faceMaterial:
        data[faceMatField] || data.face_mat || initialDefaults.face_mat || "",
      faceFinish:
        data[faceFinishField] ||
        data.face_finish ||
        initialDefaults.face_finish ||
        [],
      doorStyle:
        data[doorStyleField] ||
        data.door_style ||
        initialDefaults.door_style ||
        "",
      drawerFrontStyle:
        data[drawerFrontStyleField] ||
        data.drawer_front_style ||
        initialDefaults.drawer_front_style ||
        "",
      doorInsideMolding:
        data[doorInsideMoldingField] ??
        data.door_inside_molding ??
        initialDefaults.door_inside_molding ??
        null,
      doorOutsideMolding:
        data[doorOutsideMoldingField] ??
        data.door_outside_molding ??
        initialDefaults.door_outside_molding ??
        null,
      drawerInsideMolding:
        data[drawerInsideMoldingField] ??
        data.drawer_inside_molding ??
        initialDefaults.drawer_inside_molding ??
        null,
      drawerOutsideMolding:
        data[drawerOutsideMoldingField] ??
        data.drawer_outside_molding ??
        initialDefaults.drawer_outside_molding ??
        null,
      doorReededPanel:
        data[doorReededPanelField] ??
        data.door_reeded_panel ??
        initialDefaults.door_reeded_panel ??
        null,
      drawerReededPanel:
        data[drawerReededPanelField] ??
        data.drawer_reeded_panel ??
        initialDefaults.drawer_reeded_panel ??
        null,
      hinge_id:
        data[hingeField] || data.hinge_id || initialDefaults.hinge_id || "",
      slide_id:
        data[slideField] || data.slide_id || initialDefaults.slide_id || "",
      door_pull_id:
        data[doorPullField] ||
        data.door_pull_id ||
        initialDefaults.door_pull_id ||
        "",
      drawer_pull_id:
        data[drawerPullField] ||
        data.drawer_pull_id ||
        initialDefaults.drawer_pull_id ||
        "",
      drawer_box_mat:
        data[drawerBoxMatField] ||
        data.drawer_box_mat ||
        initialDefaults.drawer_box_mat ||
        "",
      notes: data.notes || "",
      quantity: data.quantity ?? 1,
      profit: data[profitField] ?? data.profit ?? initialDefaults.profit ?? "",
      commission:
        data[commissionField] ??
        data.commission ??
        initialDefaults.commission ??
        "",
      discount:
        data[discountField] ?? data.discount ?? initialDefaults.discount ?? "",
    };
  });

  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);

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
      "door_pull_id",
      "drawer_pull_id",
      "slide_id",
      "hinge_id",
    ];

    // Handle adjustment fields - convert to number but allow empty string to become null
    const adjustmentFields = ["quantity", "profit", "commission", "discount"];

    // Handle boolean fields from select boxes
    const booleanFields = [
      "doorInsideMolding",
      "doorOutsideMolding",
      "doorReededPanel",
      "drawerInsideMolding",
      "drawerOutsideMolding",
      "drawerReededPanel",
    ];

    let processedValue = value;
    if (numericFields.includes(name) && value !== "") {
      processedValue = +value;
    } else if (adjustmentFields.includes(name)) {
      // For adjustment fields: empty string stays as empty string in state,
      // will be converted to null or number on submit
      processedValue = value;
    } else if (booleanFields.includes(name)) {
      // For boolean fields: convert string values to boolean or null
      if (value === "") {
        processedValue = null;
      } else if (value === "true") {
        processedValue = true;
      } else if (value === "false") {
        processedValue = false;
      }
    }

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

    // For estimate defaults and sections, all fields are optional (can use fallback)
    if (editType === "estimate" || editType === "section") {
      // Only validate finish requirements IF a material is selected that needs finish
      if (
        mustSelectFaceFinish &&
        formData.faceMaterial &&
        formData.faceFinish.length === 0
      ) {
        newErrors.faceFinish =
          "At least one finish option is required for this material";
      }

      if (
        mustSelectBoxFinish &&
        formData.boxMaterial &&
        formData.boxFinish.length === 0
      ) {
        newErrors.boxFinish =
          "At least one finish option is required for this material";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // For team defaults, all fields are required (no fallback available)
    if (editType === "team") {
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

      if (!formData.hinge_id) {
        newErrors.hinge_id = "Door hinge type is required";
      }

      if (!formData.drawerFrontStyle) {
        newErrors.drawerFrontStyle = "Drawer front style is required";
      }

      if (!formData.slide_id) {
        newErrors.slide_id = "Drawer slide type is required";
      }

      if (!formData.door_pull_id) {
        newErrors.door_pull_id = "Door pull type is required";
      }

      if (!formData.drawer_pull_id) {
        newErrors.drawer_pull_id = "Drawer pull type is required";
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null); // Clear any previous errors

    if (validateForm()) {
      try {
        if (editType === "team") {
          // Update team defaults using Redux action
          // Convert profit/commission/discount to numbers
          const updatePayload = {
            default_cabinet_style_id: formData.style || null,
            default_box_mat: formData.boxMaterial || null,
            default_box_finish: formData.boxFinish,
            default_face_mat: formData.faceMaterial || null,
            default_face_finish: formData.faceFinish,
            default_door_style: formData.doorStyle || null,
            default_drawer_front_style: formData.drawerFrontStyle || null,
            default_door_inside_molding: formData.doorInsideMolding,
            default_door_outside_molding: formData.doorOutsideMolding,
            default_drawer_inside_molding: formData.drawerInsideMolding,
            default_drawer_outside_molding: formData.drawerOutsideMolding,
            default_door_reeded_panel: formData.doorReededPanel,
            default_drawer_reeded_panel: formData.drawerReededPanel,
            default_hinge_id: formData.hinge_id || null,
            default_slide_id: formData.slide_id || null,
            default_door_pull_id: formData.door_pull_id || null,
            default_drawer_pull_id: formData.drawer_pull_id || null,
            default_drawer_box_mat: formData.drawer_box_mat || null,
            default_profit:
              formData.profit === "" || formData.profit == null
                ? null
                : Number(formData.profit),
            default_commission:
              formData.commission === "" || formData.commission == null
                ? null
                : Number(formData.commission),
            default_discount:
              formData.discount === "" || formData.discount == null
                ? null
                : Number(formData.discount),
          };

          await dispatch(updateTeamDefaults(teamData.team_id, updatePayload));
          onSave?.();
          onCancel?.();
        } else if (editType === "estimate") {
          // Update estimate defaults using Redux action
          // Convert profit/commission/discount to numbers (nullable for estimates)
          const defaultsPayload = {
            default_cabinet_style_id: formData.style || null,
            default_box_mat: formData.boxMaterial || null,
            default_box_finish:
              formData.boxFinish.length > 0 ? formData.boxFinish : null,
            default_face_mat: formData.faceMaterial || null,
            default_face_finish:
              formData.faceFinish.length > 0 ? formData.faceFinish : null,
            default_door_style: formData.doorStyle || null,
            default_drawer_front_style: formData.drawerFrontStyle || null,
            default_door_inside_molding: formData.doorInsideMolding || null,
            default_door_outside_molding: formData.doorOutsideMolding || null,
            default_drawer_inside_molding: formData.drawerInsideMolding || null,
            default_drawer_outside_molding:
              formData.drawerOutsideMolding || null,
            default_door_reeded_panel: formData.doorReededPanel || null,
            default_drawer_reeded_panel: formData.drawerReededPanel || null,
            default_hinge_id: formData.hinge_id || null,
            default_slide_id: formData.slide_id || null,
            default_door_pull_id: formData.door_pull_id || null,
            default_drawer_pull_id: formData.drawer_pull_id || null,
            default_drawer_box_mat: formData.drawer_box_mat || null,
            default_profit:
              formData.profit === "" || formData.profit == null
                ? null
                : Number(formData.profit),
            default_commission:
              formData.commission === "" || formData.commission == null
                ? null
                : Number(formData.commission),
            default_discount:
              formData.discount === "" || formData.discount == null
                ? null
                : Number(formData.discount),
          };

          await dispatch(
            updateEstimateDefaults(
              estimateData.estimate_id || currentEstimate.estimate_id,
              defaultsPayload
            )
          );
          onSave?.();
          onCancel?.();
        } else {
          // Section mode - original logic
          const processedData = { ...formData };

          // Convert quantity to number (ensure it's at least 1)
          processedData.quantity =
            processedData.quantity === "" || !processedData.quantity
              ? 1
              : Number(processedData.quantity);

          // Convert other adjustment fields: empty string -> null, otherwise -> number
          ["profit", "commission", "discount"].forEach((field) => {
            if (processedData[field] === "" || processedData[field] == null) {
              processedData[field] = null;
            } else {
              processedData[field] = Number(processedData[field]);
            }
          });

          // Convert empty strings to null for material/hardware foreign key fields
          const foreignKeyFields = [
            "style",
            "boxMaterial",
            "faceMaterial",
            "drawer_box_mat",
            "hinge_id",
            "slide_id",
            "door_pull_id",
            "drawer_pull_id",
          ];
          foreignKeyFields.forEach((field) => {
            if (processedData[field] === "" || processedData[field] == null) {
              processedData[field] = null;
            }
          });

          // Convert empty strings to null for text fields
          const textFields = ["doorStyle", "drawerFrontStyle"];
          textFields.forEach((field) => {
            if (processedData[field] === "") {
              processedData[field] = null;
            }
          });

          if (section?.est_section_id) {
            // Update existing section
            await dispatch(
              updateSection(
                currentEstimate.estimate_id,
                taskId,
                section.est_section_id,
                processedData
              )
            );
          } else {
            // Create new section
            const newSection = await dispatch(
              addSection(currentEstimate.estimate_id, taskId, processedData)
            );
            onSave?.(newSection.est_section_id);
          }
          onCancel?.();
        }
      } catch (error) {
        console.error(`Error saving ${editType}:`, error);
        setSaveError(error.message || "Failed to save. Please try again.");
      }
    }
  };

  useEffect(() => {
    // Determine if finish is needed based on the EFFECTIVE material (using three-tier fallback)
    const finishNeeded = shouldApplyFinish(
      formData.faceMaterial || null,
      currentEstimate?.default_face_mat || null,
      teamDefaults?.default_face_mat || null,
      FACE_MATERIAL_OPTIONS
    );

    setMustSelectFaceFinish(finishNeeded);

    // Update selectedFaceMaterial for door style filtering
    if (formData.faceMaterial) {
      const selectedMaterial = FACE_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +formData.faceMaterial
      );
      setSelectedFaceMaterial(selectedMaterial);
    } else {
      setSelectedFaceMaterial(null);
    }

    // Clear finishes if the effective material doesn't need finish
    if (!finishNeeded && formData.faceFinish?.length > 0) {
      clearFinishes("faceFinish");
    }
  }, [
    formData.faceMaterial,
    formData.faceFinish,
    currentEstimate?.default_face_mat,
    teamDefaults?.default_face_mat,
    FACE_MATERIAL_OPTIONS,
  ]);

  useEffect(() => {
    // Determine if finish is needed based on the EFFECTIVE material (using three-tier fallback)
    const finishNeeded = shouldApplyFinish(
      formData.boxMaterial || null,
      currentEstimate?.default_box_mat || null,
      teamDefaults?.default_box_mat || null,
      BOX_MATERIAL_OPTIONS
    );

    setMustSelectBoxFinish(finishNeeded);

    // Update selectedBoxMaterial (if needed for future features)
    if (formData.boxMaterial) {
      const selectedMaterial = BOX_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +formData.boxMaterial
      );
      setSelectedBoxMaterial(selectedMaterial);
    } else {
      setSelectedBoxMaterial(null);
    }

    // Clear finishes if the effective material doesn't need finish
    if (!finishNeeded && formData.boxFinish?.length > 0) {
      clearFinishes("boxFinish");
    }
  }, [
    formData.boxMaterial,
    formData.boxFinish,
    currentEstimate?.default_box_mat,
    teamDefaults?.default_box_mat,
    BOX_MATERIAL_OPTIONS,
  ]);

  const filteredDoorStyleOptions = useMemo(() => {
    if (!selectedFaceMaterial) return DOOR_STYLE_OPTIONS;

    return DOOR_STYLE_OPTIONS.filter((option) => {
      // If material supports 5-piece, include both 5_piece_hardwood and slab_hardwood
      if (selectedFaceMaterial.five_piece === true) {
        if (
          option.id === FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD ||
          option.id === FACE_STYLE_VALUES.SLAB_HARDWOOD ||
          option.id === FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED
        ) {
          return true;
        }
      }

      // If material supports slab doors, include slab_sheet
      if (selectedFaceMaterial.slab_door === true) {
        if (
          option.id === FACE_STYLE_VALUES.SLAB_SHEET ||
          option.id === FACE_STYLE_VALUES.SLAB_SHEET_REEDED
        ) {
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

  // Get appropriate title
  const formTitle =
    editType === "team"
      ? "Team Defaults"
      : editType === "estimate"
      ? "Estimate Defaults"
      : "Section Details";

  return (
    <div className="bg-slate-50 border border-slate-400 rounded-lg p-4 shadow-sm">
      {editType !== "section" && (
        <div className="mb-2">
          <h2 className="text-xl font-bold text-slate-800">{formTitle}</h2>
          {editType === "estimate" && (
            <p className="text-sm text-slate-600">
              Use team defaults or set values to override for this estimate
              only.
            </p>
          )}
          {editType === "team" && (
            <p className="text-sm text-slate-600">
              These defaults will be used for all new estimates. All fields are
              required.
            </p>
          )}
        </div>
      )}

      {/* Error Message Display */}
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            Error saving defaults:
          </p>
          <p className="text-sm text-red-700 mt-1">{saveError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Cabinet Style Section */}
        <div className="grid grid-cols-[5fr_1fr] gap-2">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_9fr] gap-1 items-center">
              <h3 className="text-md font-medium text-slate-700">
                Cabinet Style
              </h3>
              <div className="border rounded-lg border-slate-400 p-3">
                <div className="grid grid-cols-[2fr_3fr] gap-2 items-center">
                  <div className="grid items-center">
                    <label
                      htmlFor="style"
                      className="text-left text-sm font-medium text-slate-700 flex items-center"
                    >
                      <span>Style</span>
                      {getEffectiveDefaultDisplay(
                        formData.style,
                        "default_cabinet_style_id",
                        "default_cabinet_style_id",
                        formatStyleName
                      )}
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
                      <option value="">{getPlaceholder("style")}</option>
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
            <div className="grid grid-cols-[1fr_9fr] gap-1 items-center">
              <h3 className="text-md font-medium text-slate-700">
                Cabinet Box
              </h3>
              <div className="border rounded-lg border-slate-400 p-3">
                <div className="grid grid-cols-[2fr_3fr] gap-3 items-center">
                  <div className="grid items-center">
                    <label
                      htmlFor="boxMaterial"
                      className="text-left text-sm font-medium text-slate-700 flex items-center"
                    >
                      <span>Material</span>
                      {getEffectiveDefaultDisplay(
                        formData.boxMaterial,
                        "default_box_mat",
                        "default_box_mat",
                        (id) => formatMaterialName(id, BOX_MATERIAL_OPTIONS)
                      )}
                    </label>
                    <select
                      id="boxMaterial"
                      name="boxMaterial"
                      value={formData.boxMaterial}
                      onChange={handleChange}
                      className={`block w-full rounded-md text-sm h-9 ${
                        errors.boxMaterial
                          ? "border-red-500"
                          : "border-slate-300"
                      } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                    >
                      <option value="">{getPlaceholder("box material")}</option>
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
                    <div>
                      {!mustSelectBoxFinish && (
                        <p className="text-xs text-teal-700 col-span-2 px-2 pt-1">
                          The selected box material does not require finish.
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Box Finish Options */}
                  <div>
                    <div className="grid items-center">
                      <label className="text-left text-sm font-medium text-slate-700 flex items-center">
                        <span>Finish</span>
                        {getEffectiveDefaultDisplay(
                          formData.boxFinish?.length > 0
                            ? formData.boxFinish
                            : null,
                          "default_box_finish",
                          "default_box_finish",
                          formatFinishArray,
                          false,
                          true,
                          "boxMaterial"
                        )}
                      </label>
                      <div className="grid grid-cols-3 gap-1 text-sm pl-2">
                        {FINISH_OPTIONS.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center space-x-2"
                          >
                            <input
                              disabled={!mustSelectBoxFinish}
                              type="checkbox"
                              checked={formData.boxFinish.includes(option.id)}
                              onChange={() =>
                                handleFinishChange(option.id, "boxFinish")
                              }
                              className="rounded border-slate-300"
                            />
                            <span className="text-slate-600">
                              {option.name}
                            </span>
                          </label>
                        ))}
                      </div>
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

            {/* Cabinet Face Material Section (with Finish) */}
            <div className="grid grid-cols-[1fr_9fr] gap-1 items-center">
              <h3 className="text-md font-medium text-slate-700">
                Cabinet Face
              </h3>
              <div className="border rounded-lg border-slate-400 p-3">
                <div className="grid grid-cols-[2fr_3fr] gap-3 items-center">
                  <div className="grid items-center">
                    <label
                      htmlFor="faceMaterial"
                      className="text-left text-sm font-medium text-slate-700 flex items-center"
                    >
                      <span>Material</span>
                      {getEffectiveDefaultDisplay(
                        formData.faceMaterial,
                        "default_face_mat",
                        "default_face_mat",
                        (id) => formatMaterialName(id, FACE_MATERIAL_OPTIONS)
                      )}
                    </label>
                    <select
                      id="faceMaterial"
                      name="faceMaterial"
                      value={formData.faceMaterial}
                      onChange={handleChange}
                      className={`block w-full rounded-md text-sm h-9 ${
                        errors.faceMaterial
                          ? "border-red-500"
                          : "border-slate-300"
                      } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                    >
                      <option value="">
                        {getPlaceholder("face material")}
                      </option>
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
                    <div>
                      {!mustSelectFaceFinish && (
                        <p className="text-xs text-teal-700 col-span-2 px-2 pt-1">
                          The selected face material does not require finish.
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Finish Options */}
                  <div>
                    <div className="grid items-center">
                      <label className="text-left text-sm font-medium text-slate-700 flex items-center">
                        <span>Finish</span>
                        {getEffectiveDefaultDisplay(
                          formData.faceFinish?.length > 0
                            ? formData.faceFinish
                            : null,
                          "default_face_finish",
                          "default_face_finish",
                          formatFinishArray,
                          false,
                          true,
                          "faceMaterial"
                        )}
                      </label>
                      <div className="grid grid-cols-3 gap-1 text-sm pl-2">
                        {FINISH_OPTIONS.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center space-x-2"
                          >
                            <input
                              disabled={!mustSelectFaceFinish}
                              type="checkbox"
                              checked={formData.faceFinish.includes(option.id)}
                              onChange={() =>
                                handleFinishChange(option.id, "faceFinish")
                              }
                              className="rounded border-slate-300"
                            />
                            <span className="text-slate-600">
                              {option.name}
                            </span>
                          </label>
                        ))}
                      </div>
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

            {/* Door Style Section */}
            <div className="grid grid-cols-[1fr_9fr] gap-1 items-center">
              <h3 className="text-md font-medium text-slate-700">Doors</h3>
              <div className="border rounded-lg border-slate-400 p-3">
                <div className="grid gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Door Style */}
                    <div className="grid items-center">
                      <label
                        htmlFor="doorStyle"
                        className="text-left text-sm font-medium text-slate-700 flex items-center"
                      >
                        <span>Style</span>
                        {getEffectiveDefaultDisplay(
                          formData.doorStyle,
                          "default_door_style",
                          "default_door_style",
                          formatDoorStyleName
                        )}
                      </label>
                      <select
                        id="doorStyle"
                        name="doorStyle"
                        value={formData.doorStyle}
                        onChange={handleChange}
                        className={`block w-full rounded-md text-sm h-9 ${
                          errors.doorStyle
                            ? "border-red-500"
                            : "border-slate-300"
                        } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                      >
                        <option value="">{getPlaceholder("door style")}</option>
                        {filteredDoorStyleOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {`${option.label}`}
                          </option>
                        ))}
                      </select>
                      {errors.doorStyle && (
                        <p className="text-xs text-red-500 col-span-2">
                          {errors.doorStyle}
                        </p>
                      )}
                    </div>
                    {/* Door Hinges */}
                    <div className="grid items-center">
                      <label
                        htmlFor="hinge_id"
                        className="text-left text-sm font-medium text-slate-700"
                      >
                        Hinges
                        {getEffectiveDefaultDisplay(
                          formData.hinge_id,
                          "default_hinge_id",
                          "default_hinge_id",
                          formatHingeName
                        )}
                      </label>
                      <select
                        id="hinge_id"
                        name="hinge_id"
                        value={formData.hinge_id}
                        onChange={handleChange}
                        className={`block w-full h-9 rounded-md text-sm ${
                          errors.hinge_id
                            ? "border-red-500"
                            : "border-slate-300"
                        } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                      >
                        <option value="">{getPlaceholder("hinge type")}</option>
                        {DOOR_HINGE_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {`${option.name} - $${option.price}/pair`}
                          </option>
                        ))}
                      </select>
                      {errors.hinge_id && (
                        <p className="text-xs text-red-500 col-span-2">
                          {errors.hinge_id}
                        </p>
                      )}
                    </div>
                    {/* Door Pulls */}
                    <div className="grid items-center">
                      <label
                        htmlFor="door_pull_id"
                        className="text-left text-sm font-medium text-slate-700 flex items-center"
                      >
                        <span>Pulls</span>
                        {getEffectiveDefaultDisplay(
                          formData.door_pull_id,
                          "default_door_pull_id",
                          "default_door_pull_id",
                          formatPullName
                        )}
                      </label>
                      <select
                        id="door_pull_id"
                        name="door_pull_id"
                        value={formData.door_pull_id}
                        onChange={handleChange}
                        className={`block w-full h-9 rounded-md text-sm ${
                          errors.door_pull_id
                            ? "border-red-500"
                            : "border-slate-300"
                        } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                      >
                        <option value="">
                          {getPlaceholder("door pull type")}
                        </option>
                        {PULL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {`${option.name} - $${option.price}/pull`}
                          </option>
                        ))}
                      </select>
                      {errors.door_pull_id && (
                        <p className="text-xs text-red-500 col-span-2">
                          {errors.door_pull_id}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Door Moldings */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid items-center">
                      <label className="text-left text-sm font-medium text-slate-700 flex items-center">
                        <span>Inside Molding</span>
                        {getEffectiveDefaultDisplay(
                          formData.doorInsideMolding,
                          "default_door_inside_molding",
                          "default_door_inside_molding",
                          formatBoolean
                        )}
                      </label>
                      <select
                        name="doorInsideMolding"
                        value={getBooleanSelectValue(
                          formData.doorInsideMolding
                        )}
                        onChange={handleChange}
                        className="block w-full rounded-md text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">{getPlaceholder("...")}</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="grid items-center">
                      <label className="text-left text-sm font-medium text-slate-700 flex items-center">
                        <span>Outside Molding</span>
                        {getEffectiveDefaultDisplay(
                          formData.doorOutsideMolding,
                          "default_door_outside_molding",
                          "default_door_outside_molding",
                          formatBoolean
                        )}
                      </label>
                      <select
                        name="doorOutsideMolding"
                        value={getBooleanSelectValue(
                          formData.doorOutsideMolding
                        )}
                        onChange={handleChange}
                        className="block w-full rounded-md text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">{getPlaceholder("...")}</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="grid items-center">
                      <label className="text-left text-sm font-medium text-slate-700 flex items-center">
                        <span>Reeded Panel</span>
                        {getEffectiveDefaultDisplay(
                          formData.doorReededPanel,
                          "default_door_reeded_panel",
                          "default_door_reeded_panel",
                          formatBoolean
                        )}
                      </label>
                      <select
                        name="doorReededPanel"
                        value={getBooleanSelectValue(formData.doorReededPanel)}
                        onChange={handleChange}
                        className="block w-full rounded-md text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">{getPlaceholder("...")}</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Front Style Section */}
            <div className="grid grid-cols-[1fr_9fr] gap-1 items-center">
              <h3 className="text-md font-medium text-slate-700">
                Drawer Fronts
              </h3>
              <div className="border rounded-lg border-slate-400 p-3">
                <div className="grid gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Drawer Front Style */}
                    <div className="grid items-center">
                      <label
                        htmlFor="drawerFrontStyle"
                        className="text-left text-sm font-medium text-slate-700 flex items-center"
                      >
                        <span>Style</span>
                        {getEffectiveDefaultDisplay(
                          formData.drawerFrontStyle,
                          "default_drawer_front_style",
                          "default_drawer_front_style",
                          formatDoorStyleName
                        )}
                      </label>
                      <select
                        id="drawerFrontStyle"
                        name="drawerFrontStyle"
                        value={formData.drawerFrontStyle}
                        onChange={handleChange}
                        className="block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">
                          {getPlaceholder("drawer front style")}
                        </option>
                        {filteredDoorStyleOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.drawerFrontStyle && (
                        <p className="text-xs text-red-500 col-span-2">
                          {errors.drawerFrontStyle}
                        </p>
                      )}
                    </div>
                    {/* Drawer Slides */}
                    <div className="grid items-center">
                      <label
                        htmlFor="slide_id"
                        className="text-left text-sm font-medium text-slate-700 flex items-center"
                      >
                        <span>Slides</span>
                        {getEffectiveDefaultDisplay(
                          formData.slide_id,
                          "default_slide_id",
                          "default_slide_id",
                          formatSlideName
                        )}
                      </label>
                      <select
                        id="slide_id"
                        name="slide_id"
                        value={formData.slide_id}
                        onChange={handleChange}
                        className={`block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                          errors.slide_id ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">
                          {getPlaceholder("drawer slide type")}
                        </option>
                        {DRAWER_SLIDE_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {`${option.name} - $${option.price}/pair`}
                          </option>
                        ))}
                      </select>
                      {errors.slide_id && (
                        <p className="text-xs text-red-500 col-span-2">
                          {errors.slide_id}
                        </p>
                      )}
                    </div>
                    {/* Drawer  Pulls */}
                    <div className="grid items-center">
                      <label
                        htmlFor="drawer_pull_id"
                        className="text-left text-sm font-medium text-slate-700 flex items-center"
                      >
                        <span>Pulls</span>
                        {getEffectiveDefaultDisplay(
                          formData.drawer_pull_id,
                          "default_drawer_pull_id",
                          "default_drawer_pull_id",
                          formatPullName
                        )}
                      </label>
                      <select
                        id="drawer_pull_id"
                        name="drawer_pull_id"
                        value={formData.drawer_pull_id}
                        onChange={handleChange}
                        className={`block w-full h-9 rounded-md text-sm ${
                          errors.drawer_pull_id
                            ? "border-red-500"
                            : "border-slate-300"
                        } focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                      >
                        <option value="">
                          {getPlaceholder("drawer pull type")}
                        </option>
                        {PULL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {`${option.name} - $${option.price}/pull`}
                          </option>
                        ))}
                      </select>
                      {errors.drawer_pull_id && (
                        <p className="text-xs text-red-500 col-span-2">
                          {errors.drawer_pull_id}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Drawer Front Moldings */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid items-center">
                      <label className="text-left text-sm font-medium text-slate-700 flex items-center">
                        <span>Inside Molding</span>
                        {getEffectiveDefaultDisplay(
                          formData.drawerInsideMolding,
                          "default_drawer_inside_molding",
                          "default_drawer_inside_molding",
                          formatBoolean
                        )}
                      </label>
                      <select
                        name="drawerInsideMolding"
                        value={getBooleanSelectValue(
                          formData.drawerInsideMolding
                        )}
                        onChange={handleChange}
                        className="block w-full rounded-md text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">{getPlaceholder("...")}</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="grid items-center">
                      <label className="text-left text-sm font-medium text-slate-700 flex items-center">
                        <span>Outside Molding</span>
                        {getEffectiveDefaultDisplay(
                          formData.drawerOutsideMolding,
                          "default_drawer_outside_molding",
                          "default_drawer_outside_molding",
                          formatBoolean
                        )}
                      </label>
                      <select
                        name="drawerOutsideMolding"
                        value={getBooleanSelectValue(
                          formData.drawerOutsideMolding
                        )}
                        onChange={handleChange}
                        className="block w-full rounded-md text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">{getPlaceholder("...")}</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="grid items-center">
                      <label className="text-left text-sm font-medium text-slate-700 flex items-center">
                        <span>Reeded Panel</span>
                        {getEffectiveDefaultDisplay(
                          formData.drawerReededPanel,
                          "default_drawer_reeded_panel",
                          "default_drawer_reeded_panel",
                          formatBoolean
                        )}
                      </label>
                      <select
                        name="drawerReededPanel"
                        value={getBooleanSelectValue(
                          formData.drawerReededPanel
                        )}
                        onChange={handleChange}
                        className="block w-full rounded-md text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">{getPlaceholder("...")}</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>

                  {/* Drawer Box Material */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className="grid items-center">
                      <label
                        htmlFor="drawer_box_mat"
                        className="text-left text-sm font-medium text-slate-700 flex items-center"
                      >
                        <span>Drawer Boxes</span>
                        {getEffectiveDefaultDisplay(
                          formData.drawer_box_mat,
                          "default_drawer_box_mat",
                          "default_drawer_box_mat",
                          (id) => formatMaterialName(id, DRAWER_BOX_OPTIONS)
                        )}
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
                        <option value="">
                          {getPlaceholder("drawer box material")}
                        </option>
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
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg border-slate-400 p-3 w-full h-full">
            <h3 className="text-md font-medium text-slate-700 mb-3">
              Adjustments
            </h3>
            <div className="space-y-3">
              {/* Quantity */}
              <div className="flex flex-col gap-2 items-center">
                <label
                  htmlFor="quantity"
                  className="text-right text-sm font-medium text-slate-700"
                >
                  Quantity
                </label>
                <input
                  type="text"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="1"
                  disabled={editType !== "section"}
                  className="block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                />
              </div>

              {/* Profit */}
              <div className="flex flex-col gap-2 items-center">
                <label
                  htmlFor="profit"
                  className="text-right text-sm font-medium text-slate-700 flex items-center justify-center"
                >
                  <span>Profit</span>
                  {getEffectiveDefaultDisplay(
                    formData.profit,
                    "default_profit",
                    "default_profit",
                    formatPercentage,
                    true
                  )}
                </label>
                <input
                  type="text"
                  id="profit"
                  name="profit"
                  value={formData.profit}
                  onChange={handleChange}
                  placeholder="%"
                  className="block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                />
              </div>

              {/* Commission */}
              <div className="flex flex-col gap-2 items-center">
                <label
                  htmlFor="commission"
                  className="text-right text-sm font-medium text-slate-700 flex items-center justify-center"
                >
                  <span>Commission</span>
                  {getEffectiveDefaultDisplay(
                    formData.commission,
                    "default_commission",
                    "default_commission",
                    formatPercentage,
                    true
                  )}
                </label>
                <input
                  type="text"
                  id="commission"
                  name="commission"
                  value={formData.commission}
                  onChange={handleChange}
                  placeholder="%"
                  className="block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                />
              </div>

              {/* Discount */}
              <div className="flex flex-col gap-2 items-center">
                <label
                  htmlFor="discount"
                  className="text-right text-sm font-medium text-slate-700 flex items-center justify-center"
                >
                  <span>Discount</span>
                  {getEffectiveDefaultDisplay(
                    formData.discount,
                    "default_discount",
                    "default_discount",
                    formatPercentage,
                    true
                  )}
                </label>
                <input
                  type="text"
                  id="discount"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="%"
                  className="block w-full h-9 rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section - only for sections */}
        {editType === "section" && (
          <div className="grid grid-cols-[1fr_12fr] gap-2 items-center">
            <label
              htmlFor="notes"
              className="block text-md font-medium text-slate-700"
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
        )}

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
            {editType === "team"
              ? "Save Team Defaults"
              : editType === "estimate"
              ? "Save Estimate Defaults"
              : "Save Section"}
          </button>
        </div>
      </form>
    </div>
  );
};

EstimateSectionForm.propTypes = {
  editType: PropTypes.oneOf(["team", "estimate", "section"]),
  section: PropTypes.object,
  estimateData: PropTypes.object,
  teamData: PropTypes.object,
  taskId: PropTypes.number,
  onCancel: PropTypes.func,
  onSave: PropTypes.func,
};

export default EstimateSectionForm;
