import PropTypes from "prop-types";
import { useState, useEffect, useMemo } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useSelector } from "react-redux";
import { v4 as uuid } from "uuid";

import useMathInput from "../../hooks/useMathInput";
import { ITEM_FORM_WIDTHS } from "../../utils/constants.js";
import { getEffectiveValueOnly } from "../../utils/estimateDefaults";

import SectionItemList from "./SectionItemList.jsx";

const DEFAULT_NEW_LENGTH_QUANTITY = 1;
const FINISH_NONE = "none";

const LengthItemForm = ({ item = {}, onSave, onCancel, currentSectionId }) => {
  const faceMaterialOptions = useSelector(
    (state) => state.materials?.faceMaterials || []
  );
  const finishOptions = useSelector((state) => state.finishes?.finishes || []);
  const currentEstimate = useSelector((state) => state.estimates.currentEstimate);
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults
  );
  const { catalog, molding, base, shelf, top, other, loading } = useSelector(
    (state) => state.lengths
  );

  const currentSection = useMemo(() => {
    const sectionId = Number(currentSectionId);
    if (!Number.isFinite(sectionId)) return null;

    return (
      currentEstimate?.tasks
        ?.flatMap((task) => task.sections || [])
        ?.find((section) => Number(section.est_section_id) === sectionId) || null
    );
  }, [currentEstimate, currentSectionId]);

  const effectiveLengthMaterialId = getEffectiveValueOnly(
    currentSection?.face_mat ?? null,
    currentEstimate?.default_face_mat ?? null,
    teamDefaults?.default_face_mat ?? null
  );

  const effectiveLengthFinish = getEffectiveValueOnly(
    currentSection?.face_finish ?? null,
    currentEstimate?.default_face_finish ?? null,
    teamDefaults?.default_face_finish ?? null
  );

  const [selectedType, setSelectedType] = useState("");
  const [formData, setFormData] = useState({
    length_catalog_id: +item.length_catalog_id || "",
    length: item.length || "",
    quantity: item.quantity ?? DEFAULT_NEW_LENGTH_QUANTITY,
    width: item.width ?? "",
    thickness: item.thickness ?? "",
    miter_count: item.miter_count || 0,
    cutout_count: item.cutout_count || 0,
    length_mat: item.length_mat ?? "",
    length_finish: Array.isArray(item.length_finish) ? item.length_finish : null,
    temp_id: item.temp_id || uuid(),
    id: item.id || undefined,
  });

  const effectiveLengthMaterialForFinish =
    formData.length_mat !== "" &&
    formData.length_mat !== null &&
    formData.length_mat !== undefined
      ? formData.length_mat
      : effectiveLengthMaterialId;

  const selectedLengthMaterial = faceMaterialOptions.find(
    (mat) => String(mat.id) === String(effectiveLengthMaterialForFinish)
  );

  const mustSelectLengthFinish = selectedLengthMaterial?.needs_finish === true;

  const [errors, setErrors] = useState({});
  const [selectedLengthItem, setSelectedLengthItem] = useState(null);

  const mathInput = useMathInput(
    {
      quantity: item.quantity ?? DEFAULT_NEW_LENGTH_QUANTITY,
      length: item.length || "",
      width: item.width ?? "",
      thickness: item.thickness ?? "",
      miter_count: item.miter_count || 0,
      cutout_count: item.cutout_count || 0,
    },
    (fieldName, numValue) => {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: numValue,
      }));
    }
  );

  // Set initial type if editing existing item
  useEffect(() => {
    if (item.length_catalog_id && catalog.length > 0) {
      const lengthItem = catalog.find((l) => l.id === item.length_catalog_id);
      if (lengthItem) {
        setSelectedType(lengthItem.type);
      }
    }
  }, [item.length_catalog_id, catalog]);

  // Get length items by selected type
  const getLengthsByType = () => {
    if (!selectedType) return [];

    const typeMap = {
      molding,
      base,
      shelf,
      top,
      other,
    };

    return typeMap[selectedType] || [];
  };

  const filteredLengths = getLengthsByType();

  // Update selectedLengthItem when length_catalog_id changes
  useEffect(() => {
    if (formData.length_catalog_id) {
      const lengthItem = catalog.find(
        (l) => l.id === +formData.length_catalog_id
      );
      setSelectedLengthItem(lengthItem || null);
    } else {
      setSelectedLengthItem(null);
    }
  }, [formData.length_catalog_id, catalog]);

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setSelectedType(newType);
    // Reset length selection when type changes
    setFormData({
      ...formData,
      length_catalog_id: "",
    });
  };

  // Reset miter/cutout counts when length item changes and doesn't require them
  useEffect(() => {
    if (selectedLengthItem) {
      const updates = {};
      if (!selectedLengthItem.requires_miters && formData.miter_count > 0) {
        updates.miter_count = 0;
      }
      if (!selectedLengthItem.requires_cutouts && formData.cutout_count > 0) {
        updates.cutout_count = 0;
      }
      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Note: formData values intentionally excluded to prevent infinite loop
  }, [
    selectedLengthItem?.id,
    selectedLengthItem?.requires_miters,
    selectedLengthItem?.requires_cutouts,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle math-enabled numeric inputs
    if (
      [
        "quantity",
        "length",
        "width",
        "thickness",
        "miter_count",
        "cutout_count",
      ].includes(name)
    ) {
      mathInput.handleChange(name, value);
      const parsedValue = value === "" ? null : Number(value);
      if (value === "" || Number.isFinite(parsedValue)) {
        setFormData((prev) => ({
          ...prev,
          [name]: parsedValue,
        }));
      }
      // Clear error when field is updated
      if (errors[name]) {
        setErrors({
          ...errors,
          [name]: "",
        });
      }
      return;
    } else if (name === "length_mat") {
      setFormData({
        ...formData,
        [name]: value === "" ? "" : Number(value),
      });
    } else if (name === "length_catalog_id") {
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

  const isFinishExplicitlyNone = () => {
    const value = formData.length_finish;
    return Array.isArray(value) && value.length === 0;
  };

  const formatMaterialName = (materialId) => {
    const material = faceMaterialOptions.find((mat) => mat.id === materialId);
    return material?.name || "";
  };

  const formatFinishArray = (finishIds) => {
    if (Array.isArray(finishIds) && finishIds.length === 0) {
      return "None";
    }

    if (!Array.isArray(finishIds) || finishIds.length === 0) {
      return "";
    }

    return finishIds
      .map((id) => finishOptions.find((option) => option.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const getEffectiveDefaultDisplay = (fieldValue, defaultValue, formatter, isFinish = false) => {
    const isEmpty = isFinish
      ? fieldValue === null || fieldValue === undefined
      : fieldValue === "" || fieldValue === null || fieldValue === undefined;

    if (!isEmpty) {
      return <span className="flex-1 px-1 border border-amber-400 ml-1"></span>;
    }

    const shouldShowFallback = !isFinish || mustSelectLengthFinish;
    if (!shouldShowFallback) {
      return null;
    }

    if (defaultValue === null || defaultValue === undefined) {
      return null;
    }

    const displayValue = formatter ? formatter(defaultValue) : defaultValue;
    if (!displayValue) return null;

    return (
      <span className="flex-1 px-1 text-white text-xs bg-teal-600 ml-1">
        {displayValue}
      </span>
    );
  };

  const handleFinishChange = (option) => {
    let updatedFinish;

    if (option === FINISH_NONE) {
      updatedFinish = isFinishExplicitlyNone() ? null : [];
    } else {
      const currentFinish = Array.isArray(formData.length_finish)
        ? formData.length_finish
        : [];

      updatedFinish = currentFinish.includes(option)
        ? currentFinish.filter((id) => id !== option)
        : [...currentFinish, option];

      if (updatedFinish.length === 0) {
        updatedFinish = null;
      }
    }

    setFormData((prev) => ({
      ...prev,
      length_finish: updatedFinish,
    }));
  };

  useEffect(() => {
    if (!mustSelectLengthFinish && Array.isArray(formData.length_finish)) {
      setFormData((prev) => ({
        ...prev,
        length_finish: null,
      }));
    }
  }, [mustSelectLengthFinish, formData.length_finish]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.length_catalog_id) {
      newErrors.length_catalog_id = "Length item is required";
    }

    if (!formData.length || formData.length <= 0) {
      newErrors.length = "Length must be greater than 0";
    }

    const quantityValue = Number(formData.quantity);
    if (
      formData.quantity === "" ||
      formData.quantity === null ||
      formData.quantity === undefined ||
      Number.isNaN(quantityValue) ||
      quantityValue < 0
    ) {
      newErrors.quantity = "Quantity must be 0 or greater";
    }

    if (formData.width !== "" && formData.width !== null && Number(formData.width) <= 0) {
      newErrors.width = "Width must be greater than 0";
    }

    if (
      formData.thickness !== "" &&
      formData.thickness !== null &&
      Number(formData.thickness) <= 0
    ) {
      newErrors.thickness = "Thickness must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }

    if (validateForm()) {
      const parseOptionalNumber = (value) => {
        if (value === "" || value === null || value === undefined) {
          return null;
        }
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };

      onSave({
        ...formData,
        quantity: Number(formData.quantity),
        length: Number(formData.length),
        miter_count: parseOptionalNumber(formData.miter_count) ?? 0,
        cutout_count: parseOptionalNumber(formData.cutout_count) ?? 0,
        width: parseOptionalNumber(formData.width),
        thickness: parseOptionalNumber(formData.thickness),
        length_mat: parseOptionalNumber(formData.length_mat),
      });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <h4 className="text-sm font-medium text-slate-700 mb-3">Length Item</h4>

      <div className="flex flex-col space-y-3">
        {/* Type and Item Selects */}
        <div className="space-y-3">
          <div className="flex space-x-3">
            {/* Type Selector */}
            <div className="flex-1">
              <label
                htmlFor="length_type"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Length Type <span className="text-red-500">*</span>
              </label>
              <select
                id="length_type"
                name="length_type"
                value={selectedType}
                onChange={handleTypeChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                disabled={loading}
              >
                <option value="">Select type...</option>
                <option value="molding">Molding</option>
                <option value="base">Base</option>
                <option value="shelf">Shelf</option>
                <option value="top">Top</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Item Selector */}
            <div className="flex-1">
              <label
                htmlFor="length_catalog_id"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Length Item <span className="text-red-500">*</span>
              </label>
              <select
                id="length_catalog_id"
                name="length_catalog_id"
                value={formData.length_catalog_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  errors.length_catalog_id
                    ? "border-red-500"
                    : "border-slate-300"
                } rounded-md text-sm`}
                disabled={
                  loading || filteredLengths.length === 0 || !selectedType
                }
              >
                <option value="">
                  {filteredLengths.length === 0
                    ? "First select a type"
                    : "Select item..."}
                </option>
                {filteredLengths.map((length) => (
                  <option key={length.id} value={length.id}>
                    {length.name}
                  </option>
                ))}
              </select>
              {errors.length_catalog_id && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.length_catalog_id}
                </p>
              )}
            </div>
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Quantity */}
            <div>
              <label
                htmlFor="quantity"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                id="quantity"
                name="quantity"
                value={mathInput.inputValues.quantity ?? ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("quantity")}
                className={`w-full px-3 py-2 border ${
                  errors.quantity ? "border-red-500" : "border-slate-300"
                } rounded-md text-sm`}
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Length */}
            <div>
              <label
                htmlFor="length"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Length (ft) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="length"
                name="length"
                value={mathInput.inputValues.length || ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("length")}
                className={`w-full px-3 py-2 border ${
                  errors.length ? "border-red-500" : "border-slate-300"
                } rounded-md text-sm`}
              />
              {errors.length && (
                <p className="text-red-500 text-xs mt-1">{errors.length}</p>
              )}
            </div>

            {/* Width */}
            <div>
              <label
                htmlFor="width"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Width (in)
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="width"
                name="width"
                value={mathInput.inputValues.width || ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("width")}
                placeholder={
                  selectedLengthItem?.default_width
                    ? `Default: ${selectedLengthItem.default_width}`
                    : "Optional"
                }
                className={`w-full px-3 py-2 border ${
                  errors.width ? "border-red-500" : "border-slate-300"
                } rounded-md text-sm`}
              />
              {errors.width && (
                <p className="text-red-500 text-xs mt-1">{errors.width}</p>
              )}
            </div>

            {/* Thickness */}
            <div>
              <label
                htmlFor="thickness"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Thickness (in)
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="thickness"
                name="thickness"
                value={mathInput.inputValues.thickness || ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("thickness")}
                placeholder={
                  selectedLengthItem?.default_thickness
                    ? `Default: ${selectedLengthItem.default_thickness}`
                    : "Optional"
                }
                className={`w-full px-3 py-2 border ${
                  errors.thickness ? "border-red-500" : "border-slate-300"
                } rounded-md text-sm`}
              />
              {errors.thickness && (
                <p className="text-red-500 text-xs mt-1">{errors.thickness}</p>
              )}
            </div>

            {/* Miter Count */}
            <div>
              <label
                htmlFor="miter_count"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Miters
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="miter_count"
                name="miter_count"
                value={mathInput.inputValues.miter_count || ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("miter_count")}
                disabled={!selectedLengthItem?.requires_miters}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            {/* Cutout Count */}
            <div>
              <label
                htmlFor="cutout_count"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Cutouts
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="cutout_count"
                name="cutout_count"
                value={mathInput.inputValues.cutout_count || ""}
                onChange={handleChange}
                onBlur={() => mathInput.handleBlur("cutout_count")}
                disabled={!selectedLengthItem?.requires_cutouts}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="length_mat"
                className="flex items-center text-xs font-medium text-slate-700 mb-1"
              >
                <span>Material</span>
                {getEffectiveDefaultDisplay(
                  formData.length_mat,
                  effectiveLengthMaterialId,
                  formatMaterialName
                )}
              </label>
              <select
                id="length_mat"
                name="length_mat"
                value={
                  formData.length_mat === null || formData.length_mat === ""
                    ? ""
                    : formData.length_mat
                }
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="">Section Default</option>
                {faceMaterialOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center text-xs font-medium text-slate-700 mb-1">
                <span>Finish</span>
                {getEffectiveDefaultDisplay(
                  formData.length_finish,
                  effectiveLengthFinish,
                  formatFinishArray,
                  true
                )}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm border border-slate-300 rounded-md px-3 py-2">
                <label
                  className={`flex items-center space-x-2 ${
                    !mustSelectLengthFinish ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!mustSelectLengthFinish}
                    checked={isFinishExplicitlyNone()}
                    onChange={() => handleFinishChange(FINISH_NONE)}
                    className="rounded border-slate-300"
                  />
                  <span className="italic">None</span>
                </label>
                {finishOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center space-x-2 ${
                      !mustSelectLengthFinish || isFinishExplicitlyNone()
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!mustSelectLengthFinish || isFinishExplicitlyNone()}
                      checked={(formData.length_finish || []).includes(option.id)}
                      onChange={() => handleFinishChange(option.id)}
                      className="rounded border-slate-300"
                    />
                    <span>{option.name}</span>
                  </label>
                ))}
              </div>
              <div className="h-5">
                <p
                  className={`text-xs text-teal-600 mt-1 transition-opacity duration-200 ${
                    !mustSelectLengthFinish ? "opacity-100" : "opacity-0"
                  }`}
                >
                  The selected length material does not require finish.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center"
          >
            <FiX className="mr-1" />
            Cancel
          </button>
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

LengthItemForm.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  currentSectionId: PropTypes.number,
};

const EstimateLengthManager = ({
  items,
  approxBaseLengthFeet = 0,
  approxCrownLengthFeet = 0,
  onUpdateItems,
  onReorderItems,
  onDuplicateItem,
  onMoveItem,
  onDeleteItem,
  currentTaskId,
  currentSectionId,
}) => {
  const { catalog } = useSelector((state) => state.lengths);
  const currentEstimate = useSelector((state) => state.estimates.currentEstimate);
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults
  );
  const faceMaterialOptions = useSelector(
    (state) => state.materials?.faceMaterials || []
  );
  const finishOptions = useSelector((state) => state.finishes?.finishes || []);

  const currentSection = useMemo(() => {
    const sectionId = Number(currentSectionId);
    if (!Number.isFinite(sectionId)) return null;

    return (
      currentEstimate?.tasks
        ?.flatMap((task) => task.sections || [])
        ?.find((section) => Number(section.est_section_id) === sectionId) || null
    );
  }, [currentEstimate, currentSectionId]);

  const effectiveSectionLengthMaterialId = getEffectiveValueOnly(
    currentSection?.face_mat ?? null,
    currentEstimate?.default_face_mat ?? null,
    teamDefaults?.default_face_mat ?? null
  );

  const getLengthName = (lengthCatalogId) => {
    const lengthItem = catalog.find((l) => l.id === lengthCatalogId);
    return lengthItem ? lengthItem.name : "Unknown";
  };

  const getLengthMaterialName = (materialId) => {
    if (materialId === null || materialId === undefined) return "";
    const material = faceMaterialOptions.find((mat) => mat.id === materialId);
    return material?.name || `ID ${materialId}`;
  };

  const getLengthFinishName = (finishIds) => {
    if (finishIds === null || finishIds === undefined) return "";
    if (Array.isArray(finishIds) && finishIds.length === 0) return "None";
    if (!Array.isArray(finishIds)) return "";

    return finishIds
      .map((finishId) => finishOptions.find((f) => f.id === finishId)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const getLengthOverridesSummary = (item) => {
    const summaryParts = [];

    const effectiveLengthMaterialId =
      item.length_mat !== null && item.length_mat !== undefined
        ? item.length_mat
        : effectiveSectionLengthMaterialId;
    const effectiveLengthMaterial = faceMaterialOptions.find(
      (mat) => String(mat.id) === String(effectiveLengthMaterialId)
    );
    const shouldShowFinish = effectiveLengthMaterial?.needs_finish === true;

    if (item.length_mat !== null && item.length_mat !== undefined) {
      const materialName = getLengthMaterialName(item.length_mat);
      if (materialName) {
        summaryParts.push(`${materialName}`);
      }
    }

    if (shouldShowFinish && Array.isArray(item.length_finish)) {
      const finishName = getLengthFinishName(item.length_finish);
      if (finishName) {
        summaryParts.push(`Finish: ${finishName}`);
      }
    }

    if (summaryParts.length === 0) return null;

    return <span className="text-slate-400">{summaryParts.join(" | ")}</span>;
  };

  const columns = [
    // {
    //   key: "type",
    //   label: "Type",
    //   width: "80px",
    //   render: (item) => getLengthType(item.length_catalog_id),
    // },
    {
      key: "quantity",
      label: "Qty",
      width: ITEM_FORM_WIDTHS.QUANTITY,
      render: (item) => item.quantity || 0,
    },
    {
      key: "item",
      label: "Item",
      width: ITEM_FORM_WIDTHS.DEFAULT,
      render: (item) => getLengthName(item.length_catalog_id),
    },
    {
      key: "length",
      label: "Length",
      width: "80px",
      render: (item) => (item.length ? `${item.length} ft` : "-"),
    },
    {
      key: "width",
      label: "Width",
      width: "90px",
      render: (item) => {
        const lengthItem = catalog.find((l) => l.id === item.length_catalog_id);
        const width = item.width ?? lengthItem?.default_width;
        return width ? `${width} in` : "-";
      },
    },
    {
      key: "thickness",
      label: "Thickness",
      width: "100px",
      render: (item) => {
        const lengthItem = catalog.find((l) => l.id === item.length_catalog_id);
        const thickness = item.thickness ?? lengthItem?.default_thickness;
        return thickness ? `${thickness} in` : "-";
      },
    },
    {
      key: "miter_count",
      label: "Miters",
      width: "70px",
      render: (item) => item.miter_count || 0,
    },
    {
      key: "cutout_count",
      label: "Cutouts",
      width: "70px",
      render: (item) => item.cutout_count || 0,
    },
    { key: "actions", label: "Actions", width: ITEM_FORM_WIDTHS.ACTIONS },
  ];

  const handleSaveItem = async (item, itemIndex = -1) => {
    try {
      const updatedItems = [...items];
      if (itemIndex === -1) {
        // New item
        updatedItems.push(item);
      } else {
        // Update existing item
        updatedItems[itemIndex] = item;
      }
      onUpdateItems(updatedItems);
    } catch (error) {
      void error;
    }
  };

  const handleDeleteItem = async (itemIndex) => {
    try {
      const itemToDelete = items[itemIndex];
      onDeleteItem(itemToDelete);
    } catch (error) {
      void error;
    }
  };

  const handleReorderItems = (reorderedItems) => {
    onReorderItems(reorderedItems);
  };

  const getReorderItemName = (item) => {
    const lengthName = getLengthName(item.length_catalog_id);
    const length = item.length ? `${item.length} ft` : "";
    return `${lengthName}${length ? ` - ${length}` : ""}`;
  };

  return (
    <>
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
        Approx. molding coverage (rounded up): Base {approxBaseLengthFeet} ft | Crown {approxCrownLengthFeet} ft
      </div>
      <SectionItemList
        items={items}
        columns={columns}
        addButtonText="Add Length Item"
        emptyStateText="No length items added yet. Click the button below to add one."
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onReorder={handleReorderItems}
        onDuplicate={onDuplicateItem}
        onMove={onMoveItem}
        ItemForm={LengthItemForm}
        formProps={{ currentSectionId }}
        getReorderItemName={getReorderItemName}
        getItemSummary={getLengthOverridesSummary}
        listType="length"
        currentTaskId={currentTaskId}
        currentSectionId={currentSectionId}
      />
    </>
  );
};

EstimateLengthManager.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  approxBaseLengthFeet: PropTypes.number,
  approxCrownLengthFeet: PropTypes.number,
  onUpdateItems: PropTypes.func.isRequired,
  onReorderItems: PropTypes.func.isRequired,
  onDuplicateItem: PropTypes.func,
  onMoveItem: PropTypes.func,
  onDeleteItem: PropTypes.func.isRequired,
  currentTaskId: PropTypes.number,
  currentSectionId: PropTypes.number,
};

export default EstimateLengthManager;
