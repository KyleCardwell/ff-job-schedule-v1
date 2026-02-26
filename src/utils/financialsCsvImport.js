const normalizeCsvHeader = (value) =>
  value?.toString?.().trim?.().toLowerCase?.().replace(/\s+/g, "_") || "";

export const normalizeSectionName = (value) =>
  value?.toLowerCase?.().trim?.() || "";

const parseCsvNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
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

const getCsvNumericValue = (row, keys = []) => {
  for (const key of keys) {
    const parsed = parseCsvNumber(row?.[key]);
    if (parsed !== null) return parsed;
  }
  return null;
};

const CSV_HOURS_BY_SERVICE_ID = {
  2: { hoursKey: "shop_hours", rateKey: "shop_rate" },
  3: { hoursKey: "finish_hours", rateKey: "finish_rate" },
  4: { hoursKey: "install_hours", rateKey: "install_rate" },
  5: { hoursKey: "cnc_hours", rateKey: "cnc_rate" },
};

export const CSV_PREVIEW_COLUMNS = [
  { key: "task_name", label: "Room" },
  { key: "shop_hours", label: "Shop Hrs" },
  { key: "finish_hours", label: "Finish Hrs" },
  { key: "install_hours", label: "Install Hrs" },
  { key: "cnc_hours", label: "CNC Hrs" },
  { key: "cabinets", label: "Cabinets" },
  { key: "doors_dfs", label: "Doors/DFs" },
  { key: "drawer_boxes", label: "Drawers" },
  { key: "hardware", label: "Hardware" },
  { key: "wood", label: "Wood" },
  { key: "other", label: "Other" },
  { key: "profit_percent", label: "Profit %" },
  { key: "commission_percent", label: "Commission %" },
  { key: "discount_percent", label: "Discount %" },
  { key: "quantity", label: "Qty" },
];

const getSectionEstimateFromCsv = (section, row) => {
  const sectionLookup = `${normalizeSectionName(section?.id)} ${normalizeSectionName(section?.sectionName)}`;

  if (sectionLookup.includes("cabinet")) {
    return getCsvNumericValue(row, ["cabinets"]);
  }
  if (sectionLookup.includes("door")) {
    return getCsvNumericValue(row, ["doors_dfs", "doors", "door_dfs"]);
  }
  if (sectionLookup.includes("drawer")) {
    return getCsvNumericValue(row, ["drawer_boxes", "drawers", "drawer_box"]);
  }
  if (sectionLookup.includes("hardware")) {
    return getCsvNumericValue(row, ["hardware"]);
  }
  if (sectionLookup.includes("wood")) {
    return getCsvNumericValue(row, ["wood"]);
  }
  if (sectionLookup.includes("other")) {
    return getCsvNumericValue(row, ["other"]);
  }

  return null;
};

export const formatCsvPreviewValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return value;
};

export const parseCsvRows = (rawRows = []) => {
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

      const hasAnyValue = Object.values(parsedRow).some((value) => {
        if (value === null || value === undefined) return false;
        return value.toString().trim() !== "";
      });

      return {
        ...parsedRow,
        _rowNumber: index + 2,
        _hasAnyValue: hasAnyValue,
      };
    })
    .filter((row) => row._hasAnyValue);
};

export const applyCsvRowToSections = (sections = [], row = {}) =>
  sections.map((section) => {
    if (section.id === "hours") {
      const updatedHoursData = (section.data || []).map((serviceData) => {
        const serviceMapping = CSV_HOURS_BY_SERVICE_ID[Number(serviceData.service_id)];

        if (!serviceMapping) return serviceData;

        const importedHours = getCsvNumericValue(row, [serviceMapping.hoursKey]);
        const importedRate = getCsvNumericValue(row, [serviceMapping.rateKey]);

        return {
          ...serviceData,
          estimate:
            importedHours !== null ? importedHours : (serviceData.estimate ?? 0),
          rateOverride:
            importedRate !== null ? importedRate : serviceData.rateOverride,
        };
      });

      return {
        ...section,
        data: updatedHoursData,
      };
    }

    const importedEstimate = getSectionEstimateFromCsv(section, row);
    if (importedEstimate === null) return section;

    return {
      ...section,
      estimate: importedEstimate,
    };
  });

export const applyCsvRowToAdjustments = (previousAdjustments = {}, row = {}) => {
  const importedProfit = getCsvNumericValue(row, ["profit_percent"]);
  const importedCommission = getCsvNumericValue(row, ["commission_percent"]);
  const importedDiscount = getCsvNumericValue(row, ["discount_percent"]);
  const importedQuantity = getCsvNumericValue(row, ["quantity"]);

  return {
    ...previousAdjustments,
    profit:
      importedProfit !== null ? importedProfit : previousAdjustments.profit,
    commission:
      importedCommission !== null
        ? importedCommission
        : previousAdjustments.commission,
    discount:
      importedDiscount !== null ? importedDiscount : previousAdjustments.discount,
    quantity:
      importedQuantity !== null && importedQuantity > 0
        ? importedQuantity
        : previousAdjustments.quantity,
  };
};
