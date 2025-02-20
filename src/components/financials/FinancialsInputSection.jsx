import React, { useState, useEffect, useMemo } from "react";
import { buttonClass } from "../../assets/tailwindConstants";
import EmployeeTypeAccordion from "./EmployeeTypeAccordion";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

const FinancialsInputSection = ({
  sectionName,
  estimate,
  actual_cost,
  inputRows = [],
  onUpdate,
  isExpanded,
  onToggle,
  sectionId,
  employees = [],
}) => {
  const [localInputRows, setLocalInputRows] = useState(inputRows);
  const isHoursSection = sectionId === 'hours';
  const chartConfig = useSelector((state) => state.chartConfig);

  const handleAddHoursRow = ({ type_id }) => {
    const newRow = {
      id: uuidv4(),
      employee_id: "",
      hours: 0,
      type_id
    };
    const updatedRows = [...localInputRows, newRow];
    setLocalInputRows(updatedRows);
    updateTotal(updatedRows);
  };

  const handleAddInvoiceRow = () => {
    const newRow = {
      id: uuidv4(),
      invoice: "",
      cost: 0
    };
    const updatedRows = [...localInputRows, newRow];
    setLocalInputRows(updatedRows);
    updateTotal(updatedRows);
  };

  const handleInputChange = (rowId, field, value) => {
    const updatedRows = localInputRows.map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          [field]: field === 'hours' || field === 'cost' ? parseFloat(value) || 0 : value
        };
      }
      return row;
    });
    setLocalInputRows(updatedRows);
    updateTotal(updatedRows);
  };

  const updateTotal = (rows) => {
    const total = rows.reduce((sum, row) => {
      const value = isHoursSection ? (row.hours || 0) : (row.cost || 0);
      return sum + value;
    }, 0);
    onUpdate?.({ 
      actual_cost: total, 
      inputRows: rows
    });
  };

  const rowsTotal = useMemo(() => {
    return localInputRows.reduce((sum, row) => {
      return sum + (isHoursSection ? row.hours || 0 : row.cost || 0);
    }, 0);
  }, [localInputRows, isHoursSection]);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out"
      >
        <h3 className="text-lg font-medium text-gray-900">{sectionName}</h3>
        <div className="flex items-center gap-4">
          {!isHoursSection && (
            <div className="text-sm space-x-4">
              <span className="font-medium">
                Est: ${estimate.toLocaleString()}
              </span>
              <span className="font-medium">
                Act: ${rowsTotal.toLocaleString()}
              </span>
              <span className={`font-medium ${estimate - rowsTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Δ: ${(estimate - rowsTotal).toLocaleString()}
              </span>
            </div>
          )}
          <div className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
            <svg className="w-5 h-5 text-gray-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </button>

      <div className={`transition-all duration-200 ease-in-out overflow-hidden ${
        isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
      }`}>
        <div className="p-4 space-y-4 bg-white">
          {isHoursSection ? (
            <div className="space-y-4">
              {chartConfig.employee_type?.map(type => (
                <EmployeeTypeAccordion
                  key={type.id}
                  type={type}
                  employees={employees}
                  rows={localInputRows}
                  onAddRow={handleAddHoursRow}
                  onInputChange={handleInputChange}
                  estimates={estimate?.estimates || {}}
                />
              ))}
            </div>
          ) : (
            <>
              {localInputRows.length > 0 && (
                <div className="grid grid-cols-2 gap-4 font-medium text-sm text-gray-600 px-4 mb-2">
                  <span>Invoice</span>
                  <span>Cost</span>
                </div>
              )}
              <div className="space-y-2">
                {localInputRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-2 gap-4 items-center">
                    <input
                      type="text"
                      value={row.invoice || ''}
                      onChange={(e) => handleInputChange(row.id, 'invoice', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Invoice number"
                    />
                    <input
                      type="number"
                      value={row.cost || ''}
                      onChange={(e) => handleInputChange(row.id, 'cost', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Cost"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddInvoiceRow}
                className="w-full py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-150 ease-in-out"
              >
                Add Row
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialsInputSection;
