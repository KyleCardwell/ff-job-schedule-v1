import PropTypes from "prop-types";

import {
  modalContainerClass,
  modalOverlayClass,
} from "../../assets/tailwindConstants";
import {
  CSV_PREVIEW_COLUMNS,
  formatCsvPreviewValue,
  normalizeSectionName,
} from "../../utils/financialsCsvImport";

const FinancialsCsvRowSelectorModal = ({
  isOpen,
  csvRows,
  selectedTaskName,
  selectedCsvRowIndex,
  onSelectRow,
  onClose,
  onImportSelectedRow,
}) => {
  if (!isOpen) return null;

  return (
    <div className={`${modalOverlayClass} z-[130]`}>
      <div className={`max-w-6xl ${modalContainerClass}`}>
        <div className="p-6">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Select CSV Row to Import
              </h3>
              <p className="text-sm text-gray-600">
                Choose the room row to import for
                <span className="font-medium"> {selectedTaskName}</span>.
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
                  {CSV_PREVIEW_COLUMNS.map((column) => (
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
                  const isSelected = selectedCsvRowIndex === index;
                  const isTaskMatch =
                    normalizeSectionName(row.task_name) ===
                    normalizeSectionName(selectedTaskName);

                  return (
                    <tr
                      key={`csv-row-${row._rowNumber}-${index}`}
                      className={`${isSelected ? "bg-blue-50" : "bg-white"} ${isTaskMatch ? "border-l-4 border-l-green-500" : ""} hover:bg-gray-50 cursor-pointer`}
                      onClick={() => onSelectRow(index)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="radio"
                          name="csv-row-selection"
                          checked={isSelected}
                          onChange={() => onSelectRow(index)}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-600">{row._rowNumber}</td>
                      {CSV_PREVIEW_COLUMNS.map((column) => (
                        <td
                          key={`${column.key}-${row._rowNumber}-${index}`}
                          className="px-3 py-2 whitespace-nowrap"
                        >
                          {formatCsvPreviewValue(row[column.key])}
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
              onClick={onImportSelectedRow}
              disabled={selectedCsvRowIndex === null}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                selectedCsvRowIndex === null
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Import Selected Row
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

FinancialsCsvRowSelectorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  csvRows: PropTypes.array.isRequired,
  selectedTaskName: PropTypes.string,
  selectedCsvRowIndex: PropTypes.number,
  onSelectRow: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onImportSelectedRow: PropTypes.func.isRequired,
};

export default FinancialsCsvRowSelectorModal;
