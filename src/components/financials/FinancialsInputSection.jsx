import React, { useState, useEffect, useMemo, useCallback } from "react";
import { buttonClass } from "../../assets/tailwindConstants";
import EmployeeTypeAccordion from "./EmployeeTypeAccordion";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import _ from "lodash";
import { usePermissions } from "../../hooks/usePermissions";

const FinancialsInputSection = ({
  sectionName,
  estimate,
  actual_cost,
  inputRows = [],
  data = [], // Add data prop for hours section
  onUpdate,
  isExpanded,
  onToggle,
  sectionId,
  employees = [],
}) => {
  const [localInputRows, setLocalInputRows] = useState([]);
  const [localData, setLocalData] = useState([]); // For hours section
  const [expandedTypeId, setExpandedTypeId] = useState(null);
  const isHoursSection = sectionId === "hours";
  const chartConfig = useSelector((state) => state.chartConfig);

  const { canViewProfitLoss } = usePermissions();

  // Initialize local state from props only once
  useEffect(() => {
    if (isHoursSection) {
      setLocalData(data);
    } else {
      setLocalInputRows(inputRows);
    }
  }, [data, inputRows]); // Update when props change

  const handleUpdateRows = useCallback(
    (newRows) => {
      if (isHoursSection) {
        setLocalData(newRows);
      } else {
        setLocalInputRows(newRows);
      }
    },
    [isHoursSection]
  );

  const handleBlur = useCallback(() => {
    if (isHoursSection) {
      onUpdate?.(localData);
    } else {
      onUpdate?.(localInputRows);
    }
  }, [onUpdate, localInputRows, localData, isHoursSection]);

  const handleAddHoursRow = (type_id) => {
    const newRow = {
      id: uuidv4(),
      employee_id: "",
      hours: 0,
      type_id,
    };

    // For hours section, we update the localData array
    const updatedData = localData.map((typeData) => {
      if (typeData.type_id === type_id) {
        return {
          ...typeData,
          inputRows: [...(typeData.inputRows || []), newRow],
        };
      }
      return typeData;
    });
    handleUpdateRows(updatedData);
    // For hours section, just pass the updated data array
    onUpdate(updatedData);
  };

  // Convert time input to decimal hours, handling both HH:MM format and decimal inputs
  const timeToDecimal = (time) => {
    // Handle null/undefined
    if (!time) return 0;
    
    // If it's already a number, return it rounded
    if (typeof time === 'number') return Number(time.toFixed(2));
    
    // Convert to string for processing
    const timeStr = time.toString().trim();
    
    // If it's in HH:MM format
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return Number((hours + minutes / 60).toFixed(2));
    }
    
    // Otherwise treat as decimal
    return Number(parseFloat(timeStr).toFixed(2)) || 0;
  };

  const handleHoursInputChange = (rowId, field, value, type_id) => {
    if (field === "delete") {
      handleDeleteRow(rowId, type_id);
      return;
    }

    const updatedData = localData.map((typeData) => {
      if (typeData.type_id === type_id) {
        let updatedRows = (typeData.inputRows || []).map((row) => {
          if (row.id === rowId) {
            // Handle empty or invalid input
            if (field === "hours") {
              if (!value.trim()) {
                return {
                  ...row,
                  hours: { display: '', decimal: 0 }
                };
              }
              return {
                ...row,
                hours: {
                  display: value,
                  decimal: timeToDecimal(value)
                }
              };
            }
            return {
              ...row,
              [field]: value
            };
          }
          return row;
        });

        // Update actual_cost based on whether it's a fixed amount or hourly
        if (field === "employee_id" || field === "hours") {
          updatedRows = updatedRows.map(row => {
            if (row.employee_id === 'fixed_amount') {
              // For fixed amount, use the decimal value
              return {
                ...row,
                actual_cost: row.hours?.decimal || 0
              };
            } else if (row.employee_id) {
              // For regular employees, multiply decimal hours by rate
              const selectedEmployee = employees.find(
                (e) => e.employee_id === +row.employee_id
              );
              return {
                ...row,
                actual_cost: selectedEmployee
                  ? selectedEmployee.employee_rate * (row.hours?.decimal || 0)
                  : 0
              };
            }
            return row;
          });
        }

        // Calculate total actual_cost for this type
        const actual_cost = updatedRows.reduce(
          (sum, row) => sum + (row.actual_cost || 0),
          0
        );
        return { ...typeData, inputRows: updatedRows, actual_cost };
      }
      return typeData;
    });
    handleUpdateRows(updatedData);
    onUpdate(updatedData);
  };

  const handleAddInvoiceRow = () => {
    const newRow = {
      id: uuidv4(),
      invoice: "",
      cost: 0,
    };
    const updatedRows = [...localInputRows, newRow];
    handleUpdateRows(updatedRows);
    // Update parent with complete section data
    onUpdate({
      estimate,
      actual_cost: updatedRows.reduce((sum, row) => sum + (row.cost || 0), 0),
      inputRows: updatedRows,
    });
  };

  const handleInputChange = (rowId, field, value) => {
    if (field === "delete") {
      handleDeleteRow(rowId);
      return;
    }

    const updatedRows = localInputRows.map((row) => {
      if (row.id === rowId) {
        const parsedValue = field === "cost" ? parseFloat(value) || 0 : value;
        return {
          ...row,
          [field]: parsedValue,
        };
      }
      return row;
    });
    handleUpdateRows(updatedRows);
    onUpdate({
      estimate,
      actual_cost: updatedRows.reduce((sum, row) => sum + (row.cost || 0), 0),
      inputRows: updatedRows,
    });
  };

  const handleDeleteRow = (rowId, type_id = null) => {
    if (isHoursSection) {
      // For hours section, remove row from the specific type
      const updatedData = localData.map((typeData) => {
        if (typeData.type_id === type_id) {
          const updatedRows = typeData.inputRows.filter(
            (row) => row.id !== rowId
          );
          // Recalculate actual_cost for this type
          const actual_cost = updatedRows.reduce(
            (sum, row) => sum + (row.actual_cost || 0),
            0
          );
          return { ...typeData, inputRows: updatedRows, actual_cost };
        }
        return typeData;
      });
      handleUpdateRows(updatedData);
      onUpdate(updatedData);
    } else {
      // For non-hours sections      const updatedRows = localInputRows.filter((row) => row.id !== rowId);
      const updatedRows = localInputRows.filter((row) => row.id !== rowId);
      handleUpdateRows(updatedRows);
      onUpdate({ inputRows: updatedRows });
    }
  };

  const handleToggleType = (typeId) => {
    setExpandedTypeId((current) => (current === typeId ? null : typeId));
  };

  const rowsTotal = useMemo(() => {
    if (isHoursSection) {
      return (localData || []).reduce((sum, typeData) => {
        return (
          sum +
          ((typeData?.inputRows || []).reduce(
            (sum, row) => sum + (row?.hours?.decimal || 0),
            0
          ) || 0)
        );
      }, 0);
    } else {
      return (localInputRows || []).reduce((sum, row) => {
        return sum + (row?.cost || 0);
      }, 0);
    }
  }, [localInputRows, localData, isHoursSection]);

  // Calculate totals for hours section
  const hoursTotals = useMemo(() => {
    if (!isHoursSection) return null;

    return localData.reduce(
      (acc, typeData) => {
        // Find the employee type to get its rate
        const employeeType = chartConfig.employee_type?.find(
          (type) => type.id === typeData.type_id
        );
        const rate = employeeType?.rate || 0;

        // Multiply estimate hours by rate for this type
        const typeEstimate = (typeData.estimate || 0) * rate;

        return {
          estimate: acc.estimate + typeEstimate,
          actual: acc.actual + (typeData.actual_cost || 0),
        };
      },
      { estimate: 0, actual: 0 }
    );
  }, [isHoursSection, localData, chartConfig.employee_type]);

  const formatEstimate = (value) => {
    if (value === null || value === undefined || value === '') return '';
    return value === 0 ? '' : value.toString();
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out"
      >
        <h3 className="text-lg font-medium text-gray-900">{sectionName}</h3>
        <div className="flex items-center gap-4">
          <div className="text-sm space-x-4">
            {isHoursSection ? (
              <>
                <span className="">
                  Est:{" "}
                  <span className="font-medium">
                    $
                    {hoursTotals.estimate.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </span>
                {canViewProfitLoss && (
                  <span className="">
                    Act:{" "}
                    <span className="font-medium">
                      $
                      {hoursTotals.actual.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                )}
                {canViewProfitLoss && (
                  <span
                    className={`${
                      (hoursTotals.estimate || 0) - (hoursTotals.actual || 0) >=
                      0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Δ:{" "}
                    <span className="font-medium">
                      $
                      {(
                        (hoursTotals.estimate || 0) - (hoursTotals.actual || 0)
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-sm font-medium">
                  Est: ${(estimate || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {canViewProfitLoss && (
                  <span className="text-sm font-medium">
                    Act: ${(rowsTotal || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
                {canViewProfitLoss && (
                  <span
                    className={`text-sm font-medium ${
                      (estimate || 0) - (rowsTotal || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Δ: ${((estimate || 0) - (rowsTotal || 0)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </>
            )}
          </div>
          <div
            className={`transform transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </button>

      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 space-y-4 bg-white">
          {isHoursSection ? (
            <div className="space-y-4">
              {chartConfig.employee_type?.map((type) => {
                const typeData = localData.find(
                  (d) => d.type_id === type.id
                ) || {
                  type_id: type.id,
                  type_name: type.name,
                  estimate: 0,
                  actual_cost: 0,
                  inputRows: [],
                };
                return (
                  <EmployeeTypeAccordion
                    key={type.id}
                    type={type}
                    employees={employees}
                    typeData={typeData}
                    onAddRow={handleAddHoursRow}
                    onInputChange={(rowId, field, value) =>
                      handleHoursInputChange(rowId, field, value, type.id)
                    }
                    onBlur={handleBlur}
                    isExpanded={expandedTypeId === type.id}
                    onToggle={handleToggleType}
                    onDeleteRow={(rowId) => handleDeleteRow(rowId, type.id)}
                  />
                );
              })}
            </div>
          ) : (
            <>
              {localInputRows.length > 0 && (
                <div className="grid grid-cols-3 gap-4 font-medium text-sm text-gray-600 px-4 mb-2">
                  <span>Invoice</span>
                  <span>Cost</span>
                  <span></span>
                </div>
              )}
              <div className="space-y-2">
                {localInputRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr,1fr,auto] gap-4 items-center"
                  >
                    <input
                      type="text"
                      value={row.invoice || ""}
                      onChange={(e) =>
                        handleInputChange(row.id, "invoice", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Invoice"
                    />
                    <input
                      type="number"
                      value={formatEstimate(row.cost)}
                      onChange={(e) =>
                        handleInputChange(row.id, "cost", e.target.value)
                      }
                      step="0.01"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Cost"
                    />
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-2 text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddInvoiceRow}
                className="w-full py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-150 ease-in-out"
              >
                Add Row
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialsInputSection;
