import PropTypes from "prop-types";

import {
  modalContainerClass,
  modalOverlayClass,
} from "../assets/tailwindConstants";
import {
  formatJobCsvPreviewValue,
  JOB_CSV_PREVIEW_COLUMNS,
} from "../utils/jobCsvImport";

const JobCsvTaskSelectorModal = ({
  isOpen,
  csvRows,
  selectedRowIndexes,
  onToggleRow,
  onToggleAllRows,
  onClose,
  onImportSelected,
}) => {
  if (!isOpen) return null;

  const allSelected =
    csvRows.length > 0 && selectedRowIndexes.size === csvRows.length;

  return (
    <div className={`${modalOverlayClass} z-[130]`}>
      <div className={`max-w-6xl ${modalContainerClass}`}>
        <div className="p-6">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Select Rooms to Import
              </h3>
              <p className="text-sm text-gray-600">
                Choose which CSV rows to add as rooms/tasks.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          <div className="mb-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onToggleAllRows(event.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              Select all rows
            </label>
          </div>

          <div className="border border-gray-200 rounded-md overflow-auto max-h-[55vh]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Use
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    CSV Row
                  </th>
                  {JOB_CSV_PREVIEW_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.map((row, index) => {
                  const isSelected = selectedRowIndexes.has(index);

                  return (
                    <tr
                      key={`csv-row-${row._rowNumber}-${index}`}
                      className={`${isSelected ? "bg-blue-50" : "bg-white"} hover:bg-gray-50 cursor-pointer`}
                      onClick={() => onToggleRow(index)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => onToggleRow(index)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-600">{row._rowNumber}</td>
                      {JOB_CSV_PREVIEW_COLUMNS.map((column) => (
                        <td
                          key={`${column.key}-${row._rowNumber}-${index}`}
                          className="px-3 py-2 whitespace-nowrap"
                        >
                          {formatJobCsvPreviewValue(row[column.key])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onImportSelected}
              disabled={selectedRowIndexes.size === 0}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                selectedRowIndexes.size === 0
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Import Selected Rows
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

JobCsvTaskSelectorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  csvRows: PropTypes.array.isRequired,
  selectedRowIndexes: PropTypes.instanceOf(Set).isRequired,
  onToggleRow: PropTypes.func.isRequired,
  onToggleAllRows: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onImportSelected: PropTypes.func.isRequired,
};

export default JobCsvTaskSelectorModal;
