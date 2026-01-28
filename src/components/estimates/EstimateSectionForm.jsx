import PropTypes from "prop-types";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  FiSave,
  FiX,
  FiCopy,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { RiResetLeftFill } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";

import {
  addSection,
  updateSection,
  updateEstimateDefaults,
} from "../../redux/actions/estimates";
import { updateTeamDefaults } from "../../redux/actions/teamEstimateDefaults";
import { FACE_STYLES, FACE_STYLE_VALUES , EDIT_TYPES } from "../../utils/constants";
import {
  getNewSectionDefaults,
  getEffectiveValue,
  getEffectiveValueOnly,
  shouldApplyFinish,
} from "../../utils/estimateDefaults";

import CopyRoomDetailsModal from "./CopyRoomDetailsModal.jsx";

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
  editType = EDIT_TYPES.SECTION,
  section = {},
  estimateData = null,
  teamData = null,
  onCancel,
  onSave,
  taskId,
}) => {
  const dispatch = useDispatch();
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const materials = useSelector((state) => state.materials);
  const hardware = useSelector((state) => state.hardware);
  const { styles: cabinetStyles } = useSelector((state) => state.cabinetStyles);
  const finishes = useSelector((state) => state.finishes);
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults,
  );

  // Style constants
  const STYLES = {
    sectionHeader: "text-md font-medium text-slate-200",
    sectionBorder: "border rounded-lg border-slate-400 p-3",
    label: "text-left text-sm font-medium flex items-center text-slate-200",
    input: "block w-full rounded-md text-sm h-9 bg-slate-700 text-slate-200",
    inputError: "border-red-500",
    inputNormal: "border-slate-300",
    inputFocus: "focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
    select: "block w-full rounded-md text-sm h-9 bg-slate-700 text-slate-200",
    errorText: "text-xs text-red-500 col-span-2",
    checkboxLabel: "flex items-center space-x-2 text-slate-200",
    checkboxLabelDisabled: "opacity-50",
    door_drawer_grid: "grid grid-cols-3 gap-4",
    material_finish_warn: "text-xs text-teal-400",
  };

  const COLOR_CLASS = "teal-600";

  const FACE_MATERIAL_OPTIONS = materials?.faceMaterials || [];
  const BOX_MATERIAL_OPTIONS = materials?.boxMaterials || [];
  const STYLE_OPTIONS = cabinetStyles || [];
  const FINISH_OPTIONS = finishes?.finishes || [];
  const DOOR_STYLE_OPTIONS = FACE_STYLES || [];
  const DRAWER_BOX_OPTIONS = materials?.drawerBoxMaterials || [];
  const DOOR_HINGE_OPTIONS = hardware.hinges || [];
  const DRAWER_SLIDE_OPTIONS = hardware.slides || [];
  const PULL_OPTIONS = hardware.pulls || [];

  const services = useSelector((state) => state.services?.allServices || []);
  const activeServices = services.filter((service) => service.is_active);

  const isNewSection = !section.est_section_id;

  // Determine what data to use based on editType
  const editingData = useMemo(() => {
    if (editType === EDIT_TYPES.TEAM) return teamData;
    if (editType === EDIT_TYPES.ESTIMATE) return estimateData || currentEstimate;
    return section; // 'section' mode
  }, [editType, teamData, estimateData, currentEstimate, section]);

  // Get default values for new sections using fallback logic
  // Only use getNewSectionDefaults if we don't have template data (section is empty)
  const initialDefaults = useMemo(() => {
    if (editType === EDIT_TYPES.SECTION && isNewSection) {
      // Check if section has any template data (from copying last section)
      const hasTemplateData = Object.keys(section).some(
        (key) => key !== "est_section_id" && section[key] !== undefined,
      );

      // If we have template data, don't resolve defaults - keep null values
      // This allows the fallback logic to work at render/calculation time
      if (hasTemplateData) {
        return {};
      }

      // Only resolve defaults for completely new sections with no template
      return getNewSectionDefaults(currentEstimate, teamDefaults);
    }
    return {};
  }, [editType, isNewSection, currentEstimate, teamDefaults, section]);

  // Determine field name prefix (team and estimate use 'default_' prefix)
  const getFieldName = (baseName) => {
    if (editType === EDIT_TYPES.TEAM || editType === EDIT_TYPES.ESTIMATE) {
      return `default_${baseName}`;
    }
    return baseName;
  };

  // Get placeholder text based on edit type
  const getPlaceholder = (itemName) => {
    if (editType === EDIT_TYPES.SECTION) {
      return `Estimate Default`;
    } else if (editType === EDIT_TYPES.ESTIMATE) {
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
    shouldShowFallback = true,
    fourthTierFallbackValue = null,
  ) => {
    // Don't show for team edit type
    if (editType === EDIT_TYPES.TEAM) {
      return null;
    }

    // For numeric fields, treat 0, null, undefined, or empty string as empty
    // For finish fields (arrays), treat null, undefined, or empty arrays as empty
    // For non-numeric fields, check for null, undefined, or empty string
    const isEmpty = isNumeric
      ? fieldValue === "" ||
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === 0
      : isFinishField
        ? fieldValue === null ||
          fieldValue === undefined ||
          (Array.isArray(fieldValue) && fieldValue.length === 0)
        : fieldValue === "" || fieldValue === null || fieldValue === undefined;

    if (!isEmpty) {
      return <span className="flex-1 px-1 border border-amber-400 ml-1"></span>;
    }

    // For finish fields, only show fallback if the material needs finish
    if (isFinishField && !shouldShowFallback) {
      return null;
    }

    // When in estimate editing mode, skip estimate tier to show team defaults
    const estimateValue =
      editType === EDIT_TYPES.ESTIMATE ? null : currentEstimate?.[estimateKey];
    const teamValue = teamDefaults?.[teamDefaultKey];
    const { value, source } = getEffectiveValue(null, estimateValue, teamValue);

    // If no value found in 3-tier fallback, check for 4th tier fallback
    const effectiveValue =
      value === null || value === undefined ? fourthTierFallbackValue : value;

    // Don't show if there's no effective value
    // For numeric fields, allow null/undefined to pass to formatter (will show "0%")
    // For other fields, return early if no value
    if (!isNumeric && (effectiveValue === null || effectiveValue === undefined))
      return null;

    const displayValue = formatter ? formatter(effectiveValue) : effectiveValue;

    return (
      displayValue && (
        // <span className={`text-sm ${colorClass} ml-1`}>({displayValue})</span>
        <span
          className={`flex-1 px-1 text-white text-sm bg-${COLOR_CLASS} ml-1`}
        >
          {displayValue}
        </span>
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
    if (value === null || value === undefined) return "0%";
    return `${value}%`;
  };

  const formatServiceRate = (value) => {
    if (value === null || value === undefined) return "$0";
    return `$${value}`;
  };

  // Get effective service rate display - uses existing getEffectiveValue with service-specific paths
  const getEffectiveServiceRateDisplay = (serviceId, service) => {
    // Don't show for team edit type
    if (editType === EDIT_TYPES.TEAM) {
      return null;
    }

    const fieldValue = formData.service_price_overrides?.[serviceId];
    const isEmpty =
      fieldValue === "" || fieldValue === null || fieldValue === undefined;

    if (!isEmpty) {
      return <span className="flex-1 px-1 border border-amber-400 ml-1"></span>;
    }

    // Extract service-specific values for three-tier fallback
    // When in estimate editing mode, skip estimate tier to show team defaults
    const sectionValue = null; // We're in the form, so section override is what we're editing
    const estimateValue =
      editType === EDIT_TYPES.ESTIMATE
        ? null
        : currentEstimate?.default_service_price_overrides?.[serviceId];
    const teamValue = service?.hourly_rate; // Service default rate from services store

    const { value } = getEffectiveValue(sectionValue, estimateValue, teamValue);

    // Don't show if there's no effective value
    if (value === null || value === undefined) return null;

    const displayValue = formatServiceRate(value);

    return (
      displayValue && (
        <span
          className={`flex-1 px-1 text-white text-sm bg-${COLOR_CLASS} ml-1`}
        >
          {displayValue}
        </span>
      )
    );
  };

  const [mustSelectFaceFinish, setMustSelectFaceFinish] = useState(false);
  const [mustSelectBoxFinish, setMustSelectBoxFinish] = useState(false);
  const [mustSelectDoorFinish, setMustSelectDoorFinish] = useState(false);
  const [mustSelectDrawerFrontFinish, setMustSelectDrawerFrontFinish] =
    useState(false);
  const [selectedFaceMaterial, setSelectedFaceMaterial] = useState(null);
  const [selectedBoxMaterial, setSelectedBoxMaterial] = useState(null);
  const [selectedDoorMaterial, setSelectedDoorMaterial] = useState(null);
  const [selectedDrawerFrontMaterial, setSelectedDrawerFrontMaterial] =
    useState(null);
  const [showDoorMaterialOptions, setShowDoorMaterialOptions] = useState(false);
  const [showDrawerFrontMaterialOptions, setShowDrawerFrontMaterialOptions] =
    useState(false);

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
    const doorPanelModField = getFieldName("door_panel_mod_id");
    const drawerPanelModField = getFieldName("drawer_panel_mod_id");
    const hingeField = getFieldName("hinge_id");
    const slideField = getFieldName("slide_id");
    const doorPullField = getFieldName("door_pull_id");
    const drawerPullField = getFieldName("drawer_pull_id");
    const drawerBoxMatField = getFieldName("drawer_box_mat");
    const boxFinishField = getFieldName("box_finish");
    const faceFinishField = getFieldName("face_finish");
    const doorMatField = getFieldName("door_mat");
    const doorFinishField = getFieldName("door_finish");
    const drawerFrontMatField = getFieldName("drawer_front_mat");
    const drawerFrontFinishField = getFieldName("drawer_front_finish");
    const profitField = getFieldName("profit");
    const commissionField = getFieldName("commission");
    const discountField = getFieldName("discount");
    const servicePriceOverridesField = getFieldName("service_price_overrides");

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
      doorPanelModId:
        data[doorPanelModField] ??
        data.door_panel_mod_id ??
        initialDefaults.door_panel_mod_id ??
        "",
      drawerPanelModId:
        data[drawerPanelModField] ??
        data.drawer_panel_mod_id ??
        initialDefaults.drawer_panel_mod_id ??
        "",
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
      door_mat:
        data[doorMatField] || data.door_mat || initialDefaults.door_mat || "",
      door_finish: Array.isArray(data[doorFinishField])
        ? data[doorFinishField]
        : Array.isArray(data.door_finish)
          ? data.door_finish
          : Array.isArray(initialDefaults.door_finish)
            ? initialDefaults.door_finish
            : [],
      drawer_front_mat:
        data[drawerFrontMatField] ||
        data.drawer_front_mat ||
        initialDefaults.drawer_front_mat ||
        "",
      drawer_front_finish: Array.isArray(data[drawerFrontFinishField])
        ? data[drawerFrontFinishField]
        : Array.isArray(data.drawer_front_finish)
          ? data.drawer_front_finish
          : Array.isArray(initialDefaults.drawer_front_finish)
            ? initialDefaults.drawer_front_finish
            : [],
      notes: Array.isArray(data.notes) ? data.notes : ["", "", ""],
      quantity: data.quantity ?? 1,
      profit: data[profitField] ?? data.profit ?? initialDefaults.profit ?? "",
      commission:
        data[commissionField] ??
        data.commission ??
        initialDefaults.commission ??
        "",
      discount:
        data[discountField] ?? data.discount ?? initialDefaults.discount ?? "",
      service_price_overrides:
        data[servicePriceOverridesField] ??
        data.service_price_overrides ??
        initialDefaults.service_price_overrides ??
        {},
    };
  });

  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Track if door/drawer specific materials or finishes are being used
  const isDoorMaterialCustomized = useMemo(() => {
    return (
      (formData.door_mat !== null &&
        formData.door_mat !== "" &&
        formData.door_mat !== undefined) ||
      (formData.door_finish &&
        Array.isArray(formData.door_finish) &&
        formData.door_finish.length > 0)
    );
  }, [formData.door_mat, formData.door_finish]);

  const isDrawerFrontMaterialCustomized = useMemo(() => {
    return (
      (formData.drawer_front_mat !== null &&
        formData.drawer_front_mat !== "" &&
        formData.drawer_front_mat !== undefined) ||
      (formData.drawer_front_finish &&
        Array.isArray(formData.drawer_front_finish) &&
        formData.drawer_front_finish.length > 0)
    );
  }, [formData.drawer_front_mat, formData.drawer_front_finish]);

  // Refs for synchronized textarea heights
  const notesTextareaRefs = useRef([]);

  // Function to synchronize textarea heights
  const syncTextareaHeights = useCallback(() => {
    const textareas = notesTextareaRefs.current.filter(Boolean);
    if (textareas.length === 0) return;

    // Reset heights to auto to get natural height
    textareas.forEach((textarea) => {
      textarea.style.height = "auto";
    });

    // Find the maximum scroll height
    const maxHeight = Math.max(
      ...textareas.map((textarea) => textarea.scrollHeight),
    );

    // Set all textareas to the maximum height
    textareas.forEach((textarea) => {
      textarea.style.height = `${maxHeight}px`;
    });
  }, []);

  const clearFinishes = useCallback(
    (section) => {
      setFormData({
        ...formData,
        [section]: [],
      });
    },
    [formData],
  );

  const getTiers = useCallback(
    (field, options = {}) => {
      const { emptyIsNull = false } = options;

      // 1. Get raw value from formData
      let formDataValue = formData[field] ?? null;

      // 2. Treat empty string as null (when user selects "team default")
      if (formDataValue === "") {
        formDataValue = null;
      }

      // 3. Convert empty arrays to null when needed
      if (
        emptyIsNull &&
        Array.isArray(formDataValue) &&
        formDataValue.length === 0
      ) {
        formDataValue = null;
      }

      // 3. Determine the correct estimate/team key
      const estimateKeyMap = {
        faceMaterial: "default_face_mat",
        boxMaterial: "default_box_mat",
        faceFinish: "default_face_finish",
        boxFinish: "default_box_finish",
      };

      const estimateKey = estimateKeyMap[field];

      // 4. Build tier values
      return {
        section: editType === EDIT_TYPES.SECTION ? formDataValue : null,
        estimate:
          editType === EDIT_TYPES.ESTIMATE
            ? formDataValue
            : (currentEstimate?.[estimateKey] ?? null),
        team:
          editType === EDIT_TYPES.TEAM
            ? formDataValue
            : (teamDefaults?.[estimateKey] ?? null),
      };
    },
    [editType, formData, currentEstimate, teamDefaults],
  );

  const handleChange = (e) => {
    const { name, value, dataset } = e.target;
    const notesIndex = dataset.notesIndex;

    // Handle notes array separately
    if (name === "notes" && notesIndex !== undefined) {
      const newNotes = [...formData.notes];
      newNotes[parseInt(notesIndex)] = value;
      setFormData({
        ...formData,
        notes: newNotes,
      });

      // Synchronize textarea heights
      setTimeout(() => {
        syncTextareaHeights();
      }, 0);
      return;
    }

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
      "drawerInsideMolding",
      "drawerOutsideMolding",
    ];

    // Handle panel mod ID fields (foreign keys)
    const panelModIdFields = ["doorPanelModId", "drawerPanelModId"];

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
    } else if (panelModIdFields.includes(name)) {
      // For panel mod ID fields: convert empty string to null, otherwise to number
      processedValue = value === "" ? null : +value;
    }

    setFormData({
      ...formData,
      [name]: processedValue,
    });

    if (name === "faceMaterial") {
      const selectedMaterial = FACE_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +value,
      );
      setSelectedFaceMaterial(selectedMaterial);
    }

    if (name === "boxMaterial") {
      const selectedMaterial = BOX_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +value,
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

  const handleRestoreDefaults = () => {
    // Restore all fields to defaults based on editType
    if (editType !== EDIT_TYPES.TEAM) {
      // Reset to estimate defaults
      setFormData({
        style: "",
        boxMaterial: "",
        boxFinish: [],
        faceMaterial: "",
        faceFinish: [],
        doorStyle: "",
        drawerFrontStyle: "",
        doorInsideMolding: null,
        doorOutsideMolding: null,
        doorPanelModId: "",
        drawerInsideMolding: null,
        drawerOutsideMolding: null,
        drawerPanelModId: "",
        hinge_id: "",
        slide_id: "",
        door_pull_id: "",
        drawer_pull_id: "",
        drawer_box_mat: "",
        door_mat: "",
        door_finish: [],
        drawer_front_mat: "",
        drawer_front_finish: [],
        notes: "",
        quantity: 1,
        profit: "",
        commission: "",
        discount: "",
      });
    }

    // Clear any errors
    setErrors({});
  };

  const handleCopyFromSection = (sourceSection) => {
    // Copy all relevant fields from the source section to formData
    setFormData({
      ...formData,
      style: sourceSection.cabinet_style_id || "",
      boxMaterial: sourceSection.box_mat || "",
      boxFinish: sourceSection.box_finish || [],
      faceMaterial: sourceSection.face_mat || "",
      faceFinish: sourceSection.face_finish || [],
      door_finish: sourceSection.door_finish || [],
      door_mat: sourceSection.door_mat || "",
      doorStyle: sourceSection.door_style || "",
      drawerFrontStyle: sourceSection.drawer_front_style || "",
      drawer_front_finish: sourceSection.drawer_front_finish || [],
      drawer_front_mat: sourceSection.drawer_front_mat || "",
      doorInsideMolding: sourceSection.door_inside_molding ?? null,
      doorOutsideMolding: sourceSection.door_outside_molding ?? null,
      drawerInsideMolding: sourceSection.drawer_inside_molding ?? null,
      drawerOutsideMolding: sourceSection.drawer_outside_molding ?? null,
      doorPanelModId: sourceSection.door_panel_mod_id ?? "",
      drawerPanelModId: sourceSection.drawer_panel_mod_id ?? "",
      hinge_id: sourceSection.hinge_id || "",
      slide_id: sourceSection.slide_id || "",
      door_pull_id: sourceSection.door_pull_id || "",
      drawer_pull_id: sourceSection.drawer_pull_id || "",
      drawer_box_mat: sourceSection.drawer_box_mat || "",
      profit: sourceSection.profit ?? "",
      commission: sourceSection.commission ?? "",
      discount: sourceSection.discount ?? "",
      service_price_overrides: sourceSection.service_price_overrides || {},
      // Don't copy notes - keep the current notes
      notes: formData.notes,
      // Don't copy quantity - keep the current quantity
      quantity: formData.quantity,
    });

    // Clear any validation errors since we're loading new data
    setErrors({});
  };

  const validateForm = () => {
    const ERROR_MESSAGES = {
      ONE_FINISH: "At least one finish option is required",
      COMPATIBLE_DOOR_STYLE: "Choose a compatible door style",
      COMPATIBLE_DRAWER_FRONT_STYLE: "Choose a compatible drawer front style",
    }
    const newErrors = {};

    // For estimate defaults and sections, most fields are optional (can use fallback)
    // But we still need to validate finish fields if the material needs finish
    if (editType === EDIT_TYPES.ESTIMATE || editType === EDIT_TYPES.SECTION) {
      // Check if face finish is needed using the same logic as useEffect
      const faceMaterialTiers = getTiers("faceMaterial");
      const faceFinishNeeded = shouldApplyFinish(
        faceMaterialTiers.section,
        faceMaterialTiers.estimate,
        faceMaterialTiers.team,
        FACE_MATERIAL_OPTIONS,
      );

      if (faceFinishNeeded) {
        const faceFinishTiers = getTiers("faceFinish", { emptyIsNull: true });
        const effectiveFaceFinish = getEffectiveValue(
          faceFinishTiers.section,
          faceFinishTiers.estimate,
          faceFinishTiers.team,
        );
        if (
          !effectiveFaceFinish.value ||
          effectiveFaceFinish.value.length === 0
        ) {
          newErrors.faceFinish = ERROR_MESSAGES.ONE_FINISH;
        }
      }

      // Check if box finish is needed using the same logic as useEffect
      const boxMaterialTiers = getTiers("boxMaterial");
      const boxFinishNeeded = shouldApplyFinish(
        boxMaterialTiers.section,
        boxMaterialTiers.estimate,
        boxMaterialTiers.team,
        BOX_MATERIAL_OPTIONS,
      );

      if (boxFinishNeeded) {
        const boxFinishTiers = getTiers("boxFinish", { emptyIsNull: true });
        const effectiveBoxFinish = getEffectiveValue(
          boxFinishTiers.section,
          boxFinishTiers.estimate,
          boxFinishTiers.team,
        );
        if (
          !effectiveBoxFinish.value ||
          effectiveBoxFinish.value.length === 0
        ) {
          newErrors.boxFinish = ERROR_MESSAGES.ONE_FINISH;
        }
      }

      // Validate door style is compatible with effective face material
      const effectiveFaceMaterialId = getEffectiveValueOnly(
        faceMaterialTiers.section,
        faceMaterialTiers.estimate,
        faceMaterialTiers.team,
      );

      const effectiveDoorStyle = getEffectiveValueOnly(
        formData.doorStyle || null,
        currentEstimate?.default_door_style || null,
        teamDefaults?.default_door_style || null,
      );

      // Check if door_mat is compatible with door style (if door_mat is set)
      if (formData.door_mat && effectiveDoorStyle) {
        const doorMaterial = FACE_MATERIAL_OPTIONS.find(
          (mat) => mat.id === formData.door_mat,
        );

        if (doorMaterial) {
          const isValidDoorMat =
            (doorMaterial.five_piece === true &&
              (effectiveDoorStyle === FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD ||
                effectiveDoorStyle === FACE_STYLE_VALUES.SLAB_HARDWOOD ||
                effectiveDoorStyle ===
                  FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED)) ||
            (doorMaterial.slab_door === true &&
              (effectiveDoorStyle === FACE_STYLE_VALUES.SLAB_SHEET ||
                effectiveDoorStyle === FACE_STYLE_VALUES.SLAB_SHEET_REEDED));

          if (!isValidDoorMat) {
            newErrors.doorStyle = ERROR_MESSAGES.COMPATIBLE_DOOR_STYLE;
          }
        }
      }

      // Check if door style is compatible with face material (if no door_mat override)
      if (!formData.door_mat && effectiveFaceMaterialId && effectiveDoorStyle) {
        const material = FACE_MATERIAL_OPTIONS.find(
          (mat) => mat.id === effectiveFaceMaterialId,
        );

        if (material) {
          // Check if door style is valid for this material
          const isValidDoorStyle =
            (material.five_piece === true &&
              (effectiveDoorStyle === FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD ||
                effectiveDoorStyle === FACE_STYLE_VALUES.SLAB_HARDWOOD ||
                effectiveDoorStyle ===
                  FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED)) ||
            (material.slab_door === true &&
              (effectiveDoorStyle === FACE_STYLE_VALUES.SLAB_SHEET ||
                effectiveDoorStyle === FACE_STYLE_VALUES.SLAB_SHEET_REEDED));

          if (!isValidDoorStyle) {
            newErrors.doorStyle = ERROR_MESSAGES.COMPATIBLE_DOOR_STYLE;
          }
        }
      }

      // Validate drawer front style is compatible with effective face material
      const effectiveDrawerFrontStyle = getEffectiveValueOnly(
        formData.drawerFrontStyle || null,
        currentEstimate?.default_drawer_front_style || null,
        teamDefaults?.default_drawer_front_style || null,
      );

      // Check if drawer_front_mat is compatible with drawer front style (if drawer_front_mat is set)
      if (formData.drawer_front_mat && effectiveDrawerFrontStyle) {
        const drawerFrontMaterial = FACE_MATERIAL_OPTIONS.find(
          (mat) => mat.id === formData.drawer_front_mat,
        );

        if (drawerFrontMaterial) {
          const isValidDrawerFrontMat =
            (drawerFrontMaterial.five_piece === true &&
              (effectiveDrawerFrontStyle ===
                FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD ||
                effectiveDrawerFrontStyle === FACE_STYLE_VALUES.SLAB_HARDWOOD ||
                effectiveDrawerFrontStyle ===
                  FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED)) ||
            (drawerFrontMaterial.slab_door === true &&
              (effectiveDrawerFrontStyle === FACE_STYLE_VALUES.SLAB_SHEET ||
                effectiveDrawerFrontStyle ===
                  FACE_STYLE_VALUES.SLAB_SHEET_REEDED));

          if (!isValidDrawerFrontMat) {
            newErrors.drawerFrontStyle = ERROR_MESSAGES.COMPATIBLE_DRAWER_FRONT_STYLE;
          }
        }
      }

      // Check if drawer front style is compatible with face material (if no drawer_front_mat override)
      if (!formData.drawer_front_mat && effectiveFaceMaterialId && effectiveDrawerFrontStyle) {
        const material = FACE_MATERIAL_OPTIONS.find(
          (mat) => mat.id === effectiveFaceMaterialId,
        );

        if (material) {
          // Check if drawer front style is valid for this material
          const isValidDrawerStyle =
            (material.five_piece === true &&
              (effectiveDrawerFrontStyle ===
                FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD ||
                effectiveDrawerFrontStyle === FACE_STYLE_VALUES.SLAB_HARDWOOD ||
                effectiveDrawerFrontStyle ===
                  FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED)) ||
            (material.slab_door === true &&
              (effectiveDrawerFrontStyle === FACE_STYLE_VALUES.SLAB_SHEET ||
                effectiveDrawerFrontStyle ===
                  FACE_STYLE_VALUES.SLAB_SHEET_REEDED));

          if (!isValidDrawerStyle) {
            newErrors.drawerFrontStyle =
              ERROR_MESSAGES.COMPATIBLE_DRAWER_FRONT_STYLE;
          }
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // For team defaults, all fields are required (no fallback available)
    if (editType === EDIT_TYPES.TEAM) {
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

      // Validate door style is compatible with face material for team defaults
      if (formData.faceMaterial && formData.doorStyle) {
        const material = FACE_MATERIAL_OPTIONS.find(
          (mat) => mat.id === formData.faceMaterial,
        );

        if (material) {
          const isValidDoorStyle =
            (material.five_piece === true &&
              (formData.doorStyle === FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD ||
                formData.doorStyle === FACE_STYLE_VALUES.SLAB_HARDWOOD ||
                formData.doorStyle ===
                  FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED)) ||
            (material.slab_door === true &&
              (formData.doorStyle === FACE_STYLE_VALUES.SLAB_SHEET ||
                formData.doorStyle === FACE_STYLE_VALUES.SLAB_SHEET_REEDED));

          if (!isValidDoorStyle) {
            newErrors.doorStyle =
              "Selected door style is not compatible with the face material";
          }
        }
      }

      // Validate drawer front style is compatible with face material for team defaults
      if (formData.faceMaterial && formData.drawerFrontStyle) {
        const material = FACE_MATERIAL_OPTIONS.find(
          (mat) => mat.id === formData.faceMaterial,
        );

        if (material) {
          const isValidDrawerStyle =
            (material.five_piece === true &&
              (formData.drawerFrontStyle ===
                FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD ||
                formData.drawerFrontStyle === FACE_STYLE_VALUES.SLAB_HARDWOOD ||
                formData.drawerFrontStyle ===
                  FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED)) ||
            (material.slab_door === true &&
              (formData.drawerFrontStyle === FACE_STYLE_VALUES.SLAB_SHEET ||
                formData.drawerFrontStyle ===
                  FACE_STYLE_VALUES.SLAB_SHEET_REEDED));

          if (!isValidDrawerStyle) {
            newErrors.drawerFrontStyle =
              "Selected drawer front style is not compatible with the face material";
          }
        }
      }
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
    setSaveError(null); // Clear any previous errors

    if (validateForm()) {
      try {
        if (editType === EDIT_TYPES.TEAM) {
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
            default_door_panel_mod_id:
              formData.doorPanelModId === "" ? null : formData.doorPanelModId,
            default_drawer_panel_mod_id:
              formData.drawerPanelModId === ""
                ? null
                : formData.drawerPanelModId,
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
        } else if (editType === EDIT_TYPES.ESTIMATE) {
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
            default_door_panel_mod_id:
              formData.doorPanelModId === "" ? null : formData.doorPanelModId,
            default_drawer_panel_mod_id:
              formData.drawerPanelModId === ""
                ? null
                : formData.drawerPanelModId,
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
            default_service_price_overrides:
              formData.service_price_overrides &&
              Object.keys(formData.service_price_overrides).filter(
                (key) => formData.service_price_overrides[key] !== undefined,
              ).length > 0
                ? formData.service_price_overrides
                : null,
          };

          await dispatch(
            updateEstimateDefaults(
              estimateData.estimate_id || currentEstimate.estimate_id,
              defaultsPayload,
            ),
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

          // Clean up service_price_overrides - remove undefined values
          if (processedData.service_price_overrides) {
            const cleanedOverrides = {};
            Object.entries(processedData.service_price_overrides).forEach(
              ([serviceId, rate]) => {
                if (rate !== undefined && rate !== null && rate !== "") {
                  cleanedOverrides[serviceId] = Number(rate);
                }
              },
            );
            processedData.service_price_overrides =
              Object.keys(cleanedOverrides).length > 0
                ? cleanedOverrides
                : null;
          }

          // Convert empty strings to null for material/hardware foreign key fields
          const foreignKeyFields = [
            "style",
            "boxMaterial",
            "faceMaterial",
            "drawer_box_mat",
            "door_mat",
            "drawer_front_mat",
            "hinge_id",
            "slide_id",
            "door_pull_id",
            "drawer_pull_id",
            "doorPanelModId",
            "drawerPanelModId",
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
                processedData,
              ),
            );
          } else {
            // Create new section
            const newSection = await dispatch(
              addSection(currentEstimate.estimate_id, taskId, processedData),
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
    const { section, estimate, team } = getTiers("faceMaterial");

    const finishNeeded = shouldApplyFinish(
      section,
      estimate,
      team,
      FACE_MATERIAL_OPTIONS,
    );

    setMustSelectFaceFinish(finishNeeded);

    // Update selectedFaceMaterial for door style filtering
    // Use the effective material (three-tier fallback) using getEffectiveValue
    const { value: effectiveFaceMaterialId } = getEffectiveValue(
      section,
      estimate,
      team,
    );

    if (effectiveFaceMaterialId) {
      const selectedMaterial = FACE_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +effectiveFaceMaterialId,
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
    editType,
    formData.faceMaterial,
    formData.faceFinish,
    currentEstimate?.default_face_mat,
    teamDefaults?.default_face_mat,
    FACE_MATERIAL_OPTIONS,
    clearFinishes,
    getTiers,
  ]);

  useEffect(() => {
    // Determine if finish is needed based on the EFFECTIVE material (using three-tier fallback)
    const { section, estimate, team } = getTiers("boxMaterial");

    const finishNeeded = shouldApplyFinish(
      section,
      estimate,
      team,
      BOX_MATERIAL_OPTIONS,
    );

    setMustSelectBoxFinish(finishNeeded);

    // Update selectedBoxMaterial (if needed for future features)
    // Use the effective material (three-tier fallback)
    const effectiveBoxMaterialId =
      formData.boxMaterial ||
      currentEstimate?.default_box_mat ||
      teamDefaults?.default_box_mat;

    if (effectiveBoxMaterialId) {
      const selectedMaterial = BOX_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +effectiveBoxMaterialId,
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
    editType,
    formData.boxMaterial,
    formData.boxFinish,
    currentEstimate?.default_box_mat,
    teamDefaults?.default_box_mat,
    BOX_MATERIAL_OPTIONS,
    clearFinishes,
    getTiers,
  ]);

  useEffect(() => {
    // Determine if finish is needed for door material
    // Door material falls back to face material with three-tier fallback
    const effectiveDoorMaterialId =
      formData.door_mat ||
      formData.faceMaterial ||
      currentEstimate?.default_face_mat ||
      teamDefaults?.default_face_mat;

    // Check if the effective material needs finish
    let finishNeeded = false;
    let selectedMaterial = null;

    if (effectiveDoorMaterialId) {
      selectedMaterial = FACE_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +effectiveDoorMaterialId,
      );
      if (selectedMaterial) {
        finishNeeded = selectedMaterial.needs_finish === true;
      }
    }

    setMustSelectDoorFinish(finishNeeded);
    setSelectedDoorMaterial(selectedMaterial);

    // Clear finishes if the effective material doesn't need finish
    if (!finishNeeded && formData.door_finish?.length > 0) {
      clearFinishes("door_finish");
    }
  }, [
    formData.door_mat,
    formData.faceMaterial,
    formData.door_finish,
    currentEstimate?.default_face_mat,
    teamDefaults?.default_face_mat,
    FACE_MATERIAL_OPTIONS,
    clearFinishes,
  ]);

  useEffect(() => {
    // Determine if finish is needed for drawer front material
    // Drawer front material falls back to face material with three-tier fallback
    const effectiveDrawerFrontMaterialId =
      formData.drawer_front_mat ||
      formData.faceMaterial ||
      currentEstimate?.default_face_mat ||
      teamDefaults?.default_face_mat;

    // Check if the effective material needs finish
    let finishNeeded = false;
    let selectedMaterial = null;

    if (effectiveDrawerFrontMaterialId) {
      selectedMaterial = FACE_MATERIAL_OPTIONS.find(
        (mat) => mat.id === +effectiveDrawerFrontMaterialId,
      );
      if (selectedMaterial) {
        finishNeeded = selectedMaterial.needs_finish === true;
      }
    }

    setMustSelectDrawerFrontFinish(finishNeeded);
    setSelectedDrawerFrontMaterial(selectedMaterial);

    // Clear finishes if the effective material doesn't need finish
    if (!finishNeeded && formData.drawer_front_finish?.length > 0) {
      clearFinishes("drawer_front_finish");
    }
  }, [
    formData.drawer_front_mat,
    formData.faceMaterial,
    formData.drawer_front_finish,
    currentEstimate?.default_face_mat,
    teamDefaults?.default_face_mat,
    FACE_MATERIAL_OPTIONS,
    clearFinishes,
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

  // Sync textarea heights on mount and when notes change
  useEffect(() => {
    if (editType === EDIT_TYPES.SECTION) {
      syncTextareaHeights();
    }
  }, [editType, formData.notes, syncTextareaHeights]);

  useEffect(() => {
    // Check if effective door style is valid for the current material
    // Use three-tier fallback to get the effective value
    const effectiveDoorStyle = getEffectiveValueOnly(
      formData.doorStyle || null,
      currentEstimate?.default_door_style || null,
      teamDefaults?.default_door_style || null,
    );

    // If there's an effective door style and filtered options exist
    if (effectiveDoorStyle && filteredDoorStyleOptions.length > 0) {
      const isValidOption = filteredDoorStyleOptions.some(
        (option) => option.id === effectiveDoorStyle,
      );

      // If the effective style is invalid, reset the section-level field
      if (!isValidOption) {
        setFormData((prev) => ({
          ...prev,
          doorStyle: "",
        }));
      }
    }
  }, [
    filteredDoorStyleOptions,
    formData.doorStyle,
    currentEstimate?.default_door_style,
    teamDefaults?.default_door_style,
  ]);

  useEffect(() => {
    // Check if effective drawer front style is valid for the current material
    // Use three-tier fallback to get the effective value
    const effectiveDrawerFrontStyle = getEffectiveValueOnly(
      formData.drawerFrontStyle || null,
      currentEstimate?.default_drawer_front_style || null,
      teamDefaults?.default_drawer_front_style || null,
    );

    // If there's an effective drawer front style and filtered options exist
    if (effectiveDrawerFrontStyle && filteredDoorStyleOptions.length > 0) {
      const isValidOption = filteredDoorStyleOptions.some(
        (option) => option.id === effectiveDrawerFrontStyle,
      );

      // If the effective style is invalid, reset the section-level field
      if (!isValidOption) {
        setFormData((prev) => ({
          ...prev,
          drawerFrontStyle: "",
        }));
      }
    }
  }, [
    filteredDoorStyleOptions,
    formData.drawerFrontStyle,
    currentEstimate?.default_drawer_front_style,
    teamDefaults?.default_drawer_front_style,
  ]);

  // Get appropriate title
  const formTitle =
    editType === EDIT_TYPES.TEAM
      ? "Team Defaults"
      : editType === EDIT_TYPES.ESTIMATE
        ? "Estimate Defaults"
        : "Section Details";

  return (
    <div className="flex flex-col h-full mt-0">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        {editType !== EDIT_TYPES.SECTION && editType !== EDIT_TYPES.TEAM && (
          <div className="mb-2">
            <h2 className="text-xl font-bold text-slate-800">{formTitle}</h2>
            {editType === EDIT_TYPES.ESTIMATE && (
              <p className="text-sm text-slate-200">
                Use team defaults or set values to override for this estimate
                only.
              </p>
            )}
            {editType === EDIT_TYPES.TEAM && (
              <p className="text-sm text-slate-200">
                These defaults will be used for all new estimates. All fields
                are required.
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

        <form
          id="estimate-section-form"
          onSubmit={handleSubmit}
          className="space-y-3 pb-2"
        >
          {/* Cabinet Style Section */}
          <div className="grid grid-cols-[5fr_1fr] gap-5">
            <div className="space-y-5">
              <div className="grid grid-cols-[1fr_9fr] gap-1 items-center text-slate-200">
                <h3 className={STYLES.sectionHeader}>Cabinet Style</h3>
                <div className={STYLES.sectionBorder}>
                  <div className="grid grid-cols-[2fr_3fr] gap-2 items-center">
                    <div className="grid items-center">
                      <label htmlFor="style" className={STYLES.label}>
                        <span>Style</span>
                        {getEffectiveDefaultDisplay(
                          formData.style,
                          "default_cabinet_style_id",
                          "default_cabinet_style_id",
                          formatStyleName,
                        )}
                      </label>
                      <select
                        id="style"
                        name="style"
                        value={formData.style}
                        onChange={handleChange}
                        className={`${STYLES.select} ${
                          errors.style ? STYLES.inputError : STYLES.inputNormal
                        } ${STYLES.inputFocus}`}
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
                        <p className={STYLES.errorText}>{errors.style}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cabinet Box Material Section (with Finish)*/}
              <div className="grid grid-cols-[1fr_9fr] gap-1 items-center text-slate-200">
                <h3 className={STYLES.sectionHeader}>Cabinet Box</h3>
                <div className={STYLES.sectionBorder}>
                  <div className="grid grid-cols-[2fr_3fr] gap-3 items-start">
                    <div className="grid items-start">
                      <label htmlFor="boxMaterial" className={STYLES.label}>
                        <span>Material</span>
                        {getEffectiveDefaultDisplay(
                          formData.boxMaterial,
                          "default_box_mat",
                          "default_box_mat",
                          (id) => formatMaterialName(id, BOX_MATERIAL_OPTIONS),
                        )}
                      </label>
                      <select
                        id="boxMaterial"
                        name="boxMaterial"
                        value={formData.boxMaterial}
                        onChange={handleChange}
                        className={`${STYLES.select} ${
                          errors.boxMaterial
                            ? STYLES.inputError
                            : STYLES.inputNormal
                        } ${STYLES.inputFocus}`}
                      >
                        <option value="">
                          {getPlaceholder("box material")}
                        </option>
                        {BOX_MATERIAL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {`${option.name} - $${option.sheet_price}/sheet`}
                          </option>
                        ))}
                      </select>
                      {errors.boxMaterial && (
                        <p className={STYLES.errorText}>{errors.boxMaterial}</p>
                      )}
                      <div className="h-6">
                        <p
                          className={`${STYLES.material_finish_warn} col-span-2 px-2 pt-1 transition-opacity duration-200 ${
                            !mustSelectBoxFinish ? "opacity-100" : "opacity-0"
                          }`}
                        >
                          The selected box material does not require finish.
                        </p>
                      </div>
                    </div>
                    {/* Box Finish Options */}
                    <div>
                      <div className="grid items-center">
                        <label className={STYLES.label}>
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
                            mustSelectBoxFinish,
                          )}
                        </label>
                        <div className="grid grid-cols-3 gap-1 text-sm pl-2 text-slate-600">
                          {FINISH_OPTIONS.map((option) => (
                            <label
                              key={option.id}
                              className={`${STYLES.checkboxLabel} ${!mustSelectBoxFinish ? STYLES.checkboxLabelDisabled : ""}`}
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
                              <span>{option.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {errors.boxFinish && (
                        <p className={STYLES.errorText}>{errors.boxFinish}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cabinet Face Material Section (with Finish) */}
              <div className="grid grid-cols-[1fr_9fr] gap-1 items-center text-slate-700">
                <h3 className={STYLES.sectionHeader}>Cabinet Face</h3>
                <div className={STYLES.sectionBorder}>
                  <div className="grid grid-cols-[2fr_3fr] gap-3 items-start">
                    <div className="grid items-start">
                      <label htmlFor="faceMaterial" className={STYLES.label}>
                        <span>Material</span>
                        {getEffectiveDefaultDisplay(
                          formData.faceMaterial,
                          "default_face_mat",
                          "default_face_mat",
                          (id) => formatMaterialName(id, FACE_MATERIAL_OPTIONS),
                        )}
                      </label>
                      <select
                        id="faceMaterial"
                        name="faceMaterial"
                        value={formData.faceMaterial}
                        onChange={handleChange}
                        className={`${STYLES.select} ${
                          errors.faceMaterial
                            ? STYLES.inputError
                            : STYLES.inputNormal
                        } ${STYLES.inputFocus}`}
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
                        <p className={STYLES.errorText}>
                          {errors.faceMaterial}
                        </p>
                      )}
                      <div className="h-6">
                        <p
                          className={`${STYLES.material_finish_warn} col-span-2 px-2 pt-1 transition-opacity duration-200 ${
                            !mustSelectFaceFinish ? "opacity-100" : "opacity-0"
                          }`}
                        >
                          The selected face material does not require finish.
                        </p>
                      </div>
                    </div>
                    {/* Finish Options */}
                    <div>
                      <div className="grid items-center">
                        <label className={STYLES.label}>
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
                            mustSelectFaceFinish,
                          )}
                        </label>
                        <div className="grid grid-cols-3 gap-1 text-sm pl-2 text-slate-600">
                          {FINISH_OPTIONS.map((option) => (
                            <label
                              key={option.id}
                              className={`${STYLES.checkboxLabel} ${!mustSelectFaceFinish ? STYLES.checkboxLabelDisabled : ""}`}
                            >
                              <input
                                disabled={!mustSelectFaceFinish}
                                type="checkbox"
                                checked={formData.faceFinish.includes(
                                  option.id,
                                )}
                                onChange={() =>
                                  handleFinishChange(option.id, "faceFinish")
                                }
                                className="rounded border-slate-300"
                              />
                              <span>{option.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {errors.faceFinish && (
                        <p className={STYLES.errorText}>{errors.faceFinish}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Door Style Section */}
              <div className="grid grid-cols-[1fr_9fr] gap-1 items-center">
                <div className="h-full flex flex-col justify-center relative">
                  <h3 className={STYLES.sectionHeader}>Doors</h3>
                  {editType === EDIT_TYPES.SECTION && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowDoorMaterialOptions(!showDoorMaterialOptions)
                      }
                      className={`text-sm ${isDoorMaterialCustomized ? "text-amber-400 hover:text-amber-300" : "text-teal-400 hover:text-teal-300"} flex items-center absolute bottom-0 right-0`}
                    >
                      Mod
                      {showDoorMaterialOptions ? (
                        <FiChevronUp />
                      ) : (
                        <FiChevronDown />
                      )}{" "}
                    </button>
                  )}
                </div>
                <div className={STYLES.sectionBorder}>
                  <div className="grid">
                    <div className={STYLES.door_drawer_grid + " mb-4"}>
                      {/* Door Style */}
                      <div>
                        <div className="grid items-center">
                          <label htmlFor="doorStyle" className={STYLES.label}>
                            <span>Style</span>
                            {getEffectiveDefaultDisplay(
                              formData.doorStyle,
                              "default_door_style",
                              "default_door_style",
                              formatDoorStyleName,
                            )}
                          </label>
                          <select
                            id="doorStyle"
                            name="doorStyle"
                            value={formData.doorStyle}
                            onChange={handleChange}
                            className={`${STYLES.select} ${
                              errors.doorStyle
                                ? STYLES.inputError
                                : STYLES.inputNormal
                            } ${STYLES.inputFocus}`}
                          >
                            <option value="">
                              {getPlaceholder("door style")}
                            </option>
                            {filteredDoorStyleOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {`${option.label}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        {errors.doorStyle && (
                          <p className={STYLES.errorText}>{errors.doorStyle}</p>
                        )}
                      </div>
                      {/* Door Hinges */}
                      <div className="grid items-center">
                        <label htmlFor="hinge_id" className={STYLES.label}>
                          Hinges
                          {getEffectiveDefaultDisplay(
                            formData.hinge_id,
                            "default_hinge_id",
                            "default_hinge_id",
                            formatHingeName,
                          )}
                        </label>
                        <select
                          id="hinge_id"
                          name="hinge_id"
                          value={formData.hinge_id}
                          onChange={handleChange}
                          className={`${STYLES.select} ${
                            errors.hinge_id
                              ? STYLES.inputError
                              : STYLES.inputNormal
                          } ${STYLES.inputFocus}`}
                        >
                          <option value="">
                            {getPlaceholder("hinge type")}
                          </option>
                          {DOOR_HINGE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {`${option.name} - $${option.price}/pair`}
                            </option>
                          ))}
                        </select>
                        {errors.hinge_id && (
                          <p className={STYLES.errorText}>{errors.hinge_id}</p>
                        )}
                      </div>
                      {/* Door Pulls */}
                      <div className="grid items-center">
                        <label htmlFor="door_pull_id" className={STYLES.label}>
                          <span>Pulls</span>
                          {getEffectiveDefaultDisplay(
                            formData.door_pull_id,
                            "default_door_pull_id",
                            "default_door_pull_id",
                            formatPullName,
                          )}
                        </label>
                        <select
                          id="door_pull_id"
                          name="door_pull_id"
                          value={formData.door_pull_id}
                          onChange={handleChange}
                          className={`${STYLES.select} ${
                            errors.door_pull_id
                              ? STYLES.inputError
                              : STYLES.inputNormal
                          } ${STYLES.inputFocus}`}
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
                          <p className={STYLES.errorText}>
                            {errors.door_pull_id}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Door Moldings */}
                    <div className={STYLES.door_drawer_grid}>
                      <div className="grid items-center">
                        <label className={STYLES.label}>
                          <span>Inside Molding</span>
                          {getEffectiveDefaultDisplay(
                            formData.doorInsideMolding,
                            "default_door_inside_molding",
                            "default_door_inside_molding",
                            formatBoolean,
                          )}
                        </label>
                        <select
                          name="doorInsideMolding"
                          value={getBooleanSelectValue(
                            formData.doorInsideMolding,
                          )}
                          onChange={handleChange}
                          className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
                        >
                          <option value="">{getPlaceholder("...")}</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div className="grid items-center">
                        <label className={STYLES.label}>
                          <span>Outside Molding</span>
                          {getEffectiveDefaultDisplay(
                            formData.doorOutsideMolding,
                            "default_door_outside_molding",
                            "default_door_outside_molding",
                            formatBoolean,
                          )}
                        </label>
                        <select
                          name="doorOutsideMolding"
                          value={getBooleanSelectValue(
                            formData.doorOutsideMolding,
                          )}
                          onChange={handleChange}
                          className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
                        >
                          <option value="">{getPlaceholder("...")}</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div className="grid items-center">
                        <label className={STYLES.label}>
                          <span>Panel Mod</span>
                          {getEffectiveDefaultDisplay(
                            formData.doorPanelModId,
                            "default_door_panel_mod_id",
                            "default_door_panel_mod_id",
                            (value) => {
                              if (value === 0) return "None";
                              if (value === 15) return "Reeded";
                              if (value === 22) return "Grooved";
                              return value ? `ID ${value}` : "None";
                            },
                          )}
                        </label>
                        <select
                          name="doorPanelModId"
                          value={
                            formData.doorPanelModId === null ||
                            formData.doorPanelModId === ""
                              ? ""
                              : formData.doorPanelModId
                          }
                          onChange={handleChange}
                          className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
                        >
                          <option value="">{getPlaceholder("...")}</option>
                          <option value="0">None</option>
                          <option value="15">Reeded</option>
                          <option value="22">Grooved</option>
                        </select>
                      </div>
                    </div>
                    {/* Expandable Door Material/Finish Options */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        showDoorMaterialOptions
                          ? "max-h-96 opacity-100 mt-4"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="p-3 border border-teal-600 rounded-md bg-slate-800/30">
                        <div className="grid grid-cols-[2fr_3fr] gap-3 items-start">
                          <div className="grid items-start">
                            <label htmlFor="door_mat" className={STYLES.label}>
                              <span>Material</span>
                              {(() => {
                                // 4th tier: fall back to effective face material
                                const faceMaterialValue = getEffectiveValueOnly(
                                  formData.faceMaterial || null,
                                  currentEstimate?.default_face_mat || null,
                                  teamDefaults?.default_face_mat || null,
                                );
                                return getEffectiveDefaultDisplay(
                                  formData.door_mat,
                                  "default_door_mat",
                                  "default_door_mat",
                                  (id) =>
                                    formatMaterialName(
                                      id,
                                      FACE_MATERIAL_OPTIONS,
                                    ),
                                  false,
                                  false,
                                  true,
                                  faceMaterialValue,
                                );
                              })()}
                            </label>
                            <select
                              id="door_mat"
                              name="door_mat"
                              value={formData.door_mat}
                              onChange={handleChange}
                              className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
                            >
                              <option value="">Section Default</option>
                              {FACE_MATERIAL_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {`${option.name} - $${option.sheet_price}/sheet`}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-slate-400 mt-1 px-2">
                              Leave empty to use face material
                            </p>
                            <div className="h-6">
                              <p
                                className={`${STYLES.material_finish_warn} px-2 pt-1 transition-opacity duration-200 ${
                                  !mustSelectDoorFinish
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              >
                                The selected door material does not require
                                finish.
                              </p>
                            </div>
                          </div>
                          <div>
                            <div className="grid items-center">
                              <label className={STYLES.label}>
                                <span>Finish</span>
                                {(() => {
                                  // 4th tier: fall back to effective face finish
                                  const faceFinishValue = getEffectiveValueOnly(
                                    formData.faceFinish?.length > 0
                                      ? formData.faceFinish
                                      : null,
                                    currentEstimate?.default_face_finish ||
                                      null,
                                    teamDefaults?.default_face_finish || null,
                                  );
                                  return getEffectiveDefaultDisplay(
                                    formData.door_finish,
                                    "default_door_finish",
                                    "default_door_finish",
                                    formatFinishArray,
                                    false,
                                    true,
                                    mustSelectDoorFinish,
                                    faceFinishValue,
                                  );
                                })()}
                              </label>
                              <div className="grid grid-cols-3 gap-1 text-sm pl-2 text-slate-600">
                                {FINISH_OPTIONS.map((option) => (
                                  <label
                                    key={option.id}
                                    className={`${STYLES.checkboxLabel} ${!mustSelectDoorFinish ? STYLES.checkboxLabelDisabled : ""}`}
                                  >
                                    <input
                                      disabled={!mustSelectDoorFinish}
                                      type="checkbox"
                                      checked={formData.door_finish.includes(
                                        option.id,
                                      )}
                                      onChange={() =>
                                        handleFinishChange(
                                          option.id,
                                          "door_finish",
                                        )
                                      }
                                      className="rounded border-slate-300"
                                    />
                                    <span>{option.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 px-2">
                              Leave empty to use face finish
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Front Style Section */}
              <div className="grid grid-cols-[1fr_9fr] gap-1 items-center text-slate-700">
                <div className="h-full flex flex-col justify-center relative">
                  <h3 className={STYLES.sectionHeader}>Drawer Fronts</h3>
                  {editType === EDIT_TYPES.SECTION && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowDrawerFrontMaterialOptions(
                          !showDrawerFrontMaterialOptions,
                        )
                      }
                      className={`text-sm ${isDrawerFrontMaterialCustomized ? "text-amber-400 hover:text-amber-300" : "text-teal-400 hover:text-teal-300"} flex items-center absolute bottom-0 right-0`}
                    >
                      Mod
                      {showDrawerFrontMaterialOptions ? (
                        <FiChevronUp />
                      ) : (
                        <FiChevronDown />
                      )}{" "}
                    </button>
                  )}
                </div>
                <div className={STYLES.sectionBorder}>
                  <div className="grid">
                    <div className={STYLES.door_drawer_grid + " mb-4"}>
                      {/* Drawer Front Style */}
                      <div>
                        <div className="grid items-center">
                          <label
                            htmlFor="drawerFrontStyle"
                            className={STYLES.label}
                          >
                            <span>Style</span>
                            {getEffectiveDefaultDisplay(
                              formData.drawerFrontStyle,
                              "default_drawer_front_style",
                              "default_drawer_front_style",
                              formatDoorStyleName,
                            )}
                          </label>
                          <select
                            id="drawerFrontStyle"
                            name="drawerFrontStyle"
                            value={formData.drawerFrontStyle}
                            onChange={handleChange}
                            className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
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
                        </div>
                        {errors.drawerFrontStyle && (
                          <p className={STYLES.errorText}>
                            {errors.drawerFrontStyle}
                          </p>
                        )}
                      </div>
                      {/* Drawer Slides */}
                      <div className="grid items-center">
                        <label htmlFor="slide_id" className={STYLES.label}>
                          <span>Slides</span>
                          {getEffectiveDefaultDisplay(
                            formData.slide_id,
                            "default_slide_id",
                            "default_slide_id",
                            formatSlideName,
                          )}
                        </label>
                        <select
                          id="slide_id"
                          name="slide_id"
                          value={formData.slide_id}
                          onChange={handleChange}
                          className={`${STYLES.select} ${
                            errors.slide_id
                              ? STYLES.inputError
                              : STYLES.inputNormal
                          } ${STYLES.inputFocus}`}
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
                          <p className={STYLES.errorText}>{errors.slide_id}</p>
                        )}
                      </div>
                      {/* Drawer  Pulls */}
                      <div className="grid items-center">
                        <label
                          htmlFor="drawer_pull_id"
                          className={STYLES.label}
                        >
                          <span>Pulls</span>
                          {getEffectiveDefaultDisplay(
                            formData.drawer_pull_id,
                            "default_drawer_pull_id",
                            "default_drawer_pull_id",
                            formatPullName,
                          )}
                        </label>
                        <select
                          id="drawer_pull_id"
                          name="drawer_pull_id"
                          value={formData.drawer_pull_id}
                          onChange={handleChange}
                          className={`${STYLES.select} ${
                            errors.drawer_pull_id
                              ? STYLES.inputError
                              : STYLES.inputNormal
                          } ${STYLES.inputFocus}`}
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
                          <p className={STYLES.errorText}>
                            {errors.drawer_pull_id}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Drawer Front Moldings */}
                    <div className={STYLES.door_drawer_grid + " mb-4"}>
                      <div className="grid items-center">
                        <label className={STYLES.label}>
                          <span>Inside Molding</span>
                          {getEffectiveDefaultDisplay(
                            formData.drawerInsideMolding,
                            "default_drawer_inside_molding",
                            "default_drawer_inside_molding",
                            formatBoolean,
                          )}
                        </label>
                        <select
                          name="drawerInsideMolding"
                          value={getBooleanSelectValue(
                            formData.drawerInsideMolding,
                          )}
                          onChange={handleChange}
                          className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
                        >
                          <option value="">{getPlaceholder("...")}</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div className="grid items-center">
                        <label className={STYLES.label}>
                          <span>Outside Molding</span>
                          {getEffectiveDefaultDisplay(
                            formData.drawerOutsideMolding,
                            "default_drawer_outside_molding",
                            "default_drawer_outside_molding",
                            formatBoolean,
                          )}
                        </label>
                        <select
                          name="drawerOutsideMolding"
                          value={getBooleanSelectValue(
                            formData.drawerOutsideMolding,
                          )}
                          onChange={handleChange}
                          className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
                        >
                          <option value="">{getPlaceholder("...")}</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div className="grid items-center">
                        <label className={STYLES.label}>
                          <span>Panel Mod</span>
                          {getEffectiveDefaultDisplay(
                            formData.drawerPanelModId,
                            "default_drawer_panel_mod_id",
                            "default_drawer_panel_mod_id",
                            (value) => {
                              if (value === 0) return "None";
                              if (value === 15) return "Reeded";
                              if (value === 22) return "Grooved";
                              return value ? `ID ${value}` : "None";
                            },
                          )}
                        </label>
                        <select
                          name="drawerPanelModId"
                          value={
                            formData.drawerPanelModId === null ||
                            formData.drawerPanelModId === ""
                              ? ""
                              : formData.drawerPanelModId
                          }
                          onChange={handleChange}
                          className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
                        >
                          <option value="">{getPlaceholder("...")}</option>
                          <option value="0">None</option>
                          <option value="15">Reeded</option>
                          <option value="22">Grooved</option>
                        </select>
                      </div>
                    </div>

                    {/* Drawer Box Material */}
                    <div className={STYLES.door_drawer_grid}>
                      <div className="grid items-center">
                        <label
                          htmlFor="drawer_box_mat"
                          className={STYLES.label}
                        >
                          <span>Drawer Boxes</span>
                          {getEffectiveDefaultDisplay(
                            formData.drawer_box_mat,
                            "default_drawer_box_mat",
                            "default_drawer_box_mat",
                            (id) => formatMaterialName(id, DRAWER_BOX_OPTIONS),
                          )}
                        </label>
                        <select
                          id="drawer_box_mat"
                          name="drawer_box_mat"
                          value={formData.drawer_box_mat}
                          onChange={handleChange}
                          className={`${STYLES.select} ${
                            errors.drawer_box_mat
                              ? STYLES.inputError
                              : STYLES.inputNormal
                          } ${STYLES.inputFocus}`}
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
                          <p className={STYLES.errorText}>
                            {errors.drawer_box_mat}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Expandable Drawer Front Material/Finish Options */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        showDrawerFrontMaterialOptions
                          ? "max-h-96 opacity-100 mt-4"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="p-3 border border-teal-600 rounded-md bg-slate-800/30">
                        <div className="grid grid-cols-[2fr_3fr] gap-3 items-start">
                          <div className="grid items-start">
                            <label
                              htmlFor="drawer_front_mat"
                              className={STYLES.label}
                            >
                              <span>Material</span>
                              {(() => {
                                // 4th tier: fall back to effective face material
                                const faceMaterialValue = getEffectiveValueOnly(
                                  formData.faceMaterial || null,
                                  currentEstimate?.default_face_mat || null,
                                  teamDefaults?.default_face_mat || null,
                                );
                                return getEffectiveDefaultDisplay(
                                  formData.drawer_front_mat,
                                  "default_drawer_front_mat",
                                  "default_drawer_front_mat",
                                  (id) =>
                                    formatMaterialName(
                                      id,
                                      FACE_MATERIAL_OPTIONS,
                                    ),
                                  false,
                                  false,
                                  true,
                                  faceMaterialValue,
                                );
                              })()}
                            </label>
                            <select
                              id="drawer_front_mat"
                              name="drawer_front_mat"
                              value={formData.drawer_front_mat}
                              onChange={handleChange}
                              className={`${STYLES.select} ${STYLES.inputNormal} ${STYLES.inputFocus}`}
                            >
                              <option value="">Section Default</option>
                              {FACE_MATERIAL_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {`${option.name} - $${option.sheet_price}/sheet`}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-slate-400 mt-1 px-2">
                              Leave empty to use face material
                            </p>
                            <div className="h-6">
                              <p
                                className={`${STYLES.material_finish_warn} px-2 pt-1 transition-opacity duration-200 ${
                                  !mustSelectDrawerFrontFinish
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              >
                                The selected drawer front material does not
                                require finish.
                              </p>
                            </div>
                          </div>
                          <div>
                            <div className="grid items-center">
                              <label className={STYLES.label}>
                                <span>Finish</span>
                                {(() => {
                                  // 4th tier: fall back to effective face finish
                                  const faceFinishValue = getEffectiveValueOnly(
                                    formData.faceFinish?.length > 0
                                      ? formData.faceFinish
                                      : null,
                                    currentEstimate?.default_face_finish ||
                                      null,
                                    teamDefaults?.default_face_finish || null,
                                  );
                                  return getEffectiveDefaultDisplay(
                                    formData.drawer_front_finish,
                                    "default_drawer_front_finish",
                                    "default_drawer_front_finish",
                                    formatFinishArray,
                                    false,
                                    true,
                                    mustSelectDrawerFrontFinish,
                                    faceFinishValue,
                                  );
                                })()}
                              </label>
                              <div className="grid grid-cols-3 gap-1 text-sm pl-2 text-slate-600">
                                {FINISH_OPTIONS.map((option) => (
                                  <label
                                    key={option.id}
                                    className={`${STYLES.checkboxLabel} ${!mustSelectDrawerFrontFinish ? STYLES.checkboxLabelDisabled : ""}`}
                                  >
                                    <input
                                      disabled={!mustSelectDrawerFrontFinish}
                                      type="checkbox"
                                      checked={formData.drawer_front_finish.includes(
                                        option.id,
                                      )}
                                      onChange={() =>
                                        handleFinishChange(
                                          option.id,
                                          "drawer_front_finish",
                                        )
                                      }
                                      className="rounded border-slate-300"
                                    />
                                    <span>{option.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 px-2">
                              Leave empty to use face finish
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg border-slate-400 p-3 w-full h-full text-slate-700">
              <h3 className={`${STYLES.sectionHeader} mb-3`}>Adjustments</h3>
              <div className="space-y-3">
                {/* Quantity */}
                <div className="flex flex-col gap-2 items-center -mt-2">
                  <label htmlFor="quantity" className={STYLES.label}>
                    Quantity
                  </label>
                  <input
                    type="text"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="1"
                    disabled={editType !== EDIT_TYPES.SECTION}
                    className={`${STYLES.input} ${STYLES.inputNormal} ${STYLES.inputFocus} text-center`}
                  />
                </div>

                {/* Profit */}
                <div className="flex flex-col gap-2 items-center">
                  <label htmlFor="profit" className={STYLES.label}>
                    <span>Profit{editType === EDIT_TYPES.TEAM ? " %" : ""}</span>
                    {getEffectiveDefaultDisplay(
                      formData.profit,
                      "default_profit",
                      "default_profit",
                      formatPercentage,
                      true,
                    )}
                  </label>
                  <input
                    type="text"
                    id="profit"
                    name="profit"
                    value={formData.profit}
                    onChange={handleChange}
                    placeholder="0%"
                    className={`${STYLES.input} ${STYLES.inputNormal} ${STYLES.inputFocus} text-center`}
                  />
                </div>

                {/* Commission */}
                <div className="flex flex-col gap-2 items-center">
                  <label htmlFor="commission" className={STYLES.label}>
                    <span>Commission{editType === EDIT_TYPES.TEAM ? " %" : ""}</span>
                    {getEffectiveDefaultDisplay(
                      formData.commission,
                      "default_commission",
                      "default_commission",
                      formatPercentage,
                      true,
                    )}
                  </label>
                  <input
                    type="text"
                    id="commission"
                    name="commission"
                    value={formData.commission}
                    onChange={handleChange}
                    placeholder="0%"
                    className={`${STYLES.input} ${STYLES.inputNormal} ${STYLES.inputFocus} text-center`}
                  />
                </div>

                {/* Discount */}
                <div className="flex flex-col gap-2 items-center">
                  <label htmlFor="discount" className={STYLES.label}>
                    <span>Discount{editType === EDIT_TYPES.TEAM ? " %" : ""}</span>
                    {getEffectiveDefaultDisplay(
                      formData.discount,
                      "default_discount",
                      "default_discount",
                      formatPercentage,
                      true,
                    )}
                  </label>
                  <input
                    type="text"
                    id="discount"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    placeholder="0%"
                    className={`${STYLES.input} ${STYLES.inputNormal} ${STYLES.inputFocus} text-center`}
                  />
                </div>

                <h3
                  className={`${STYLES.sectionHeader} mb-3 border-t border-slate-400 pt-2`}
                >
                  Rates
                </h3>

                {/* Service Rate Overrides - only for estimate and section */}
                {editType === EDIT_TYPES.TEAM
                  ? // Team mode: Display rates as read-only text
                    activeServices.map((service) => (
                      <div
                        key={service.service_id}
                        className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0"
                      >
                        <span className="text-sm font-medium">
                          {service.service_name}
                        </span>
                        <span className="text-sm text-slate-600">
                          ${service.hourly_rate}/hr
                        </span>
                      </div>
                    ))
                  : // Estimate/Section mode: Editable inputs with effective value display
                    activeServices.map((service) => (
                      <div
                        key={service.service_id}
                        className="flex flex-col gap-2 items-center"
                      >
                        <label
                          htmlFor={`service-rate-${service.service_id}`}
                          className={STYLES.label}
                        >
                          <span>{service.service_name}</span>
                          {getEffectiveServiceRateDisplay(
                            service.service_id,
                            service,
                          )}
                        </label>
                        <input
                          type="number"
                          id={`service-rate-${service.service_id}`}
                          min="0"
                          step="1"
                          value={
                            formData.service_price_overrides?.[
                              service.service_id
                            ] || ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({
                              ...formData,
                              service_price_overrides: {
                                ...formData.service_price_overrides,
                                [service.service_id]:
                                  value === "" ? undefined : parseFloat(value),
                              },
                            });
                          }}
                          placeholder="$/hr"
                          className={`${STYLES.input} ${STYLES.inputNormal} ${STYLES.inputFocus} text-center`}
                        />
                      </div>
                    ))}
              </div>
            </div>
          </div>

          {/* Notes Section - only for sections */}
          {editType === EDIT_TYPES.SECTION && (
            <div className="grid grid-cols-3 gap-4 items-start text-slate-700 px-1">
              <div>
                <label htmlFor="notes-0" className={STYLES.label}>
                  Notes
                </label>
                <textarea
                  ref={(el) => (notesTextareaRefs.current[0] = el)}
                  id="notes-0"
                  name="notes"
                  data-notes-index="0"
                  value={formData.notes[0] || ""}
                  onChange={handleChange}
                  rows={2}
                  className="mt-1 p-2 block w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
                  placeholder="Any special notes..."
                />
              </div>
              <div>
                <label htmlFor="notes-1" className={STYLES.label}>
                  Includes
                </label>
                <textarea
                  ref={(el) => (notesTextareaRefs.current[1] = el)}
                  id="notes-1"
                  name="notes"
                  data-notes-index="1"
                  value={formData.notes[1] || ""}
                  onChange={handleChange}
                  rows={2}
                  className="mt-1 p-2 block w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
                  placeholder="What's included..."
                />
              </div>
              <div>
                <label htmlFor="notes-2" className={STYLES.label}>
                  Does Not Include
                </label>
                <textarea
                  ref={(el) => (notesTextareaRefs.current[2] = el)}
                  id="notes-2"
                  name="notes"
                  data-notes-index="2"
                  value={formData.notes[2] || ""}
                  onChange={handleChange}
                  rows={2}
                  className="mt-1 p-2 block w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
                  placeholder="What's not included..."
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Form Actions - Fixed to Bottom */}
      <div className="flex justify-end space-x-2 bg-slate-800 py-4 px-4 border-t border-slate-600">
        {editType !== EDIT_TYPES.TEAM && (
          <div className="flex-1 flex justify-start space-x-2">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="px-3 py-1 text-xs font-medium text-white bg-teal-600 border border-teal-700 rounded hover:bg-teal-700 flex items-center"
            >
              <RiResetLeftFill className="mr-1" size={12} />
              Restore Defaults
            </button>
            {editType === EDIT_TYPES.SECTION && (
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(true)}
                className="px-3 py-1 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded hover:bg-purple-700 flex items-center"
              >
                <FiCopy className="mr-1" size={12} />
                Copy Room Details
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
        >
          <FiX className="mr-1" size={12} />
          Cancel
        </button>
        <button
          type="submit"
          form="estimate-section-form"
          className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 flex items-center"
        >
          <FiSave className="mr-1" size={12} />
          {editType === EDIT_TYPES.TEAM
            ? "Save Team Defaults"
            : editType === EDIT_TYPES.ESTIMATE
              ? "Save Estimate Defaults"
              : "Save Section"}
        </button>
      </div>

      {/* Copy Room Details Modal */}
      {editType === EDIT_TYPES.SECTION && (
        <CopyRoomDetailsModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          currentEstimate={currentEstimate}
          currentSectionId={section?.est_section_id}
          onCopySection={handleCopyFromSection}
        />
      )}
    </div>
  );
};

EstimateSectionForm.propTypes = {
  editType: PropTypes.oneOf([EDIT_TYPES.TEAM, EDIT_TYPES.ESTIMATE, EDIT_TYPES.SECTION]),
  section: PropTypes.object,
  estimateData: PropTypes.object,
  teamData: PropTypes.object,
  taskId: PropTypes.number,
  onCancel: PropTypes.func,
  onSave: PropTypes.func,
};

export default EstimateSectionForm;
