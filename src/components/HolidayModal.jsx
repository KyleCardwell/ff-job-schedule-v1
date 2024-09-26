import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addHoliday, removeHoliday } from "../redux/actions/holidays";
import Holidays from 'date-holidays';

const HolidayModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const holidays = useSelector((state) => state.holidays.holidays);
  const [availableHolidays, setAvailableHolidays] = useState([]);
  const [selectedHoliday, setSelectedHoliday] = useState("");

  useEffect(() => {
    if (isOpen) {
      const hd = new Holidays('US');
      const allHolidays = hd.getHolidays(new Date().getFullYear());
      setAvailableHolidays(allHolidays.map(h => h.name));
    }
  }, [isOpen]);

  const handleAddHoliday = () => {
    if (selectedHoliday && !holidays.some(h => h.name === selectedHoliday)) {
      dispatch(addHoliday(selectedHoliday));
      setSelectedHoliday("");
    }
  };

  const handleRemoveHoliday = (name) => {
    dispatch(removeHoliday(name));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="holiday-modal">
        <h2>Manage Holidays</h2>
        <select
          value={selectedHoliday}
          onChange={(e) => setSelectedHoliday(e.target.value)}
        >
          <option value="">Select a holiday</option>
          {availableHolidays.map((holiday) => (
            <option key={holiday} value={holiday}>
              {holiday}
            </option>
          ))}
        </select>
        <button onClick={handleAddHoliday}>Add Holiday</button>
        <h3>Active Holidays</h3>
        <ul>
          {holidays.map((holiday) => (
            <li key={holiday.name}>
              {holiday.name}
              <button onClick={() => handleRemoveHoliday(holiday.name)}>Remove</button>
            </li>
          ))}
        </ul>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default HolidayModal;