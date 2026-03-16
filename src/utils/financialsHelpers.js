import { FIXED_AMOUNT } from "./constants";

/**
 * Calculate actual_cost for a single hours input row.
 *
 * @param {object} row          – the input row ({ employee_id, hours, isOvertime })
 * @param {object[]} employees  – full employees array from redux
 * @param {number} overheadRate – team overhead rate from financialsData
 * @returns {number} the computed actual_cost
 */
export const calculateHoursRowCost = (row, employees, overheadRate) => {
  if (row.employee_id === FIXED_AMOUNT) {
    return row.hours?.decimal || 0;
  }

  if (!row.employee_id) return 0;

  const selectedEmployee = employees.find(
    (e) => e.employee_id === +row.employee_id
  );
  if (!selectedEmployee) return 0;

  const overtimeMultiplier = row.isOvertime ? 1.5 : 1;
  const rate = selectedEmployee.employee_rate ?? 0;
  const overhead = typeof overheadRate === "number" ? overheadRate : 0;

  return (rate * overtimeMultiplier + overhead) * (row.hours?.decimal || 0);
};

/**
 * Recalculate actual_cost for every row in a service's inputRows
 * and return the updated serviceData with per-row and total actual_cost.
 *
 * @param {object}   serviceData – a single service entry from hours section data[]
 * @param {object[]} employees   – full employees array
 * @param {number}   overheadRate
 * @returns {object} serviceData with updated inputRows[].actual_cost and total actual_cost
 */
export const recalcServiceActualCost = (serviceData, employees, overheadRate) => {
  const updatedRows = (serviceData.inputRows || []).map((row) => ({
    ...row,
    actual_cost: calculateHoursRowCost(row, employees, overheadRate),
  }));

  const actual_cost = updatedRows.reduce(
    (sum, row) => sum + (row.actual_cost || 0),
    0
  );

  return { ...serviceData, inputRows: updatedRows, actual_cost };
};
