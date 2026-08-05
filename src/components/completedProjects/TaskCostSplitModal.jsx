import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import {
  buttonClass,
  modalContainerClass,
  modalOverlayClass,
} from "../../assets/tailwindConstants";
import { DEFAULT_FINANCIAL_SECTIONS, FIXED_AMOUNT } from "../../utils/constants";
import { roundToHundredth } from "../../utils/estimateHelpers";
import {
  buildHoursSplitPreview,
  getApplicableHoursTaskIds,
  getAvailableHoursEmployees,
  getAvailableHoursServices,
  getTaskHoursService,
} from "../../utils/hoursSplitHelpers";
import { formatNumberValue, safeEvaluate } from "../../utils/mathUtils";
import ExpressionInput from "../common/ExpressionInput.jsx";

const normalizeSectionName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase();

const createSplitRow = () => ({
  id: uuidv4(),
  taskId: "",
  amount: null,
  amountExpression: null,
  isTaxed: false,
});

const createSharedRow = () => ({
  id: uuidv4(),
  description: "",
  amount: null,
  amountExpression: null,
  isTaxed: false,
});

const normalizeExpression = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

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

const buildDistributedCostExpression = (
  baseExpression,
  shareCents,
  totalCents,
) => {
  if (!baseExpression) return null;
  if (shareCents === 0 || totalCents === 0) {
    return `(${baseExpression}) * 0`;
  }
  if (shareCents === totalCents) {
    return baseExpression;
  }
  const allocationPercent =
    Math.round(((shareCents / totalCents) * 100 + Number.EPSILON) * 1000) / 1000;
  return `(${baseExpression}) * ${allocationPercent}%`;
};

const formatCurrency = (value) =>
  `$${(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const renderHoursDisplay = (value, showPlus = false) => {
  const decimalHours = Number(value) || 0;
  const totalMinutes = Math.round(Math.abs(decimalHours) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const sign = decimalHours < 0 ? "-" : showPlus ? "+" : "";
  const clock = `${sign}${String(hours).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}`;

  return (
    <span className="inline-flex flex-col align-middle leading-tight">
      <span>{clock}</span>
      <span className="text-[11px] font-normal opacity-70">
        {sign}
        {Math.abs(decimalHours).toFixed(2)} hrs
      </span>
    </span>
  );
};

const buildSharedDistributionByTask = (sharedRow, taskIds, taskWeightsById = null) => {
  if (!taskIds.length) return [];

  const totalCents = Math.round((sharedRow.cost || 0) * 100);
  const baseCostExpression =
    sharedRow.costExpression ||
    (sharedRow.cost === null || sharedRow.cost === undefined
      ? null
      : String(sharedRow.cost));
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
        costExpression: buildDistributedCostExpression(
          baseCostExpression,
          shareCents,
          totalCents,
        ),
        taxRateExpression: sharedRow.taxRateExpression || null,
        taxAmountExpression: sharedRow.taxAmountExpression || null,
      },
    };
  });
};

const COST_DISTRIBUTION_EXCLUDED_CATEGORY_IDS = new Set([
  "hours",
  "addToSubtotal",
  "profit",
  "commission",
  "discount",
  "rounding",
  "addToTotal",
]);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTaskCostSection = (task, categoryId) =>
  (task?.sections || []).find(
    (section) => String(section?.id) === String(categoryId),
  );

const getCostRowTotal = (row) => {
  const cost = toNumber(row?.cost);
  const taxRate = toNumber(row?.taxRate);
  return cost * (1 + taxRate / 100);
};

const allocateCentsByWeight = (totalCents, weights) => {
  const total = Math.trunc(toNumber(totalCents));
  const sign = total < 0 ? -1 : 1;
  const absoluteTotal = Math.abs(total);
  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);

  if (absoluteTotal === 0 || weightTotal <= 0) {
    return weights.map(() => 0);
  }

  const normalizedWeights = weights.map((weight) => Math.max(0, weight));
  const rawShares = normalizedWeights.map(
    (weight) => (absoluteTotal * weight) / weightTotal,
  );
  const allocated = rawShares.map(Math.floor);
  let remainder = absoluteTotal - allocated.reduce((sum, value) => sum + value, 0);
  const remainderOrder = rawShares
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let index = 0; index < remainder; index += 1) {
    allocated[remainderOrder[index % remainderOrder.length].index] += 1;
  }

  return allocated.map((value) => value * sign);
};

const buildCostDistributionPreview = ({
  tasks = [],
  categoryId,
  selectedTaskIds = [],
  mode = "estimate",
}) => {
  if (!categoryId) {
    return { error: "Please select a section." };
  }

  if ((selectedTaskIds || []).length < 2) {
    return { error: "Please select at least two tasks to distribute costs across." };
  }

  const selectedTaskIdSet = new Set((selectedTaskIds || []).map(String));
  const selectedTasks = tasks.filter((task) =>
    selectedTaskIdSet.has(String(task.taskId)),
  );

  if (selectedTasks.length < 2) {
    return { error: "Please select at least two tasks to distribute costs across." };
  }

  const taskSections = selectedTasks.map((task) => ({
    task,
    section: getTaskCostSection(task, categoryId),
  }));

  if (taskSections.some(({ section }) => !section)) {
    return {
      error: "The selected section is missing from one or more selected tasks.",
    };
  }

  if (selectedTasks.some((task) => !task.financialsUpdatedAt)) {
    return {
      error:
        "One or more selected tasks are missing financial records. Save those task financials first, then try again.",
    };
  }

  const pooledRows = taskSections.flatMap(({ section }) => section.rows || []);
  if (pooledRows.length === 0) {
    return { error: "The selected tasks do not have any rows to distribute." };
  }

  const weights = taskSections.map(({ section }) => {
    if (mode === "equal") return 1;
    return Math.max(0, toNumber(section.estimate));
  });
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights =
    weightTotal > 0 ? weights : taskSections.map(() => 1);
  const normalizedWeightTotal = normalizedWeights.reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const rowsByTask = new Map(
    selectedTasks.map((task) => [String(task.taskId), []]),
  );
  const currentTotalsByTask = new Map(
    selectedTasks.map((task) => [String(task.taskId), 0]),
  );
  const proposedTotalsByTask = new Map(
    selectedTasks.map((task) => [String(task.taskId), 0]),
  );

  taskSections.forEach(({ task, section }) => {
    const taskId = String(task.taskId);
    const currentTotal = (section.rows || []).reduce(
      (sum, row) => sum + getCostRowTotal(row),
      0,
    );
    currentTotalsByTask.set(taskId, currentTotal);
  });

  pooledRows.forEach((row) => {
    const cents = Math.round(toNumber(row?.cost) * 100);
    const shares = allocateCentsByWeight(cents, normalizedWeights);

    selectedTasks.forEach((task, taskIndex) => {
      const shareCents = shares[taskIndex] || 0;
      if (shareCents === 0) return;
      const distributedCost = shareCents / 100;
      const taxRate = toNumber(row?.taxRate);
      const taskId = String(task.taskId);
      const taskRows = rowsByTask.get(taskId) || [];

      taskRows.push({
        invoice: row?.invoice || "",
        description: row?.description || "",
        cost: distributedCost,
        taxRate,
        costExpression: buildDistributedCostExpression(
          row?.costExpression ||
            (row?.cost === null || row?.cost === undefined
              ? null
              : String(row.cost)),
          shareCents,
          cents,
        ),
        taxRateExpression: row?.taxRateExpression || null,
        taxAmountExpression: row?.taxAmountExpression || null,
      });
      rowsByTask.set(taskId, taskRows);

      proposedTotalsByTask.set(
        taskId,
        (proposedTotalsByTask.get(taskId) || 0) +
          distributedCost * (1 + taxRate / 100),
      );
    });
  });

  const taskSummaries = selectedTasks.map((task, index) => {
    const taskId = String(task.taskId);
    const currentTotal = currentTotalsByTask.get(taskId) || 0;
    const proposedTotal = proposedTotalsByTask.get(taskId) || 0;
    return {
      taskId,
      taskNumber: task.taskNumber,
      taskName: task.taskName,
      estimate: Math.max(0, toNumber(taskSections[index]?.section?.estimate)),
      weight: normalizedWeights[index] / Math.max(normalizedWeightTotal, 1),
      currentTotal,
      proposedTotal,
      change: proposedTotal - currentTotal,
      rowCount: (rowsByTask.get(taskId) || []).length,
      expectedFinancialsUpdatedAt: task.financialsUpdatedAt || null,
    };
  });

  const taskUpdates = selectedTasks.map((task) => {
    const taskId = String(task.taskId);
    const summary = taskSummaries.find((item) => item.taskId === taskId);
    return {
      taskId,
      expectedFinancialsUpdatedAt: summary?.expectedFinancialsUpdatedAt || null,
      rows: rowsByTask.get(taskId) || [],
    };
  });

  const totals = taskSummaries.reduce(
    (acc, summary) => ({
      currentTotal: acc.currentTotal + summary.currentTotal,
      proposedTotal: acc.proposedTotal + summary.proposedTotal,
    }),
    { currentTotal: 0, proposedTotal: 0 },
  );

  return {
    categoryId,
    mode,
    taskSummaries,
    taskUpdates,
    totals: {
      ...totals,
      change: totals.proposedTotal - totals.currentTotal,
    },
  };
};

const TaskCostSplitModal = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  tasks,
  onSave,
  onLoadHours,
  onSaveHours,
  onLoadCostDistribution,
  onSaveCostDistribution,
}) => {
  const chartConfig = useSelector((state) => state.chartConfig);
  const services = useSelector((state) => state.services?.allServices || []);
  const employees = useSelector((state) => state.builders?.employees || []);

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
  const [sharedTaxExpression, setSharedTaxExpression] = useState(null);
  const [deliveryFeeAmount, setDeliveryFeeAmount] = useState(null);
  const [deliveryFeeExpression, setDeliveryFeeExpression] = useState(null);
  const [creditCardFeeAmount, setCreditCardFeeAmount] = useState(null);
  const [creditCardFeeExpression, setCreditCardFeeExpression] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeTab, setActiveTab] = useState("cost");
  const [hoursSplitData, setHoursSplitData] = useState(null);
  const [isHoursLoading, setIsHoursLoading] = useState(false);
  const [hoursLoadError, setHoursLoadError] = useState(null);
  const [hoursLoadVersion, setHoursLoadVersion] = useState(0);
  const [hoursServiceId, setHoursServiceId] = useState("");
  const [selectedHoursTaskIds, setSelectedHoursTaskIds] = useState([]);
  const [selectedHoursEmployeeIds, setSelectedHoursEmployeeIds] = useState([]);
  const [hoursPreview, setHoursPreview] = useState(null);
  const [costDistributionData, setCostDistributionData] = useState(null);
  const [isCostDistributionLoading, setIsCostDistributionLoading] = useState(false);
  const [costDistributionLoadError, setCostDistributionLoadError] = useState(null);
  const [costDistributionLoadVersion, setCostDistributionLoadVersion] = useState(0);
  const [costDistributionCategoryId, setCostDistributionCategoryId] = useState("");
  const [costDistributionMode, setCostDistributionMode] = useState("estimate");
  const [selectedCostDistributionTaskIds, setSelectedCostDistributionTaskIds] = useState([]);
  const [costDistributionPreview, setCostDistributionPreview] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setCategoryId("");
    setInvoice("");
    setSplitRows([createSplitRow()]);
    setSharedRows([createSharedRow()]);
    setSharedTaxAmount(null);
    setSharedTaxExpression(null);
    setDeliveryFeeAmount(null);
    setDeliveryFeeExpression(null);
    setCreditCardFeeAmount(null);
    setCreditCardFeeExpression(null);
    setInputValues({});
    setIsSaving(false);
    setSaveError(null);
    setActiveTab("cost");
    setHoursSplitData(null);
    setIsHoursLoading(false);
    setHoursLoadError(null);
    setHoursLoadVersion(0);
    setHoursServiceId("");
    setSelectedHoursTaskIds([]);
    setSelectedHoursEmployeeIds([]);
    setHoursPreview(null);
    setCostDistributionData(null);
    setIsCostDistributionLoading(false);
    setCostDistributionLoadError(null);
    setCostDistributionLoadVersion(0);
    setCostDistributionCategoryId("");
    setCostDistributionMode("estimate");
    setSelectedCostDistributionTaskIds([]);
    setCostDistributionPreview(null);
  }, [isOpen]);

  useEffect(() => {
    if (
      !isOpen ||
      activeTab !== "hours" ||
      hoursSplitData ||
      !onLoadHours
    ) {
      return;
    }

    let isCurrent = true;
    setIsHoursLoading(true);
    setHoursLoadError(null);

    onLoadHours()
      .then((result) => {
        if (!isCurrent) return;
        if (result?.success === false) {
          setHoursLoadError(result.error || "Failed to load project hours.");
          return;
        }
        setHoursSplitData(result?.data || { tasks: [] });
      })
      .catch((error) => {
        if (isCurrent) {
          setHoursLoadError(error?.message || "Failed to load project hours.");
        }
      })
      .finally(() => {
        if (isCurrent) setIsHoursLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    activeTab,
    hoursSplitData,
    hoursLoadVersion,
    isOpen,
    onLoadHours,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      activeTab !== "distribute" ||
      costDistributionData ||
      !onLoadCostDistribution
    ) {
      return;
    }

    let isCurrent = true;
    setIsCostDistributionLoading(true);
    setCostDistributionLoadError(null);

    onLoadCostDistribution()
      .then((result) => {
        if (!isCurrent) return;
        if (result?.success === false) {
          setCostDistributionLoadError(
            result.error || "Failed to load project costs.",
          );
          return;
        }
        setCostDistributionData(result?.data || { tasks: [] });
      })
      .catch((error) => {
        if (isCurrent) {
          setCostDistributionLoadError(
            error?.message || "Failed to load project costs.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsCostDistributionLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    activeTab,
    costDistributionData,
    costDistributionLoadVersion,
    isOpen,
    onLoadCostDistribution,
  ]);

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

  const hoursTasks = useMemo(() => {
    const availableTaskIds = new Set((tasks || []).map((task) => String(task.task_id)));
    return (hoursSplitData?.tasks || []).filter((task) =>
      availableTaskIds.has(String(task.taskId)),
    );
  }, [hoursSplitData, tasks]);

  const hoursServiceOptions = useMemo(() => {
    const availableServiceIds = new Set(getAvailableHoursServices(hoursTasks));
    return services
      .filter((service) =>
        availableServiceIds.has(String(service.team_service_id)),
      )
      .map((service) => ({
        value: String(service.team_service_id),
        label: service.service_name,
      }));
  }, [hoursTasks, services]);

  const applicableHoursTaskIds = useMemo(
    () => getApplicableHoursTaskIds(hoursTasks, hoursServiceId),
    [hoursTasks, hoursServiceId],
  );

  const availableHoursEmployees = useMemo(
    () =>
      getAvailableHoursEmployees(
        hoursTasks,
        hoursServiceId,
        selectedHoursTaskIds,
      ).map((employeeTotal) => {
        if (employeeTotal.isFixedAmount) {
          return {
            ...employeeTotal,
            name: employeeTotal.name || "Fixed Amount",
          };
        }

        const employee = employees.find(
          (item) => String(item.employee_id) === employeeTotal.employeeId,
        );
        return {
          ...employeeTotal,
          name: employee?.employee_name || `Employee #${employeeTotal.employeeId}`,
        };
      }),
    [employees, hoursServiceId, hoursTasks, selectedHoursTaskIds],
  );

  const costDistributionTasks = useMemo(() => {
    const availableTaskIds = new Set((tasks || []).map((task) => String(task.task_id)));
    return (costDistributionData?.tasks || []).filter((task) =>
      availableTaskIds.has(String(task.taskId)),
    );
  }, [costDistributionData, tasks]);

  const costDistributionCategoryOptions = useMemo(() => {
    const optionsMap = new Map();

    costDistributionTasks.forEach((task) => {
      (task.sections || []).forEach((section) => {
        const sectionId = String(section?.id || "");
        if (!sectionId || COST_DISTRIBUTION_EXCLUDED_CATEGORY_IDS.has(sectionId)) {
          return;
        }

        if (!optionsMap.has(sectionId)) {
          optionsMap.set(sectionId, {
            value: sectionId,
            label: section?.name || sectionId,
          });
        }
      });
    });

    return [...optionsMap.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }, [costDistributionTasks]);

  const applicableCostDistributionTaskIds = useMemo(
    () =>
      costDistributionTasks
        .filter((task) => getTaskCostSection(task, costDistributionCategoryId))
        .map((task) => String(task.taskId)),
    [costDistributionCategoryId, costDistributionTasks],
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

  const handleRowAmountBlur = (rowType, rowId, value, shouldUpdateExpression = true) => {
    const { setRows, inputKeyPrefix } = getRowTypeConfig(rowType);
    const parsedValue = parseMathInputValue(value);
    const expression = parsedValue === null ? null : normalizeExpression(value);

    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              amount: parsedValue ?? null,
              amountExpression: shouldUpdateExpression
                ? expression
                : row.amountExpression,
            }
          : row,
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

  const handleFeeBlur = (
    fieldKey,
    value,
    setAmount,
    setExpression,
    shouldUpdateExpression = true,
  ) => {
    const parsedValue = parseMathInputValue(value);
    const expression = parsedValue === null ? null : normalizeExpression(value);
    setAmount(parsedValue ?? null);
    if (shouldUpdateExpression) {
      setExpression(expression);
    }
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

  const handleAddOneRowPerTask = () => {
    setSplitRows((prev) => {
      const populatedRows = prev.filter(
        (row) => row.taskId || row.amount !== null || row.isTaxed,
      );
      const existingTaskIds = new Set(
        populatedRows.map((row) => String(row.taskId)).filter(Boolean),
      );
      const taskRows = taskOptions
        .filter((taskOption) => !existingTaskIds.has(taskOption.value))
        .map((taskOption) => ({
          ...createSplitRow(),
          taskId: taskOption.value,
        }));

      return [...populatedRows, ...taskRows];
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSaveError(null);
  };

  const handleHoursServiceChange = (serviceId) => {
    setHoursServiceId(serviceId);
    setSelectedHoursTaskIds([]);
    setSelectedHoursEmployeeIds([]);
    setHoursPreview(null);
    setSaveError(null);
  };

  const handleHoursTaskToggle = (taskId) => {
    const normalizedTaskId = String(taskId);
    const currentlyAllEmployeesSelected = availableHoursEmployees.every(
      (employee) => selectedHoursEmployeeIds.includes(employee.employeeId),
    );
    const nextTaskIds = selectedHoursTaskIds.includes(normalizedTaskId)
      ? selectedHoursTaskIds.filter((id) => id !== normalizedTaskId)
      : [...selectedHoursTaskIds, normalizedTaskId];
    const nextAvailableEmployees = getAvailableHoursEmployees(
      hoursTasks,
      hoursServiceId,
      nextTaskIds,
    );
    const nextAvailableEmployeeIds = nextAvailableEmployees.map(
      (employee) => employee.employeeId,
    );

    setSelectedHoursTaskIds(nextTaskIds);
    setSelectedHoursEmployeeIds(
      currentlyAllEmployeesSelected
        ? nextAvailableEmployeeIds
        : selectedHoursEmployeeIds.filter((employeeId) =>
            nextAvailableEmployeeIds.includes(employeeId),
          ),
    );
    setHoursPreview(null);
    setSaveError(null);
  };

  const handleSelectAllHoursTasks = () => {
    const shouldClear =
      applicableHoursTaskIds.length > 0 &&
      applicableHoursTaskIds.every((taskId) =>
        selectedHoursTaskIds.includes(taskId),
      );
    const nextTaskIds = shouldClear ? [] : applicableHoursTaskIds;
    const nextEmployees = getAvailableHoursEmployees(
      hoursTasks,
      hoursServiceId,
      nextTaskIds,
    );

    setSelectedHoursTaskIds(nextTaskIds);
    setSelectedHoursEmployeeIds(
      shouldClear ? [] : nextEmployees.map((employee) => employee.employeeId),
    );
    setHoursPreview(null);
    setSaveError(null);
  };

  const handleHoursEmployeeToggle = (employeeId) => {
    const normalizedEmployeeId = String(employeeId);
    setSelectedHoursEmployeeIds((prev) =>
      prev.includes(normalizedEmployeeId)
        ? prev.filter((id) => id !== normalizedEmployeeId)
        : [...prev, normalizedEmployeeId],
    );
    setHoursPreview(null);
    setSaveError(null);
  };

  const handleSelectAllHoursEmployees = () => {
    const availableEmployeeIds = availableHoursEmployees.map(
      (employee) => employee.employeeId,
    );
    const shouldClear =
      availableEmployeeIds.length > 0 &&
      availableEmployeeIds.every((employeeId) =>
        selectedHoursEmployeeIds.includes(employeeId),
      );

    setSelectedHoursEmployeeIds(shouldClear ? [] : availableEmployeeIds);
    setHoursPreview(null);
    setSaveError(null);
  };

  const handleCalculateHoursSplit = () => {
    setSaveError(null);
    const preview = buildHoursSplitPreview({
      tasks: hoursTasks,
      serviceId: hoursServiceId,
      selectedTaskIds: selectedHoursTaskIds,
      selectedEmployeeIds: selectedHoursEmployeeIds,
      splitBatchId: uuidv4(),
    });

    if (preview.error) {
      setHoursPreview(null);
      setSaveError(preview.error);
      return;
    }

    setHoursPreview(preview);
  };

  const handleSaveHoursSplit = async () => {
    if (!hoursPreview || !onSaveHours) return;

    const includeFixedAmount = selectedHoursEmployeeIds.includes(FIXED_AMOUNT);
    const selectedNumericEmployeeIds = selectedHoursEmployeeIds
      .map((employeeId) => Number(employeeId))
      .filter((employeeId) => Number.isFinite(employeeId));
    const taskUpdatesWithInvoice = (hoursPreview.taskUpdates || []).map(
      (taskUpdate) => ({
        ...taskUpdate,
        rows: (taskUpdate.rows || []).map((row) =>
          row.employee_id === FIXED_AMOUNT
            ? { ...row, invoice: row.invoice || "" }
            : row,
        ),
      }),
    );

    setIsSaving(true);
    setSaveError(null);
    try {
      const saveResult = await onSaveHours({
        projectId,
        teamServiceId: Number(hoursServiceId),
        employeeIds: selectedNumericEmployeeIds,
        includeFixedAmount,
        taskUpdates: taskUpdatesWithInvoice,
      });

      if (saveResult?.success === false) {
        setSaveError(saveResult.error || "Failed to save the hours distribution.");
        return;
      }

      onClose?.();
    } catch (error) {
      setSaveError(error?.message || "Failed to save the hours distribution.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCostDistributionCategoryChange = (nextCategoryId) => {
    setCostDistributionCategoryId(nextCategoryId);
    setSelectedCostDistributionTaskIds([]);
    setCostDistributionPreview(null);
    setSaveError(null);
  };

  const handleCostDistributionModeChange = (nextMode) => {
    setCostDistributionMode(nextMode);
    setCostDistributionPreview(null);
    setSaveError(null);
  };

  const handleCostDistributionTaskToggle = (taskId) => {
    const normalizedTaskId = String(taskId);
    setSelectedCostDistributionTaskIds((prev) =>
      prev.includes(normalizedTaskId)
        ? prev.filter((id) => id !== normalizedTaskId)
        : [...prev, normalizedTaskId],
    );
    setCostDistributionPreview(null);
    setSaveError(null);
  };

  const handleSelectAllCostDistributionTasks = () => {
    const shouldClear =
      applicableCostDistributionTaskIds.length > 0 &&
      applicableCostDistributionTaskIds.every((taskId) =>
        selectedCostDistributionTaskIds.includes(taskId),
      );

    setSelectedCostDistributionTaskIds(
      shouldClear ? [] : applicableCostDistributionTaskIds,
    );
    setCostDistributionPreview(null);
    setSaveError(null);
  };

  const handleCalculateCostDistribution = () => {
    setSaveError(null);
    const preview = buildCostDistributionPreview({
      tasks: costDistributionTasks,
      categoryId: costDistributionCategoryId,
      selectedTaskIds: selectedCostDistributionTaskIds,
      mode: costDistributionMode,
    });

    if (preview.error) {
      setCostDistributionPreview(null);
      setSaveError(preview.error);
      return;
    }

    setCostDistributionPreview(preview);
  };

  const handleSaveCostDistribution = async () => {
    if (!costDistributionPreview || !onSaveCostDistribution) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const saveResult = await onSaveCostDistribution({
        projectId,
        categoryId: costDistributionCategoryId,
        taskUpdates: costDistributionPreview.taskUpdates,
      });

      if (saveResult?.success === false) {
        setSaveError(saveResult.error || "Failed to save the cost distribution.");
        return;
      }

      onClose?.();
    } catch (error) {
      setSaveError(error?.message || "Failed to save the cost distribution.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    const taxAmountExpression =
      sharedTaxAmount === null ? null : sharedTaxExpression;

    const preparedSplitRows = splitRows
      .filter((row) => row.taskId && row.amount !== null)
      .map((row) => ({
        taskId: row.taskId,
        invoice: invoice || "",
        description: "",
        cost: row.amount,
        taxRate: row.isTaxed ? roundedEffectiveTaxRate : 0,
        costExpression: row.amountExpression || null,
        taxAmountExpression: row.isTaxed ? taxAmountExpression : null,
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
        costExpression: row.amountExpression || null,
        taxAmountExpression: row.isTaxed ? taxAmountExpression : null,
      }));

    const preparedFeeRows = [
      {
        description: "Delivery Fee",
        invoice: invoice ? `${invoice} - delivery fee` : "delivery fee",
        cost: deliveryFeeAmount,
        costExpression: deliveryFeeExpression || null,
      },
      {
        description: "Credit Card Fee",
        invoice: invoice ? `${invoice} - credit card fee` : "credit card fee",
        cost: creditCardFeeAmount,
        costExpression: creditCardFeeExpression || null,
      },
    ]
      .filter((row) => row.cost !== null)
      .map((row) => ({
        invoice: row.invoice,
        description: row.description,
        cost: row.cost,
        taxRate: 0,
        costExpression: row.costExpression || null,
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
        description: row.description,
        cost: row.cost,
        taxRate: row.taxRate,
        costExpression: row.costExpression || null,
        taxAmountExpression: row.taxAmountExpression || null,
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
          <div className="mt-4 flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => handleTabChange("cost")}
              className={`px-5 py-2 text-sm font-semibold border-b-2 ${
                activeTab === "cost"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Split Cost
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("hours")}
              className={`px-5 py-2 text-sm font-semibold border-b-2 ${
                activeTab === "hours"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Distribute Hours
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("distribute")}
              className={`px-5 py-2 text-sm font-semibold border-b-2 ${
                activeTab === "distribute"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Distribute Costs
            </button>
          </div>
          {activeTab === "cost" && (
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
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-1">
          {activeTab === "cost" ? (
            <>
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase text-gray-700">
                Task Split Amounts
              </h3>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleAddOneRowPerTask}
                  disabled={taskOptions.length === 0}
                  className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <FiPlus size={14} /> 1 per task
                </button>
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
                  <ExpressionInput
                    type="text"
                    value={inputValues[`split-${row.id}`] ?? ""}
                    expression={row.amountExpression}
                    onChange={(e) =>
                      handleRowAmountInputChange(
                        "split",
                        row.id,
                        e.target.value,
                      )
                    }
                    onCommit={({ value, didEdit }) =>
                      handleRowAmountBlur("split", row.id, value, didEdit)
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
                <ExpressionInput
                  type="text"
                  value={inputValues.deliveryFee ?? ""}
                  expression={deliveryFeeExpression}
                  onChange={(e) =>
                    handleFeeInputChange("deliveryFee", e.target.value)
                  }
                  onCommit={({ value, didEdit }) =>
                    handleFeeBlur(
                      "deliveryFee",
                      value,
                      setDeliveryFeeAmount,
                      setDeliveryFeeExpression,
                      didEdit,
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
                <ExpressionInput
                  type="text"
                  value={inputValues.creditCardFee ?? ""}
                  expression={creditCardFeeExpression}
                  onChange={(e) =>
                    handleFeeInputChange("creditCardFee", e.target.value)
                  }
                  onCommit={({ value, didEdit }) =>
                    handleFeeBlur(
                      "creditCardFee",
                      value,
                      setCreditCardFeeAmount,
                      setCreditCardFeeExpression,
                      didEdit,
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
                <ExpressionInput
                  type="text"
                  value={inputValues.sharedTax ?? ""}
                  expression={sharedTaxExpression}
                  onChange={(e) =>
                    handleFeeInputChange("sharedTax", e.target.value)
                  }
                  onCommit={({ value, didEdit }) =>
                    handleFeeBlur(
                      "sharedTax",
                      value,
                      setSharedTaxAmount,
                      setSharedTaxExpression,
                      didEdit,
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
                  <ExpressionInput
                    type="text"
                    value={inputValues[`shared-${row.id}`] ?? ""}
                    expression={row.amountExpression}
                    onChange={(e) =>
                      handleRowAmountInputChange(
                        "shared",
                        row.id,
                        e.target.value,
                      )
                    }
                    onCommit={({ value, didEdit }) =>
                      handleRowAmountBlur("shared", row.id, value, didEdit)
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
            </>
          ) : activeTab === "hours" ? (
            <section className="space-y-5">
              <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <FiAlertTriangle className="mt-0.5 flex-shrink-0" size={18} />
                <div className="flex-1">
                  <div className="font-semibold">
                    Do not distribute until all hours are entered.
                  </div>
                  <p className="mt-1 text-amber-800">
                    This redistributes selected employee hours and fixed-amount
                    rows across tasks. It does not change project totals.
                  </p>
                </div>
              </div>

              {isHoursLoading && (
                <div className="py-10 text-center text-sm text-gray-500">
                  Loading project hours...
                </div>
              )}

              {!isHoursLoading && hoursLoadError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p>{hoursLoadError}</p>
                  <button
                    type="button"
                    onClick={() => setHoursLoadVersion((version) => version + 1)}
                    className="mt-3 inline-flex items-center gap-1 font-semibold text-red-700 hover:text-red-900"
                  >
                    <FiRefreshCw size={14} /> Try Again
                  </button>
                </div>
              )}

              {!isHoursLoading && !hoursLoadError && hoursSplitData && (
                <>
                  {hoursServiceOptions.length === 0 ? (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      No service hour or fixed-amount data is available for
                      these tasks.
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                          Service
                        </label>
                        <select
                          value={hoursServiceId}
                          onChange={(event) =>
                            handleHoursServiceChange(event.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select service</option>
                          {hoursServiceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {hoursServiceId && (
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)] gap-5">
                          <div className="rounded-md border border-gray-200">
                            <div className="relative flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                              <div className="flex-1">
                                <h3 className="text-sm font-bold uppercase text-gray-700">
                                  Tasks
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Select at least two tasks.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleSelectAllHoursTasks}
                                className="absolute right-4 text-xs font-semibold text-blue-700 hover:text-blue-900"
                              >
                                {applicableHoursTaskIds.length > 0 &&
                                applicableHoursTaskIds.every((taskId) =>
                                  selectedHoursTaskIds.includes(taskId),
                                )
                                  ? "Clear all"
                                  : "Select all"}
                              </button>
                            </div>
                            <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
                              {hoursTasks
                                .filter((task) =>
                                  applicableHoursTaskIds.includes(
                                    String(task.taskId),
                                  ),
                                )
                                .map((task) => {
                                  const service = getTaskHoursService(
                                    task,
                                    hoursServiceId,
                                  );
                                  const actualHours = (
                                    service?.inputRows || []
                                  ).reduce((sum, row) => {
                                    if (
                                      !row.employee_id ||
                                      row.employee_id === FIXED_AMOUNT
                                    ) {
                                      return sum;
                                    }
                                    return (
                                      sum +
                                      Number(
                                        row.hours?.decimal ?? row.hours ?? 0,
                                      )
                                    );
                                  }, 0);
                                  const fixedAmount = (
                                    service?.inputRows || []
                                  ).reduce((sum, row) => {
                                    if (row.employee_id !== FIXED_AMOUNT) {
                                      return sum;
                                    }
                                    const actualCost = Number(row.actual_cost);
                                    if (Number.isFinite(actualCost) && actualCost !== 0) {
                                      return sum + actualCost;
                                    }
                                    return (
                                      sum +
                                      Number(row.hours?.decimal ?? row.hours ?? 0)
                                    );
                                  }, 0);

                                  return (
                                    <label
                                      key={task.taskId}
                                      className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-blue-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedHoursTaskIds.includes(
                                          String(task.taskId),
                                        )}
                                        onChange={() =>
                                          handleHoursTaskToggle(task.taskId)
                                        }
                                        className="mt-1 h-4 w-4"
                                      />
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-gray-800">
                                          {task.taskNumber} - {task.taskName}
                                        </span>
                                        <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                                          <span>
                                            Est:{" "}
                                            {renderHoursDisplay(service?.estimate)}
                                          </span>
                                          <span>
                                            Current:{" "}
                                            {renderHoursDisplay(actualHours)}
                                          </span>
                                          {fixedAmount > 0 && (
                                            <span>
                                              Fixed: {formatCurrency(fixedAmount)}
                                            </span>
                                          )}
                                          <span
                                            className={
                                              task.hours?.completedAt
                                                ? "text-green-700"
                                                : "font-semibold text-amber-700"
                                            }
                                          >
                                            {task.hours?.completedAt
                                              ? "Hours complete"
                                              : "Hours not marked complete"}
                                          </span>
                                        </span>
                                      </span>
                                    </label>
                                  );
                                })}
                            </div>
                          </div>

                          <div className="rounded-md border border-gray-200">
                            <div className="relative flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                              <div className="flex-1">
                                <h3 className="text-sm font-bold uppercase text-gray-700">
                                  Employees
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Only selected employees will be changed.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleSelectAllHoursEmployees}
                                disabled={availableHoursEmployees.length === 0}
                                className="absolute right-4 text-xs font-semibold text-blue-700 hover:text-blue-900 disabled:text-gray-400"
                              >
                                {availableHoursEmployees.length > 0 &&
                                availableHoursEmployees.every((employee) =>
                                  selectedHoursEmployeeIds.includes(
                                    employee.employeeId,
                                  ),
                                )
                                  ? "Clear all"
                                  : "Select all"}
                              </button>
                            </div>
                            <div>
                              <div>
                                <div className="grid grid-cols-[20px_minmax(56px,.75fr)_repeat(3,minmax(56px,72px))] items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-2 text-xs font-semibold uppercase text-gray-600 sm:grid-cols-[24px_minmax(70px,1fr)_repeat(3,minmax(54px,72px))] sm:px-3">
                                  <span />
                                  <span>Employee</span>
                                  <span className="text-right">Reg</span>
                                  <span className="text-right">OT</span>
                                  <span className="text-right">Total</span>
                                </div>
                                <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
                                  {availableHoursEmployees.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                                      Select tasks containing employee hours or
                                      fixed amounts.
                                    </div>
                                  ) : (
                                    availableHoursEmployees.map((employee) => (
                                      <label
                                        key={employee.employeeId}
                                        className="grid cursor-pointer grid-cols-[20px_minmax(56px,1fr)_repeat(3,minmax(44px,60px))] items-center gap-1 px-2 py-3 hover:bg-blue-50 sm:grid-cols-[24px_minmax(70px,1fr)_repeat(3,minmax(54px,72px))] sm:px-3"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedHoursEmployeeIds.includes(
                                            employee.employeeId,
                                          )}
                                          onChange={() =>
                                            handleHoursEmployeeToggle(
                                              employee.employeeId,
                                            )
                                          }
                                          className="h-4 w-4"
                                        />
                                        <span className="truncate text-sm font-medium text-gray-800">
                                          {employee.name}
                                        </span>
                                        <span className="text-right text-xs text-gray-600">
                                          {employee.isFixedAmount
                                            ? "--"
                                            : renderHoursDisplay(
                                                employee.regularHours,
                                              )}
                                        </span>
                                        <span className="text-right text-xs text-gray-600">
                                          {employee.isFixedAmount
                                            ? "--"
                                            : renderHoursDisplay(
                                                employee.overtimeHours,
                                              )}
                                        </span>
                                        <span className="text-right text-xs font-semibold text-gray-800">
                                          {employee.isFixedAmount
                                            ? formatCurrency(
                                                employee.fixedAmount ??
                                                  employee.actualCost ??
                                                  0,
                                              )
                                            : renderHoursDisplay(employee.hours)}
                                        </span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {hoursServiceId && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleCalculateHoursSplit}
                            disabled={
                              selectedHoursTaskIds.length < 2 ||
                              selectedHoursEmployeeIds.length === 0
                            }
                            className={`${buttonClass} bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400`}
                          >
                            Calculate Distribution
                          </button>
                        </div>
                      )}

                      {hoursPreview && (
                        <div className="rounded-md border border-blue-200">
                          <div className="border-b border-blue-200 bg-blue-50 px-4 py-3">
                            <h3 className="text-sm font-bold uppercase text-blue-900">
                              Distribution Preview
                            </h3>
                            <p className="mt-1 text-xs text-blue-800">
                              Total selected hours, fixed amounts, and saved
                              labor cost are preserved. Regular and overtime
                              hours are split separately.
                            </p>
                            {hoursPreview.weightStrategy !==
                              "service_estimate" && (
                              <p className="mt-1 text-xs font-semibold text-blue-900">
                                {hoursPreview.weightStrategy ===
                                "task_total_estimate"
                                  ? "Weights are based on each task's total estimated hours (selected service estimates are all zero)."
                                  : "Weights are evenly split across selected tasks (all estimated hours are zero)."}
                              </p>
                            )}
                          </div>
                          <div className="overflow-x-auto">
                            <div className="min-w-[760px]">
                              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-600">
                                <span>Task</span>
                                <span className="text-right">Estimated</span>
                                <span className="text-right">Weight</span>
                                <span className="text-right">Current</span>
                                <span className="text-right">New</span>
                                <span className="text-right">Change</span>
                              </div>
                              {hoursPreview.taskSummaries.map((summary) => (
                                <div
                                  key={summary.taskId}
                                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0"
                                >
                                  <span className="font-medium text-gray-800">
                                    <span className="block">
                                      {summary.taskNumber} - {summary.taskName}
                                    </span>
                                    {(summary.currentFixedAmount > 0 ||
                                      summary.proposedFixedAmount > 0) && (
                                      <span className="mt-1 block text-xs font-normal text-gray-500">
                                        Fixed: {formatCurrency(summary.currentFixedAmount)}
                                        {" → "}
                                        {formatCurrency(summary.proposedFixedAmount)}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-right">
                                    {renderHoursDisplay(
                                      summary.estimatedHours,
                                    )}
                                  </span>
                                  <span className="text-right">
                                    {(summary.weight * 100).toFixed(1)}%
                                  </span>
                                  <span className="text-right">
                                    {renderHoursDisplay(
                                      summary.currentHours,
                                    )}
                                  </span>
                                  <span className="text-right font-semibold">
                                    {renderHoursDisplay(
                                      summary.proposedHours,
                                    )}
                                  </span>
                                  <span
                                    className={`text-right font-semibold ${
                                      summary.proposedHours -
                                        summary.currentHours >=
                                      0
                                        ? "text-green-700"
                                        : "text-red-700"
                                    }`}
                                  >
                                    {renderHoursDisplay(
                                      summary.proposedHours -
                                        summary.currentHours,
                                      true,
                                    )}
                                  </span>
                                </div>
                              ))}
                              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-t-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950">
                                <span>Totals</span>
                                <span className="text-right">
                                  {renderHoursDisplay(
                                    hoursPreview.totals.estimatedHours,
                                  )}
                                </span>
                                <span className="text-right">100.0%</span>
                                <span className="text-right">
                                  {renderHoursDisplay(
                                    hoursPreview.totals.currentHours,
                                  )}
                                </span>
                                <span className="text-right">
                                  {renderHoursDisplay(
                                    hoursPreview.totals.proposedHours,
                                  )}
                                </span>
                                <span
                                  className={`text-right ${
                                    Math.abs(
                                      hoursPreview.totals.proposedHours -
                                        hoursPreview.totals.currentHours,
                                    ) < 0.000001
                                      ? "text-blue-800"
                                      : "text-red-700"
                                  }`}
                                >
                                  {renderHoursDisplay(
                                    hoursPreview.totals.proposedHours -
                                      hoursPreview.totals.currentHours,
                                    true,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </section>
          ) : (
            <section className="space-y-5">
              <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <FiAlertTriangle className="mt-0.5 flex-shrink-0" size={18} />
                <div className="flex-1">
                  <div className="font-semibold">
                    Distribute only after section costs are complete.
                  </div>
                  <p className="mt-1 text-amber-800">
                    This redistributes existing non-hours cost rows across tasks
                    in the selected section. It keeps the pooled total cost the
                    same.
                  </p>
                </div>
              </div>

              {isCostDistributionLoading && (
                <div className="py-10 text-center text-sm text-gray-500">
                  Loading project costs...
                </div>
              )}

              {!isCostDistributionLoading && costDistributionLoadError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p>{costDistributionLoadError}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setCostDistributionLoadVersion((version) => version + 1)
                    }
                    className="mt-3 inline-flex items-center gap-1 font-semibold text-red-700 hover:text-red-900"
                  >
                    <FiRefreshCw size={14} /> Try Again
                  </button>
                </div>
              )}

              {!isCostDistributionLoading &&
                !costDistributionLoadError &&
                costDistributionData && (
                  <>
                    {costDistributionCategoryOptions.length === 0 ? (
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        No non-hours cost rows were found on these tasks.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                              Section
                            </label>
                            <select
                              value={costDistributionCategoryId}
                              onChange={(event) =>
                                handleCostDistributionCategoryChange(
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select section</option>
                              {costDistributionCategoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                              Distribution Mode
                            </label>
                            <select
                              value={costDistributionMode}
                              onChange={(event) =>
                                handleCostDistributionModeChange(event.target.value)
                              }
                              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="estimate">By section estimate</option>
                              <option value="equal">Equal split by task</option>
                            </select>
                          </div>
                        </div>

                        {costDistributionCategoryId && (
                          <>
                            {applicableCostDistributionTaskIds.length < 2 ? (
                              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                                At least two tasks in this section are needed to
                                distribute costs.
                              </div>
                            ) : (
                              <div className="rounded-md border border-gray-200">
                                <div className="relative flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                                  <div className="flex-1">
                                    <h3 className="text-sm font-bold uppercase text-gray-700">
                                      Tasks
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      Select at least two tasks.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleSelectAllCostDistributionTasks}
                                    className="absolute right-4 text-xs font-semibold text-blue-700 hover:text-blue-900"
                                  >
                                    {applicableCostDistributionTaskIds.length > 0 &&
                                    applicableCostDistributionTaskIds.every((taskId) =>
                                      selectedCostDistributionTaskIds.includes(taskId),
                                    )
                                      ? "Clear all"
                                      : "Select all"}
                                  </button>
                                </div>
                                <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
                                  {costDistributionTasks
                                    .filter((task) =>
                                      applicableCostDistributionTaskIds.includes(
                                        String(task.taskId),
                                      ),
                                    )
                                    .map((task) => {
                                      const section = getTaskCostSection(
                                        task,
                                        costDistributionCategoryId,
                                      );
                                      const currentTotal = (section?.rows || []).reduce(
                                        (sum, row) => sum + getCostRowTotal(row),
                                        0,
                                      );
                                      return (
                                        <label
                                          key={task.taskId}
                                          className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-blue-50"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedCostDistributionTaskIds.includes(
                                              String(task.taskId),
                                            )}
                                            onChange={() =>
                                              handleCostDistributionTaskToggle(task.taskId)
                                            }
                                            className="mt-1 h-4 w-4"
                                          />
                                          <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-gray-800">
                                              {task.taskNumber} - {task.taskName}
                                            </span>
                                            <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                                              <span>
                                                Estimate:{" "}
                                                {formatCurrency(section?.estimate || 0)}
                                              </span>
                                              <span>
                                                Current: {formatCurrency(currentTotal)}
                                              </span>
                                              <span>
                                                Rows: {(section?.rows || []).length}
                                              </span>
                                            </span>
                                          </span>
                                        </label>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleCalculateCostDistribution}
                                disabled={selectedCostDistributionTaskIds.length < 2}
                                className={`${buttonClass} bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400`}
                              >
                                Calculate Distribution
                              </button>
                            </div>
                          </>
                        )}

                        {costDistributionPreview && (
                          <div className="rounded-md border border-blue-200">
                            <div className="border-b border-blue-200 bg-blue-50 px-4 py-3">
                              <h3 className="text-sm font-bold uppercase text-blue-900">
                                Distribution Preview
                              </h3>
                              <p className="mt-1 text-xs text-blue-800">
                                Total cost is preserved. Task row counts may increase.
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <div className="min-w-[760px]">
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-600">
                                  <span>Task</span>
                                  <span className="text-right">Estimate</span>
                                  <span className="text-right">Weight</span>
                                  <span className="text-right">Current</span>
                                  <span className="text-right">New</span>
                                  <span className="text-right">Change</span>
                                </div>
                                {costDistributionPreview.taskSummaries.map(
                                  (summary) => (
                                    <div
                                      key={summary.taskId}
                                      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0"
                                    >
                                      <span className="font-medium text-gray-800">
                                        {summary.taskNumber} - {summary.taskName}
                                      </span>
                                      <span className="text-right">
                                        {formatCurrency(summary.estimate)}
                                      </span>
                                      <span className="text-right">
                                        {(summary.weight * 100).toFixed(1)}%
                                      </span>
                                      <span className="text-right">
                                        {formatCurrency(summary.currentTotal)}
                                      </span>
                                      <span className="text-right font-semibold">
                                        {formatCurrency(summary.proposedTotal)}
                                      </span>
                                      <span
                                        className={`text-right font-semibold ${
                                          summary.change >= 0
                                            ? "text-green-700"
                                            : "text-red-700"
                                        }`}
                                      >
                                        {summary.change >= 0 ? "+" : ""}
                                        {formatCurrency(summary.change)}
                                      </span>
                                    </div>
                                  ),
                                )}
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-t-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950">
                                  <span>Totals</span>
                                  <span className="text-right">--</span>
                                  <span className="text-right">100.0%</span>
                                  <span className="text-right">
                                    {formatCurrency(
                                      costDistributionPreview.totals.currentTotal,
                                    )}
                                  </span>
                                  <span className="text-right">
                                    {formatCurrency(
                                      costDistributionPreview.totals.proposedTotal,
                                    )}
                                  </span>
                                  <span
                                    className={`text-right ${
                                      Math.abs(
                                        costDistributionPreview.totals.change,
                                      ) < 0.000001
                                        ? "text-blue-800"
                                        : "text-red-700"
                                    }`}
                                  >
                                    {costDistributionPreview.totals.change >= 0
                                      ? "+"
                                      : ""}
                                    {formatCurrency(
                                      costDistributionPreview.totals.change,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
            </section>
          )}
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
            className={`${buttonClass} bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-400`}
            onClick={
              activeTab === "cost"
                ? handleSave
                : activeTab === "hours"
                  ? handleSaveHoursSplit
                  : handleSaveCostDistribution
            }
            disabled={
              isSaving ||
              (activeTab === "hours" && (!hoursPreview || !onSaveHours)) ||
              (activeTab === "distribute" &&
                (!costDistributionPreview || !onSaveCostDistribution))
            }
          >
            {isSaving
              ? "Saving..."
              : activeTab === "cost"
                ? "Save Split Cost"
                : activeTab === "hours"
                  ? "Save Distributed Hours"
                  : "Save Distributed Costs"}
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
  onLoadHours: PropTypes.func,
  onSaveHours: PropTypes.func,
  onLoadCostDistribution: PropTypes.func,
  onSaveCostDistribution: PropTypes.func,
};

export default TaskCostSplitModal;
