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
      // Build section rows with intelligent pagination - one table per page
      const maxRowsPerPage = 23; // Reduced to account for column headers in page header

      const createBlankRow = () => [
        { text: " ", border: [true, false, true, false] },
        { text: " ", border: [true, false, true, false] },
        { text: " ", border: [true, false, true, false], colSpan: 2 },
        {},
        { text: " ", border: [true, false, true, false], colSpan: 2 },
        {},
      ];

      // First, build all section row groups
      const sectionRowGroups = allSections.map((section) => {
        const rows = [];
        const leftColumn = [];
        const rightColumn = [];

        // Build detail columns
        leftColumn.push(`Style: ${section.cabinetStyle}`);
        leftColumn.push(`Drawer Boxes: ${section.drawerBoxMaterial}`);
        leftColumn.push(`Exterior: ${section.faceMaterial}`);
        leftColumn.push(`Finish: ${section.faceFinish}`);

        rightColumn.push(`Door Style: ${section.doorStyle}`);
        rightColumn.push(`Drawer Front Style: ${section.drawerFrontStyle}`);
        rightColumn.push(`Interior: ${section.boxMaterial}`);
        rightColumn.push(`Finish: ${section.boxFinish}`);

        const maxDetailRows = Math.max(leftColumn.length, rightColumn.length);
        const totalRowsForSection =
          1 + maxDetailRows + (section.notes ? 1 : 0) + 1; // task + details + notes + blank

        // Row 1: Task name with Qty, Cost, Total
        rows.push([
          {
            text: section.quantity.toString(),
            alignment: "center",
            border: [true, false, true, false],
          },
          {
            text: section.displayName || section.taskName,
            bold: true,
            fontSize: 10,
            border: [true, false, true, false],
          },
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

        // Detail rows
        for (let i = 0; i < maxDetailRows; i++) {
          rows.push([
            { text:"", border: [true, false, true, false] },
            {
              columns: [
                { text: leftColumn[i] || "", width: "*", fontSize: 9 },
                { text: rightColumn[i] || "", width: "*", fontSize: 9 },
              ],
              border: [true, false, true, false],
            },
            { text:"", colSpan: 2, border: [true, false, true, false] },
            {},
            { text:"", colSpan: 2, border: [true, false, true, false] },
            {},
          ]);
        }

        // Notes row
        if (section.notes) {
          rows.push([
            { text:"", border: [true, false, true, false] },
            {
              text: `Notes: ${section.notes}`,
              italics: true,
              fontSize: 9,
              border: [true, false, true, false],
            },
            { text:"", colSpan: 2, border: [true, false, true, false] },
            {},
            { text:"", colSpan: 2, border: [true, false, true, false] },
            {},
          ]);
        }

        // Blank separator row
        rows.push([
          { text: "", border: [true, false, true, false] },
          { text: "", border: [true, false, true, false] },
          { text: "", colSpan: 2, border: [true, false, true, false] },
          {},
          { text: "", colSpan: 2, border: [true, false, true, false] },
          {},
        ]);

        return { rows, rowCount: totalRowsForSection };
      });

      // Create one table per section + filler tables to manage pagination
      const tables = [];
      let currentPageRows = 0;

      sectionRowGroups.forEach((sectionGroup) => {
        const sectionRowCount = sectionGroup.rowCount; // No header in table anymore
        
        // Check if this section fits on current page
        if (currentPageRows > 0 && currentPageRows + sectionRowCount > maxRowsPerPage) {
          // Need to start a new page - add filler table for remaining space
          const blankRowsNeeded = maxRowsPerPage - currentPageRows;
          if (blankRowsNeeded > 0) {
            const fillerBody = [];
            for (let i = 0; i < blankRowsNeeded; i++) {
              fillerBody.push(createBlankRow());
            }
            tables.push({
              tableBody: fillerBody,
              pageBreak: "after",
            });
          }
          currentPageRows = 0;
        }

        // Create table for this section (no header row)
        tables.push({
          tableBody: sectionGroup.rows,
          pageBreak: undefined,
        });
        
        currentPageRows += sectionRowCount;
      });

      // Fill remaining space on last page if needed
      const finalBlankRowsNeeded = maxRowsPerPage - currentPageRows;
      if (finalBlankRowsNeeded > 0) {
        const fillerBody = [];
        for (let i = 0; i < finalBlankRowsNeeded; i++) {
          fillerBody.push(createBlankRow());
        }
        tables.push({
          tableBody: fillerBody,
          pageBreak: undefined,
        });
      }

      // Build PDF content - one table per section + filler tables
      const content = tables.map((tableObj) => ({
        table: {
          widths: [25, "*", 30, 20, 30, 20],
          body: tableObj.tableBody,
        },
        layout: {
        //   hLineWidth: () => 1,
          vLineWidth: () => 1,
        //   hLineColor: () => "#000",
          vLineColor: () => "#000",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        pageBreak: tableObj.pageBreak,
        margin: [0, 0, 0, 0], // No vertical margins to eliminate gaps
      }));

      // PDF document definition
      const docDefinition = {
        pageSize: "LETTER",
        pageMargins: [30, 160, 30, 70], // top margin increased for header with column headers, bottom for footer
        content: content,
        // Header function for each page
        header: (currentPage, pageCount) => {
          return {
            stack: [
              // Logo and Estimate title/date
              {
                columns: [
                  {
                    text: "[LOGO]",
                    width: 100,
                    alignment: "left",
                    fontSize: 10,
                    color: "#999",
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
                  },
                ],
                margin: [30, 20, 30, 10],
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
                margin: [30, 0, 30, 10],
              },
              // Column headers table
              {
                table: {
                  widths: [25, "*", 30, 20, 30, 20],
                  body: [
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
                      },
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
                  ],
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
                margin: [30, 0, 30, 0], // No bottom margin to connect to first table
              },
            ],
          };
        },
        // Footer function for each page
        footer: (currentPage, pageCount) => {
          return {
            stack: [
              // Deposit and Total row with border (using table for border support)
              {
                table: {
                  widths: ["*", "auto", 100],
                  body: [
                    [
                      {
                        text: "50% deposit required",
                        alignment: "left",
                        bold: true,
                        fontSize: 12,
                        border: [true, true, false, true],
                      },
                      {
                        text: "Total",
                        alignment: "right",
                        bold: true,
                        fontSize: 12,
                        border: [false, true, false, true],
                      },
                      {
                        text: formatCurrency(grandTotal),
                        alignment: "right",
                        bold: true,
                        fontSize: 14,
                        border: [false, true, true, true],
                      },
                    ],
                  ],
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
                margin: [30, 0, 30, 8], // No top margin to connect to last table
              },
              // Page number and guarantee date row
              {
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
                    text: `Pricing guaranteed until ${formatDate(
                      guaranteeDate
                    )}`,
                    alignment: "right",
                    width: "*",
                    fontSize: 9,
                  },
                ],
                margin: [30, 0, 30, 10],
              },
            ],
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
