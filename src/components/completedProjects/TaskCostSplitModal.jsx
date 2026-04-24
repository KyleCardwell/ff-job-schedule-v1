import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import {
  buttonClass,
  modalContainerClass,
  modalOverlayClass,
} from "../../assets/tailwindConstants";
import { DEFAULT_FINANCIAL_SECTIONS } from "../../utils/constants";
import { formatNumberValue, safeEvaluate } from "../../utils/mathUtils";

const normalizeSectionName = (name) => String(name || "").trim().toLowerCase();

const createSplitRow = () => ({
  id: uuidv4(),
  taskId: "",
  amount: null,
  isTaxed: false,
});

const createSharedRow = () => ({
  id: uuidv4(),
  description: "",
  amount: null,
  isTaxed: false,
});

const parseMathInputValue = (rawValue) => {
  if (!rawValue || rawValue.trim() === "") {
    return null;
  }

  const evaluated = safeEvaluate(rawValue);
  if (evaluated !== null) {
    return formatNumberValue(evaluated);
  }

  const parsed = parseFloat(rawValue);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return formatNumberValue(parsed);
};

const formatCurrency = (value) =>
  `$${(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const TaskCostSplitModal = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  tasks,
  onSave,
}) => {
  const chartConfig = useSelector((state) => state.chartConfig);

  const categoryOptions = useMemo(() => {
    const chartSections = Array.isArray(chartConfig?.estimate_sections)
      ? chartConfig.estimate_sections
      : [];

    const options = [...DEFAULT_FINANCIAL_SECTIONS];
    const existingIds = new Set(options.map((section) => String(section.id)));
    const existingNames = new Set(
      options.map((section) => normalizeSectionName(section.name)),
    );

    chartSections.forEach((section) => {
      const sectionId = String(section?.id || "");
      const sectionName = section?.name || "";
      const normalizedName = normalizeSectionName(sectionName);

      if (!sectionId || !sectionName) return;
      if (existingIds.has(sectionId) || existingNames.has(normalizedName)) return;

      options.push({ id: sectionId, name: sectionName });
      existingIds.add(sectionId);
      existingNames.add(normalizedName);
    });

    return options;
  }, [chartConfig]);

  const [categoryId, setCategoryId] = useState("");
  const [invoice, setInvoice] = useState("");
  const [splitRows, setSplitRows] = useState([]);
  const [sharedRows, setSharedRows] = useState([]);
  const [sharedTaxAmount, setSharedTaxAmount] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setCategoryId(categoryOptions[0]?.id ? String(categoryOptions[0].id) : "");
    setInvoice("");
    setSplitRows([createSplitRow()]);
    setSharedRows([createSharedRow()]);
    setSharedTaxAmount(null);
    setInputValues({});
    setIsSaving(false);
  }, [isOpen, categoryOptions]);

  const taskOptions = useMemo(
    () =>
      (tasks || []).map((task) => ({
        value: String(task.task_id),
        label: `${task.task_number || ""} - ${task.task_name || ""}`,
      })),
    [tasks],
  );

  const splitSubtotal = useMemo(
    () => splitRows.reduce((sum, row) => sum + (row.amount || 0), 0),
    [splitRows],
  );

  const sharedSubtotal = useMemo(
    () => sharedRows.reduce((sum, row) => sum + (row.amount || 0), 0),
    [sharedRows],
  );

  const taxableSubtotal = useMemo(() => {
    const taxedSplit = splitRows.reduce(
      (sum, row) => sum + (row.isTaxed ? row.amount || 0 : 0),
      0,
    );
    const taxedShared = sharedRows.reduce(
      (sum, row) => sum + (row.isTaxed ? row.amount || 0 : 0),
      0,
    );
    return taxedSplit + taxedShared;
  }, [splitRows, sharedRows]);

  const effectiveTaxRate = useMemo(() => {
    if (!taxableSubtotal) return 0;
    return ((sharedTaxAmount || 0) / taxableSubtotal) * 100;
  }, [sharedTaxAmount, taxableSubtotal]);

  const grandTotal = useMemo(
    () => splitSubtotal + sharedSubtotal + (sharedTaxAmount || 0),
    [splitSubtotal, sharedSubtotal, sharedTaxAmount],
  );

  if (!isOpen) return null;

  const handleTaskRowChange = (rowId, field, value) => {
    setSplitRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  const handleSharedRowChange = (rowId, field, value) => {
    setSharedRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  const handleTaskAmountInputChange = (rowId, value) => {
    setInputValues((prev) => ({
      ...prev,
      [`split-${rowId}`]: value,
    }));
  };

  const handleTaskAmountBlur = (rowId, value) => {
    const parsedValue = parseMathInputValue(value);
    setSplitRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, amount: parsedValue ?? null } : row,
      ),
    );
    setInputValues((prev) => ({
      ...prev,
      [`split-${rowId}`]: parsedValue === null ? "" : parsedValue.toString(),
    }));
  };

  const handleSharedAmountInputChange = (rowId, value) => {
    setInputValues((prev) => ({
      ...prev,
      [`shared-${rowId}`]: value,
    }));
  };

  const handleSharedAmountBlur = (rowId, value) => {
    const parsedValue = parseMathInputValue(value);
    setSharedRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, amount: parsedValue ?? null } : row,
      ),
    );
    setInputValues((prev) => ({
      ...prev,
      [`shared-${rowId}`]: parsedValue === null ? "" : parsedValue.toString(),
    }));
  };

  const handleSharedTaxInputChange = (value) => {
    setInputValues((prev) => ({ ...prev, sharedTax: value }));
  };

  const handleSharedTaxBlur = (value) => {
    const parsedValue = parseMathInputValue(value);
    setSharedTaxAmount(parsedValue ?? null);
    setInputValues((prev) => ({
      ...prev,
      sharedTax: parsedValue === null ? "" : parsedValue.toString(),
    }));
  };

  const handleDeleteSplitRow = (rowId) => {
    setSplitRows((prev) => prev.filter((row) => row.id !== rowId));
    setInputValues((prev) => {
      const next = { ...prev };
      delete next[`split-${rowId}`];
      return next;
    });
  };

  const handleDeleteSharedRow = (rowId) => {
    setSharedRows((prev) => prev.filter((row) => row.id !== rowId));
    setInputValues((prev) => {
      const next = { ...prev };
      delete next[`shared-${rowId}`];
      return next;
    });
  };

  const handleSave = async () => {
    const payload = {
      projectId,
      projectName,
      categoryId,
      invoice,
      splitRows,
      sharedRows,
      sharedTaxAmount: sharedTaxAmount || 0,
      totals: {
        splitSubtotal,
        sharedSubtotal,
        taxableSubtotal,
        effectiveTaxRate,
        grandTotal,
      },
    };

    if (!onSave) {
      onClose?.();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(payload);
      onClose?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass}>
      <div
        className={`${modalContainerClass} max-w-5xl w-11/12 max-h-[90vh] flex flex-col`}
      >
        <div className="flex-shrink-0 mb-4 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-center">{projectName}</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                Invoice
              </label>
              <input
                type="text"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Invoice #"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-1">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase text-gray-700">
                Task Split Amounts
              </h3>
              <button
                type="button"
                onClick={() => setSplitRows((prev) => [...prev, createSplitRow()])}
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              >
                <FiPlus size={14} /> Add Task Row
              </button>
            </div>

            <div className="grid grid-cols-[2fr_1fr_110px_40px] gap-3 text-xs font-semibold text-gray-600 uppercase mb-1">
              <span>Task</span>
              <span>Amount</span>
              <span>Taxed</span>
              <span />
            </div>

            <div className="space-y-2">
              {splitRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[2fr_1fr_110px_40px] gap-3 items-center"
                >
                  <select
                    value={row.taskId}
                    onChange={(e) =>
                      handleTaskRowChange(row.id, "taskId", e.target.value)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select task</option>
                    {taskOptions.map((taskOption) => (
                      <option key={taskOption.value} value={taskOption.value}>
                        {taskOption.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={inputValues[`split-${row.id}`] ?? ""}
                    onChange={(e) =>
                      handleTaskAmountInputChange(row.id, e.target.value)
                    }
                    onBlur={(e) => handleTaskAmountBlur(row.id, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Amount"
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!row.isTaxed}
                      onChange={(e) =>
                        handleTaskRowChange(row.id, "isTaxed", e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    Taxed
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteSplitRow(row.id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Remove split row"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase text-gray-700">
                Shared Amounts (Split Across Included Tasks)
              </h3>
              <button
                type="button"
                onClick={() => setSharedRows((prev) => [...prev, createSharedRow()])}
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              >
                <FiPlus size={14} /> Add Shared Row
              </button>
            </div>

            <div className="grid grid-cols-[2fr_1fr_110px_40px] gap-3 text-xs font-semibold text-gray-600 uppercase mb-1">
              <span>Description</span>
              <span>Amount</span>
              <span>Taxed</span>
              <span />
            </div>

            <div className="space-y-2">
              {sharedRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[2fr_1fr_110px_40px] gap-3 items-center"
                >
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) =>
                      handleSharedRowChange(row.id, "description", e.target.value)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Delivery, credit card fee, etc."
                  />
                  <input
                    type="text"
                    value={inputValues[`shared-${row.id}`] ?? ""}
                    onChange={(e) =>
                      handleSharedAmountInputChange(row.id, e.target.value)
                    }
                    onBlur={(e) => handleSharedAmountBlur(row.id, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Amount"
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!row.isTaxed}
                      onChange={(e) =>
                        handleSharedRowChange(row.id, "isTaxed", e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    Taxed
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteSharedRow(row.id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Remove shared row"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 max-w-sm">
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                Tax Amount
              </label>
              <input
                type="text"
                value={inputValues.sharedTax ?? ""}
                onChange={(e) => handleSharedTaxInputChange(e.target.value)}
                onBlur={(e) => handleSharedTaxBlur(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tax amount"
              />
              <p className="text-xs text-gray-500 mt-1">
                Derived tax rate from taxable amounts: {effectiveTaxRate.toFixed(2)}%
              </p>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold uppercase text-gray-700 mb-2">Totals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm">
              <div className="text-gray-600">Task Split Subtotal</div>
              <div className="text-right font-medium">{formatCurrency(splitSubtotal)}</div>
              <div className="text-gray-600">Shared Subtotal</div>
              <div className="text-right font-medium">{formatCurrency(sharedSubtotal)}</div>
              <div className="text-gray-600">Taxable Base</div>
              <div className="text-right font-medium">{formatCurrency(taxableSubtotal)}</div>
              <div className="text-gray-600">Tax Amount</div>
              <div className="text-right font-medium">{formatCurrency(sharedTaxAmount || 0)}</div>
              <div className="text-gray-900 font-bold">Total</div>
              <div className="text-right font-bold text-base">{formatCurrency(grandTotal)}</div>
            </div>
          </section>
        </div>

        <div className="flex-shrink-0 mt-5 pt-4 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            className={`${buttonClass} bg-red-500`}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${buttonClass} bg-blue-500`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

TaskCostSplitModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  projectName: PropTypes.string,
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      task_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      task_name: PropTypes.string,
      task_number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ),
  onSave: PropTypes.func,
};

export default TaskCostSplitModal;
