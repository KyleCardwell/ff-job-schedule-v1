import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";

const DETAIL_FIELDS = [
  ["cabinetStyle", "Cabinet Style"],
  ["woodGrain", "Wood Grain"],
  ["boxMaterial", "Box Material"],
  ["boxFinish", "Box Finish"],
  ["faceMaterial", "Face Material"],
  ["faceFinish", "Face Finish"],
  ["doorStyle", "Door Style"],
  ["doorInsideMolding", "Door Inside Molding"],
  ["doorOutsideMolding", "Door Outside Molding"],
  ["doorPanelModification", "Door Panel Modification"],
  ["doorMaterial", "Door Material"],
  ["doorFinish", "Door Finish"],
  ["doorHinges", "Door Hinges"],
  ["doorPulls", "Door Pulls"],
  ["drawerFrontStyle", "Drawer Front Style"],
  ["drawerInsideMolding", "Drawer Inside Molding"],
  ["drawerOutsideMolding", "Drawer Outside Molding"],
  ["drawerFrontPanelModification", "Drawer Front Panel Modification"],
  ["drawerFrontMaterial", "Drawer Front Material"],
  ["drawerFrontFinish", "Drawer Front Finish"],
  ["drawerBoxMaterial", "Drawer Box Material"],
  ["drawerSlides", "Drawer Slides"],
  ["drawerPulls", "Drawer Pulls"],
];

const normalizeDetail = (value) => String(value || "None").trim() || "None";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const sanitizeFileName = (value) =>
  String(value || "Estimate")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim();

const formatFileDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const groupSectionsByDetails = (sections, selectedSections) => {
  const groups = new Map();

  sections.forEach((section) => {
    const detailValues = section.groupingDetails || section;
    const details = Object.fromEntries(
      DETAIL_FIELDS.map(([field]) => [field, normalizeDetail(detailValues[field])]),
    );
    const key = JSON.stringify(details);

    if (!groups.has(key)) {
      groups.set(key, { details, sections: [] });
    }

    groups.get(key).sections.push({
      name: section.customSectionName
        ? `${section.taskName} - ${section.customSectionName}`
        : section.taskName,
      price: Number(section.totalPriceWithQuantity) || 0,
      included: selectedSections[section.sectionId] === true,
    });
  });

  return Array.from(groups.values());
};

const buildGroupedEstimatePdfDefinition = ({
  estimate,
  sections,
  selectedSections,
  grandTotal,
}) => {
  const groups = groupSectionsByDetails(sections, selectedSections);
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
            { text: "Estimate Style Groups", style: "title" },
            {
              text: estimate.est_project_name || "Untitled Estimate",
              style: "projectName",
            },
            estimate.est_client_name
              ? { text: estimate.est_client_name, style: "clientName" }
              : null,
          ].filter(Boolean),
        },
        {
          width: 180,
          stack: [
            { text: `Generated ${generatedOn}`, alignment: "right" },
            {
              text: `Estimate Total: ${formatCurrency(grandTotal)}`,
              style: "estimateTotal",
              alignment: "right",
              margin: [0, 6, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 18],
    },
  ];

  if (groups.length > 1) {
    content.push({
      text: "Highlighted values differ from Style Group 1, which is used as the baseline.",
      bold: true,
      color: "#92400e",
      fillColor: "#fef3c7",
      margin: [6, 5, 6, 12],
    });
  }

  groups.forEach((group, index) => {
    const detailRows = [];
    const baselineDetails = groups[0]?.details || {};
    const buildDetailValueCell = (field) => {
      const isDifferent =
        index > 0 && group.details[field] !== baselineDetails[field];

      return {
        text: group.details[field],
        style: "detailValue",
        ...(isDifferent
          ? { bold: true, color: "#92400e", fillColor: "#fef3c7" }
          : {}),
      };
    };

    for (let fieldIndex = 0; fieldIndex < DETAIL_FIELDS.length; fieldIndex += 2) {
      const [leftField, leftLabel] = DETAIL_FIELDS[fieldIndex];
      const rightDetail = DETAIL_FIELDS[fieldIndex + 1];
      detailRows.push([
        { text: leftLabel, style: "detailLabel" },
        buildDetailValueCell(leftField),
        rightDetail
          ? { text: rightDetail[1], style: "detailLabel" }
          : { text: "", style: "detailLabel" },
        rightDetail
          ? buildDetailValueCell(rightDetail[0])
          : { text: "", style: "detailValue" },
      ]);
    }

    const sectionRows = [
      [
        { text: "Room / Section", style: "tableHeader" },
        { text: "Section Price", style: "tableHeader", alignment: "right" },
        {
          text: "Included in Estimate Total",
          style: "tableHeader",
          alignment: "center",
        },
      ],
      ...group.sections.map((section) => [
        { text: section.name || "Unnamed Room" },
        { text: formatCurrency(section.price), alignment: "right" },
        {
          text: section.included ? "Yes" : "No",
          alignment: "center",
          bold: true,
          color: section.included ? "#047857" : "#b91c1c",
        },
      ]),
    ];

    content.push({
      stack: [
        {
          text: `Style Group ${index + 1}${index === 0 ? " (Baseline)" : ""}`,
          style: "groupTitle",
        },
        {
          table: {
            widths: [78, "*", 88, "*"],
            body: detailRows,
          },
          layout: {
            fillColor: (rowIndex, node, columnIndex) =>
              columnIndex === 0 || columnIndex === 2 ? "#e2e8f0" : "#f8fafc",
            hLineColor: () => "#cbd5e1",
            vLineColor: () => "#cbd5e1",
          },
          margin: [0, 0, 0, 8],
        },
        {
          table: {
            headerRows: 1,
            widths: ["*", 90, 100],
            body: sectionRows,
            dontBreakRows: true,
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#dbeafe" : null),
            hLineColor: () => "#cbd5e1",
            vLineColor: () => "#e2e8f0",
          },
        },
      ],
      unbreakable: group.sections.length <= 6,
      margin: [0, 0, 0, 18],
    });
  });

  return {
    pageSize: "LETTER",
    pageMargins: [36, 36, 36, 44],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: "#1e293b",
    },
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: `Estimate Total: ${formatCurrency(grandTotal)}`,
          bold: true,
          margin: [36, 12, 0, 0],
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "right",
          color: "#64748b",
          margin: [0, 12, 36, 0],
        },
      ],
    }),
    styles: {
      title: { fontSize: 20, bold: true, color: "#0f172a" },
      projectName: { fontSize: 13, bold: true, margin: [0, 4, 0, 0] },
      clientName: { fontSize: 9, color: "#64748b", margin: [0, 2, 0, 0] },
      estimateTotal: { fontSize: 12, bold: true, color: "#0f766e" },
      groupTitle: {
        fontSize: 11,
        bold: true,
        color: "#ffffff",
        fillColor: "#1e293b",
        margin: [6, 4, 6, 4],
      },
      detailLabel: { fontSize: 8, bold: true, color: "#475569" },
      detailValue: { fontSize: 8, color: "#0f172a" },
      tableHeader: { fontSize: 8, bold: true, color: "#334155" },
    },
  };
};

const GenerateGroupedEstimatePdf = ({
  estimate,
  sections,
  selectedSections,
  grandTotal,
  disabled = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (disabled || isGenerating || !estimate || sections.length === 0) return;

    setIsGenerating(true);

    try {
      const [{ default: pdfMake }, fontsModule] = await Promise.all([
        import("pdfmake/build/pdfmake.js"),
        import("pdfmake/build/vfs_fonts.js"),
      ]);
      pdfMake.vfs = fontsModule.default || fontsModule;

      const definition = buildGroupedEstimatePdfDefinition({
        estimate,
        sections,
        selectedSections,
        grandTotal,
      });
      const pdfDocument = pdfMake.createPdf(definition);
      const fileName = `${sanitizeFileName(estimate.est_project_name)} Style Groups ${formatFileDate()}.pdf`;
      const pdfBlob = await new Promise((resolve, reject) => {
        pdfDocument.getBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Unable to generate grouped estimate PDF."));
        });
      });

      const openPdfInNewTab = () => {
        const blobUrl = window.URL.createObjectURL(pdfBlob);
        const previewTab = window.open(blobUrl, "_blank");

        if (previewTab) {
          previewTab.opener = null;
        } else {
          alert(
            "PDF was saved, but your browser blocked opening it in a new tab. Please allow pop-ups and try again.",
          );
        }

        window.setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 60000);
      };

      if (typeof window.showSaveFilePicker === "function") {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "PDF Document",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });
          const writable = await fileHandle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
          openPdfInNewTab();
          return;
        } catch (saveError) {
          if (saveError?.name === "AbortError") return;
        }
      }

      pdfDocument.download(fileName);
      openPdfInNewTab();
    } catch {
      alert("There was an error generating the grouped PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={disabled || isGenerating}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
    >
      <FiFileText className="w-4 h-4" />
      {isGenerating ? "Generating..." : "Grouped PDF"}
    </button>
  );
};

GenerateGroupedEstimatePdf.propTypes = {
  estimate: PropTypes.object,
  sections: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedSections: PropTypes.object.isRequired,
  grandTotal: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
};

export default GenerateGroupedEstimatePdf;
