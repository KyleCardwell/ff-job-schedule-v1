import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";

/**
 * Component that generates a PDF estimate with:
 * - Header with logo space, "Estimate" title, date, client name, and project
 * - Table with columns: Qty, Description, Cost, Total
 * - Each row is one section with detailed description
 * - Footer with deposit text, total, page numbers, and pricing guarantee date
 */
const GenerateEstimatePdf = ({
  estimate,
  allSections,
  grandTotal,
  disabled,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (!estimate || !allSections || allSections.length === 0 || isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      // Load pdfMake from CDN
      if (!window.pdfMake) {
        // Load pdfMake script
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // Load fonts
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Calculate dates
      const today = new Date();
      const guaranteeDate = new Date(today);
      guaranteeDate.setDate(guaranteeDate.getDate() + 30);

      const formatDate = (date) => {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      const formatCurrency = (value) => {
        return `$${value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

    //   const grandTotalText = "Total:   " + formatCurrency(grandTotal);

      // Build table body with sections
      // Table has 6 columns: Qty (1), Description (2), Cost (2), Total (2)
      const tableBody = [
        // Header row
        [
          {
            text: "Qty",
            style: "tableHeader",
            border: [true, true, true, true],
            alignment: "center",
          },
          {
            text: "Description",
            style: "tableHeader",
            border: [true, true, true, true],
            alignment: "center",
            // colSpan: 2,
          },
        //   {},
          {
            text: "Cost",
            style: "tableHeader",
            border: [true, true, true, true],
            alignment: "center",
            colSpan: 2,
          },
          {},
          {
            text: "Total",
            style: "tableHeader",
            border: [true, true, true, true],
            alignment: "center",
            colSpan: 2,
          },
          {},
        ],
      ];

      // Add section rows
      allSections.forEach((section) => {
        // Build description with task name first, then 2-column details, then notes
        const descriptionLines = [
          // First line: Task name (bold)
          { text: section.displayName || section.taskName, bold: true, margin: [0, 0, 0, 3] },
        ];

        // Build 2-column layout for details
        const leftColumn = [];
        const rightColumn = [];

        // Left column
        leftColumn.push(`Style: ${section.cabinetStyle}`);
        leftColumn.push(`Drawer Boxes: ${section.drawerBoxMaterial}`);
        leftColumn.push(`Exterior: ${section.faceMaterial}`);
        leftColumn.push(`Finish: ${section.faceFinish}`);

        // Right column
        if (section.doorStyle) {
          rightColumn.push(`Door Style: ${section.doorStyle}`);
        }
        if (section.drawerFrontStyle) {
          rightColumn.push(`Drawer Front Style: ${section.drawerFrontStyle}`);
        }
        // if (section.faceFinish && section.faceFinish !== "None") {
          rightColumn.push(`Interior: ${section.boxMaterial}`);
        // }
        // if (section.boxFinish && section.boxFinish !== "None") {
          rightColumn.push(`Finish: ${section.boxFinish}`);
        // }

        // Add 2-column layout to description
        descriptionLines.push({
          columns: [
            {
              width: "*",
              stack: leftColumn.map(text => ({ text, fontSize: 9 })),
            },
            {
              width: "*",
              stack: rightColumn.map(text => ({ text, fontSize: 9 })),
            },
          ],
          margin: [0, 0, 0, 3],
        });

        // Add notes at the end if present
        if (section.notes) {
          descriptionLines.push({
            text: `Notes: ${section.notes}`,
            italics: true,
            fontSize: 9,
            margin: [0, 3, 0, 0],
          });
        }

        // Add row to table (6 columns total)
        tableBody.push([
          {
            text: section.quantity.toString(),
            alignment: "center",
            border: [true, false, true, false],
          },
          {
            stack: descriptionLines,
            border: [true, false, true, false],
            // colSpan: 2,
          },
        //   {},
          {
            text: formatCurrency(section.unitPrice),
            alignment: "right",
            border: [true, false, true, false],
            colSpan: 2,
          },
          {},
          {
            text: formatCurrency(section.totalPrice),
            alignment: "right",
            border: [true, false, true, false],
            colSpan: 2,
          },
          {},
        ]);
      });

      // Fill table to consistent height for all pages
      // Letter paper: ~792 points tall, minus margins, header, footer = ~600 points usable
      // Each section row: ~60-80 points with 2-column layout
      // Estimated 10 rows fits well on one page - adjust this value as needed
      const maxRows = 10;
      
      // Add filler rows to reach maxRows
      while (tableBody.length - 1 < maxRows) { // -1 because header row doesn't count
        tableBody.push([
          { text: " ", border: [true, false, true, false] }, // Qty (1)
          { text: " ", border: [true, false, true, false] }, // Description (1)
          { text: " ", border: [true, false, true, false], colSpan: 2 }, // Cost (2)
          {},
          { text: " ", border: [true, false, true, false], colSpan: 2 }, // Total (2)
          {},
        ]);
      }

      // Add footer row with deposit and total (6 columns)
      // Deposit (2), "Total" label (1), grand total (3)
      tableBody.push([
        {
          text: "50% deposit required",
          colSpan: 2,
          alignment: "center",
          bold: true,
          fontSize: 14,
          border: [true, true, false, true],
        },
        {},
        {
          text: "Total",
          bold: true,
          alignment: "left",
          fontSize: 12,
          border: [false, true, false, true],
        },
        {
          text: formatCurrency(grandTotal),
          bold: true,
          fontSize: 12,
          alignment: "right",
          border: [false, true, true, true],
          colSpan: 3,
        },
        {},
        {},
      ]);

      // Build PDF content
      const content = [
        // Header section
        {
          columns: [
            {
              // Logo space - placeholder
              text: "[LOGO]",
              width: 100,
              alignment: "left",
              fontSize: 10,
              color: "#999",
            },
            {
              // Right side: Estimate and Date
              stack: [
                {
                  text: "Estimate",
                  bold: true,
                  fontSize: 16,
                  alignment: "right",
                },
                {
                  text: formatDate(today),
                  fontSize: 10,
                  alignment: "right",
                  margin: [0, 2, 0, 0],
                },
              ],
              width: "*",
            },
          ],
          margin: [0, 0, 0, 15],
        },
        // Client and Project info
        {
          columns: [
            {
              stack: [
                {
                  text: "Client Name",
                  fontSize: 9,
                  color: "#666",
                  margin: [0, 0, 0, 2],
                },
                {
                  text: estimate.client_name || "N/A",
                  fontSize: 11,
                  bold: true,
                },
              ],
              width: "*",
            },
            {
              stack: [
                {
                  text: "Project",
                  fontSize: 9,
                  color: "#666",
                  margin: [0, 0, 0, 2],
                },
                {
                  text: estimate.est_project_name || "N/A",
                  fontSize: 11,
                  bold: true,
                },
              ],
              width: "*",
            },
          ],
          margin: [0, 0, 0, 20],
        },
        // Main table (6 columns)
        {
          table: {
            headerRows: 1,
            widths: [25, "*", 30, 20, 30, 20],
            body: tableBody,
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => "#000",
            vLineColor: () => "#000",
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6,
          },
        },
      ];

      // PDF document definition
      const docDefinition = {
        pageSize: "LETTER",
        pageMargins: [30, 30, 30, 30],
        content: content,
        // Header function for each page
        header: (currentPage, pageCount) => {
          if (currentPage === 1) return null; // First page already has header in content

          return {
            columns: [
              {
                text: "[LOGO]",
                width: 100,
                alignment: "left",
                fontSize: 10,
                color: "#999",
                margin: [40, 20, 0, 0],
              },
              {
                stack: [
                  {
                    text: "Estimate",
                    bold: true,
                    fontSize: 16,
                    alignment: "right",
                  },
                  {
                    text: formatDate(today),
                    fontSize: 10,
                    alignment: "right",
                    margin: [0, 2, 0, 0],
                  },
                ],
                width: "*",
                margin: [0, 20, 40, 0],
              },
            ],
          };
        },
        // Footer function for each page
        footer: (currentPage, pageCount) => {
          return {
            columns: [
              {
                text: "",
                width: "*",
              },
              {
                text: `Page ${currentPage} of ${pageCount}`,
                alignment: "center",
                width: "auto",
                fontSize: 9,
              },
              {
                text: `Pricing guaranteed until ${formatDate(guaranteeDate)}`,
                alignment: "right",
                width: "*",
                fontSize: 9,
              },
            ],
            margin: [40, 10, 40, 0],
          };
        },
        styles: {
          tableHeader: {
            bold: true,
            fontSize: 11,
            fillColor: "#f0f0f0",
          },
        },
        defaultStyle: {
          fontSize: 10,
        },
      };

      // Generate and download PDF
      const fileName = `${estimate.est_project_name || "Estimate"}_${formatDate(
        today
      )
        .replace(/,/g, "")
        .replace(/ /g, "_")}.pdf`;
      window.pdfMake.createPdf(docDefinition).download(fileName);
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
      disabled={
        disabled || isGenerating || !allSections || allSections.length === 0
      }
      className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
    >
      <FiFileText className="w-4 h-4" />
      {isGenerating ? "Generating..." : "Generate PDF"}
    </button>
  );
};

GenerateEstimatePdf.propTypes = {
  estimate: PropTypes.object.isRequired,
  allSections: PropTypes.array.isRequired,
  grandTotal: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
};

export default GenerateEstimatePdf;
