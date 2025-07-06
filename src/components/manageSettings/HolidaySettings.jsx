import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { saveHolidays } from "../../redux/actions/holidays";
import Holidays from "date-holidays";
import { formatDateForInput, normalizeDate } from "../../utils/dateUtils";
import { updateTasksAfterBuilderChanges } from "../../redux/actions/taskData";
import SettingsSection from "./SettingsSection";
import SettingsList from "./SettingsList";
import { v4 as uuidv4 } from "uuid";

const HolidaySettings = forwardRef((props, ref) => {
  const dispatch = useDispatch();

  const { chartStartDate, dayWidth } = useSelector((state) => state.chartData);

  const workdayHours = useSelector((state) => state.chartConfig.workday_hours);

  const { standardHolidays, customHolidays } = useSelector(
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
  const [customHolidayError, setCustomHolidayError] = useState(null);

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
      setLocalCustomHolidays([
        ...localCustomHolidays,
        { id: uuidv4(), name: newDate },
      ]);
    }
  };

  const handleRemoveCustomDate = (id) => {
    const newHolidays = localCustomHolidays.filter((h) => h.id !== id);
    setLocalCustomHolidays(newHolidays);
    validateCustomHolidays(newHolidays);
  };

  const validateCustomHolidays = (holidays) => {
    // Check for empty dates
    if (holidays.some((h) => !h.name)) {
      setCustomHolidayError("All dates must be set");
      return false;
    }

    // Check for invalid dates
    if (holidays.some((h) => isNaN(new Date(h.name).getTime()))) {
      setCustomHolidayError("Invalid date format");
      return false;
    }

    // Check for duplicates
    const uniqueDates = new Set(holidays.map((h) => h.name));
    if (uniqueDates.size !== holidays.length) {
      setCustomHolidayError("Duplicate dates are not allowed");
      return false;
    }

    setCustomHolidayError(null);
    return true;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    // Validate custom holidays before saving
    if (!validateCustomHolidays(localCustomHolidays)) {
      setIsSaving(false);
      return;
    }

    try {
      const { holidayMap: newHolidayMap } = await dispatch(saveHolidays(localStandardHolidays, localCustomHolidays));

      // Update tasks with new holiday configuration
      if (employees.length > 0) {
        await dispatch(
          updateTasksAfterBuilderChanges(
            employees,
            [], // no builders to delete
            workdayHours,
            newHolidayMap, 
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

  // Expose save and cancel handlers to parent
  useImperativeHandle(ref, () => ({
    handleSave: () => handleSave(),
    handleCancel: () => {
      setLocalStandardHolidays([...standardHolidays]);
      setLocalCustomHolidays(
        [...customHolidays].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSaveError(null);
    },
  }));

  return (
    <div className="space-y-6 mt-6">
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
            <div
              key={holiday.name}
              className="grid"
              style={{ gridTemplateColumns: "1fr 40px" }}
            >
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

      <SettingsSection title="Custom Holidays" error={customHolidayError}>
        <SettingsList
          items={localCustomHolidays}
          columns={[
            {
              field: "name",
              label: "",
              width: "320px",
              type: "date",
              getValue: (item) => formatDateForInput(item.name),
              setValue: (item, value) => ({
                ...item,
                name: formatDateForInput(new Date(value)),
              }),
            },
          ]}
          onDelete={handleRemoveCustomDate}
          onChange={(id, field, value) => {
            const newHolidays = localCustomHolidays.map((h) =>
              h.id === id
                ? { ...h, name: formatDateForInput(new Date(value)) }
                : h
            );
            setLocalCustomHolidays(newHolidays);
            validateCustomHolidays(newHolidays);
          }}
          onAdd={handleAddCustomDate}
          addLabel="Add Custom Date"
        />
      </SettingsSection>
    </div>
  );
});

HolidaySettings.displayName = "HolidaySettings";

export default HolidaySettings;
