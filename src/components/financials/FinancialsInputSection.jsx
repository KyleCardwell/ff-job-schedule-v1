import _ from "lodash";
import PropTypes from "prop-types";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import { usePermissions } from "../../hooks/usePermissions";
import { safeEvaluate } from "../../utils/mathUtils";

import EmployeeTypeAccordion from "./EmployeeTypeAccordion.jsx";

const FinancialsInputSection = ({
  sectionName,
  estimate,
  inputRows = [],
  data = [], // Add data prop for hours section
  onUpdate,
  isExpanded,
  onToggle,
  sectionId,
  employees = [],
  services = [],
}) => {
  const { overheadRate } = useSelector((state) => state.financialsData);
  const [localInputRows, setLocalInputRows] = useState([]);
  const [localData, setLocalData] = useState([]); // For hours section
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [inputValues, setInputValues] = useState({}); // For cost inputs
  const isHoursSection = sectionId === "hours";
  const inputRefs = useRef({});
  const prevRowsLengthRef = useRef(inputRows.length);

  const { canViewProfitLoss } = usePermissions();

  // Initialize local state from props only once
  useEffect(() => {
    if (isHoursSection) {
      setLocalData(data);
    } else {
      setLocalInputRows(inputRows);
    }
  }, [data, inputRows]); // Update when props change

  // Focus on the first input of newly added row
  useEffect(() => {
    if (isHoursSection) return; // Skip for hours section

    const currentRowsLength = localInputRows.length;

    // If a new row was added and the section is expanded
    if (currentRowsLength > prevRowsLengthRef.current && isExpanded) {
      // Get the last row's ID
      const lastRowId = localInputRows[currentRowsLength - 1].id;

      // Focus on the first input of the last row
      if (inputRefs.current[lastRowId]) {
        setTimeout(() => {
          inputRefs.current[lastRowId].focus();
        }, 0);
      }
    }

    // Update the previous rows length reference
    prevRowsLengthRef.current = currentRowsLength;
  }, [localInputRows, isExpanded, isHoursSection]);

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

  const handleAddHoursRow = (team_service_id) => {
    const newRow = {
      id: uuidv4(),
      employee_id: "",
      hours: 0,
      isOvertime: false,
    };

    // For hours section, we update the localData array
    const updatedData = localData.map((serviceData) => {
      if (serviceData.team_service_id === team_service_id) {
        return {
          ...serviceData,
          inputRows: [...(serviceData.inputRows || []), newRow],
        };
      }
      return serviceData;
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
    if (typeof time === "number") return Number(time.toFixed(2));

    // Convert to string for processing
    const timeStr = time.toString().trim();

    // If it's in HH:MM format
    if (timeStr.includes(":")) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return Number((hours + minutes / 60).toFixed(2));
    }

    // Otherwise treat as decimal
    return Number(parseFloat(timeStr).toFixed(2)) || 0;
  };

  const handleHoursInputChange = (rowId, field, value, team_service_id) => {
    if (field === "delete") {
      handleDeleteRow(rowId, team_service_id);
      return;
    }

    const updatedData = localData.map((serviceData) => {
      if (serviceData.team_service_id === team_service_id) {
        let updatedRows = (serviceData.inputRows || []).map((row) => {
          if (row.id === rowId) {
            // Handle employee_id change - reset overtime if changing to fixed_amount
            if (field === "employee_id") {
              // If switching to fixed_amount, uncheck overtime
              if (value === "fixed_amount") {
                return {
                  ...row,
                  [field]: value,
                  isOvertime: false, // Reset overtime flag
                };
              }
              return {
                ...row,
                [field]: value,
              };
            }

            // Handle empty or invalid input for hours
            if (field === "hours") {
              if (!value.trim()) {
                return {
                  ...row,
                  hours: { display: "", decimal: 0 },
                };
              }
              return {
                ...row,
                hours: {
                  display: value,
                  decimal: timeToDecimal(value),
                },
              };
            }

            // Handle other field changes
            return {
              ...row,
              [field]: value,
            };
          }
          return row;
        });

        // Update actual_cost based on whether it's a fixed amount or hourly
        if (
          field === "employee_id" ||
          field === "hours" ||
          field === "isOvertime"
        ) {
          updatedRows = updatedRows.map((row) => {
            if (row.employee_id === "fixed_amount") {
              // For fixed amount, use the decimal value
              return {
                ...row,
                actual_cost: row.hours?.decimal || 0,
              };
            } else if (row.employee_id) {
              // For regular employees, multiply decimal hours by rate
              const selectedEmployee = employees.find(
                (e) => e.employee_id === +row.employee_id
              );

              // Apply overtime multiplier if overtime is checked
              const overtimeMultiplier = row.isOvertime ? 1.5 : 1;

              return {
                ...row,
                actual_cost: selectedEmployee
                  ? (selectedEmployee.employee_rate * overtimeMultiplier +
                      overheadRate) *
                    (row.hours?.decimal || 0)
                  : 0,
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
        return { ...serviceData, inputRows: updatedRows, actual_cost };
      }
      return serviceData;
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
    setInputValues((prev) => ({ ...prev, [`${newRow.id}-cost`]: "" }));
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

    if (field === "cost") {
      // For cost field, just update the string value in state
      setInputValues((prev) => ({
        ...prev,
        [`${rowId}-cost`]: value,
      }));
      return;
    }

    const updatedRows = localInputRows.map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          [field]: value,
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

  const handleCostBlur = (rowId, value) => {
    let numValue = 0;
    
    if (value.trim() !== "") {
      // First try to evaluate as a math expression
      const evaluatedValue = safeEvaluate(value);
      
      if (evaluatedValue !== null) {
        numValue = evaluatedValue;
      } else {
        // Fall back to regular parsing if evaluation fails
        const parsed = parseFloat(value);
        numValue = !isNaN(parsed) ? parsed : 0;
      }
    }

    // Update the model with the numeric value
    const updatedRows = localInputRows.map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          cost: numValue,
        };
      }
      return row;
    });
    
    // Update the input value to show the calculated result
    setInputValues((prev) => ({
      ...prev,
      [`${rowId}-cost`]: numValue.toString(),
    }));
    
    handleUpdateRows(updatedRows);
    onUpdate({
      estimate,
      actual_cost: updatedRows.reduce((sum, row) => sum + (row.cost || 0), 0),
      inputRows: updatedRows,
    });
  };

  const handleDeleteRow = (rowId, team_service_id = null) => {
    if (isHoursSection) {
      // For hours section, remove row from the specific type
      const updatedData = localData.map((serviceData) => {
        if (serviceData.team_service_id === team_service_id) {
          const updatedRows = serviceData.inputRows.filter(
            (row) => row.id !== rowId
          );
          // Recalculate actual_cost for this type
          const actual_cost = updatedRows.reduce(
            (sum, row) => sum + (row.actual_cost || 0),
            0
          );
          return { ...serviceData, inputRows: updatedRows, actual_cost };
        }
        return serviceData;
      });
      handleUpdateRows(updatedData);
      onUpdate(updatedData);
    } else {
      // For non-hours sections
      const updatedRows = localInputRows.filter((row) => row.id !== rowId);
      handleUpdateRows(updatedRows);
      
      // Also clean up the input values for the deleted row
      setInputValues((prev) => {
        const newValues = { ...prev };
        delete newValues[`${rowId}-cost`];
        return newValues;
      });
      
      onUpdate({ inputRows: updatedRows });
    }
  };

  const handleToggleService = (teamServiceId) => {
    // const teamServiceId = services.find((s) => s.service_id === serviceId)?.team_service_id;
    setExpandedServiceId((current) =>
      current === teamServiceId ? null : teamServiceId
    );
  };

  const rowsTotal = useMemo(() => {
    if (isHoursSection) {
      return (localData || []).reduce((sum, serviceData) => {
        return (
          sum +
          ((serviceData?.inputRows || []).reduce(
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
      (acc, serviceData) => {
        // Find the service to get its rate
        const service = services.find(
          (s) => s.team_service_id === serviceData.team_service_id
        );
        const rate = serviceData.rateOverride ?? service?.hourly_rate ?? 0;

        // Multiply estimate hours by rate for this type
        const serviceEstimate = (serviceData.estimate || 0) * rate;

        // Calculate actual hours from input rows
        const actualHours = (serviceData.inputRows || []).reduce((sum, row) => {
          if (row.employee_id === "fixed_amount") return sum;
          const hoursValue = row.hours?.decimal ?? row.hours ?? 0;
          return sum + hoursValue;
        }, 0);

        return {
          estimate: acc.estimate + serviceEstimate,
          actual: acc.actual + (serviceData.actual_cost || 0),
          totalHours: acc.totalHours + (serviceData.estimate || 0),
          actualHours: acc.actualHours + actualHours,
        };
      },
      { estimate: 0, actual: 0, totalHours: 0, actualHours: 0 }
    );
  }, [isHoursSection, localData, services]);

  const formatEstimate = (value) => {
    if (value === null || value === undefined || value === "") return "";
    return value === 0 ? "" : value.toString();
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
                    })}{" "}
                    <span className="text-gray-500">
                      ({hoursTotals.totalHours.toFixed(2)} hrs)
                    </span>
                  </span>
                </span>
                <span className="">
                  Act:{" "}
                  <span className="font-medium">
                    {canViewProfitLoss ? (
                      <>
                        $
                        {hoursTotals.actual.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                      </>
                    ) : null}
                    <span className="text-gray-500">
                      ({hoursTotals.actualHours.toFixed(2)} hrs)
                    </span>
                  </span>
                </span>
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
                  Est: $
                  {(estimate || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {canViewProfitLoss && (
                  <span className="text-sm font-medium">
                    Act: $
                    {(rowsTotal || 0).toLocaleString(undefined, {
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
                    Δ: $
                    {((estimate || 0) - (rowsTotal || 0)).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
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
              {services?.map((service) => {
                const serviceData = localData.find(
                  (d) => d.team_service_id === service.team_service_id
                ) || {
                  team_service_id: service.team_service_id,
                  service_name: service.service_name,
                  estimate: 0,
                  actual_cost: 0,
                  inputRows: [],
                };
                return (
                  <EmployeeTypeAccordion
                    key={service.team_service_id}
                    service={service}
                    employees={employees}
                    serviceData={serviceData}
                    onAddRow={handleAddHoursRow}
                    onInputChange={(rowId, field, value) =>
                      handleHoursInputChange(
                        rowId,
                        field,
                        value,
                        service.team_service_id
                      )
                    }
                    onBlur={handleBlur}
                    isExpanded={expandedServiceId === service.team_service_id}
                    onToggle={handleToggleService}
                    onDeleteRow={(rowId) =>
                      handleDeleteRow(rowId, service.team_service_id)
                    }
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
                      ref={(el) => (inputRefs.current[row.id] = el)}
                      type="text"
                      value={row.invoice || ""}
                      onChange={(e) =>
                        handleInputChange(row.id, "invoice", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Invoice"
                    />
                    <input
                      type="text"
                      value={inputValues[`${row.id}-cost`] ?? ""}
                      onChange={(e) =>
                        handleInputChange(row.id, "cost", e.target.value)
                      }
                      onBlur={(e) => handleCostBlur(row.id, e.target.value)}
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

FinancialsInputSection.propTypes = {
  sectionName: PropTypes.string,
  estimate: PropTypes.number,
  inputRows: PropTypes.array,
  data: PropTypes.array,
  onUpdate: PropTypes.func,
  onToggle: PropTypes.func,
  sectionId: PropTypes.string,
  employees: PropTypes.array,
  services: PropTypes.array,
};

export default FinancialsInputSection;
