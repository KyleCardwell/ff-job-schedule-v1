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

      // Height variables to control header/footer and page margins
      const HEADER_HEIGHT = 178.5; // Fixed height for header table
      const FOOTER_HEIGHT = 80; // Fixed height for footer table
      const PAGE_TOP_MARGIN = HEADER_HEIGHT; // Must match header height
      const PAGE_BOTTOM_MARGIN = FOOTER_HEIGHT; // Must match footer height

      // Calculate column positions for canvas lines
      // Page margins: [30, PAGE_TOP_MARGIN, 30, PAGE_BOTTOM_MARGIN]
      // Letter page width: 612 points
      // Content area: 612 - 30 - 30 = 552 points
      // Column widths: [25, "*", 30, 20, 30, 20]
      // Effective columns: Qty(25), Description(*), Cost(50), Total(50)
      const LEFT_MARGIN = 30.5;
      const CONTENT_WIDTH = 551;
      const QTY_WIDTH = 42;
      const COST_WIDTH = 84; // 30 + 20
      const TOTAL_WIDTH = 84; // 30 + 20
      const DESC_WIDTH = CONTENT_WIDTH - QTY_WIDTH - COST_WIDTH - TOTAL_WIDTH;
      
      // X-coordinates for vertical lines
      const LINE_X = {
        left: LEFT_MARGIN,
        qty: LEFT_MARGIN + QTY_WIDTH,
        cost: LEFT_MARGIN + QTY_WIDTH + DESC_WIDTH,
        total: LEFT_MARGIN + QTY_WIDTH + DESC_WIDTH + COST_WIDTH,
        right: LEFT_MARGIN + CONTENT_WIDTH,
      };

      // Build all section rows - no borders, they'll be drawn via canvas
      const allRows = [];
      
      allSections.forEach((section) => {
        const leftColumn = [];
        const rightColumn = [];

        // Build detail columns
        leftColumn.push(`Style: ${section.cabinetStyle}`);
        leftColumn.push(`Drawer Boxes: ${section.drawerBoxMaterial}`);
        leftColumn.push(`Cabinets: ${section.boxMaterial}`);
        leftColumn.push(`Finish: ${section.boxFinish}`);
        
        rightColumn.push(`Door Style: ${section.doorStyle}`);
        rightColumn.push(`Drawer Front Style: ${section.drawerFrontStyle}`);
        rightColumn.push(`Wood: ${section.faceMaterial}`);
        rightColumn.push(`Finish: ${section.faceFinish}`);

        const maxDetailRows = Math.max(leftColumn.length, rightColumn.length);

        // Build details stack for the description column
        const detailsStack = [];
        for (let i = 0; i < maxDetailRows; i++) {
          detailsStack.push({
            columns: [
              { text: leftColumn[i] || "", width: "*", fontSize: 9 },
              { text: rightColumn[i] || "", width: "*", fontSize: 9 },
            ],
            margin: [5, 0, 0, 0], // Left indent
          });
        }

        // Add notes if present
        if (section.notes) {
          detailsStack.push({
            text: `Notes: ${section.notes}`,
            italics: true,
            fontSize: 9,
            margin: [5, 0, 0, 0], // Left indent with small top margin
          });
        }

        // Single row with all section content - mark for page break avoidance
        allRows.push([
          {
            text: section.quantity.toString(),
            alignment: "center",
            rowSpan: 1,
          },
          {
            stack: [
              {
                text: section.displayName || section.taskName,
                bold: true,
                fontSize: 10,
                margin: [0, 0, 0, 2], // Reduced bottom margin
              },
              ...detailsStack,
            ],
          },
          {
            text: formatCurrency(section.unitPrice),
            alignment: "right",
            colSpan: 2,
          },
          {},
          {
            text: formatCurrency(section.totalPrice),
            alignment: "right",
            colSpan: 2,
          },
          {},
        ]);

        // Blank separator row
        allRows.push([
          { text: " " },
          { text: " " },
          { text: " ", colSpan: 2 },
          {},
          { text: " ", colSpan: 2 },
          {},
        ]);
      });

      // Build PDF content - single table with all rows
      const content = [
        {
          table: {
            widths: [25, "*", 30, 20, 30, 20],
            body: allRows,
            dontBreakRows: true, // Prevent rows from breaking across pages
          },
          layout: {
            hLineWidth: () => 0, // No horizontal lines
            vLineWidth: () => 0, // No vertical lines (drawn via canvas)
            hLineColor: () => "#000",
            vLineColor: () => "#000",
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
      ];

      // PDF document definition
      const docDefinition = {
        pageSize: "LETTER",
        pageMargins: [30, PAGE_TOP_MARGIN, 30, PAGE_BOTTOM_MARGIN], // Margins match header/footer heights
        content: content,
        // Background function to draw vertical lines on every page
        background: (currentPage, pageSize) => {
          // Letter page height: 792 points
          const lineTop = PAGE_TOP_MARGIN;
          const lineBottom = pageSize.height - PAGE_BOTTOM_MARGIN;
          
          return {
            canvas: [
              // Left border
              { type: "line", x1: LINE_X.left, y1: lineTop, x2: LINE_X.left, y2: lineBottom, lineWidth: 1 },
              // Qty | Description
              { type: "line", x1: LINE_X.qty, y1: lineTop, x2: LINE_X.qty, y2: lineBottom, lineWidth: 1 },
              // Description | Cost
              { type: "line", x1: LINE_X.cost, y1: lineTop, x2: LINE_X.cost, y2: lineBottom, lineWidth: 1 },
              // Cost | Total
              { type: "line", x1: LINE_X.total, y1: lineTop, x2: LINE_X.total, y2: lineBottom, lineWidth: 1 },
              // Right border
              { type: "line", x1: LINE_X.right, y1: lineTop, x2: LINE_X.right, y2: lineBottom, lineWidth: 1 },
            ],
          };
        },
        // Header function for each page
        header: (currentPage, pageCount) => ({
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: [
                    // Logo and Estimate title/date
                    {
                      columns: [
                        {
                          // Logo placeholder - defined space
                          canvas: [
                            {
                              type: "rect",
                              x: 0,
                              y: 0,
                              w: 100,
                              h: 80,
                              lineWidth: 2,
                              lineColor: "#cccccc",
                              dash: { length: 5 },
                            },
                          ],
                          width: 100,
                        },
                        {
                          stack: [
                            {
                              text: "Estimate",
                              bold: true,
                              fontSize: 18,
                              alignment: "right",
                            },
                            {
                              text: formatDate(today),
                              fontSize: 10,
                              alignment: "right",
                              margin: [0, 4, 0, 0],
                            },
                          ],
                          width: "*",
                        },
                      ],
                      margin: [0, 15, 0, 15],
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
                              alignment: "center",
                            },
                            {
                              canvas: [
                                {
                                  type: "line",
                                  x1: 0,
                                  y1: 0,
                                  x2: 235,
                                  y2: 0,
                                  lineWidth: 1,
                                  lineColor: "#000",
                                },
                              ],
                              margin: [0, 4, 0, 4],
                            },
                            {
                              text: estimate.est_client_name || "",
                              fontSize: 11,
                              bold: true,
                              alignment: "center",
                            },
                          ],
                          width: "*",
                        },
                        {
                          text: "",
                          width: 81,
                        },
                        {
                          stack: [
                            {
                              text: "Project",
                              fontSize: 9,
                              color: "#666",
                              alignment: "center",
                            },
                            {
                              canvas: [
                                {
                                  type: "line",
                                  x1: 0,
                                  y1: 0,
                                  x2: 235,
                                  y2: 0,
                                  lineWidth: 1,
                                  lineColor: "#000",
                                },
                              ],
                              margin: [0, 4, 0, 4],
                            },
                            {
                              text: estimate.est_project_name || "",
                              fontSize: 11,
                              bold: true,
                              alignment: "center",
                            },
                          ],
                          width: "*",
                        },
                      ],
                      margin: [0, 0, 0, 10],
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
                      margin: [0, 0, 0, 0],
                    },
                  ],
                  border: [false, false, false, false],
                },
              ],
            ],
            heights: [HEADER_HEIGHT], // Fixed height
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 30,
            paddingRight: () => 30,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        }),
        // Footer function for each page
        footer: (currentPage, pageCount) => ({
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: [
                    // Deposit and Total row with border
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
                      margin: [0, 0, 0, 5],
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
                      margin: [0, 0, 0, 0],
                    },
                  ],
                  border: [false, false, false, false],
                },
              ],
            ],
            heights: [FOOTER_HEIGHT], // Fixed height
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 30,
            paddingRight: () => 30,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        }),
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
    <div className="fixed right-0 top-0 h-[50px] z-30 flex print:hidden">
      <button
        onClick={generatePdf}
        disabled={
          disabled || isGenerating || !allSections || allSections.length === 0
        }
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
      >
        <FiFileText className="w-4 h-4" />
        {isGenerating ? "Generating..." : "Generate PDF"}
      </button>
    </div>
  );
};

GenerateEstimatePdf.propTypes = {
  estimate: PropTypes.object.isRequired,
  allSections: PropTypes.array.isRequired,
  grandTotal: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
};

export default GenerateEstimatePdf;
