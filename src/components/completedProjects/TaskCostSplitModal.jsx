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
import { roundToHundredth } from "../../utils/estimateHelpers";
import { formatNumberValue, safeEvaluate } from "../../utils/mathUtils";

const normalizeSectionName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase();

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

const buildSharedDistributionByTask = (sharedRow, taskIds, taskWeightsById = null) => {
  if (!taskIds.length) return [];

  const totalCents = Math.round((sharedRow.cost || 0) * 100);
  const weightedTasks = taskIds.map((taskId) => ({
    taskId,
    weight: Math.max(0, taskWeightsById?.[String(taskId)] || 0),
  }));
  const totalWeight = weightedTasks.reduce((sum, task) => sum + task.weight, 0);

  const distributionTasks =
    totalWeight > 0
      ? weightedTasks
      : taskIds.map((taskId) => ({ taskId, weight: 1 }));

  const distributionWeightTotal = distributionTasks.reduce(
    (sum, task) => sum + task.weight,
    0,
  );

  let allocatedCents = 0;
  let allocatedWeight = 0;

  return distributionTasks.map(({ taskId, weight }, index) => {
    const shareCents =
      index === distributionTasks.length - 1
        ? totalCents - allocatedCents
        : Math.round(
            ((totalCents - allocatedCents) * weight) /
              Math.max(distributionWeightTotal - allocatedWeight, 1),
          );

    allocatedCents += shareCents;
    allocatedWeight += weight;

    return {
      taskId,
      row: {
        invoice: sharedRow.invoice || "",
        description: sharedRow.description || "",
        cost: shareCents / 100,
        taxRate: sharedRow.taxRate || 0,
      },
    };
  });
};

const TaskCostSplitModal = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  tasks,
  onSave,
}) => {
  const chartConfig = useSelector((state) => state.chartConfig);
  const services = useSelector((state) => state.services?.allServices || []);

  const sectionCategoryOptions = useMemo(() => {
    const chartSections = Array.isArray(chartConfig?.estimate_sections)
      ? chartConfig.estimate_sections
      : [];

    const options = DEFAULT_FINANCIAL_SECTIONS.map((section) => ({
      value: String(section.id),
      categoryId: String(section.id),
      name: section.name,
      type: "section",
      label: section.name,
    }));
    const existingIds = new Set(options.map((section) => String(section.value)));
    const existingNames = new Set(
      options.map((section) => normalizeSectionName(section.name)),
    );

    chartSections.forEach((section) => {
      const sectionId = String(section?.id || "");
      const sectionName = section?.name || "";
      const normalizedName = normalizeSectionName(sectionName);

      if (!sectionId || !sectionName) return;
      if (existingIds.has(sectionId) || existingNames.has(normalizedName))
        return;

      options.push({
        value: sectionId,
        categoryId: sectionId,
        name: sectionName,
        type: "section",
        label: sectionName,
      });
      existingIds.add(sectionId);
      existingNames.add(normalizedName);
    });

    return options;
  }, [chartConfig]);

  const serviceCategoryOptions = useMemo(
    () =>
      (services || []).map((service) => ({
        value: `service:${service.team_service_id}`,
        categoryId: "hours",
        teamServiceId: String(service.team_service_id),
        name: service.service_name,
        type: "service",
        label: service.service_name,
      })),
    [services],
  );

  const categoryOptions = useMemo(
    () => [...sectionCategoryOptions, ...serviceCategoryOptions],
    [sectionCategoryOptions, serviceCategoryOptions],
  );

  const [categoryId, setCategoryId] = useState("");
  const [invoice, setInvoice] = useState("");
  const [splitRows, setSplitRows] = useState([]);
  const [sharedRows, setSharedRows] = useState([]);
  const [sharedTaxAmount, setSharedTaxAmount] = useState(null);
  const [deliveryFeeAmount, setDeliveryFeeAmount] = useState(null);
  const [creditCardFeeAmount, setCreditCardFeeAmount] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setCategoryId("");
    setInvoice("");
    setSplitRows([createSplitRow()]);
    setSharedRows([createSharedRow()]);
    setSharedTaxAmount(null);
    setDeliveryFeeAmount(null);
    setCreditCardFeeAmount(null);
    setInputValues({});
    setIsSaving(false);
    setSaveError(null);
  }, [isOpen]);

  const selectedCategory = useMemo(
    () =>
      categoryOptions.find(
        (option) => String(option.value) === String(categoryId),
      ),
    [categoryOptions, categoryId],
  );

  const isServiceCategory = selectedCategory?.type === "service";
  const amountColumnLabel = isServiceCategory ? "Fixed Amount" : "Amount";

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

  const roundedEffectiveTaxRate = useMemo(
    () => roundToHundredth(effectiveTaxRate),
    [effectiveTaxRate],
  );

  const grandTotal = useMemo(
    () =>
      splitSubtotal +
      sharedSubtotal +
      (sharedTaxAmount || 0) +
      (deliveryFeeAmount || 0) +
      (creditCardFeeAmount || 0),
    [
      splitSubtotal,
      sharedSubtotal,
      sharedTaxAmount,
      deliveryFeeAmount,
      creditCardFeeAmount,
    ],
  );

  if (!isOpen) return null;

  const getRowTypeConfig = (rowType) => {
    if (rowType === "split") {
      return {
        setRows: setSplitRows,
        inputKeyPrefix: "split",
      };
    }

    return {
      setRows: setSharedRows,
      inputKeyPrefix: "shared",
    };
  };

  const handleRowChange = (rowType, rowId, field, value) => {
    const { setRows } = getRowTypeConfig(rowType);
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  const handleRowAmountInputChange = (rowType, rowId, value) => {
    const { inputKeyPrefix } = getRowTypeConfig(rowType);
    setInputValues((prev) => ({
      ...prev,
      [`${inputKeyPrefix}-${rowId}`]: value,
    }));
  };

  const handleRowAmountBlur = (rowType, rowId, value) => {
    const { setRows, inputKeyPrefix } = getRowTypeConfig(rowType);
    const parsedValue = parseMathInputValue(value);

    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, amount: parsedValue ?? null } : row,
      ),
    );

    setInputValues((prev) => ({
      ...prev,
      [`${inputKeyPrefix}-${rowId}`]:
        parsedValue === null ? "" : parsedValue.toString(),
    }));
  };

  const handleFeeInputChange = (fieldKey, value) => {
    setInputValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleFeeBlur = (fieldKey, value, setAmount) => {
    const parsedValue = parseMathInputValue(value);
    setAmount(parsedValue ?? null);
    setInputValues((prev) => ({
      ...prev,
      [fieldKey]: parsedValue === null ? "" : parsedValue.toString(),
    }));
  };

  const handleDeleteRow = (rowType, rowId) => {
    const { setRows, inputKeyPrefix } = getRowTypeConfig(rowType);
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    setInputValues((prev) => {
      const next = { ...prev };
      delete next[`${inputKeyPrefix}-${rowId}`];
      return next;
    });
  };

  const handleSave = async () => {
    setSaveError(null);

    const preparedSplitRows = splitRows
      .filter((row) => row.taskId && row.amount !== null)
      .map((row) => ({
        taskId: row.taskId,
        invoice: invoice || "",
        description: "",
        cost: row.amount,
        taxRate: row.isTaxed ? roundedEffectiveTaxRate : 0,
      }));

    const splitAmountsByTask = preparedSplitRows.reduce((acc, row) => {
      const taskId = String(row.taskId);
      acc[taskId] = (acc[taskId] || 0) + (row.cost || 0);
      return acc;
    }, {});

    const preparedSharedRows = sharedRows
      .filter((row) => row.amount !== null)
      .map((row) => ({
        invoice: invoice || "",
        description: row.description,
        cost: row.amount,
        taxRate: row.isTaxed ? roundedEffectiveTaxRate : 0,
      }));

    const preparedFeeRows = [
      {
        description: "Delivery Fee",
        invoice: invoice ? `${invoice} - delivery fee` : "delivery fee",
        cost: deliveryFeeAmount,
      },
      {
        description: "Credit Card Fee",
        invoice: invoice ? `${invoice} - credit card fee` : "credit card fee",
        cost: creditCardFeeAmount,
      },
    ]
      .filter((row) => row.cost !== null)
      .map((row) => ({
        invoice: row.invoice,
        description: row.description,
        cost: row.cost,
        taxRate: 0,
      }));

    const selectedTaskIds = [
      ...new Set(preparedSplitRows.map((row) => String(row.taskId))),
    ];

    if (!categoryId) {
      setSaveError("Please select a category.");
      return;
    }

    if (preparedSplitRows.length === 0) {
      setSaveError("Please add at least one task row with task + amount.");
      return;
    }

    const taskRowsMap = selectedTaskIds.reduce((acc, taskId) => {
      acc[taskId] = [];
      return acc;
    }, {});

    preparedSplitRows.forEach((row) => {
      taskRowsMap[row.taskId].push({
        invoice: row.invoice,
        cost: row.cost,
        taxRate: row.taxRate,
      });
    });

    preparedSharedRows.forEach((sharedRow) => {
      const distributedRows = buildSharedDistributionByTask(
        sharedRow,
        selectedTaskIds,
      );
      distributedRows.forEach(({ taskId, row }) => {
        taskRowsMap[taskId].push(row);
      });
    });

    preparedFeeRows.forEach((feeRow) => {
      const distributedRows = buildSharedDistributionByTask(
        feeRow,
        selectedTaskIds,
        splitAmountsByTask,
      );
      distributedRows.forEach(({ taskId, row }) => {
        taskRowsMap[taskId].push(row);
      });
    });

    const taskRows = Object.entries(taskRowsMap)
      .map(([taskId, rows]) => ({ taskId, rows }))
      .filter((taskRow) => taskRow.rows.length > 0);

    const payload = {
      projectId,
      categoryId: selectedCategory?.categoryId || categoryId,
      categoryName: selectedCategory?.name || "",
      categoryType: selectedCategory?.type || "section",
      serviceTeamServiceId: selectedCategory?.teamServiceId || null,
      taskRows,
    };

    if (!onSave) {
      onClose?.();
      return;
    }

    setIsSaving(true);
    try {
      const saveResult = await onSave(payload);
      if (saveResult?.success === false) {
        setSaveError(saveResult.error || "Failed to save split cost.");
        return;
      }

      onClose?.();
    } catch (error) {
      setSaveError(error?.message || "Failed to save split cost.");
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
                <optgroup label="Sections">
                  {sectionCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Hours - Fixed Amounts">
                  {serviceCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
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
                onClick={() =>
                  setSplitRows((prev) => [...prev, createSplitRow()])
                }
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              >
                <FiPlus size={14} /> Add Task Row
              </button>
            </div>

            <div className="grid grid-cols-[2fr_1fr_110px_40px] gap-3 text-xs font-semibold text-gray-600 uppercase mb-1">
              <span>Task</span>
              <span>{amountColumnLabel}</span>
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
                      handleRowChange("split", row.id, "taskId", e.target.value)
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
                      handleRowAmountInputChange(
                        "split",
                        row.id,
                        e.target.value,
                      )
                    }
                    onBlur={(e) =>
                      handleRowAmountBlur("split", row.id, e.target.value)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={amountColumnLabel}
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!row.isTaxed}
                      onChange={(e) =>
                        handleRowChange(
                          "split",
                          row.id,
                          "isTaxed",
                          e.target.checked,
                        )
                      }
                      className="h-4 w-4"
                    />
                    Taxed
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteRow("split", row.id)}
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
                onClick={() =>
                  setSharedRows((prev) => [...prev, createSharedRow()])
                }
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              >
                <FiPlus size={14} /> Add Shared Row
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                  Delivery Fee
                </label>
                <input
                  type="text"
                  value={inputValues.deliveryFee ?? ""}
                  onChange={(e) =>
                    handleFeeInputChange("deliveryFee", e.target.value)
                  }
                  onBlur={(e) =>
                    handleFeeBlur(
                      "deliveryFee",
                      e.target.value,
                      setDeliveryFeeAmount,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Delivery fee"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                  Credit Card Fee
                </label>
                <input
                  type="text"
                  value={inputValues.creditCardFee ?? ""}
                  onChange={(e) =>
                    handleFeeInputChange("creditCardFee", e.target.value)
                  }
                  onBlur={(e) =>
                    handleFeeBlur(
                      "creditCardFee",
                      e.target.value,
                      setCreditCardFeeAmount,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Credit card fee"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                  Tax Amount
                </label>
                <input
                  type="text"
                  value={inputValues.sharedTax ?? ""}
                  onChange={(e) =>
                    handleFeeInputChange("sharedTax", e.target.value)
                  }
                  onBlur={(e) =>
                    handleFeeBlur(
                      "sharedTax",
                      e.target.value,
                      setSharedTaxAmount,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tax amount"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Derived tax rate from taxable amounts:{" "}
                  {effectiveTaxRate.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[2fr_1fr_110px_40px] gap-3 text-xs font-semibold text-gray-600 uppercase mb-1">
              <span>Description</span>
              <span>{amountColumnLabel}</span>
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
                      handleRowChange(
                        "shared",
                        row.id,
                        "description",
                        e.target.value,
                      )
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description"
                  />
                  <input
                    type="text"
                    value={inputValues[`shared-${row.id}`] ?? ""}
                    onChange={(e) =>
                      handleRowAmountInputChange(
                        "shared",
                        row.id,
                        e.target.value,
                      )
                    }
                    onBlur={(e) =>
                      handleRowAmountBlur("shared", row.id, e.target.value)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={amountColumnLabel}
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!row.isTaxed}
                      onChange={(e) =>
                        handleRowChange(
                          "shared",
                          row.id,
                          "isTaxed",
                          e.target.checked,
                        )
                      }
                      className="h-4 w-4"
                    />
                    Taxed
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteRow("shared", row.id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Remove shared row"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold uppercase text-gray-700 mb-2">
              Totals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm">
              <div className="text-gray-600">Task Split Subtotal</div>
              <div className="text-right font-medium">
                {formatCurrency(splitSubtotal)}
              </div>
              <div className="text-gray-600">Shared Subtotal</div>
              <div className="text-right font-medium">
                {formatCurrency(sharedSubtotal)}
              </div>
              <div className="text-gray-600">Taxable Base</div>
              <div className="text-right font-medium">
                {formatCurrency(taxableSubtotal)}
              </div>
              <div className="text-gray-600">Tax Amount</div>
              <div className="text-right font-medium">
                {formatCurrency(sharedTaxAmount || 0)}
              </div>
              <div className="text-gray-600">Delivery Fee</div>
              <div className="text-right font-medium">
                {formatCurrency(deliveryFeeAmount || 0)}
              </div>
              <div className="text-gray-600">Credit Card Fee</div>
              <div className="text-right font-medium">
                {formatCurrency(creditCardFeeAmount || 0)}
              </div>
              <div className="text-gray-900 font-bold">Total</div>
              <div className="text-right font-bold text-base">
                {formatCurrency(grandTotal)}
              </div>
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
        {saveError && (
          <div className="text-sm text-red-600 mt-2">{saveError}</div>
        )}
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
