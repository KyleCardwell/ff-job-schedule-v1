import React, { useState } from "react";
import { buttonClass } from "../../assets/tailwindConstants";

const FinancialsInputSection = ({
  sectionName,
  estimate,
  actual_cost,
  inputRows = [],
  onUpdate,
  isExpanded,
  onToggle,
}) => {
  // Create local copies of the props
  const [localEstimate, setLocalEstimate] = useState(estimate);
  const [localActualCost, setLocalActualCost] = useState(actual_cost);
  const [localInputRows, setLocalInputRows] = useState([...inputRows]);

  const handleAddRow = () => {
    const newRow = {
      id: Date.now(), // Temporary ID for new rows
      // Add default values for your row fields here
    };
    setLocalInputRows([...localInputRows, newRow]);
  };

  const handleInputChange = (e, field, rowId = null) => {
    if (rowId === null) {
      // Handle top-level fields
      if (field === "estimate") {
        setLocalEstimate(e.target.value);
        onUpdate({ ...localEstimate, estimate: e.target.value });
      } else if (field === "actual_cost") {
        setLocalActualCost(e.target.value);
        onUpdate({ ...localActualCost, actual_cost: e.target.value });
      }
    } else {
      // Handle row fields
      const updatedRows = localInputRows?.map((row) =>
        row.id === rowId ? { ...row, [field]: e.target.value } : row
      );
      setLocalInputRows(updatedRows);
      onUpdate({ inputRows: updatedRows });
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out"
      >
        <h3 className="text-lg font-medium text-gray-900">{sectionName}</h3>
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
      </button>

      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 space-y-6 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Estimate
              </label>
              <input
                type="number"
                value={localEstimate}
                onChange={(e) => handleInputChange(e, "estimate")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Actual Cost
              </label>
              <input
                type="number"
                value={localActualCost}
                onChange={(e) => handleInputChange(e, "actual_cost")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            {localInputRows.length > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <button
                    onClick={handleAddRow}
                    className={`${buttonClass} bg-green-500 hover:bg-green-600`}
                  >
                    Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {localInputRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="text-sm text-gray-500">
                        Row {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={handleAddRow}
                  className={`${buttonClass} bg-green-500 hover:bg-green-600`}
                >
                  Add Row
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialsInputSection;
