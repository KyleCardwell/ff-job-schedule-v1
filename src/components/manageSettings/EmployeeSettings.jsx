import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from '@headlessui/react';
import { v4 as uuidv4 } from 'uuid';
import {
  updateEmployees,
  deleteEmployees,
  addEmployees,
} from '../../redux/actions/builders';
import { updateTasksAfterBuilderChanges } from '../../redux/actions/taskData';
import { normalizeDate } from '../../utils/dateUtils';
import SettingsSection from './SettingsSection';
import EmployeeSettingsCard from './EmployeeSettingsCard';

const EmployeeSettings = () => {
  const dispatch = useDispatch();
  const employees = useSelector((state) => state.builders.employees);
  const employeeTypes = useSelector((state) => state.chartConfig.employeeTypes);
  const workdayHours = useSelector((state) => state.chartConfig.workdayHours);
  const holidayChecker = useSelector((state) => state.holidays);
  const dayWidth = useSelector((state) => state.chartConfig.dayWidth);
  const chartStartDate = useSelector((state) => state.chartConfig.chartStartDate);

  const [localEmployees, setLocalEmployees] = useState([]);
  const [timeOffVisibility, setTimeOffVisibility] = useState({});
  const [showRates, setShowRates] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Initialize local state
  useEffect(() => {
    const defaultEmployee = {
      employee_id: 'default',
      employee_name: 'Unassigned',
      employee_color: '#FFC0CC',
      time_off: [],
      employee_type: {},
      employee_rate: null,
      can_schedule: true,
    };

    const employeesToUse = employees?.length > 0 ? employees : [defaultEmployee];
    setLocalEmployees(employeesToUse);
  }, [employees]);

  const handleNameChange = (employeeId, value) => {
    setLocalEmployees(
      localEmployees.map((emp) =>
        emp.employee_id === employeeId ? { ...emp, employee_name: value } : emp
      )
    );
  };

  const handleColorChange = (employeeId, value) => {
    setLocalEmployees(
      localEmployees.map((emp) =>
        emp.employee_id === employeeId ? { ...emp, employee_color: value } : emp
      )
    );
  };

  const handleCanScheduleChange = (employeeId, value) => {
    setLocalEmployees(
      localEmployees.map((emp) =>
        emp.employee_id === employeeId ? { ...emp, can_schedule: value } : emp
      )
    );
  };

  const handleEmployeeTypeChange = (employeeId, selectedType) => {
    setLocalEmployees(
      localEmployees.map((emp) =>
        emp.employee_id === employeeId
          ? {
              ...emp,
              employee_type: selectedType
                ? {
                    id: selectedType.id,
                    name: selectedType.name,
                  }
                : null,
            }
          : emp
      )
    );
  };

  const handleEmployeeRateChange = (employeeId, value) => {
    setLocalEmployees(
      localEmployees.map((emp) =>
        emp.employee_id === employeeId ? { ...emp, employee_rate: value } : emp
      )
    );
  };

  const handleAddTimeOff = (employeeId) => {
    setLocalEmployees(
      localEmployees.map((emp) =>
        emp.employee_id === employeeId
          ? {
              ...emp,
              time_off: [
                ...emp.time_off,
                {
                  start: normalizeDate(new Date()),
                  end: normalizeDate(new Date()),
                },
              ],
            }
          : emp
      )
    );
  };

  const handleTimeOffChange = (employeeId, timeOffIndex, field, value) => {
    setLocalEmployees(
      localEmployees.map((emp) => {
        if (emp.employee_id !== employeeId) return emp;

        const newTimeOff = [...emp.time_off];
        newTimeOff[timeOffIndex] = {
          ...newTimeOff[timeOffIndex],
          [field]: normalizeDate(new Date(value)),
        };

        return { ...emp, time_off: newTimeOff };
      })
    );
  };

  const handleRemoveTimeOff = (employeeId, timeOffIndex) => {
    setLocalEmployees(
      localEmployees.map((emp) => {
        if (emp.employee_id !== employeeId) return emp;

        const newTimeOff = [...emp.time_off];
        newTimeOff.splice(timeOffIndex, 1);
        return { ...emp, time_off: newTimeOff };
      })
    );
  };

  const handleToggleTimeOff = (employeeId) => {
    setTimeOffVisibility((prev) => ({
      ...prev,
      [employeeId]: !prev[employeeId],
    }));
  };

  const handleAddEmployee = () => {
    const newEmployee = {
      employee_id: uuidv4(),
      employee_name: '',
      employee_color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      time_off: [],
      employee_type: {},
      employee_rate: null,
      can_schedule: true,
    };
    setLocalEmployees([...localEmployees, newEmployee]);
  };

  const handleDeleteEmployee = (employeeId) => {
    setLocalEmployees(localEmployees.filter((emp) => emp.employee_id !== employeeId));
  };

  const validateInputs = () => {
    const newErrors = {};

    localEmployees.forEach((employee, index) => {
      if (!employee.employee_name.trim()) {
        newErrors[`name-${index}`] = 'Name is required';
      }

      employee.time_off.forEach((period, timeOffIndex) => {
        const start = new Date(period.start);
        const end = new Date(period.end);
        if (end < start) {
          newErrors[`timeoff-${index}-${timeOffIndex}`] = 'End date must be after start date';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Save employee changes
      await dispatch(updateEmployees(localEmployees));

      // Update tasks with new employee configuration
      await dispatch(
        updateTasksAfterBuilderChanges(
          localEmployees,
          [], // no employees to delete
          workdayHours,
          holidayChecker,
          {
            standardHolidays: holidayChecker.standardHolidays,
            customHolidays: holidayChecker.customHolidays,
          },
          dayWidth,
          chartStartDate,
          localEmployees[0].employee_id
        )
      );
    } catch (error) {
      setSaveError('Failed to save changes');
      console.error('Error saving employees:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-200">Manage Employees</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={showRates}
              onChange={setShowRates}
              className={`${
                showRates ? 'bg-blue-600' : 'bg-slate-600'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  showRates ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className="text-sm text-slate-200">Show Hourly Rates</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              isSaving
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <SettingsSection error={saveError}>
        {localEmployees.map((employee) => (
          <EmployeeSettingsCard
            key={employee.employee_id}
            employee={employee}
            employeeTypes={employeeTypes}
            onNameChange={(value) => handleNameChange(employee.employee_id, value)}
            onColorChange={(value) => handleColorChange(employee.employee_id, value)}
            onCanScheduleChange={(value) => handleCanScheduleChange(employee.employee_id, value)}
            onEmployeeTypeChange={(value) => handleEmployeeTypeChange(employee.employee_id, value)}
            onEmployeeRateChange={(value) => handleEmployeeRateChange(employee.employee_id, value)}
            onAddTimeOff={() => handleAddTimeOff(employee.employee_id)}
            onTimeOffChange={(index, field, value) =>
              handleTimeOffChange(employee.employee_id, index, field, value)
            }
            onRemoveTimeOff={(index) => handleRemoveTimeOff(employee.employee_id, index)}
            onDelete={() => handleDeleteEmployee(employee.employee_id)}
            showRates={showRates}
            errors={errors}
            timeOffVisible={timeOffVisibility[employee.employee_id] || false}
            onToggleTimeOff={() => handleToggleTimeOff(employee.employee_id)}
          />
        ))}

        <button
          onClick={handleAddEmployee}
          className="w-full mt-4 px-3 py-2 text-sm bg-slate-600 text-slate-200 hover:bg-slate-500 rounded"
        >
          Add Employee
        </button>
      </SettingsSection>
    </div>
  );
};

export default EmployeeSettings;
