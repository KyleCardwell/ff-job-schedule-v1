import PropTypes from "prop-types";
import { useState, useMemo } from "react";
import { useCSVReader } from "react-papaparse";
import { v4 as uuidv4 } from "uuid";

import {
  buttonClass,
  modalContainerClass,
  modalOverlayClass,
} from "../../assets/tailwindConstants";

/**
 * Normalise a string for fuzzy comparison: lowercase, trim, collapse whitespace.
 */
const norm = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");

/**
 * Try to match a CSV row (first + last name) against the employees list.
 *
 * Matching priority:
 *   1. "first last" === employee_name
 *   2. last name only === employee_name  (handles single-name employees like "Geurtsen")
 *   3. first name only === employee_name (handles single-name employees like "Nick")
 */
const matchEmployee = (firstName, lastName, employees) => {
  const fullName = norm(`${firstName} ${lastName}`);
  const first = norm(firstName);
  const last = norm(lastName);

  // Exact full-name match
  let match = employees.find((e) => norm(e.employee_name) === fullName);
  if (match) return match;

  // Last-name only match
  if (last) {
    match = employees.find((e) => norm(e.employee_name) === last);
    if (match) return match;
  }

  // First-name only match
  if (first) {
    match = employees.find((e) => norm(e.employee_name) === first);
    if (match) return match;
  }

  return null;
};

/**
 * Parse the busybusy employee-activity CSV into preview rows.
 * Each CSV person may produce up to 2 rows: Regular Time + Overtime.
 */
const timeToDecimal = (value) => {
  if (!value) return 0;
  const str = value.toString().trim();
  if (!str) return 0;

  if (str.includes(":")) {
    const [hoursPart, minutesPart] = str.split(":");
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return Number((hours + minutes / 60).toFixed(2));
    }
  }

  const parsed = Number(str);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const parseHoursCsv = (rawRows, employees) => {
  if (!Array.isArray(rawRows) || rawRows.length < 2) return [];

  const headers = (rawRows[0] || []).map((h) =>
    h?.toString().trim().toLowerCase().replace(/\s+/g, "_")
  );

  const rows = [];

  rawRows.slice(1).forEach((rawRow) => {
    const values = Array.isArray(rawRow) ? rawRow : [];
    const obj = headers.reduce((acc, header, i) => {
      acc[header] = typeof values[i] === "string" ? values[i].trim() : values[i];
      return acc;
    }, {});

    // Skip empty rows
    const hasValue = Object.values(obj).some(
      (v) => v !== null && v !== undefined && v.toString().trim() !== ""
    );
    if (!hasValue) return;

    const firstName = obj["first_name"] || "";
    const lastName = obj["last_name"] || "";
    const regularDisplay = obj["regular_time"] || "";
    const overtimeDisplay = obj["overtime"] || "";
    const regularDecimal =
      parseFloat(
        obj["regular_time_(decimal)"] || obj["regular_time_decimal"] || 0
      ) || timeToDecimal(regularDisplay);
    const overtimeDecimal =
      parseFloat(obj["overtime_(decimal)"] || obj["overtime_decimal"] || 0) ||
      timeToDecimal(overtimeDisplay);

    const employee = matchEmployee(firstName, lastName, employees);

    // Regular time row
    if (regularDecimal > 0) {
      rows.push({
        _id: uuidv4(),
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        hoursDisplay: regularDisplay || regularDecimal.toString(),
        hoursDecimal: regularDecimal,
        isOvertime: false,
        label: "Regular Time",
        selectedEmployeeId: employee?.employee_id
          ? employee.employee_id.toString()
          : "",
        included: true,
      });
    }

    // Overtime row
    if (overtimeDecimal > 0) {
      rows.push({
        _id: uuidv4(),
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        hoursDisplay: overtimeDisplay || overtimeDecimal.toString(),
        hoursDecimal: overtimeDecimal,
        isOvertime: true,
        label: "Overtime",
        selectedEmployeeId: employee?.employee_id
          ? employee.employee_id.toString()
          : "",
        included: true,
      });
    }
  });

  return rows;
};

const HoursCsvModal = ({ isOpen, onClose, employees, services, onConfirm }) => {
  const { CSVReader } = useCSVReader();
  const [previewRows, setPreviewRows] = useState([]);
  const [csvError, setCsvError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.employee_id.toString(), employee])),
    [employees]
  );
  const servicesByTeamServiceId = useMemo(
    () => new Map(services.map((service) => [service.team_service_id, service])),
    [services]
  );

  const handleFileLoad = ({ data }, file) => {
    const rows = parseHoursCsv(data, employees);
    if (rows.length === 0) {
      setCsvError("No valid rows found in CSV.");
      setPreviewRows([]);
      return;
    }
    setCsvError(null);
    setPreviewRows(rows);
    setUploadedFileName(file?.name || "");
  };

  const handleToggleInclude = (id) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, included: !r.included } : r))
    );
  };

  const handleEmployeeChange = (id, employeeId) => {
    setPreviewRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        return { ...r, selectedEmployeeId: employeeId || "" };
      })
    );
  };

  const includedRows = useMemo(
    () => previewRows.filter((r) => r.included),
    [previewRows]
  );

  const hasUnassigned = useMemo(
    () => includedRows.some((r) => !r.selectedEmployeeId),
    [includedRows]
  );

  const handleConfirm = () => {
    if (hasUnassigned) return;
    onConfirm(includedRows);
    onClose();
  };

  const handleClearCsv = () => {
    setPreviewRows([]);
    setCsvError(null);
    setUploadedFileName("");
  };

  if (!isOpen) return null;

  return (
    <div className={`${modalOverlayClass} z-[130]`}>
      <div className={`max-w-5xl ${modalContainerClass}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Import Hours CSV
              </h3>
              <p className="text-sm text-gray-600">
                Upload a Busybusy Employee Activity Report to auto-assign hours
                to services.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearCsv}
              disabled={previewRows.length === 0}
              className={`px-3 py-2 text-sm font-medium border rounded-md ${
                previewRows.length === 0
                  ? "text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
                  : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              Clear CSV
            </button>
          </div>

          {/* Upload button */}
          {previewRows.length === 0 && (
            <div className="mb-4">
              <CSVReader onUploadAccepted={handleFileLoad}>
                {({ getRootProps }) => (
                  <button
                    type="button"
                    {...getRootProps()}
                    className={`${buttonClass} bg-blue-500 hover:bg-blue-700`}
                  >
                    Choose CSV File
                  </button>
                )}
              </CSVReader>
            </div>
          )}

          {csvError && (
            <div className="text-sm text-red-600 mb-4">{csvError}</div>
          )}

          {uploadedFileName && previewRows.length > 0 && (
            <div className="text-xs text-gray-500 mb-2">
              File: {uploadedFileName}
            </div>
          )}

          {/* Preview table */}
          {previewRows.length > 0 && (
            <>
              <div className="border border-gray-200 rounded-md overflow-auto max-h-[55vh]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">
                        Include
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">
                        Type
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">
                        Hours
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">
                        Matched Employee
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">
                        Service
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const unassigned = row.included && !row.selectedEmployeeId;
                      const selectedEmployee = row.selectedEmployeeId
                        ? employeesById.get(row.selectedEmployeeId)
                        : null;
                      const selectedService = selectedEmployee
                        ? servicesByTeamServiceId.get(selectedEmployee.team_service_id)
                        : null;
                      return (
                        <tr
                          key={row._id}
                          className={`${
                            !row.included
                              ? "bg-gray-100 opacity-60"
                              : unassigned
                              ? "bg-red-50"
                              : "bg-white"
                          } hover:bg-gray-50`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={row.included}
                              onChange={() => handleToggleInclude(row._id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.displayName}
                          </td>
                          <td
                            className={`px-3 py-2 whitespace-nowrap ${
                              row.isOvertime
                                ? "text-orange-600 font-medium"
                                : ""
                            }`}
                          >
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {row.hoursDisplay}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.selectedEmployeeId || ""}
                              onChange={(e) =>
                                handleEmployeeChange(row._id, e.target.value)
                              }
                              className={`px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                unassigned
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-300"
                              }`}
                            >
                              <option value="">Select employee...</option>
                              {employees.map((employee) => (
                                <option
                                  key={employee.employee_id}
                                  value={employee.employee_id}
                                >
                                  {employee.employee_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td
                            className={`px-3 py-2 whitespace-nowrap ${
                              selectedService ? "text-gray-800" : "text-red-600"
                            }`}
                          >
                            {selectedService?.service_name || "Unassigned"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {includedRows.length} of {previewRows.length} rows selected
                  {hasUnassigned && (
                    <span className="text-red-600 ml-2">
                      — assign all included rows to a service before confirming
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={includedRows.length === 0 || hasUnassigned}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                      includedRows.length === 0 || hasUnassigned
                        ? "bg-blue-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

HoursCsvModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  employees: PropTypes.array.isRequired,
  services: PropTypes.array.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default HoursCsvModal;
