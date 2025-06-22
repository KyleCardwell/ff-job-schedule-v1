import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { normalizeDate } from '../utils/dateUtils';

const DateRangeFilter = ({ onFilterChange, setSelectedEmployeeIds }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    onFilterChange({
      startDate: startDate ? normalizeDate(startDate) : null,
      endDate: endDate ? normalizeDate(endDate) : null
    });
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSelectedEmployeeIds([]);
    onFilterChange({ startDate: null, endDate: null });
  };

  return (
    <div className="flex items-center space-x-4 print:hidden pr-2">
      <div className="flex items-center space-x-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
          placeholder="Start Date"
        />
        <span>to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
          placeholder="End Date"
        />
      </div>
      <div className="flex space-x-2">
        <button
          onClick={handleApply}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
        >
          Apply
        </button>
        <button
          onClick={handleReset}
          className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

DateRangeFilter.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
};

export default DateRangeFilter;
