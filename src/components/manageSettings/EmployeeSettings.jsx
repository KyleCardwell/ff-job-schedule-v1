import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { Switch } from "@headlessui/react";
import {
  updateBuilder,
  deleteBuilder,
  addBuilder,
  addEmployees,
  updateEmployees,
  deleteEmployees,
} from "../../redux/actions/builders";
import { formatDateForInput, normalizeDate } from "../../utils/dateUtils";
import { updateTasksAfterBuilderChanges } from "../../redux/actions/taskData";
import { GridLoader } from "react-spinners";
import { v4 as uuidv4 } from "uuid";
import SettingsSection from "./SettingsSection";
import EmployeeSettingsCard from "./EmployeeSettingsCard";

const EmployeeSettings = forwardRef((props, ref) => {
  const { visible, holidayChecker } = props;

  const { chartStartDate, workdayHours, dayWidth } = useSelector(
    (state) => state.chartData
  );

  const dispatch = useDispatch();
  const employees = useSelector((state) => state.builders.employees);
  const holidays = useSelector((state) => state.holidays);
  const subTasksByEmployee = useSelector(
    (state) => state.taskData.subTasksByEmployee
  );
  const employeeTypes = useSelector(
    (state) => state.chartConfig.employee_type || []
  );

  const [localEmployees, setLocalEmployees] = useState(employees);
  const [errors, setErrors] = useState({});
  const [timeOffVisibility, setTimeOffVisibility] = useState({});
  const [showRates, setShowRates] = useState(false);
  const [schedulingError, setSchedulingError] = useState(null);
  const scrollableRef = useRef(null);
  const inputRefs = useRef({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    // If builders is empty or undefined, create first Employee
    const firstEmployee = {
      employee_name: "Unassigned",
      employee_color: "#FFC0CC",
      time_off: [],
      employee_type: {},
      employee_rate: null,
      markedForDeletion: false,
      can_schedule: true,
    };

    const employeesToUse = employees?.length > 0 ? employees : [firstEmployee];

    setLocalEmployees(
      employeesToUse.map((employee) => ({
        ...employee,
        markedForDeletion: false,
      }))
    );
    setTimeOffVisibility({});
    setShowRates(false); // Reset showRates when modal opens
  }, [employees, visible]);

  const handleNameChange = (employeeId, value) => {
    const updatedEmployees = localEmployees.map((employee) =>
      employee.employee_id === employeeId
        ? { ...employee, employee_name: value }
        : employee
    );
    setLocalEmployees(updatedEmployees);
  };

  const handleColorChange = (employeeId, value) => {
    const updatedEmployees = localEmployees.map((employee) =>
      employee.employee_id === employeeId
        ? { ...employee, employee_color: value }
        : employee
    );
    setLocalEmployees(updatedEmployees);
  };

  const handleCanScheduleChange = (employeeId, value) => {
    const updatedEmployees = localEmployees.map((employee) =>
      employee.employee_id === employeeId
        ? { ...employee, can_schedule: value }
        : employee
    );
    setLocalEmployees(updatedEmployees);
  };

  const handleEmployeeTypeChange = (employeeId, selectedType) => {
    const updatedEmployees = localEmployees.map((employee) =>
      employee.employee_id === employeeId
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

  const handleEmployeeRateChange = (employeeId, value) => {
    const updatedEmployees = localEmployees.map((employee) =>
      employee.employee_id === employeeId
        ? { ...employee, employee_rate: value }
        : employee
    );
    setLocalEmployees(updatedEmployees);
  };

  const handleAddTimeOff = (employeeId) => {
    const updatedEmployees = localEmployees.map((employee) =>
      employee.employee_id === employeeId
        ? {
            ...employee,
            time_off: [
              ...employee.time_off,
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
        : employee
    );
    setLocalEmployees(updatedEmployees);
  };

  const handleTimeOffChange = (employeeId, timeOffIndex, field, value) => {
    const updatedEmployees = localEmployees.map((employee) => {
      if (employee.employee_id === employeeId) {
        const updatedTimeOff = employee.time_off.map((period, j) =>
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
        return { ...employee, time_off: updatedTimeOff };
      }
      return employee;
    });
    setLocalEmployees(updatedEmployees);
  };

  const handleRemoveTimeOff = (employeeId, timeOffIndex) => {
    const updatedEmployees = localEmployees.map((employee) => {
      if (employee.employee_id === employeeId) {
        const updatedTimeOff = employee.time_off.filter(
          (_, j) => j !== timeOffIndex
        );
        return { ...employee, time_off: updatedTimeOff };
      }
      return employee;
    });
    setLocalEmployees(updatedEmployees);
  };

  const handleMarkForDeletion = (employeeId) => {
    const updatedEmployees = localEmployees.map((employee) =>
      employee.employee_id === employeeId
        ? { ...employee, markedForDeletion: !employee.markedForDeletion }
        : employee
    );
    setLocalEmployees(updatedEmployees);
  };

  const handleAddEmployee = () => {
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
    localEmployees.forEach((employee) => {
      // Skip validation for employees marked for deletion
      if (employee.markedForDeletion) return;

      // Validate name
      if (employee.employee_name.trim() === "") {
        newErrors[employee.employee_id] = {
          ...newErrors[employee.employee_id],
          name: "Name is required"
        };
      }

      // Validate employee type
      if (!employee.employee_type?.id) {
        newErrors[employee.employee_id] = {
          ...newErrors[employee.employee_id],
          employee_type: "Employee type is required"
        };
      }

      // Validate time off periods
      employee.time_off?.forEach((period, timeOffIndex) => {
        const timeOffErrors = [];
        if (!period.start) {
          timeOffErrors.push("Start date is required");
        }
        if (!period.end) {
          timeOffErrors.push("End date is required");
        }
        if (period.start && period.end && period.end < period.start) {
          timeOffErrors.push("End date must be on or after start date");
        }
        if (timeOffErrors.length > 0) {
          newErrors[employee.employee_id] = {
            ...newErrors[employee.employee_id],
            [`timeoff-${timeOffIndex}`]: timeOffErrors.join(". ")
          };
        }
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSchedulingChanges = () => {
    const employeesWithSchedulingConflicts = [];
    const employeesToKeep = localEmployees.filter(
      (emp) => !emp.markedForDeletion
    );

    employeesToKeep.forEach((localEmployee) => {
      const existingEmployee = employees.find(
        (emp) => emp.employee_id === localEmployee.employee_id
      );

      if (
        existingEmployee &&
        existingEmployee.can_schedule &&
        !localEmployee.can_schedule &&
        subTasksByEmployee[localEmployee.employee_id]?.length > 0
      ) {
        employeesWithSchedulingConflicts.push(localEmployee.employee_name);
        // Reset can_schedule to true for this employee
        localEmployee.can_schedule = true;
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
    setIsSaving(true); // Set isSaving to true before continuing
    // Continue with the save process
    handleSaveImplementation();
  };

  const handleSaveImplementation = async () => {
    try {
      const employeesToDelete = localEmployees
        .filter((emp) => emp.markedForDeletion)
        .map((emp) => emp.employee_id);

      const employeesToKeep = localEmployees.filter(
        (emp) => !emp.markedForDeletion
      );

      // Separate employees into updates and additions
      const employeesToUpdate = [];
      const employeesToAdd = [];

      employeesToKeep.forEach((localEmployee) => {
        const existingEmployee = employees.find(
          (emp) => emp.employee_id === localEmployee.employee_id
        );
        if (!existingEmployee) {
          // This is a new employee
          employeesToAdd.push({
            employee_name: localEmployee.employee_name,
            employee_color: localEmployee.employee_color,
            time_off: localEmployee.time_off,
            employee_type: localEmployee.employee_type,
            employee_rate: localEmployee.employee_rate,
            can_schedule: localEmployee.can_schedule,
          });
        } else {
          // Check if the employee has any changes
          const hasChanges =
            existingEmployee.employee_name !== localEmployee.employee_name ||
            existingEmployee.employee_color !== localEmployee.employee_color ||
            !areTimeOffsEqual(
              existingEmployee.time_off,
              localEmployee.time_off
            ) ||
            existingEmployee.employee_type !== localEmployee.employee_type ||
            existingEmployee.employee_rate !== localEmployee.employee_rate ||
            existingEmployee.can_schedule !== localEmployee.can_schedule;

          if (hasChanges) {
            employeesToUpdate.push(localEmployee);
          }
        }
      });

      // Handle updates
      if (employeesToUpdate.length > 0) {
        const updateResult = await dispatch(updateEmployees(employeesToUpdate));
        if (!updateResult.success) {
          throw new Error(updateResult.error || "Failed to update employees");
        }
      }

      // Handle additions
      if (employeesToAdd.length > 0) {
        const addResult = await dispatch(addEmployees(employeesToAdd));
        if (!addResult) {
          throw new Error("Failed to add new employees");
        }
      }

      // Update tasks after all builder changes
      await dispatch(
        updateTasksAfterBuilderChanges(
          employeesToKeep,
          employeesToDelete,
          workdayHours,
          holidayChecker,
          holidays,
          dayWidth,
          chartStartDate,
          localEmployees[0].employee_id
        )
      );

      setTimeOffVisibility({});
      // onCancel();
    } catch (error) {
      console.error("Error saving builders:", error);
      setSaveError("Failed to save Employees. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTimeOff = (employeeId) => {
    setTimeOffVisibility((prev) => ({
      ...prev,
      [employeeId]: !prev[employeeId],
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

  // Reset the form to its initial state
  const cancelChanges = useCallback(() => {
    setLocalEmployees(
      employees.map((employee) => ({
        ...employee,
        markedForDeletion: false,
      }))
    );
    setErrors({});
    setTimeOffVisibility({});
    setShowRates(false);
    setSchedulingError(null);
    setSaveError(null);
  }, [employees]);

  // Expose methods to parent component
  useImperativeHandle(
    ref,
    () => ({
      handleSave: handleSave,
      handleCancel: cancelChanges,
      // Add current state getters that might be useful to parent
      getCurrentEmployees: () => localEmployees,
      hasErrors: () => Object.keys(errors).length > 0,
      isSaving: () => isSaving,
    }),
    [handleSave, cancelChanges, localEmployees, errors, isSaving]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header */}
      <div className="sticky top-0 z-10 bg-slate-800 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200">Manage Employees</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={showRates}
                onChange={setShowRates}
                className={`${
                  showRates ? "bg-blue-600" : "bg-slate-600"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    showRates ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
              <span className="text-sm text-slate-200">Show Hourly Rates</span>
            </div>
            <button
              onClick={handleAddEmployee}
              className="px-2 py-2 text-sm bg-slate-600 text-slate-200 hover:bg-slate-500"
            >
              Add Employee
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto" ref={scrollableRef}>
        <SettingsSection key="employees" title="" error={saveError}>
          {localEmployees.map((employee, index) => (
            <EmployeeSettingsCard
              key={employee.employee_id || `employee-${index}`}
              employee={employee}
              employeeTypes={employeeTypes}
              onNameChange={(value) =>
                handleNameChange(employee.employee_id, value)
              }
              onColorChange={(value) =>
                handleColorChange(employee.employee_id, value)
              }
              onCanScheduleChange={(value) =>
                handleCanScheduleChange(employee.employee_id, value)
              }
              onEmployeeTypeChange={(value) =>
                handleEmployeeTypeChange(employee.employee_id, value)
              }
              onEmployeeRateChange={(value) =>
                handleEmployeeRateChange(employee.employee_id, value)
              }
              onAddTimeOff={() => handleAddTimeOff(employee.employee_id)}
              onTimeOffChange={(index, field, value) =>
                handleTimeOffChange(employee.employee_id, index, field, value)
              }
              onRemoveTimeOff={(index) =>
                handleRemoveTimeOff(employee.employee_id, index)
              }
              onDelete={() => handleMarkForDeletion(employee.employee_id)}
              onMarkForDeletion={() =>
                handleMarkForDeletion(employee.employee_id)
              }
              showRates={showRates}
              errors={errors[employee.employee_id] || {}}
              timeOffVisible={timeOffVisibility[employee.employee_id] || false}
              onToggleTimeOff={() => handleToggleTimeOff(employee.employee_id)}
              defaultEmployee={index === 0}
            />
          ))}
        </SettingsSection>
      </div>
    </div>
  );
});

export default EmployeeSettings;
