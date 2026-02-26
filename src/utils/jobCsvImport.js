const normalizeCsvHeader = (value) =>
  value?.toString?.().trim?.().toLowerCase?.().replace(/\s+/g, "_") || "";

const isBlank = (value) => {
  if (value === null || value === undefined) return true;
  return value.toString().trim() === "";
};

const getFirstNonBlankValue = (row, keys = [], fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (!isBlank(value)) {
      return value;
    }
  }

  return fallback;
};

const parseCsvNumber = (value) => {
  if (isBlank(value)) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const sanitized = value
    .toString()
    .replace(/[$,%\s]/g, "")
    .replace(/,/g, "");

  if (!sanitized) return null;

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseJobCsvRows = (rawRows = []) => {
  if (!Array.isArray(rawRows) || rawRows.length < 2) return [];

  const headers = (rawRows[0] || []).map(
    (header, index) => normalizeCsvHeader(header) || `column_${index}`,
  );

  return rawRows
    .slice(1)
    .map((row, index) => {
      const rowValues = Array.isArray(row) ? row : [];
      const parsedRow = headers.reduce((acc, header, headerIndex) => {
        const value = rowValues[headerIndex];
        acc[header] = typeof value === "string" ? value.trim() : value;
        return acc;
      }, {});

      const normalizedProjectName = getFirstNonBlankValue(parsedRow, [
        "project_name",
        "projecet_name",
        "project",
        "job_name",
      ]);

      const normalizedRow = {
        ...parsedRow,
        project_name: normalizedProjectName,
      };

      const hasAnyValue = Object.values(normalizedRow).some(
        (value) => !isBlank(value),
      );

      return {
        ...normalizedRow,
        _rowNumber: index + 2,
        _hasAnyValue: hasAnyValue,
      };
    })
    .filter((row) => row._hasAnyValue);
};

export const getJobCsvText = (row, keys = [], fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (!isBlank(value)) {
      return value.toString().trim();
    }
  }
  return fallback;
};

export const getJobCsvNumber = (row, keys = [], fallback = null) => {
  for (const key of keys) {
    const parsed = parseCsvNumber(row?.[key]);
    if (parsed !== null) return parsed;
  }
  return fallback;
};

export const JOB_CSV_PREVIEW_COLUMNS = [
  { key: "task_name", label: "Room" },
  { key: "employee_name", label: "Employee" },
  { key: "start_date", label: "Start Date" },
  { key: "duration", label: "Hours" },
  { key: "task_number", label: "Task #" },
  { key: "project_name", label: "Project" },
];

export const formatJobCsvPreviewValue = (value) => {
  if (isBlank(value)) return "-";
  return value;
};
