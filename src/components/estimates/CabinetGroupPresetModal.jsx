import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { TbArrowsSplit } from "react-icons/tb";
import { v4 as uuid } from "uuid";

import { CABINET_GROUP_PRESETS } from "../../config/cabinetGroupPresets";
import {
  formatNumberValue,
  fractionToDecimal,
  safeEvaluate,
} from "../../utils/mathUtils";

const DIMENSION_FIELDS = ["width", "height", "depth"];
const END_PANEL_TYPE_ID = 10;

const parseDimension = (value) => {
  const input = String(value ?? "").trim();
  if (!input) return null;

  const evaluated = safeEvaluate(input);
  const fraction = fractionToDecimal(input);
  const numericValue = evaluated ?? fraction ?? Number(input);
  return Number.isFinite(numericValue) ? formatNumberValue(numericValue) : null;
};

const CabinetGroupPresetModal = ({
  isOpen,
  onClose,
  onAdd,
  cabinetTypes,
  dimensionOverrides,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState(
    CABINET_GROUP_PRESETS[0].id,
  );
  const [parameters, setParameters] = useState({});
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const selectedPreset = useMemo(
    () =>
      CABINET_GROUP_PRESETS.find(
        (preset) => preset.id === selectedPresetId,
      ) || CABINET_GROUP_PRESETS[0],
    [selectedPresetId],
  );

  const buildContext = useMemo(
    () => ({ cabinetTypes, dimensionOverrides, parseDimension }),
    [cabinetTypes, dimensionOverrides],
  );

  useEffect(() => {
    if (!isOpen) return;
    const preset = CABINET_GROUP_PRESETS[0];
    const defaults = preset.createDefaults(buildContext);
    setSelectedPresetId(preset.id);
    setParameters(defaults);
    setRows(preset.createRows(defaults, buildContext));
    setErrors({});
    setSubmitError("");
  }, [buildContext, isOpen]);

  const selectPreset = (preset) => {
    const defaults = preset.createDefaults(buildContext);
    setSelectedPresetId(preset.id);
    setParameters(defaults);
    setRows(preset.createRows(defaults, buildContext));
    setErrors({});
    setSubmitError("");
  };

  const updateParameter = (key, value) => {
    const nextParameters = { ...parameters, [key]: value };
    setParameters(nextParameters);
    setRows(selectedPreset.createRows(nextParameters, buildContext));
    setErrors({});
    setSubmitError("");
  };

  const updateRow = (rowKey, field, value) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.key === rowKey ? { ...row, [field]: value } : row,
      ),
    );
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[`${rowKey}.${field}`];
      return nextErrors;
    });
    setSubmitError("");
  };

  const splitRow = (rowIndex) => {
    setRows((currentRows) => {
      const row = currentRows[rowIndex];
      const quantity = Math.trunc(Number(row.quantity));
      if (!Number.isFinite(quantity) || quantity <= 1) return currentRows;

      const splitRows = Array.from({ length: quantity }, (_, index) => ({
        ...row,
        key: `${row.key}-${uuid()}`,
        quantity: "1",
        configuration: `${row.configuration} ${index + 1}`,
      }));
      return [
        ...currentRows.slice(0, rowIndex),
        ...splitRows,
        ...currentRows.slice(rowIndex + 1),
      ];
    });
  };

  const removeRow = (rowKey) => {
    setRows((currentRows) =>
      currentRows.filter((row) => row.key !== rowKey),
    );
  };

  const applianceHeightError = useMemo(() => {
    if (selectedPresetId !== "appliance-surround") return "";
    const overallHeight = parseDimension(parameters.overallHeight);
    const applianceHeight = parseDimension(parameters.applianceHeight);
    const baseHeight = parseDimension(parameters.baseHeight);
    if (
      overallHeight == null ||
      applianceHeight == null ||
      baseHeight == null
    ) {
      return "";
    }
    return overallHeight - applianceHeight - baseHeight <= 0
      ? "Overall height must be greater than the appliance height plus the base height."
      : "";
  }, [parameters, selectedPresetId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};

    rows.forEach((row) => {
      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        nextErrors[`${row.key}.quantity`] = "Enter a whole number of 1 or more.";
      }
      DIMENSION_FIELDS.forEach((field) => {
        const value = parseDimension(row[field]);
        if (value == null || value <= 0) {
          nextErrors[`${row.key}.${field}`] = "Enter a positive size.";
        }
      });
    });

    if (rows.length === 0) {
      setSubmitError("Add at least one cabinet item before saving.");
      return;
    }
    if (applianceHeightError) {
      setSubmitError(applianceHeightError);
      return;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError("Correct the highlighted values before adding the group.");
      return;
    }

    const normalizedRows = rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      width: parseDimension(row.width),
      height: parseDimension(row.height),
      depth: parseDimension(row.depth),
    }));

    try {
      onAdd(normalizedRows);
      onClose();
    } catch (error) {
      setSubmitError(error.message || "The cabinet group could not be added.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cabinet-group-preset-title"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-4">
          <div>
            <h2
              id="cabinet-group-preset-title"
              className="text-xl font-bold text-slate-800"
            >
              Add Cabinet Group
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a preset, adjust its shared dimensions, then review every
              generated item before adding it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 text-2xl leading-none text-slate-400 hover:text-slate-600"
            aria-label="Close cabinet group modal"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Configuration
            </legend>
            <div>
              <select
                value={selectedPresetId}
                onChange={(event) => {
                  const preset = CABINET_GROUP_PRESETS.find(
                    (candidate) => candidate.id === event.target.value,
                  );
                  if (preset) selectPreset(preset);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                aria-label="Cabinet group configuration"
              >
                {CABINET_GROUP_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} — {preset.description}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500">
                <span className="font-medium text-slate-700">
                  {selectedPreset.label}:
                </span>{" "}
                {selectedPreset.description}
              </p>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <legend className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Shared Dimensions
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {selectedPreset.parameterFields
                .filter((field) => field.group !== "ends")
                .map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={parameters[field.key] ?? ""}
                    onChange={(event) =>
                      updateParameter(field.key, event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                Ends
              </div>
              <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                {selectedPreset.parameterFields
                  .filter((field) => field.group === "ends")
                  .map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-600">
                        {field.label}
                      </span>
                    <select
                      value={parameters[field.key] ?? ""}
                      onChange={(event) =>
                        updateParameter(field.key, event.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    </label>
                  ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Changing a shared dimension refreshes the generated rows. Make
              row-specific edits afterward.
            </p>
            {selectedPresetId === "appliance-surround" && (
              <p
                className={`mt-2 text-xs ${
                  applianceHeightError ? "text-red-600" : "text-slate-500"
                }`}
              >
                Upper height = overall height − appliance height − base height.
                {applianceHeightError ? ` ${applianceHeightError}` : ""}
              </p>
            )}
          </fieldset>

          <div>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Generated Items
                </h3>
                <p className="text-xs text-slate-500">
                  Split a quantity row when individual cabinets need different
                  dimensions.
                </p>
              </div>
              <span className="text-xs text-slate-500">
                {rows.reduce(
                  (total, row) => total + (Number(row.quantity) || 0),
                  0,
                )}{" "}
                total pieces
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[80px_minmax(150px,1.4fr)_minmax(130px,1.2fr)_repeat(3,minmax(105px,1fr))_90px_80px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <span>Qty</span>
                  <span>Type</span>
                  <span>Configuration</span>
                  <span>Width</span>
                  <span>Height</span>
                  <span>Depth</span>
                  <span>Shop Built</span>
                  <span>Actions</span>
                </div>
                {rows.map((row, rowIndex) => {
                  const cabinetType = cabinetTypes.find(
                    (type) =>
                      Number(type.cabinet_type_id) === Number(row.typeId),
                  );
                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-[80px_minmax(150px,1.4fr)_minmax(130px,1.2fr)_repeat(3,minmax(105px,1fr))_90px_80px] items-start gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0"
                    >
                      <div>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.quantity}
                          onChange={(event) =>
                            updateRow(row.key, "quantity", event.target.value)
                          }
                          className={`w-full rounded-md border px-2 py-2 text-sm ${
                            errors[`${row.key}.quantity`]
                              ? "border-red-500"
                              : "border-slate-300"
                          }`}
                          aria-label={`${row.configuration} quantity`}
                        />
                      </div>
                      <div className="pt-2 text-sm font-medium text-slate-700">
                        {cabinetType?.cabinet_type_name || `Type ${row.typeId}`}
                      </div>
                      <div className="pt-2 text-sm text-slate-600">
                        {row.configuration}
                      </div>
                      {DIMENSION_FIELDS.map((field) => (
                        <div key={field}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row[field]}
                            onChange={(event) =>
                              updateRow(row.key, field, event.target.value)
                            }
                            className={`w-full rounded-md border px-2 py-2 text-sm ${
                              errors[`${row.key}.${field}`]
                                ? "border-red-500"
                                : "border-slate-300"
                            }`}
                            aria-label={`${row.configuration} ${field}`}
                          />
                        </div>
                      ))}
                      <div className="flex justify-center pt-2">
                        {Number(row.typeId) === END_PANEL_TYPE_ID ? (
                          <input
                            type="checkbox"
                            checked={Boolean(row.shopBuilt)}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                "shopBuilt",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            aria-label={`${row.configuration} shop built`}
                          />
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1 pt-1">
                        {Number(row.quantity) > 1 && (
                          <button
                            type="button"
                            onClick={() => splitRow(rowIndex)}
                            className="rounded p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-600"
                            title="Split into individual rows"
                            aria-label={`Split ${row.configuration} into individual rows`}
                          >
                            <TbArrowsSplit size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove row"
                          aria-label={`Remove ${row.configuration}`}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {submitError && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {submitError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
          >
            Add Cabinet Group
          </button>
        </div>
      </form>
    </div>
  );
};

CabinetGroupPresetModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  cabinetTypes: PropTypes.arrayOf(PropTypes.object).isRequired,
  dimensionOverrides: PropTypes.object.isRequired,
};

export default CabinetGroupPresetModal;
