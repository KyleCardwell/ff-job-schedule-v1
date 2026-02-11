import PropTypes from "prop-types";
import { useState, useEffect, useMemo } from "react";
import {
  FiSave,
  FiX,
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { RiDeleteBin2Line } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";

import { updateEstimatePriceOverrides } from "../../redux/actions/estimates";

// Section configuration using Redux-aligned names
// Hardware sections use dotted keys ("hardware.hinges") to produce nested output
const SECTION_CONFIG = {
  materials: {
    label: "Materials",
    priceFields: [
      { key: "sheet_price", label: "Sheet Price", placeholder: "0.00" },
      { key: "bd_ft_price", label: "Bd Ft Price", placeholder: "0.00" },
    ],
    getOptions: (state) => {
      const allMats = [
        ...(state.materials?.boxMaterials || []),
        ...(state.materials?.faceMaterials || []),
      ];
      // Deduplicate by id
      const seen = new Set();
      return allMats.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    },
    optionLabel: (item) => item.name,
    optionValue: (item) => item.id,
  },
  drawerBoxMaterials: {
    label: "Drawer Box Materials",
    priceFields: [
      { key: "sheet_price", label: "Sheet Price", placeholder: "0.00" },
    ],
    getOptions: (state) => state.materials?.drawerBoxMaterials || [],
    optionLabel: (item) => item.name,
    optionValue: (item) => item.id,
  },
  finishes: {
    label: "Finishes",
    priceFields: [
      { key: "shop_markup", label: "Shop Markup (%)", placeholder: "0" },
      { key: "finish_markup", label: "Finish Markup (%)", placeholder: "0" },
    ],
    getOptions: (state) => state.finishes?.finishes || [],
    optionLabel: (item) => item.name,
    optionValue: (item) => item.id,
  },
  "hardware.hinges": {
    label: "Hinges",
    priceFields: [
      { key: "price", label: "Price", placeholder: "0.00" },
      { key: "actual_cost", label: "Actual Cost", placeholder: "0.00" },
    ],
    getOptions: (state) => state.hardware?.hinges || [],
    optionLabel: (item) => item.name,
    optionValue: (item) => item.id,
  },
  "hardware.pulls": {
    label: "Pulls",
    priceFields: [
      { key: "price", label: "Price", placeholder: "0.00" },
      { key: "actual_cost", label: "Actual Cost", placeholder: "0.00" },
    ],
    getOptions: (state) => state.hardware?.pulls || [],
    optionLabel: (item) => item.name,
    optionValue: (item) => item.id,
  },
  "hardware.slides": {
    label: "Slides",
    priceFields: [
      { key: "price", label: "Price", placeholder: "0.00" },
      { key: "actual_cost", label: "Actual Cost", placeholder: "0.00" },
    ],
    getOptions: (state) => state.hardware?.slides || [],
    optionLabel: (item) => item.name,
    optionValue: (item) => item.id,
  },
  accessories: {
    label: "Accessories",
    priceFields: [
      {
        key: "default_price_per_unit",
        label: "Price / Unit",
        placeholder: "0.00",
      },
    ],
    getOptions: (state) => state.accessories?.catalog || [],
    optionLabel: (item) => item.name,
    optionValue: (item) => item.id,
  },
};

const SECTION_ORDER = [
  "materials",
  "drawerBoxMaterials",
  "finishes",
  "hardware.hinges",
  "hardware.pulls",
  "hardware.slides",
  "accessories",
];

// Resolve a dotted key like "hardware.hinges" to the nested value in price_overrides
const getOverrideData = (priceOverrides, sectionKey) => {
  const parts = sectionKey.split(".");
  let data = priceOverrides;
  for (const part of parts) {
    data = data?.[part];
  }
  return data || {};
};

// Build form state from estimate.price_overrides
const buildFormState = (priceOverrides) => {
  const formState = {};
  SECTION_ORDER.forEach((sectionKey) => {
    const savedSection = getOverrideData(priceOverrides, sectionKey);
    // Convert { itemId: { field: value, ... }, ... } to array of rows
    formState[sectionKey] = Object.entries(savedSection).map(
      ([itemId, prices]) => ({
        itemId: String(itemId),
        ...prices,
      })
    );
  });
  return formState;
};

const EstimatePriceOverrides = ({ estimate, onSave }) => {
  const dispatch = useDispatch();
  const state = useSelector((s) => s);

  const [formData, setFormData] = useState(() =>
    buildFormState(estimate?.price_overrides)
  );
  const [collapsedSections, setCollapsedSections] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when estimate changes
  useEffect(() => {
    setFormData(buildFormState(estimate?.price_overrides));
  }, [estimate?.price_overrides]);

  // Get catalog options for each section, memoized
  const sectionOptions = useMemo(() => {
    const opts = {};
    SECTION_ORDER.forEach((key) => {
      opts[key] = SECTION_CONFIG[key].getOptions(state);
    });
    return opts;
  }, [
    state.materials?.boxMaterials,
    state.materials?.faceMaterials,
    state.materials?.drawerBoxMaterials,
    state.finishes?.finishes,
    state.hardware?.hinges,
    state.hardware?.pulls,
    state.hardware?.slides,
    state.accessories?.catalog,
  ]);

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleAddRow = (sectionKey) => {
    setFormData((prev) => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), { itemId: "" }],
    }));
    // Make sure section is expanded
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: false }));
  };

  const handleDeleteRow = (sectionKey, rowIndex) => {
    setFormData((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((_, i) => i !== rowIndex),
    }));
  };

  const handleRowChange = (sectionKey, rowIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((row, i) => {
        if (i !== rowIndex) return row;
        // If changing itemId, reset price fields
        if (field === "itemId") {
          const resetRow = { itemId: value };
          return resetRow;
        }
        return { ...row, [field]: value };
      }),
    }));
  };

  // Get items already selected in a section (to filter dropdown)
  const getSelectedIds = (sectionKey, excludeIndex) => {
    return (formData[sectionKey] || [])
      .filter((_, i) => i !== excludeIndex)
      .map((row) => String(row.itemId))
      .filter(Boolean);
  };

  // Convert form state to the price_overrides JSON structure
  // Handles dotted keys (e.g. "hardware.hinges") by nesting into { hardware: { hinges: {...} } }
  const buildPriceOverrides = () => {
    const overrides = {};
    SECTION_ORDER.forEach((sectionKey) => {
      const rows = formData[sectionKey] || [];
      const sectionData = {};
      rows.forEach((row) => {
        if (!row.itemId) return;
        const prices = {};
        SECTION_CONFIG[sectionKey].priceFields.forEach(({ key }) => {
          const val = row[key];
          if (val !== undefined && val !== "" && val !== null) {
            prices[key] = parseFloat(val);
          }
        });
        if (Object.keys(prices).length > 0) {
          sectionData[row.itemId] = prices;
        }
      });
      if (Object.keys(sectionData).length > 0) {
        // Handle dotted keys like "hardware.hinges"
        const parts = sectionKey.split(".");
        if (parts.length === 2) {
          if (!overrides[parts[0]]) overrides[parts[0]] = {};
          overrides[parts[0]][parts[1]] = sectionData;
        } else {
          overrides[sectionKey] = sectionData;
        }
      }
    });
    return overrides;
  };

  const handleSave = async () => {
    if (!estimate?.estimate_id) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const priceOverrides = buildPriceOverrides();
      await dispatch(
        updateEstimatePriceOverrides(estimate.estimate_id, priceOverrides)
      );
      onSave?.();
    } catch (error) {
      console.error("Error saving price overrides:", error);
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to previously saved state (does not navigate away)
    setFormData(buildFormState(estimate?.price_overrides));
    setSaveError(null);
  };

  const handleClearAll = () => {
    const emptyState = {};
    SECTION_ORDER.forEach((key) => {
      emptyState[key] = [];
    });
    setFormData(emptyState);
  };

  // Style constants matching EstimateSectionForm
  const STYLES = {
    sectionHeader: "text-md font-medium text-slate-200",
    sectionBorder: "border rounded-lg border-slate-400 p-3",
    label: "text-left text-sm font-medium text-slate-200",
    input:
      "block w-full rounded-md text-sm h-9 text-center bg-slate-700 text-slate-200 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
    select:
      "block w-full rounded-md text-sm h-9 bg-slate-700 text-slate-200 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between py-4 sticky top-0 bg-slate-800 z-10">
        <h2 className="text-lg font-semibold text-slate-200">
          Price Overrides
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-slate-200 rounded transition-colors"
            title="Clear all overrides"
          >
            <RiDeleteBin2Line size={18} />
            Clear All
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            <FiX size={18} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors disabled:opacity-50"
          >
            <FiSave size={18} />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-red-900 border border-red-600 text-red-200 rounded">
          {saveError}
        </div>
      )}

      {/* Sections */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {SECTION_ORDER.map((sectionKey) => {
          const config = SECTION_CONFIG[sectionKey];
          const rows = formData[sectionKey] || [];
          const isCollapsed = collapsedSections[sectionKey];
          const options = sectionOptions[sectionKey] || [];

          return (
            <div key={sectionKey} className={STYLES.sectionBorder}>
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {isCollapsed ? (
                    <FiChevronDown className="text-slate-400" size={18} />
                  ) : (
                    <FiChevronUp className="text-slate-400" size={18} />
                  )}
                  <span className={STYLES.sectionHeader}>
                    {config.label}
                  </span>
                  {rows.length > 0 && (
                    <span className="text-xs text-teal-400 ml-2">
                      ({rows.length} override{rows.length !== 1 ? "s" : ""})
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleAddRow(sectionKey)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors"
                >
                  <FiPlus size={14} />
                  Add
                </button>
              </div>

              {/* Section Rows */}
              {!isCollapsed && rows.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* Column Headers */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 min-w-[200px]">
                      <span className="text-xs font-medium text-slate-400">
                        Item
                      </span>
                    </div>
                    {config.priceFields.map((pf) => (
                      <div key={pf.key} className="w-32">
                        <span className="text-xs font-medium text-slate-400">
                          {pf.label}
                        </span>
                      </div>
                    ))}
                    <div className="w-10" />
                  </div>

                  {/* Data Rows */}
                  {rows.map((row, rowIndex) => {
                    const selectedIds = getSelectedIds(
                      sectionKey,
                      rowIndex
                    );
                    const availableOptions = options.filter(
                      (opt) =>
                        !selectedIds.includes(
                          String(config.optionValue(opt))
                        )
                    );

                    return (
                      <div
                        key={rowIndex}
                        className="flex items-center gap-2 bg-slate-700 rounded p-2"
                      >
                        {/* Item Select */}
                        <div className="flex-1 min-w-[200px]">
                          <select
                            className={STYLES.select}
                            value={row.itemId || ""}
                            onChange={(e) =>
                              handleRowChange(
                                sectionKey,
                                rowIndex,
                                "itemId",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select item...</option>
                            {/* Show current selection even if it would be filtered */}
                            {row.itemId &&
                              !availableOptions.find(
                                (opt) =>
                                  String(config.optionValue(opt)) ===
                                  String(row.itemId)
                              ) &&
                              (() => {
                                const currentOpt = options.find(
                                  (opt) =>
                                    String(config.optionValue(opt)) ===
                                    String(row.itemId)
                                );
                                return currentOpt ? (
                                  <option
                                    key={config.optionValue(currentOpt)}
                                    value={config.optionValue(currentOpt)}
                                  >
                                    {config.optionLabel(currentOpt)}
                                  </option>
                                ) : null;
                              })()}
                            {availableOptions.map((opt) => (
                              <option
                                key={config.optionValue(opt)}
                                value={config.optionValue(opt)}
                              >
                                {config.optionLabel(opt)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Price Inputs */}
                        {config.priceFields.map((pf) => (
                          <div key={pf.key} className="w-32">
                            <input
                              type="number"
                              step="any"
                              className={STYLES.input}
                              placeholder={pf.placeholder}
                              value={row[pf.key] ?? ""}
                              onChange={(e) =>
                                handleRowChange(
                                  sectionKey,
                                  rowIndex,
                                  pf.key,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        ))}

                        {/* Delete Button */}
                        <div className="w-10 flex justify-center">
                          <button
                            onClick={() =>
                              handleDeleteRow(sectionKey, rowIndex)
                            }
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Remove override"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isCollapsed && rows.length === 0 && (
                <div className="mt-2 text-sm text-slate-500 italic px-1">
                  No overrides. Click Add to override a price.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

EstimatePriceOverrides.propTypes = {
  estimate: PropTypes.object,
  onSave: PropTypes.func,
};

export default EstimatePriceOverrides;
