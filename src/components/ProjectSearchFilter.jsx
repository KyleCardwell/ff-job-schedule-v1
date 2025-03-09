import React, { useState } from "react";
import { buttonClass } from "../assets/tailwindConstants";

const ProjectSearchFilter = ({ onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilterChange({ searchTerm, dateRange });
  };

  const handleDateChange = (type, value) => {
    const newDateRange = { ...dateRange, [type]: value };
    setDateRange(newDateRange);
  };

  const handleReset = () => {
    setSearchTerm("");
    setDateRange({ start: "", end: "" });
    onFilterChange({ searchTerm: "", dateRange: { start: "", end: "" } });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow rounded-lg px-4 py-3 mb-6"
    >
      <div className="flex items-center gap-3 justify-end">
        <div className="">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={handleSearch}
            className="px-3 h-9 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => handleDateChange("start", e.target.value)}
            className="w-[150px] px-2 h-9 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleDateChange("end", e.target.value)}
            className="w-[150px] px-2 h-9 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className={`${buttonClass} h-9 px-4 bg-blue-500`}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={handleReset}
            className={`${buttonClass} h-9 px-4 border-2 border-red-500`}
          >
            <span className="text-red-500">Reset</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProjectSearchFilter;
