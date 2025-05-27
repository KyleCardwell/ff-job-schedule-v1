import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { saveHolidays } from "../../redux/actions/holidays";
import Holidays from "date-holidays";
import { formatDateForInput, normalizeDate } from "../../utils/dateUtils";
import { updateTasksAfterBuilderChanges } from "../../redux/actions/taskData";
import SettingsSection from "./SettingsSection";

const HolidaySettings = ({
  workdayHours,
  holidayChecker,
  dayWidth,
  chartStartDate,
}) => {
  const dispatch = useDispatch();

  const { standardHolidays, customHolidays, loading, error } = useSelector(
    (state) => state.holidays
  );
  const employees = useSelector((state) => state.builders.employees);

  // Local state for managing changes
  const [localStandardHolidays, setLocalStandardHolidays] = useState([]);
  const [localCustomHolidays, setLocalCustomHolidays] = useState([]);
  const [availableHolidays, setAvailableHolidays] = useState([]);
  const [selectedHoliday, setSelectedHoliday] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Initialize local state
  useEffect(() => {
    setLocalStandardHolidays([...standardHolidays]);
    setLocalCustomHolidays(
      [...customHolidays].sort((a, b) => a.name.localeCompare(b.name))
    );

    const hd = new Holidays("US");
    const allHolidays = hd.getHolidays(new Date().getFullYear());
    const filteredHolidays = allHolidays.filter(
      (h) => h.type === "public" || h.type === "bank" || h.type === "school"
    );
    setAvailableHolidays(filteredHolidays.map((h) => h.name));
  }, [standardHolidays, customHolidays]);

  const handleAddHoliday = () => {
    if (
      selectedHoliday &&
      !localStandardHolidays.some((h) => h.name === selectedHoliday)
    ) {
      setLocalStandardHolidays([
        ...localStandardHolidays,
        { name: selectedHoliday },
      ]);
      setSelectedHoliday("");
    }
  };

  const handleRemoveStandardHoliday = (name) => {
    setLocalStandardHolidays(
      localStandardHolidays.filter((h) => h.name !== name)
    );
  };

  const handleAddCustomDate = () => {
    const newDate = normalizeDate(new Date());
    if (!localCustomHolidays.some((h) => h.name === newDate)) {
      setLocalCustomHolidays([...localCustomHolidays, { name: newDate }]);
    }
  };

  const handleCustomDateChange = (index, date) => {
    const newDates = [...localCustomHolidays];
    newDates[index] = { name: normalizeDate(new Date(date)) };
    setLocalCustomHolidays(newDates);
  };

  const handleRemoveCustomDate = (name) => {
    setLocalCustomHolidays(localCustomHolidays.filter((h) => h.name !== name));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await dispatch(saveHolidays(localStandardHolidays, localCustomHolidays));

      // Update tasks with new holiday configuration
      if (employees.length > 0) {
        await dispatch(
          updateTasksAfterBuilderChanges(
            employees,
            [], // no builders to delete
            workdayHours,
            holidayChecker,
            {
              standardHolidays: localStandardHolidays,
              customHolidays: localCustomHolidays,
            },
            dayWidth,
            chartStartDate,
            employees[0].employee_id
          )
        );
      }
    } catch (error) {
      setSaveError("Failed to save changes");
      console.error("Error saving holidays:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSection title="Standard Holidays" error={saveError}>
        <div className="flex gap-2 mb-4">
          <select
            value={selectedHoliday}
            onChange={(e) => setSelectedHoliday(e.target.value)}
            className="flex-1 bg-slate-600 text-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a holiday</option>
            {availableHolidays.map((holiday) => (
              <option key={holiday} value={holiday}>
                {holiday}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddHoliday}
            disabled={!selectedHoliday}
            className="px-3 py-1 text-sm bg-blue-500 text-slate-200 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {localStandardHolidays.map((holiday) => (
            <div key={holiday.name} className="grid" style={{ gridTemplateColumns: '1fr 40px' }}>
              <div className="bg-slate-600 p-2 rounded text-sm text-slate-200">
                {holiday.name}
              </div>
              <button
                onClick={() => handleRemoveStandardHoliday(holiday.name)}
                className="p-2 text-slate-400 hover:text-red-400"
              >
                <svg
                  className="h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Custom Holidays">
        <div className="mb-4">
          <button
            onClick={handleAddCustomDate}
            className="w-full px-3 py-1 text-sm bg-slate-600 text-slate-200 hover:bg-slate-500"
          >
            Add Custom Date
          </button>
        </div>
        <div className="space-y-2">
          {localCustomHolidays.map((holiday, index) => (
            <div key={index} className="grid" style={{ gridTemplateColumns: '1fr 40px' }}>
              <div className="bg-slate-600 p-2 rounded">
                <input
                  type="date"
                  value={formatDateForInput(holiday.name)}
                  onChange={(e) => handleCustomDateChange(index, e.target.value)}
                  className="w-full bg-slate-700 text-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                />
              </div>
              <button
                onClick={() => handleRemoveCustomDate(holiday.name)}
                className="p-2 text-slate-400 hover:text-red-400"
              >
                <svg
                  className="h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
};

export default HolidaySettings;
