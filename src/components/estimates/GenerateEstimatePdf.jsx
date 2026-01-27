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
  selectedNotes = [],
  teamData,
  logoDataUrl,
  selectedLineItems = {},
  disabled,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (!estimate || isGenerating) {
      return;
    }

    // Check if there's anything to generate (sections or line items)
    const hasSections = allSections && allSections.length > 0;
    const hasLineItems = estimate.line_items && estimate.line_items.length > 0;
    if (!hasSections && !hasLineItems) {
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

      const formatDateShort = (date) => {
        const mm = String(date.getMonth() + 1).padStart(2, "0"); // getMonth is 0-based
        const dd = String(date.getDate()).padStart(2, "0");
        const yyyy = date.getFullYear();

        return `${mm}-${dd}-${yyyy}`;
      };

      const formatCurrency = (value) => {
        return `$${value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      //   const grandTotalText = "Total:   " + formatCurrency(grandTotal);

      // Build contact info text
      const contactInfo = teamData?.contact_info;
      const contactLines = [];
      if (contactInfo?.street) {
        contactLines.push(contactInfo.street);
      }
      if (contactInfo?.city || contactInfo?.state || contactInfo?.zip) {
        const cityStateZip = [
          contactInfo.city,
          contactInfo.state,
          contactInfo.zip,
        ]
          .filter(Boolean)
          .join(" ");
        if (cityStateZip) contactLines.push(cityStateZip);
      }
      if (contactInfo?.phone) {
        contactLines.push(`Phone: ${contactInfo.phone}`);
      }
      if (contactInfo?.email) {
        contactLines.push(`Email: ${contactInfo.email}`);
      }
      if (contactInfo?.fax) {
        contactLines.push(`Fax: ${contactInfo.fax}`);
      }

      // Height variables to control header/footer and page margins
      const HEADER_HEIGHT = 209.75; // Increased if we have contact info
      const FOOTER_HEIGHT = 65; // Fixed height for footer table
      const PAGE_TOP_MARGIN = HEADER_HEIGHT; // Must match header height
      const PAGE_BOTTOM_MARGIN = FOOTER_HEIGHT; // Must match footer height

      const GROUP_HEADER_FONT_SIZE = 10;
      const GROUP_DATA_FONT_SIZE = 9;
      const QUANTITY_FONT_SIZE = 10;

      const GROUP_DATA_INDENT = 5;

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

      // Add estimate notes at the beginning if any are selected
      if (selectedNotes && selectedNotes.length > 0) {
        // Add introductory line
        allRows.push([
          {
            text: "",
            alignment: "center",
          },
          {
            text: "Cabinetry is to have the following description unless otherwise noted:",
            fontSize: GROUP_HEADER_FONT_SIZE,
            bold: true,
          },
          {
            text: "",
            colSpan: 2,
          },
          {},
          {
            text: "",
            colSpan: 2,
          },
          {},
        ]);

        // Add each note with minimal padding
        selectedNotes.forEach((noteText) => {
          allRows.push([
            {
              text: "",
              alignment: "center",
            },
            {
              text: "-" + noteText,
              fontSize: GROUP_DATA_FONT_SIZE,
              italics: true,
              margin: [GROUP_DATA_INDENT, 0, 0, 0],
            },
            {
              text: "",
              colSpan: 2,
            },
            {},
            {
              text: "",
              colSpan: 2,
            },
            {},
          ]);
        });

        // Add a minimal separator row after notes section
        allRows.push([
          { text: " " },
          { text: " " },
          { text: " ", colSpan: 2 },
          {},
          { text: " ", colSpan: 2 },
          {},
        ]);
      }

      allSections.forEach((section) => {
        const leftColumn = [];
        const rightColumn = [];

        // Build detail columns
        leftColumn.push(`Style: ${section.cabinetStyle}`);
        leftColumn.push(`Drawer Boxes: ${section.drawerBoxMaterial}`);
        leftColumn.push(`Cabinets: ${section.boxMaterial}`);
        leftColumn.push(`Finish: ${section.boxFinish}`);

        rightColumn.push(`Doors: ${section.doorStyle}`);
        rightColumn.push(`Drawer Fronts: ${section.drawerFrontStyle}`);
        rightColumn.push(`Wood: ${section.faceMaterial}`);
        rightColumn.push(`Finish: ${section.faceFinish}`);

        const maxDetailRows = Math.max(leftColumn.length, rightColumn.length);

        // Build details stack for the description column
        const detailsStack = [];
        for (let i = 0; i < maxDetailRows; i++) {
          detailsStack.push({
            columns: [
              {
                text: leftColumn[i] || "",
                width: "*",
                fontSize: GROUP_DATA_FONT_SIZE,
              },
              {
                text: rightColumn[i] || "",
                width: "*",
                fontSize: GROUP_DATA_FONT_SIZE,
              },
            ],
            margin: [GROUP_DATA_INDENT, 0, 0, 4], // Left indent
          });
        }

        // Add notes if present (handle both array and string formats)
        if (section.notes) {
          if (Array.isArray(section.notes)) {
            const notesLabels = ["Notes:", "Includes:", "Does Not Include:"];

            section.notes.forEach((note, index) => {
              if (note && note.trim()) {
                detailsStack.push({
                  text: `${notesLabels[index]} ${note}`,
                  italics: true,
                  fontSize: GROUP_DATA_FONT_SIZE,
                  margin: [GROUP_DATA_INDENT, 0, 0, 4], // Left indent with top margin for new line
                });
              }
            });
          } else if (section.notes.trim()) {
            // Backward compatibility for string notes
            detailsStack.push({
              text: `Notes: ${section.notes}`,
              italics: true,
              fontSize: GROUP_DATA_FONT_SIZE,
              margin: [GROUP_DATA_INDENT, 0, 0, 4],
            });
          }
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
                fontSize: GROUP_HEADER_FONT_SIZE,
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
        // allRows.push([
        //   { text: " " },
        //   { text: " " },
        //   { text: " ", colSpan: 2 },
        //   {},
        //   { text: " ", colSpan: 2 },
        //   {},
        // ]);
      });

      // Add line items to PDF (only selected ones)
      if (estimate.line_items && Array.isArray(estimate.line_items)) {
        estimate.line_items.forEach((item, index) => {
          const parentKey = String(index);

          // Add parent line item if selected
          if (selectedLineItems[parentKey]) {
            const itemTotal =
              item.quantity && item.cost
                ? parseFloat(item.quantity) * parseFloat(item.cost)
                : 0;

            allRows.push([
              {
                text: item.quantity ? item.quantity.toString() : "",
                alignment: "center",
                rowSpan: 1,
                fontSize: QUANTITY_FONT_SIZE,
              },
              {
                text: item.title || "Line Item",
                bold: true,
                fontSize: GROUP_HEADER_FONT_SIZE,
              },
              {
                text: item.cost ? formatCurrency(parseFloat(item.cost)) : "",
                alignment: "right",
                colSpan: 2,
                fontSize: QUANTITY_FONT_SIZE,
              },
              {},
              {
                text:
                  item.quantity && item.cost ? formatCurrency(itemTotal) : "",
                alignment: "right",
                colSpan: 2,
                fontSize: QUANTITY_FONT_SIZE,
              },
              {},
            ]);
          }

          // Add sub-items as separate rows (only if selected)
          if (
            item.subItems &&
            Array.isArray(item.subItems) &&
            item.subItems.length > 0
          ) {
            item.subItems.forEach((subItem, subIndex) => {
              const childKey = `${index}-${subIndex}`;

              // Skip if not selected
              if (!selectedLineItems[childKey]) {
                return;
              }

              const subTotal =
                subItem.quantity && subItem.cost
                  ? parseFloat(subItem.quantity) * parseFloat(subItem.cost)
                  : 0;

              allRows.push([
                {
                  text: subItem.quantity ? subItem.quantity.toString() : "",
                  alignment: "center",
                  fontSize: QUANTITY_FONT_SIZE,
                  // color: "#666666",
                },
                {
                  text: subItem.title || "Sub-item",
                  fontSize: GROUP_DATA_FONT_SIZE,
                  // color: "#666666",
                  margin: [GROUP_DATA_INDENT, 0, 0, 0], // Indent sub-items
                },
                {
                  text: subItem.cost
                    ? formatCurrency(parseFloat(subItem.cost))
                    : "",
                  alignment: "right",
                  fontSize: QUANTITY_FONT_SIZE,
                  // color: "#666666",
                  colSpan: 2,
                },
                {},
                {
                  text:
                    subItem.quantity && subItem.cost
                      ? formatCurrency(subTotal)
                      : "",
                  alignment: "right",
                  fontSize: QUANTITY_FONT_SIZE,
                  // color: "#666666",
                  colSpan: 2,
                },
                {},
              ]);
            });
          }
        });
      }

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
            paddingTop: (i, node) => {
              // No padding for note rows (italics) or intro line (bold)
              if (
                i > 0 &&
                (node.table.body[i][1]?.italics || node.table.body[i][1]?.bold)
              ) {
                return 0;
              }
              return 3;
            },
            paddingBottom: (i, node) => {
              if (i === 0) {
                return 4;
              }
              // Minimal padding for note rows and separator rows
              if (
                i > 0 &&
                (node.table.body[i][1]?.italics || node.table.body[i][1]?.bold)
              ) {
                return 4;
              }
              // Very minimal for blank separator rows
              if (i > 0 && node.table.body[i][1]?.text === " ") {
                return 2;
              }
              return 10;
            },
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
              {
                type: "line",
                x1: LINE_X.left,
                y1: lineTop,
                x2: LINE_X.left,
                y2: lineBottom,
                lineWidth: 1,
              },
              // Qty | Description
              {
                type: "line",
                x1: LINE_X.qty,
                y1: lineTop,
                x2: LINE_X.qty,
                y2: lineBottom,
                lineWidth: 1,
              },
              // Description | Cost
              {
                type: "line",
                x1: LINE_X.cost,
                y1: lineTop,
                x2: LINE_X.cost,
                y2: lineBottom,
                lineWidth: 1,
              },
              // Cost | Total
              {
                type: "line",
                x1: LINE_X.total,
                y1: lineTop,
                x2: LINE_X.total,
                y2: lineBottom,
                lineWidth: 1,
              },
              // Right border
              {
                type: "line",
                x1: LINE_X.right,
                y1: lineTop,
                x2: LINE_X.right,
                y2: lineBottom,
                lineWidth: 1,
              },
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
                          // Left column: Logo and contact info stacked
                          stack: [
                            logoDataUrl && logoDataUrl.startsWith("data:image/")
                              ? {
                                  // Actual logo - adjust fit dimensions to control size
                                  image: logoDataUrl,
                                  fit: [240, 180], // [maxWidth, maxHeight] - increase these for larger logo
                                  alignment: "center",
                                }
                              : {
                                  // Placeholder (shown if no logo or invalid format)
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
                            // Company Contact Info below logo
                            ...(contactLines.length > 0
                              ? [
                                  {
                                    stack: contactLines.map((line) => ({
                                      text: line,
                                      fontSize: 12,
                                      color: "#414141",
                                      alignment: "center",
                                    })),
                                    margin: [0, 10, 0, 0],
                                  },
                                ]
                              : []),
                          ],
                          width: 240,
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
                              fontSize: 10,
                              color: "#414141",
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
                              fontSize: 10,
                              color: "#414141",
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
                              alignment: "center",
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
                              fontSize: 12,
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
                          margin: [0, 2, 0, 0],
                        },
                        {
                          text: `Pricing guaranteed until ${formatDate(
                            guaranteeDate,
                          )}`,
                          bold: true,
                          alignment: "right",
                          width: "*",
                          fontSize: 11,
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
      const fileName = `${
        estimate.est_project_name || ""
      } Estimate ${formatDateShort(today)}.pdf`;
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
        disabled={disabled || isGenerating}
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
  selectedNotes: PropTypes.arrayOf(PropTypes.string),
  teamData: PropTypes.object,
  logoDataUrl: PropTypes.string,
  selectedLineItems: PropTypes.object,
  disabled: PropTypes.bool,
};

export default GenerateEstimatePdf;
