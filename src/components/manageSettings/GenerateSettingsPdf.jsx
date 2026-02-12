import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";

/**
 * Generic PDF generator for settings pages.
 *
 * Props:
 *   title       - PDF header title (e.g. "Materials Settings")
 *   fileName    - Base file name (date is appended automatically)
 *   sections    - Array of { label, columns, items }
 *     label   - Section heading in the PDF
 *     columns - Array of { field, label, format? }
 *               format is an optional function (value, item) => string
 *     items   - Array of data objects (items with markedForDeletion are skipped)
 *   orientation - "portrait" | "landscape" | "auto" (default "auto" picks based on column count)
 */
const GenerateSettingsPdf = ({
  title,
  fileName,
  sections,
  orientation = "auto",
  disabled = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const hasData =
    sections &&
    sections.length > 0 &&
    sections.some((s) => s.items && s.items.length > 0);

  const generatePdf = async () => {
    if (isGenerating || !hasData) return;

    setIsGenerating(true);

    try {
      // Load pdfMake from CDN
      if (!window.pdfMake) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const content = [
        {
          text: title,
          style: "header",
          margin: [0, 0, 0, 15],
        },
      ];

      // Track max column count for orientation decision
      let maxColumns = 0;

      sections.forEach((section) => {
        const activeItems = (section.items || []).filter(
          (item) => !item.markedForDeletion
        );

        if (activeItems.length === 0) return;

        const columns = section.columns || [];
        if (columns.length > maxColumns) maxColumns = columns.length;

        // Section header
        content.push({
          text: section.label,
          style: "sectionHeader",
          margin: [0, 15, 0, 8],
        });

        // Build column widths
        const columnWidths = columns.map((col) =>
          col.width || "*"
        );

        // Build table header row
        const headerRow = columns.map((col) => ({
          text: col.label,
          style: "tableHeader",
          alignment: "center",
        }));

        // Build data rows
        const tableBody = [headerRow];

        activeItems.forEach((item) => {
          const row = columns.map((col) => {
            let value = item[col.field];

            // Apply custom format function if provided
            if (col.format) {
              value = col.format(value, item);
            }

            // Handle booleans
            if (typeof value === "boolean") {
              value = value ? "Yes" : "No";
            }

            // Handle arrays
            if (Array.isArray(value)) {
              value = value.join(", ");
            }

            // Handle null/undefined
            if (value === null || value === undefined) {
              value = "-";
            }

            return {
              text: String(value),
              alignment: col.alignment || "center",
              fontSize: col.fontSize || 9,
            };
          });

          tableBody.push(row);
        });

        content.push({
          table: {
            headerRows: 1,
            widths: columnWidths,
            body: tableBody,
            dontBreakRows: true,
          },
          layout: {
            hLineWidth: (i, node) =>
              i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => "#cccccc",
            vLineColor: () => "#cccccc",
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
            fillColor: (i) => (i === 0 ? "#f0f0f0" : null),
          },
          margin: [0, 0, 0, 2],
        });
      });

      // Determine orientation
      let pageOrientation;
      if (orientation === "auto") {
        pageOrientation = maxColumns > 5 ? "landscape" : "portrait";
      } else {
        pageOrientation = orientation;
      }

      const docDefinition = {
        pageSize: "LETTER",
        pageOrientation,
        pageMargins: [30, 30, 30, 40],
        content,
        footer: (currentPage, pageCount) => ({
          columns: [
            {
              text: `Generated: ${today}`,
              alignment: "left",
              fontSize: 9,
              color: "#666",
            },
            {
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: "right",
              fontSize: 9,
              color: "#666",
            },
          ],
          margin: [30, 10, 30, 0],
        }),
        styles: {
          header: {
            fontSize: 16,
            bold: true,
          },
          sectionHeader: {
            fontSize: 13,
            bold: true,
            color: "#333333",
          },
          tableHeader: {
            bold: true,
            fontSize: 8,
            fillColor: "#f0f0f0",
          },
        },
        defaultStyle: {
          fontSize: 9,
        },
      };

      const formatDateShort = (date) => {
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        const yyyy = date.getFullYear();
        return `${mm}-${dd}-${yyyy}`;
      };

      const pdfFileName = `${fileName} ${formatDateShort(new Date())}.pdf`;
      window.pdfMake.createPdf(docDefinition).download(pdfFileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("There was an error generating the PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePdf}
      disabled={isGenerating || !hasData || disabled}
      className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
      title={`Generate PDF of ${title.toLowerCase()}`}
    >
      <FiFileText size={18} />
      {isGenerating ? "Generating..." : "Generate PDF"}
    </button>
  );
};

GenerateSettingsPdf.propTypes = {
  title: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      columns: PropTypes.arrayOf(
        PropTypes.shape({
          field: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
          format: PropTypes.func,
          width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          alignment: PropTypes.string,
          fontSize: PropTypes.number,
        })
      ).isRequired,
      items: PropTypes.array.isRequired,
    })
  ).isRequired,
  orientation: PropTypes.oneOf(["portrait", "landscape", "auto"]),
  disabled: PropTypes.bool,
};

export default GenerateSettingsPdf;
