import { FIXED_AMOUNT } from "./constants.js";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRowHours = (row) =>
  toNumber(row?.hours?.decimal ?? row?.hours ?? 0);

const formatHoursAsClock = (value) => {
  const totalMinutes = Math.round(Math.max(0, toNumber(value)) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const isEmployeeRow = (row) =>
  row?.employee_id && row.employee_id !== FIXED_AMOUNT;

export const getTaskHoursService = (task, serviceId) => {
  const services = Array.isArray(task?.hours?.data) ? task.hours.data : [];
  return services.find(
    (service) =>
      String(service?.team_service_id) === String(serviceId),
  );
};

export const getAvailableHoursServices = (tasks = []) => {
  const serviceIds = new Set();

  tasks.forEach((task) => {
    const services = Array.isArray(task?.hours?.data) ? task.hours.data : [];
    services.forEach((service) => {
      if (service?.team_service_id !== null && service?.team_service_id !== undefined) {
        serviceIds.add(String(service.team_service_id));
      }
    });
  });

  return [...serviceIds];
};

export const getApplicableHoursTaskIds = (tasks = [], serviceId) =>
  tasks
    .filter((task) => {
      const service = getTaskHoursService(task, serviceId);
      if (!service) return false;

      const hasEstimate = toNumber(service.estimate) > 0;
      const hasEmployeeHours = (service.inputRows || []).some(
        (row) => isEmployeeRow(row) && getRowHours(row) > 0,
      );

      return hasEstimate || hasEmployeeHours;
    })
    .map((task) => String(task.taskId));

export const getAvailableHoursEmployees = (
  tasks = [],
  serviceId,
  selectedTaskIds = [],
) => {
  const selectedIds = new Set(selectedTaskIds.map(String));
  const employeeTotals = new Map();

  tasks.forEach((task) => {
    if (!selectedIds.has(String(task.taskId))) return;

    const service = getTaskHoursService(task, serviceId);
    (service?.inputRows || []).forEach((row) => {
      if (!isEmployeeRow(row)) return;

      const employeeId = String(row.employee_id);
      const current = employeeTotals.get(employeeId) || {
        employeeId,
        hours: 0,
        regularHours: 0,
        overtimeHours: 0,
        actualCost: 0,
      };
      const rowHours = getRowHours(row);
      current.hours += rowHours;
      if (row.isOvertime) {
        current.overtimeHours += rowHours;
      } else {
        current.regularHours += rowHours;
      }
      current.actualCost += toNumber(row.actual_cost);
      employeeTotals.set(employeeId, current);
    });
  });

  return [...employeeTotals.values()].sort((a, b) =>
    a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true }),
  );
};

const allocateByWeight = (total, weights, precision) => {
  const factor = 10 ** precision;
  const totalUnits = Math.round(toNumber(total) * factor);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalUnits === 0 || weightTotal <= 0) {
    return weights.map(() => 0);
  }

  const rawShares = weights.map((weight) => (totalUnits * weight) / weightTotal);
  const allocatedUnits = rawShares.map(Math.floor);
  let remainder = totalUnits - allocatedUnits.reduce((sum, value) => sum + value, 0);

  const remainderOrder = rawShares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let index = 0; index < remainder; index += 1) {
    allocatedUnits[remainderOrder[index % remainderOrder.length].index] += 1;
  }

  return allocatedUnits.map((value) => value / factor);
};

const buildPoolKey = (employeeId, isOvertime) =>
  `${employeeId}:${isOvertime ? "overtime" : "regular"}`;

export const buildHoursSplitPreview = ({
  tasks = [],
  serviceId,
  selectedTaskIds = [],
  selectedEmployeeIds = [],
  splitBatchId,
}) => {
  const selectedTaskIdSet = new Set(selectedTaskIds.map(String));
  const selectedEmployeeIdSet = new Set(selectedEmployeeIds.map(String));
  const selectedTasks = tasks.filter((task) =>
    selectedTaskIdSet.has(String(task.taskId)),
  );

  if (!serviceId) {
    return { error: "Please select a service." };
  }
  if (selectedTasks.length < 2) {
    return { error: "Please select at least two tasks to split hours across." };
  }
  if (selectedEmployeeIdSet.size === 0) {
    return { error: "Please select at least one employee." };
  }

  const taskServices = selectedTasks.map((task) => ({
    task,
    service: getTaskHoursService(task, serviceId),
  }));
  if (taskServices.some(({ service }) => !service)) {
    return { error: "The selected service is missing from one or more tasks." };
  }

  const weights = taskServices.map(({ service }) =>
    Math.max(0, toNumber(service.estimate)),
  );
  const totalEstimatedHours = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalEstimatedHours <= 0) {
    return {
      error: "The selected tasks have no estimated hours for this service.",
    };
  }

  const pools = new Map();
  const currentByTask = new Map();

  taskServices.forEach(({ task, service }) => {
    const taskId = String(task.taskId);
    const taskCurrent = { hours: 0, actualCost: 0 };

    (service.inputRows || []).forEach((row) => {
      const employeeId = String(row?.employee_id || "");
      if (!selectedEmployeeIdSet.has(employeeId)) return;

      const isOvertime = !!row.isOvertime;
      const poolKey = buildPoolKey(employeeId, isOvertime);
      const pool = pools.get(poolKey) || {
        employeeId,
        isOvertime,
        hours: 0,
        actualCost: 0,
      };
      const rowHours = getRowHours(row);
      const rowActualCost = toNumber(row.actual_cost);

      pool.hours += rowHours;
      pool.actualCost += rowActualCost;
      pools.set(poolKey, pool);
      taskCurrent.hours += rowHours;
      taskCurrent.actualCost += rowActualCost;
    });

    currentByTask.set(taskId, taskCurrent);
  });

  const totalPooledHours = [...pools.values()].reduce(
    (sum, pool) => sum + pool.hours,
    0,
  );
  if (totalPooledHours <= 0) {
    return { error: "The selected employees have no hours to split." };
  }

  const replacementRowsByTask = new Map(
    selectedTasks.map((task) => [String(task.taskId), []]),
  );
  const proposedByTask = new Map(
    selectedTasks.map((task) => [
      String(task.taskId),
      { hours: 0, actualCost: 0 },
    ]),
  );

  pools.forEach((pool) => {
    const hourShares = allocateByWeight(pool.hours, weights, 2);
    const costShares = allocateByWeight(pool.actualCost, weights, 6);

    selectedTasks.forEach((task, taskIndex) => {
      const hours = hourShares[taskIndex];
      const actualCost = costShares[taskIndex];
      const taskId = String(task.taskId);
      if (hours === 0 && actualCost === 0) return;

      replacementRowsByTask.get(taskId).push({
        id: `${splitBatchId}-${pool.employeeId}-${pool.isOvertime ? "ot" : "reg"}-${taskId}`,
        employee_id: pool.employeeId,
        hours: {
          display: formatHoursAsClock(hours),
          decimal: hours,
        },
        isOvertime: pool.isOvertime,
        actual_cost: actualCost,
        split_batch_id: splitBatchId,
      });

      const taskProposed = proposedByTask.get(taskId);
      taskProposed.hours += hours;
      taskProposed.actualCost += actualCost;
    });
  });

  const taskSummaries = taskServices.map(({ task }, index) => {
    const taskId = String(task.taskId);
    const current = currentByTask.get(taskId) || { hours: 0, actualCost: 0 };
    const proposed = proposedByTask.get(taskId) || { hours: 0, actualCost: 0 };

    return {
      taskId,
      taskNumber: task.taskNumber,
      taskName: task.taskName,
      estimatedHours: weights[index],
      weight: weights[index] / totalEstimatedHours,
      currentHours: current.hours,
      proposedHours: proposed.hours,
      currentActualCost: current.actualCost,
      proposedActualCost: proposed.actualCost,
    };
  });

  const totals = taskSummaries.reduce(
    (acc, summary) => ({
      estimatedHours: acc.estimatedHours + summary.estimatedHours,
      currentHours: acc.currentHours + summary.currentHours,
      proposedHours: acc.proposedHours + summary.proposedHours,
      currentActualCost:
        acc.currentActualCost + summary.currentActualCost,
      proposedActualCost:
        acc.proposedActualCost + summary.proposedActualCost,
    }),
    {
      estimatedHours: 0,
      currentHours: 0,
      proposedHours: 0,
      currentActualCost: 0,
      proposedActualCost: 0,
    },
  );

  return {
    error: null,
    totalEstimatedHours,
    taskSummaries,
    totals,
    taskUpdates: selectedTasks.map((task) => ({
      taskId: String(task.taskId),
      expectedFinancialsUpdatedAt: task.financialsUpdatedAt,
      rows: replacementRowsByTask.get(String(task.taskId)) || [],
    })),
  };
};
