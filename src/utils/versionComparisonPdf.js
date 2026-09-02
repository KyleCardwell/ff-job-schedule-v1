const formatCurrency = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "Unable to price";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
};

const formatDifference = (value, isActive) => {
  if (isActive) return "-";
  if (value == null || !Number.isFinite(Number(value))) return "Unable to price";

  const prefix = Number(value) > 0 ? "+" : "";
  return `${prefix}${formatCurrency(value)}`;
};

export const buildVersionComparisonPdfDefinition = ({
  estimate,
  rooms,
  currentProjectTotal,
}) => {
  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = [
    {
      columns: [
        {
          stack: [
            { text: "Version Price Comparison", style: "title" },
            {
              text: estimate?.est_project_name || "Untitled Estimate",
              style: "projectName",
            },
            estimate?.est_client_name
              ? { text: estimate.est_client_name, style: "clientName" }
              : null,
          ].filter(Boolean),
        },
        {
          width: 190,
          stack: [
            { text: `Generated ${generatedOn}`, alignment: "right" },
            {
              text: "Prices use current estimate and catalog rates.",
              alignment: "right",
              color: "#64748b",
              margin: [0, 4, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 18],
    },
    {
      table: {
        widths: ["*", "*", "*"],
        body: [
          [
            { text: "Current rooms total", style: "summaryLabel" },
            { text: "Rooms", style: "summaryLabel" },
            { text: "Versioned sections", style: "summaryLabel" },
          ],
          [
            { text: formatCurrency(currentProjectTotal), style: "summaryValue" },
            { text: String(rooms.length), style: "summaryValue" },
            {
              text: String(
                rooms.reduce(
                  (count, room) =>
                    count +
                    room.sections.filter((section) => section.versions.length > 1)
                      .length,
                  0,
                ),
              ),
              style: "summaryValue",
            },
          ],
        ],
      },
      layout: {
        fillColor: (rowIndex) => (rowIndex === 0 ? "#e2e8f0" : "#f8fafc"),
        hLineColor: () => "#cbd5e1",
        vLineColor: () => "#cbd5e1",
      },
      margin: [0, 0, 0, 18],
    },
  ];

  rooms.forEach((room) => {
    const tableBody = [
      [
        { text: "Section", style: "tableHeader" },
        { text: "Version", style: "tableHeader", alignment: "center" },
        { text: "Status", style: "tableHeader", alignment: "center" },
        { text: "Extended total", style: "tableHeader", alignment: "right" },
        { text: "Change", style: "tableHeader", alignment: "right" },
        { text: "Room if selected", style: "tableHeader", alignment: "right" },
        { text: "Project if selected", style: "tableHeader", alignment: "right" },
      ],
    ];

    room.sections.forEach((section) => {
      section.versions.forEach((version, versionIndex) => {
        tableBody.push([
          versionIndex === 0
            ? {
                text: section.sectionName,
                rowSpan: section.versions.length,
              }
            : {},
          { text: `v${version.revision}`, alignment: "center" },
          {
            text: version.isActive ? "Active" : "Alternative",
            alignment: "center",
            color: version.isActive ? "#0f766e" : "#475569",
            bold: version.isActive,
          },
          { text: formatCurrency(version.totalPrice), alignment: "right" },
          {
            text: formatDifference(
              version.differenceFromActive,
              version.isActive,
            ),
            alignment: "right",
            color:
              version.differenceFromActive > 0
                ? "#b91c1c"
                : version.differenceFromActive < 0
                  ? "#047857"
                  : "#475569",
          },
          {
            text: formatCurrency(version.roomTotalIfSelected),
            alignment: "right",
          },
          {
            text: formatCurrency(version.projectTotalIfSelected),
            alignment: "right",
          },
        ]);
      });
    });

    content.push({
      unbreakable: tableBody.length <= 9,
      stack: [
        {
          table: {
            widths: ["*", "auto"],
            body: [
              [
                {
                  text: room.taskName,
                  style: "roomTitle",
                  fillColor: "#1e293b",
                  margin: [5, 3, 5, 3],
                },
                {
                  text: `Qty ${room.taskQuantity}  |  Current ${formatCurrency(room.activeRoomTotal)}`,
                  alignment: "right",
                  color: "#cbd5e1",
                  fillColor: "#1e293b",
                  margin: [5, 3, 5, 3],
                },
              ],
            ],
          },
          layout: "noBorders",
        },
        {
          table: {
            headerRows: 1,
            widths: [95, 38, 55, 78, 66, 88, 88],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#e2e8f0" : null),
            hLineColor: () => "#cbd5e1",
            vLineColor: () => "#e2e8f0",
          },
        },
      ],
      margin: [0, 0, 0, 16],
    });
  });

  if (rooms.length === 0) {
    content.push({
      text: "No rooms match the selected filter.",
      alignment: "center",
      color: "#64748b",
      margin: [0, 30, 0, 0],
    });
  }

  return {
    pageOrientation: "landscape",
    pageSize: "LETTER",
    pageMargins: [32, 36, 32, 42],
    defaultStyle: {
      font: "Roboto",
      fontSize: 8,
      color: "#1e293b",
    },
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: "Version comparison - additional line items are excluded",
          color: "#64748b",
          margin: [32, 12, 0, 0],
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "right",
          color: "#64748b",
          margin: [0, 12, 32, 0],
        },
      ],
    }),
    styles: {
      title: { fontSize: 20, bold: true, color: "#0f172a" },
      projectName: { fontSize: 13, bold: true, margin: [0, 4, 0, 0] },
      clientName: { fontSize: 9, color: "#64748b", margin: [0, 2, 0, 0] },
      summaryLabel: { fontSize: 8, bold: true, color: "#475569" },
      summaryValue: { fontSize: 13, bold: true, color: "#0f172a" },
      roomTitle: { fontSize: 11, bold: true, color: "#ffffff" },
      tableHeader: { fontSize: 7, bold: true, color: "#334155" },
    },
  };
};
