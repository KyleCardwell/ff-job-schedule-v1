import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";

import {
  safeEvaluate,
  formatNumberValue,
  decimalToFraction,
  fractionToDecimal,
} from "../../utils/mathUtils";

const DIMENSION_FIELDS = ["width", "height", "depth"];

const parseDimensionOverride = (value) => {
  const input = String(value ?? "").trim();
  if (!input) return null;

  const evaluatedValue = safeEvaluate(input);
  const fractionValue = fractionToDecimal(input);
  const numericValue = evaluatedValue ?? fractionValue ?? Number(input);

  return Number.isFinite(numericValue) && numericValue > 0
    ? formatNumberValue(numericValue)
    : undefined;
};

const createDimensionDraft = (cabinetTypes, dimensionOverrides) =>
  cabinetTypes.reduce((draft, cabinetType) => {
    const typeId = cabinetType.cabinet_type_id;
    draft[typeId] = DIMENSION_FIELDS.reduce((dimensions, field) => {
      const value = dimensionOverrides[typeId]?.[field];
      dimensions[field] = value == null ? "" : decimalToFraction(value);
      return dimensions;
    }, {});
    return draft;
  }, {});

const CabinetDimensionDefaultsModal = ({
  isOpen,
  onClose,
  cabinetTypes,
  dimensionOverrides,
  onSave,
}) => {
  const activeCabinetTypes = useMemo(
    () => cabinetTypes.filter((cabinetType) => cabinetType.is_active),
    [cabinetTypes],
  );
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setDraft(createDimensionDraft(activeCabinetTypes, dimensionOverrides));
    setErrors({});
  }, [activeCabinetTypes, dimensionOverrides, isOpen]);

  const handleChange = (typeId, field, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [typeId]: {
        ...currentDraft[typeId],
        [field]: value,
      },
    }));
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[`${typeId}.${field}`];
      return nextErrors;
    });
  };

  const handleClear = () => {
    setDraft(createDimensionDraft(activeCabinetTypes, {}));
    setErrors({});
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const nextOverrides = activeCabinetTypes.reduce((overrides, cabinetType) => {
      const typeId = cabinetType.cabinet_type_id;
      overrides[typeId] = DIMENSION_FIELDS.reduce((dimensions, field) => {
        const value = parseDimensionOverride(draft[typeId]?.[field]);
        if (value === undefined) {
          nextErrors[`${typeId}.${field}`] = true;
        } else {
          dimensions[field] = value;
        }
        return dimensions;
      }, {});
      return overrides;
    }, {});

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(nextOverrides);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cabinet-dimension-defaults-title"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-4">
          <div>
            <h2
              id="cabinet-dimension-defaults-title"
              className="text-xl font-bold text-slate-800"
            >
              Cabinet Dimension Defaults
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Blank fields use the team default. These overrides last only for the
              current section editing session.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 text-2xl leading-none text-slate-400 hover:text-slate-600"
            aria-label="Close cabinet dimension defaults"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[minmax(180px,2fr)_repeat(3,minmax(120px,1fr))] gap-3 border-b border-slate-200 px-2 pb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <span>Cabinet Type</span>
              {DIMENSION_FIELDS.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
            {activeCabinetTypes.map((cabinetType) => {
              const typeId = cabinetType.cabinet_type_id;
              return (
                <div
                  key={typeId}
                  className="grid grid-cols-[minmax(180px,2fr)_repeat(3,minmax(120px,1fr))] items-start gap-3 border-b border-slate-100 px-2 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700">
                      {cabinetType.cabinet_type_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Team: {DIMENSION_FIELDS.map((field) => {
                        const value = cabinetType[`default_${field}`];
                        return value == null ? "—" : decimalToFraction(value);
                      }).join(" × ")}
                    </div>
                  </div>
                  {DIMENSION_FIELDS.map((field) => {
                    const errorKey = `${typeId}.${field}`;
                    const defaultValue = cabinetType[`default_${field}`];
                    return (
                      <div key={field}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft[typeId]?.[field] ?? ""}
                          onChange={(event) =>
                            handleChange(typeId, field, event.target.value)
                          }
                          placeholder={
                            defaultValue == null
                              ? "No default"
                              : decimalToFraction(defaultValue)
                          }
                          className={`w-full rounded-md border px-3 py-2 text-sm ${
                            errors[errorKey]
                              ? "border-red-500"
                              : "border-slate-300"
                          }`}
                          aria-label={`${cabinetType.cabinet_type_name} ${field}`}
                          aria-invalid={Boolean(errors[errorKey])}
                        />
                        {errors[errorKey] && (
                          <p className="mt-1 text-xs text-red-500">
                            Enter a positive size or leave blank.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Clear Overrides
          </button>
          <div className="flex gap-2">
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
              Apply Defaults
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

CabinetDimensionDefaultsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cabinetTypes: PropTypes.arrayOf(PropTypes.object).isRequired,
  dimensionOverrides: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default CabinetDimensionDefaultsModal;
