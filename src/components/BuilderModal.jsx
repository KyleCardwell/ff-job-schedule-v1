import { Switch } from "@headlessui/react";
import { format , addDays, parseISO } from "date-fns";
import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { GridLoader } from "react-spinners";
import { v4 as uuidv4 } from "uuid";

import {
  buttonClass,
  modalContainerClass,
  modalOverlayClass,
} from "../assets/tailwindConstants";
import {
  updateBuilder,
  deleteBuilder,
  addBuilder,
  addEmployees,
  updateEmployees,
  deleteEmployees,
} from "../redux/actions/builders";
import { updateTasksAfterBuilderChanges } from "../redux/actions/taskData";
import { formatDateForInput, normalizeDate } from "../utils/dateUtils";

const BuilderModal = ({
  visible,
  onCancel,
  workdayHours,
  holidayChecker,
  dayWidth,
  chartStartDate,
}) => {
  const dispatch = useDispatch();
  const builders = useSelector((state) => state.builders.builders);
  const employees = useSelector((state) => state.builders.employees);
  const holidays = useSelector((state) => state.holidays);
  const chartConfig = useSelector((state) => state.chartConfig);
  const subTasksByEmployee = useSelector(
    (state) => state.taskData.subTasksByEmployee
  );

  const [localEmployees, setLocalEmployees] = useState(builders);
  const [errors, setErrors] = useState({});
  const [timeOffVisibility, setTimeOffVisibility] = useState({});
  const [showRates, setShowRates] = useState(false);
  const [schedulingError, setSchedulingError] = useState(null);
  const scrollableRef = useRef(null);
  const inputRefs = useRef({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    // If builders is empty or undefined, create default builder
    const defaultEmployee = {
      employee_name: "Unassigned",
      employee_color: "#FFC0CC",
      time_off: [],
      employee_type: {},
      employee_rate: null,
      markedForDeletion: false,
      can_schedule: true,
    };

    const employeesToUse =
      employees?.length > 0 ? employees : [defaultEmployee];

    setLocalEmployees(
      employeesToUse.map((employee) => ({
        ...employee,
        markedForDeletion: false,
      }))
    );
    setTimeOffVisibility({});
    setShowRates(false); // Reset showRates when modal opens
  }, [employees, visible]);

  const handleNameChange = (index, value) => {
    const updatedBuilders = localEmployees.map((builder, i) =>
      i === index ? { ...builder, employee_name: value } : builder
    );
    setLocalEmployees(updatedBuilders);
  };

  const handleColorChange = (index, value) => {
    const updatedBuilders = localEmployees.map((builder, i) =>
      i === index ? { ...builder, employee_color: value } : builder
    );
    setLocalEmployees(updatedBuilders);
  };

  const handleCanScheduleChange = (index, value) => {
    const updatedBuilders = localEmployees.map((builder, i) =>
      i === index ? { ...builder, can_schedule: value } : builder
    );
    setLocalEmployees(updatedBuilders);
  };

  const handleEmployeeTypeChange = (index, selectedType) => {
    const updatedEmployees = localEmployees.map((employee, i) =>
      i === index
        ? {
            ...employee,
            employee_type: selectedType
              ? {
                  id: selectedType.id,
                  name: selectedType.name,
                }
              : null,
          }
        : employee
    );
    setLocalEmployees(updatedEmployees);
  };

  const handleEmployeeRateChange = (index, value) => {
    const updatedEmployees = localEmployees.map((employee, i) =>
      i === index ? { ...employee, employee_rate: value } : employee
    );
    setLocalEmployees(updatedEmployees);
  };

  const handleAddTimeOff = (index) => {
    const updatedBuilders = localEmployees.map((builder, i) =>
      i === index
        ? {
            ...builder,
            time_off: [
              ...builder.time_off,
              {
                start: normalizeDate(
                  new Date(
                    Date.UTC(
                      new Date().getUTCFullYear(),
                      new Date().getUTCMonth(),
                      new Date().getUTCDate()
                    )
                  )
                ),
                end: normalizeDate(
                  new Date(
                    Date.UTC(
                      new Date().getUTCFullYear(),
                      new Date().getUTCMonth(),
                      new Date().getUTCDate()
                    )
                  )
                ),
              },
            ],
          }
        : builder
    );
    setLocalEmployees(updatedBuilders);
  };

  const handleTimeOffChange = (builderIndex, timeOffIndex, field, value) => {
    const updatedBuilders = localEmployees.map((builder, i) => {
      if (i === builderIndex) {
        const updatedTimeOff = builder.time_off.map((period, j) =>
          j === timeOffIndex
            ? {
                ...period,
                [field]:
                  field === "start" || field === "end"
                    ? normalizeDate(value)
                    : value,
              }
            : period
        );
        return { ...builder, time_off: updatedTimeOff };
      }
      return builder;
    });
    setLocalEmployees(updatedBuilders);
  };

  const handleRemoveTimeOff = (builderIndex, timeOffIndex) => {
    const updatedBuilders = localEmployees.map((builder, i) => {
      if (i === builderIndex) {
        const updatedTimeOff = builder.time_off.filter(
          (_, j) => j !== timeOffIndex
        );
        return { ...builder, time_off: updatedTimeOff };
      }
      return builder;
    });
    setLocalEmployees(updatedBuilders);
  };

  const handleMarkForDeletion = (builderId) => {
    const updatedBuilders = localEmployees.map((builder) =>
      builder.employee_id === builderId
        ? { ...builder, markedForDeletion: !builder.markedForDeletion }
        : builder
    );
    setLocalEmployees(updatedBuilders);
  };

  const handleAddBuilder = () => {
    const newEmployee = {
      employee_id: uuidv4(),
      employee_name: "",
      employee_color: "#000000",
      time_off: [],
      employee_rate: 0,
      employee_type: null,
      markedForDeletion: false,
      can_schedule: true,
    };

    setLocalEmployees((prev) => [...prev, newEmployee]);

    // Wait for state update and DOM to render
    setTimeout(() => {
      // Focus the new input
      if (inputRefs.current[newEmployee.employee_id]) {
        inputRefs.current[newEmployee.employee_id].focus();
      }

      // Scroll the container to the bottom
      if (scrollableRef.current) {
        scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
      }
    }, 0);
  };

  const validateInputs = () => {
    const newErrors = {};
    localEmployees.forEach((builder, index) => {
      if (builder.employee_name.trim() === "") {
        newErrors[`name-${index}`] = "Name is required";
      }
      builder.time_off?.forEach((period, timeOffIndex) => {
        const timeOffErrors = [];
        if (!period.start) {
          timeOffErrors.push("Start date is required");
        }
        if (!period.end) {
          timeOffErrors.push("End date is required");
        }
        if (period.start && period.end && period.end < period.start) {
          timeOffErrors.push("End date must be after start date");
        }
        if (timeOffErrors.length > 0) {
          newErrors[`timeoff-${index}-${timeOffIndex}`] =
            timeOffErrors.join(". ");
        }
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSchedulingChanges = () => {
    const employeesWithSchedulingConflicts = [];
    const buildersToKeep = localEmployees.filter((b) => !b.markedForDeletion);

    buildersToKeep.forEach((localBuilder) => {
      const existingBuilder = employees.find(
        (emp) => emp.employee_id === localBuilder.employee_id
      );

      if (
        existingBuilder &&
        existingBuilder.can_schedule &&
        !localBuilder.can_schedule &&
        subTasksByEmployee[localBuilder.employee_id]?.length > 0
      ) {
        employeesWithSchedulingConflicts.push(localBuilder.employee_name);
        // Reset can_schedule to true for this builder
        localBuilder.can_schedule = true;
      }
    });

    if (employeesWithSchedulingConflicts.length > 0) {
      setSchedulingError(
        `Unable to disable scheduling for ${employeesWithSchedulingConflicts.join(
          ", "
        )} because they have currently scheduled tasks. Please re-assign those tasks first. Other changes will still be saved.`
      );
      return false;
    }

    return true;
  };

  const handleSchedulingErrorClose = () => {
    setSchedulingError(null);
    setIsSaving(true);  // Set isSaving to true before continuing
    // Continue with the save process
    handleSaveImplementation();
  };

  const handleSaveImplementation = async () => {
    try {
      const buildersToDelete = localEmployees
        .filter((b) => b.markedForDeletion)
        .map((b) => b.employee_id);

      const buildersToKeep = localEmployees.filter((b) => !b.markedForDeletion);

      // Separate builders into updates and additions
      const buildersToUpdate = [];
      const buildersToAdd = [];

      buildersToKeep.forEach((localBuilder) => {
        const existingBuilder = employees.find(
          (emp) => emp.employee_id === localBuilder.employee_id
        );
        if (!existingBuilder) {
          // This is a new builder
          buildersToAdd.push({
            employee_name: localBuilder.employee_name,
            employee_color: localBuilder.employee_color,
            time_off: localBuilder.time_off,
            employee_type: localBuilder.employee_type,
            employee_rate: localBuilder.employee_rate,
            can_schedule: localBuilder.can_schedule,
          });
        } else {
          // Check if the builder has any changes
          const hasChanges =
            existingBuilder.employee_name !== localBuilder.employee_name ||
            existingBuilder.employee_color !== localBuilder.employee_color ||
            !areTimeOffsEqual(
              existingBuilder.time_off,
              localBuilder.time_off
            ) ||
            existingBuilder.employee_type !== localBuilder.employee_type ||
            existingBuilder.employee_rate !== localBuilder.employee_rate ||
            existingBuilder.can_schedule !== localBuilder.can_schedule;

          if (hasChanges) {
            buildersToUpdate.push(localBuilder);
          }
        }
      });

      // Handle updates
      if (buildersToUpdate.length > 0) {
        const updateResult = await dispatch(updateEmployees(buildersToUpdate));
        if (!updateResult.success) {
          throw new Error(updateResult.error || "Failed to update employees");
        }
      }

      // Handle additions
      if (buildersToAdd.length > 0) {
        const addResult = await dispatch(addEmployees(buildersToAdd));
        if (!addResult) {
          throw new Error("Failed to add new employees");
        }
      }

      // Update tasks after all builder changes
      await dispatch(
        updateTasksAfterBuilderChanges(
          buildersToKeep,
          buildersToDelete,
          workdayHours,
          holidayChecker,
          holidays,
          dayWidth,
          chartStartDate,
          localEmployees[0].employee_id
        )
      );

      setTimeOffVisibility({});
      onCancel();
    } catch (error) {
      console.error("Error saving builders:", error);
      setSaveError("Failed to save Employees. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTimeOffVisibility = (builderId) => {
    setTimeOffVisibility((prev) => ({
      ...prev,
      [builderId]: !prev[builderId],
    }));
  };

  // Helper function to compare time_off arrays
  const areTimeOffsEqual = (timeOff1, timeOff2) => {
    if (timeOff1?.length !== timeOff2?.length) return false;
    return timeOff1?.every((period1, index) => {
      const period2 = timeOff2[index];
      // Compare normalized dates
      const start1 = normalizeDate(
        new Date(
          Date.UTC(
            new Date(period1.start).getUTCFullYear(),
            new Date(period1.start).getUTCMonth(),
            new Date(period1.start).getUTCDate()
          )
        )
      );
      const start2 = normalizeDate(
        new Date(
          Date.UTC(
            new Date(period2.start).getUTCFullYear(),
            new Date(period2.start).getUTCMonth(),
            new Date(period2.start).getUTCDate()
          )
        )
      );
      const end1 = normalizeDate(
        new Date(
          Date.UTC(
            new Date(period1.end).getUTCFullYear(),
            new Date(period1.end).getUTCMonth(),
            new Date(period1.end).getUTCDate()
          )
        )
      );
      const end2 = normalizeDate(
        new Date(
          Date.UTC(
            new Date(period2.end).getUTCFullYear(),
            new Date(period2.end).getUTCMonth(),
            new Date(period2.end).getUTCDate()
          )
        )
      );
      return start1 === start2 && end1 === end2;
    });
  };

  const handleSave = async () => {
    if (validateInputs()) {
      setIsSaving(true);
      setSaveError(null);
      setSchedulingError(null);

      // First check for scheduling conflicts
      if (!validateSchedulingChanges()) {
        setIsSaving(false);
        // The actual save will happen after user acknowledges the conflict
        return;
      }

      // If no conflicts, proceed with save
      await handleSaveImplementation();
    }
  };

  if (!visible) return null;

  return (
    <div className={modalOverlayClass}>
      {/* Error Modal */}
      {schedulingError ? (
        <div className="absolute inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-[120]">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              Scheduling Conflict
            </h3>
            <p className="text-gray-700 mb-4">{schedulingError}</p>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleSchedulingErrorClose}
              >
                Continue with Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${modalContainerClass} max-h-[90vh] flex flex-col`}>
          {isSaving && (
            <div className="loading-overlay absolute inset-0 bg-gray-200 bg-opacity-80 flex flex-col justify-center items-center z-[120]">
              <GridLoader color="maroon" size={15} />
              <p>Saving Employees...</p>
            </div>
          )}
          {/* Fixed Header */}
          <div className="flex justify-center items-center mb-5 relative">
            <h2 className="text-lg font-bold">Manage Employees</h2>
            <div className="flex items-center gap-2 absolute right-0">
              <Switch
                checked={showRates}
                onChange={setShowRates}
                className={`${
                  showRates ? "bg-blue-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    showRates ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
              <span className="text-sm font-medium text-gray-700">
                Show Hourly Rates
              </span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1" ref={scrollableRef}>
            <div className="overflow-y-auto flex-1">
              {localEmployees.map((builder, index) => (
                <div
                  className="flex flex-col gap-2 p-4 mb-2 rounded relative"
                  key={builder.employee_id || index}
                  style={{
                    backgroundColor: builder.employee_color,
                  }}
                >
                  {index === 0 && (
                    <div className="absolute top-0 right-0 bottom-0 bg-black bg-opacity-20 text-white p-2 rounded-r z-10 flex items-center justify-center text-center">
                      This first employee is for unassigned
                      <br />
                      tasks. It cannot be deleted.
                      <br />
                      You may change the name and color.
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div
                      className={`flex items-center gap-2 ${
                        builder.markedForDeletion ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex gap-4 flex-grow">
                        <div className="w-48">
                          <label className="block text-sm font-medium text-gray-700">
                            Name
                          </label>
                          <input
                            type="text"
                            value={builder.employee_name}
                            onChange={(e) =>
                              handleNameChange(index, e.target.value)
                            }
                            placeholder="Builder Name"
                            className={`p-2 h-8 text-sm border ${
                              errors[`name-${index}`]
                                ? "border-red-500"
                                : "border-gray-300"
                            } rounded`}
                            disabled={builder.markedForDeletion}
                            ref={(el) =>
                              (inputRefs.current[builder.employee_id] = el)
                            }
                          />
                        </div>
                        <div className="w-16">
                          <label className="block text-sm font-medium text-gray-700">
                            Color
                          </label>
                          <input
                            type="color"
                            value={builder.employee_color}
                            onChange={(e) =>
                              handleColorChange(index, e.target.value)
                            }
                            disabled={builder.markedForDeletion}
                            className="block w-full rounded-md focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-9"
                          />
                        </div>
                        {index > 0 && (
                          <div className="w-28">
                            <label className="block text-sm font-medium text-gray-700">
                              Can Schedule
                            </label>
                            <div className="flex items-center h-9 justify-center">
                              <input
                                type="checkbox"
                                checked={builder.can_schedule}
                                onChange={(e) =>
                                  handleCanScheduleChange(
                                    index,
                                    e.target.checked
                                  )
                                }
                                disabled={builder.markedForDeletion}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex-1 px-4">
                          {index > 0 ? (
                            <>
                              <label className="block text-sm font-medium text-gray-700">
                                Type
                              </label>
                              <select
                                value={builder.employee_type?.id || ""}
                                onChange={(e) => {
                                  const selectedType =
                                    chartConfig.employee_type.find(
                                      (t) => t.id === e.target.value
                                    );
                                  handleEmployeeTypeChange(index, selectedType);
                                }}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-9"
                              >
                                <option value="">Select Type</option>
                                {chartConfig.employee_type?.map((type) => (
                                  <option key={type.id} value={type.id}>
                                    {type.name}
                                  </option>
                                ))}
                              </select>
                              {showRates && (
                                <div className="mt-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Hourly Rate
                                  </label>
                                  <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <span className="text-gray-500 sm:text-sm">
                                        $
                                      </span>
                                    </div>
                                    <input
                                      type="number"
                                      value={builder.employee_rate || ""}
                                      onChange={(e) =>
                                        handleEmployeeRateChange(
                                          index,
                                          e.target.value
                                        )
                                      }
                                      className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-9"
                                      placeholder="0.00"
                                      step="0.01"
                                      min="0"
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-between">
                        <button
                          className={`${buttonClass} bg-blue-500 h-9`}
                          style={
                            index === 0
                              ? {
                                  visibility: "hidden",
                                }
                              : {}
                          }
                          type="button"
                          onClick={() =>
                            toggleTimeOffVisibility(builder.employee_id)
                          }
                          disabled={builder.markedForDeletion}
                        >
                          {timeOffVisibility[builder.employee_id]
                            ? "Hide Time Off"
                            : "Edit Time Off"}
                        </button>
                        <button
                          className={`${buttonClass} border-2 border-red-500 h-9 bg-white`}
                          style={
                            index === 0
                              ? {
                                  visibility: "hidden",
                                }
                              : {}
                          }
                          type="button"
                          onClick={() =>
                            handleMarkForDeletion(builder.employee_id)
                          }
                        >
                          <span className="text-red-500">
                            {builder.markedForDeletion
                              ? "Undo Delete"
                              : "Delete"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {timeOffVisibility[builder.employee_id] && (
                      <div className="flex flex-col gap-2 items-center">
                        {builder.time_off.map((period, timeOffIndex) => (
                          <div
                            className="flex flex-col gap-2 p-2 border border-white rounded"
                            key={timeOffIndex}
                          >
                            <div className="flex gap-6">
                              <div className="flex-grow gap-2">
                                <label
                                  htmlFor={`start-${builder.employee_id}-${timeOffIndex}`}
                                  className="text-sm"
                                >
                                  Start:
                                </label>
                                <input
                                  id={`start-${builder.employee_id}-${timeOffIndex}`}
                                  type="date"
                                  value={formatDateForInput(period.start)}
                                  onChange={(e) =>
                                    handleTimeOffChange(
                                      index,
                                      timeOffIndex,
                                      "start",
                                      e.target.value
                                    )
                                  }
                                  className={`p-2 h-8 text-sm border ${
                                    errors[`timeoff-${index}-${timeOffIndex}`]
                                      ? "border-red-500"
                                      : "border-gray-300"
                                  } rounded`}
                                  disabled={builder.markedForDeletion}
                                />
                              </div>
                              <div className="flex-grow gap-2">
                                <label
                                  htmlFor={`end-${builder.employee_id}-${timeOffIndex}`}
                                  className="text-sm"
                                >
                                  End:
                                </label>
                                <input
                                  id={`end-${builder.employee_id}-${timeOffIndex}`}
                                  type="date"
                                  value={formatDateForInput(period.end)}
                                  onChange={(e) =>
                                    handleTimeOffChange(
                                      index,
                                      timeOffIndex,
                                      "end",
                                      e.target.value
                                    )
                                  }
                                  className={`p-2 h-8 text-sm border ${
                                    errors[`timeoff-${index}-${timeOffIndex}`]
                                      ? "border-red-500"
                                      : "border-gray-300"
                                  } rounded`}
                                  disabled={builder.markedForDeletion}
                                />
                              </div>
                              <button
                                className="text-white bg-red-500 rounded-md px-2 py-1"
                                type="button"
                                onClick={() =>
                                  handleRemoveTimeOff(index, timeOffIndex)
                                }
                                disabled={builder.markedForDeletion}
                              >
                                Remove
                              </button>
                            </div>
                            {errors[`timeoff-${index}-${timeOffIndex}`] && (
                              <div className="text-red-500 text-sm text-center">
                                {errors[`timeoff-${index}-${timeOffIndex}`]}
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddTimeOff(index)}
                          disabled={builder.markedForDeletion}
                          className="text-white bg-green-500 rounded-md px-2 py-1 w-fit"
                        >
                          Add Time Off Period
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            className="text-white bg-green-500 rounded-md px-2 py-1"
            type="button"
            onClick={handleAddBuilder}
            style={{
              display: "block",
              margin: "20px auto",
              width: "auto",
              padding: "8px 16px",
            }}
          >
            Add Employee
          </button>

          <div className="flex justify-between">
            <button
              className="text-white bg-red-500 rounded-md px-2 py-1"
              onClick={() => {
                onCancel();
                setErrors({});
              }}
            >
              Cancel
            </button>
            {saveError && <div className="text-red-500">{saveError}</div>}
            <button
              className="text-white bg-blue-500 rounded-md px-2 py-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderModal;
