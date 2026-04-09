import PropTypes from "prop-types";
import { useState, useMemo } from "react";
import { FiX, FiSave } from "react-icons/fi";

import {
  computeUnitPrice,
  computeSuggestedRates,
} from "../../utils/targetPriceHelpers";

const CLEAR_SENTINEL = "clear";

const getEffectiveRate = (changed, current, defaultRate) => {
  if (changed === CLEAR_SENTINEL) return defaultRate;
  if (changed !== "") return parseFloat(changed) || 0;
  return current;
};

const TargetPriceModal = ({
  isOpen,
  onClose,
  subTotal,
  currentProfit,
  currentCommission,
  currentDiscount,
  defaultProfit,
  defaultCommission,
  defaultDiscount,
  onSave,
}) => {
  const [targetPrice, setTargetPrice] = useState("");
  const [changedProfit, setChangedProfit] = useState("");
  const [changedCommission, setChangedCommission] = useState("");
  const [changedDiscount, setChangedDiscount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Suggested rates based on target price
  const suggested = useMemo(() => {
    const tp = parseFloat(targetPrice);
    if (!tp || !subTotal) {
      return {
        suggestedProfit: null,
        suggestedCommission: null,
        suggestedDiscount: null,
      };
    }
    return computeSuggestedRates(
      tp,
      subTotal,
      currentProfit,
      currentCommission,
      currentDiscount,
    );
  }, [targetPrice, subTotal, currentProfit, currentCommission, currentDiscount]);

  // Current total (using only current rates)
  const currentTotal = useMemo(
    () => computeUnitPrice(subTotal, currentProfit, currentCommission, currentDiscount),
    [subTotal, currentProfit, currentCommission, currentDiscount],
  );

  // Effective rates: changed value if provided, cleared → default, else current
  const effectiveProfit = getEffectiveRate(changedProfit, currentProfit, defaultProfit);
  const effectiveCommission = getEffectiveRate(changedCommission, currentCommission, defaultCommission);
  const effectiveDiscount = getEffectiveRate(changedDiscount, currentDiscount, defaultDiscount);

  // New total using effective (changed or current) rates
  const newTotal = useMemo(
    () => computeUnitPrice(subTotal, effectiveProfit, effectiveCommission, effectiveDiscount),
    [subTotal, effectiveProfit, effectiveCommission, effectiveDiscount],
  );

  // Dollar amounts for each adjustment row
  const currentProfitDollar = subTotal * (currentProfit / 100);
  const currentCommissionDollar = subTotal * (currentCommission / 100);
  const currentDiscountDollar = subTotal * (currentDiscount / 100);

  const newProfitDollar = subTotal * (effectiveProfit / 100);
  const newCommissionDollar = subTotal * (effectiveCommission / 100);
  const newDiscountDollar = subTotal * (effectiveDiscount / 100);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatRate = (rate) =>
    rate != null ? `${Math.round(rate * 100) / 100}%` : "—";

  const isFieldChanged = (val) => val !== "";
  const hasChanges =
    isFieldChanged(changedProfit) ||
    isFieldChanged(changedCommission) ||
    isFieldChanged(changedDiscount);

  const resolveSaveValue = (changed) => {
    if (changed === CLEAR_SENTINEL) return null;
    return parseFloat(changed) || 0;
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    const updates = {};
    if (isFieldChanged(changedProfit)) updates.profit = resolveSaveValue(changedProfit);
    if (isFieldChanged(changedCommission))
      updates.commission = resolveSaveValue(changedCommission);
    if (isFieldChanged(changedDiscount))
      updates.discount = resolveSaveValue(changedDiscount);

    setIsSaving(true);
    try {
      await onSave(updates);
      handleClose();
    } catch {
      // error handled upstream
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setTargetPrice("");
    setChangedProfit("");
    setChangedCommission("");
    setChangedDiscount("");
    onClose();
  };

  // Apply a suggested value to the changed column
  const applySuggested = (field, value) => {
    if (value == null) return;
    const str = String(value);
    if (field === "profit") setChangedProfit(str);
    if (field === "commission") setChangedCommission(str);
    if (field === "discount") setChangedDiscount(str);
  };

  // Set a field to "clear" (will send null to DB)
  const clearField = (field) => {
    if (field === "profit") setChangedProfit(CLEAR_SENTINEL);
    if (field === "commission") setChangedCommission(CLEAR_SENTINEL);
    if (field === "discount") setChangedDiscount(CLEAR_SENTINEL);
  };

  // Reset a field back to untouched
  const resetField = (field) => {
    if (field === "profit") setChangedProfit("");
    if (field === "commission") setChangedCommission("");
    if (field === "discount") setChangedDiscount("");
  };

  if (!isOpen) return null;

  const rows = [
    {
      label: "Profit",
      field: "profit",
      current: currentProfit,
      changed: changedProfit,
      setChanged: setChangedProfit,
      suggestedValue: suggested.suggestedProfit,
      currentDollar: currentProfitDollar,
      newDollar: newProfitDollar,
      defaultRate: defaultProfit,
    },
    {
      label: "Commission",
      field: "commission",
      current: currentCommission,
      changed: changedCommission,
      setChanged: setChangedCommission,
      suggestedValue: suggested.suggestedCommission,
      currentDollar: currentCommissionDollar,
      newDollar: newCommissionDollar,
      defaultRate: defaultCommission,
    },
    {
      label: "Discount",
      field: "discount",
      current: currentDiscount,
      changed: changedDiscount,
      setChanged: setChangedDiscount,
      suggestedValue: suggested.suggestedDiscount,
      currentDollar: currentDiscountDollar,
      newDollar: newDiscountDollar,
      defaultRate: defaultDiscount,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-300">
          <h2 className="text-xl font-bold text-slate-800">Target Price</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isSaving}
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Subtotal display */}
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-slate-600">Subtotal</span>
            <span className="font-semibold text-slate-800">
              {formatCurrency(subTotal)}
            </span>
          </div>
          <div className="flex justify-between items-center">
              <span className="font-medium text-slate-700">Current Total</span>
              <span className="text-lg font-bold text-slate-800">
                {formatCurrency(currentTotal)}
              </span>
            </div>

          {/* Target price input */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="target-price"
              className="text-sm font-medium text-slate-600 whitespace-nowrap"
            >
              Target Price
            </label>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                $
              </span>
              <input
                id="target-price"
                type="number"
                step="5"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Enter target..."
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-2 pr-2 font-medium text-slate-500">
                    Field
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-slate-500">
                    Current
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-slate-500">
                    Current $
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-slate-500">
                    Changed
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-slate-500">
                    New $
                  </th>
                  <th className="text-right py-2 pl-2 font-medium text-slate-500">
                    Suggested
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.field}
                    className="border-b border-slate-200"
                  >
                    <td className="py-2 pr-2 font-medium text-slate-700">
                      {row.label}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600">
                      {formatRate(row.current)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600">
                      {formatCurrency(row.currentDollar)}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        {row.changed === CLEAR_SENTINEL ? (
                          <span
                            className="w-20 text-right px-2 py-1 border border-amber-300 bg-amber-50 rounded text-sm text-amber-600 cursor-pointer"
                            onClick={() => resetField(row.field)}
                            title={`Default: ${formatRate(row.defaultRate)} — click to undo`}
                          >
                            {formatRate(row.defaultRate)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.5"
                            value={row.changed}
                            onChange={(e) => row.setChanged(e.target.value)}
                            placeholder="—"
                            className="w-20 text-right px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        )}
                        {row.changed !== CLEAR_SENTINEL ? (
                          <button
                            type="button"
                            onClick={() => clearField(row.field)}
                            className="text-xs text-slate-400 hover:text-amber-500 transition-colors"
                            title="Set to null (clear override)"
                          >
                            <FiX size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className={`py-2 px-2 text-right ${
                      row.changed === CLEAR_SENTINEL
                        ? "text-amber-500 font-medium"
                        : isFieldChanged(row.changed)
                          ? "text-teal-600 font-medium"
                          : "text-slate-400"
                    }`}>
                      {formatCurrency(row.newDollar)}
                    </td>
                    <td className="py-2 pl-2 text-right">
                      {row.suggestedValue != null ? (
                        <button
                          type="button"
                          onClick={() =>
                            applySuggested(row.field, row.suggestedValue)
                          }
                          className="text-teal-600 hover:text-teal-800 font-medium hover:underline"
                          title="Click to apply"
                        >
                          {formatRate(row.suggestedValue)}
                        </button>
                      ) : targetPrice ? (
                        <span className="text-slate-400 italic">n/a</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="pt-2 border-t border-slate-300 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-700">New Total</span>
              <span
                className={`text-lg font-bold ${
                  hasChanges ? "text-teal-600" : "text-slate-400"
                }`}
              >
                {hasChanges ? formatCurrency(newTotal) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-300 p-4 flex justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave size={14} />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

TargetPriceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  subTotal: PropTypes.number.isRequired,
  currentProfit: PropTypes.number.isRequired,
  currentCommission: PropTypes.number.isRequired,
  currentDiscount: PropTypes.number.isRequired,
  defaultProfit: PropTypes.number,
  defaultCommission: PropTypes.number,
  defaultDiscount: PropTypes.number,
  onSave: PropTypes.func.isRequired,
};

export default TargetPriceModal;
