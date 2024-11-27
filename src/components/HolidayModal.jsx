import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { saveHolidays } from "../redux/actions/holidays";
import Holidays from "date-holidays";
import {
  buttonClass,
  modalContainerClass,
  modalOverlayClass,
} from "../assets/tailwindConstants";
import { formatDateForInput, normalizeDate } from "../utils/dateUtils";
import { updateTasksAfterBuilderChanges } from "../redux/actions/taskData";
import { GridLoader } from "react-spinners";

const HolidayModal = ({
  isOpen,
  onClose,
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

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalStandardHolidays([...standardHolidays]);
      setLocalCustomHolidays(
        [...customHolidays].sort((a, b) => a.name.localeCompare(b.name))
      );

      const hd = new Holidays("US");
      const allHolidays = hd.getHolidays(new Date().getFullYear());
      setAvailableHolidays(allHolidays.map((h) => h.name));
    }
  }, [isOpen, standardHolidays, customHolidays]);

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

      onClose();
    } catch (error) {
      setSaveError("Failed to save changes");
      console.error("Error saving holidays:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalStandardHolidays([...standardHolidays]);
    setLocalCustomHolidays([...customHolidays]);
    setSaveError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={modalOverlayClass}>
      <div
        className={`${modalContainerClass} w-full max-w-4xl mx-4 md:mx-auto`}
      >
        {isSaving && (
          <div className="loading-overlay absolute inset-0 bg-gray-200 bg-opacity-80 flex flex-col justify-center items-center z-[120]">
            <GridLoader color="maroon" size={15} />
            <p>Saving Holidays...</p>
          </div>
        )}
        <div className="flex justify-center items-center mb-4">
          <h2 className="text-lg font-bold">Manage Holidays</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Left Side - Predefined Holidays */}
          <div className="w-full md:w-1/2 space-y-4">
            <h3 className="text-md font-semibold sticky top-0 bg-white">
              Standard Holidays
            </h3>
            <div className="flex gap-2">
              <select
                value={selectedHoliday}
                onChange={(e) => setSelectedHoliday(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className={`${buttonClass} bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Add
              </button>
            </div>

            <div className="h-1/3 md:h-3/4 overflow-y-scroll">
              <div className="space-y-2">
                {localStandardHolidays.map((holiday) => (
                  <div
                    key={holiday.name}
                    className="flex justify-between items-center bg-gray-50 p-2 rounded"
                  >
                    <span className="text-sm">{holiday.name}</span>
                    <button
                      onClick={() => handleRemoveStandardHoliday(holiday.name)}
                      className={`${buttonClass} bg-red-500`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Custom Dates */}
          <div className="flex-1 space-y-4">
            <h3 className="text-md font-semibold sticky top-0 bg-white">
              Custom Holidays
            </h3>
            <button
              onClick={handleAddCustomDate}
              className={`${buttonClass} bg-green-500 w-full`}
            >
              Add Custom Date
            </button>

            <div className="h-1/3 md:h-3/4 overflow-y-auto">
              <div className="space-y-2">
                {localCustomHolidays.map((holiday, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-center bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="date"
                      value={formatDateForInput(holiday.name)}
                      onChange={(e) =>
                        handleCustomDateChange(index, e.target.value)
                      }
                      className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleRemoveCustomDate(holiday.name)}
                      className={`${buttonClass} bg-red-500`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-4 pt-4 border-t">
          <button
            className={`${buttonClass} bg-red-500`}
            onClick={handleCancel}
          >
            Cancel
          </button>
          {saveError && <div className="text-red-500">{saveError}</div>}
          <button
            className={`${buttonClass} bg-blue-500`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HolidayModal;
