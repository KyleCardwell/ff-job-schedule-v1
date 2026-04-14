import PropTypes from "prop-types";
import { useState } from "react";

import {
  headerButtonClass,
  headerButtonColor,
} from "../../assets/tailwindConstants";
import {
  FIXED_AMOUNT,
  FINANCIAL_SECTION_ORDER,
  ADJUSTMENT_ORDER,
} from "../../utils/constants";
import { calculateFinancialTotals } from "../../utils/helpers";

const orderFinancialEntries = (entries) => {
  const entryMap = new Map(entries);
  const ordered = [];

  FINANCIAL_SECTION_ORDER.forEach((id) => {
    if (entryMap.has(id)) {
      ordered.push([id, entryMap.get(id)]);
      entryMap.delete(id);
    }
  });

  entries.forEach(([id, data]) => {
    if (!entryMap.has(id)) return;
    if (ADJUSTMENT_ORDER.includes(id)) return;
    ordered.push([id, data]);
    entryMap.delete(id);
  });

  ADJUSTMENT_ORDER.forEach((id) => {
    if (entryMap.has(id)) {
      ordered.push([id, entryMap.get(id)]);
      entryMap.delete(id);
    }
  });

  entryMap.forEach((data, id) => {
    ordered.push([id, data]);
  });

  return ordered;
};

const formatOtherInputRowLabel = (row) => {
  const parts = [row?.invoice, row?.description]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  return parts.join(" - ") || "(No details)";
};

const PDF_LINE_COLOR = "#aaa";
const COMPACT_TABLE_LAYOUT = {
  hLineWidth: function () {
    return 0.5;
  },
  vLineWidth: function () {
    return 0;
  },
  hLineColor: function () {
    return PDF_LINE_COLOR;
  },
  paddingTop: function () {
    return 1;
  },
  paddingBottom: function () {
    return 1;
  },
};
const NO_SECTION_LINES_LAYOUT = {
  hLineWidth: function () {
    return 0;
  },
  vLineWidth: function () {
    return 0;
  },
  paddingTop: function () {
    return 1;
  },
  paddingBottom: function () {
    return 1;
  },
};
const HOURS_SERVICES_LAYOUT = {
  hLineWidth: function (i) {
    if (i === 1) return 0.5;
    if (i > 1 && i % 2 === 1) return 0.5;
    return 0;
  },
  vLineWidth: function () {
    return 0;
  },
  hLineColor: function () {
    return PDF_LINE_COLOR;
  },
  paddingTop: function () {
    return 1;
  },
  paddingBottom: function () {
    return 1;
  },
};
const TOTALS_LAYOUT = {
  hLineWidth: function () {
    return 0.5;
  },
  vLineWidth: function () {
    return 0;
  },
  hLineColor: function () {
    return PDF_LINE_COLOR;
  },
  paddingTop: function () {
    return 1;
  },
  paddingBottom: function () {
    return 1;
  },
};

// Use CDN approach for pdfMake to avoid font loading issues
const GeneratePdfButton = ({
  project,
  projectFinancials,
  projectTotals,
  dateUpdated,
  services,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (!project || !projectFinancials || isGenerating) return;

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

      const completedDate = new Date(
        project.project_completed_at,
      ).toLocaleDateString();

      // Get today's date for the report
      const today = new Date().toLocaleDateString();

      // Summary table for all tasks
      const summaryTableBody = [
        [
          { text: "Job #", bold: true },
          { text: "Room Name", bold: true },
          { text: "Estimate", bold: true, alignment: "right" },
          { text: "Cost", bold: true, alignment: "right" },
          { text: "Profit/Loss", bold: true, alignment: "right" },
          { text: "%", bold: true, alignment: "right" },
        ],
      ];

      const profitPercent =
        ((projectTotals.profit || 0) / (projectTotals.estimate || 0)) * 100;

      // Content array for the PDF
      const content = [
        {
          columns: [
            {
              text: project.project_name,
              style: "header",
              alignment: "left",
              width: "*",
            },
            // {
            //   text: `Report Date: ${today}`,
            //   alignment: "right",
            //   width: "auto",
            //   margin: [0, 10, 0, 0],
            // },
          ],
          margin: [0, 0, 0, 8],
        },
        {
          columns: [
            {
              text: `Shop Completion: ${completedDate}`,
              alignment: "left",
            },
            {
              text: `Last updated: ${dateUpdated}`,
              alignment: "right",
            },
          ],
          margin: [0, 0, 0, 14],
        },
        {
          text: "Project Totals",
          style: "subheader",
          margin: [0, 8, 0, 4],
        },
        {
          table: {
            widths: ["*", "*", "*", "*"],
            body: [
              [
                { text: "Estimate", bold: true, alignment: "center" },
                { text: "Cost", bold: true, alignment: "center" },
                { text: "Profit/Loss", bold: true, alignment: "center" },
                { text: "Profit %", bold: true, alignment: "center" },
              ],
              [
                {
                  text: `$${(projectTotals.estimate || 0).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}`,
                  alignment: "center",
                },
                {
                  text: `$${(projectTotals.actual || 0).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}`,
                  alignment: "center",
                },
                {
                  text: `$${(projectTotals.profit || 0).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}`,
                  color:
                    (projectTotals.profit || 0) > 0
                      ? "green"
                      : (projectTotals.profit || 0) < 0
                        ? "red"
                        : "blue",
                  alignment: "center",
                },
                {
                  text: `${profitPercent.toFixed(2)}%`,
                  color:
                    profitPercent > 0
                      ? "green"
                      : profitPercent < 0
                        ? "red"
                        : "blue",
                  alignment: "center",
                },
              ],
            ],
          },
          layout: COMPACT_TABLE_LAYOUT,
          margin: [0, 0, 0, 14],
        },
        {
          text: "Tasks Summary",
          style: "subheader",
          margin: [0, 8, 0, 4],
        },
      ];

      // Detailed task breakdowns
      const taskBreakdowns = [];

      projectFinancials.forEach((task) => {
        // Skip tasks with no financial data, no services, or null adjustments
        if (
          !task.financial_data ||
          !services?.length ||
          task.adjustments === null
        )
          return;

        const taskSections = Object.entries(task.financial_data).map(
          ([id, section]) => {
            if (id === "hours") {
              return {
                id,
                data: section.data || [],
              };
            }
            return {
              id,
              estimate: section.estimate || 0,
              inputRows: section.data || [],
            };
          },
        );

        const taskTotals = calculateFinancialTotals(taskSections, services);
        const adjustedTotals = task.adjustments
          ? calculateFinancialTotals(taskSections, services, task.adjustments)
          : taskTotals;

        const estimate = adjustedTotals.total || adjustedTotals.estimate || 0;
        const actual = adjustedTotals.actual || 0;
        const taskProfit = estimate - actual;
        const profitPercent = (taskProfit / estimate) * 100;

        // Add to summary table
        summaryTableBody.push([
          task.task_number,
          task.task_name,
          {
            text: `$${estimate.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            alignment: "right",
          },
          {
            text: `$${actual.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            alignment: "right",
          },
          {
            text: `$${taskProfit.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: taskProfit > 0 ? "green" : taskProfit < 0 ? "red" : "blue",
            alignment: "right",
          },
          {
            text: `${profitPercent.toFixed(2)}%`,
            color:
              profitPercent > 0 ? "green" : profitPercent < 0 ? "red" : "blue",
            alignment: "right",
          },
        ]);

        // Create detailed breakdown for this task
        const taskBreakdown = [
          {
            text: `${project.project_name} - ${task.task_number} - ${task.task_name}`,
            style: "taskHeader",
            margin: [0, 10, 0, 4],
          },
        ];

        // Process each section in the same order as completed-project breakdown
        const sections = orderFinancialEntries([
          ...Object.entries(task.financial_data || {}),
          ...(adjustedTotals.adjustments || []),
        ]);
        sections.forEach(([id, sectionData]) => {
          if (id === "hours") {
            // Hours section with service breakdowns
            // taskBreakdown.push({
            //   text: sectionData.name || "Labor",
            //   style: "sectionHeader",
            //   margin: [0, 10, 0, 5],
            // });

            // Table for hours breakdown
            const hoursTableBody = [
              [
                { text: "Category", bold: true },
                { text: "Estimate", bold: true, alignment: "right" },
                { text: "Cost", bold: true, alignment: "right" },
                { text: "Profit/Loss", bold: true, alignment: "right" },
              ],
            ];

            // Add each service row
            (sectionData.data || []).forEach((service) => {
              const serviceInfo = services.find(
                (s) => s.team_service_id === service.team_service_id,
              );
              const rate =
                service.rateOverride ?? serviceInfo?.hourly_rate ?? 0;
              const estimate =
                (service.estimate || 0) * rate + (service.fixedAmount || 0);

              // Calculate actual hours, excluding fixed_amount entries
              const actualHours = (service.inputRows || []).reduce(
                (sum, row) => {
                  if (row.employee_id === FIXED_AMOUNT) return sum;
                  const hoursValue = row.hours?.decimal ?? row.hours ?? 0;
                  return sum + hoursValue;
                },
                0,
              );

              // Calculate differences
              const hoursDiff = service.estimate - actualHours;
              const costDiff = estimate - service.actual_cost;

              // Determine colors
              const hoursColor =
                hoursDiff > 0 ? "green" : hoursDiff < 0 ? "red" : "blue";

              const costColor =
                costDiff > 0 ? "green" : costDiff < 0 ? "red" : "blue";

              // First row - Service name and financial values
              hoursTableBody.push([
                serviceInfo?.service_name || "Unknown Service",
                {
                  text: `$${estimate.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  alignment: "right",
                },
                {
                  text: `$${service.actual_cost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  alignment: "right",
                },
                {
                  text: `$${costDiff.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  alignment: "right",
                  color: costColor,
                },
              ]);

              // Second row - Hours information
              hoursTableBody.push([
                { text: "Hours", margin: [12, 0, 0, 0] },
                {
                  text: service.estimate.toFixed(2),
                  alignment: "right",
                },
                {
                  text: actualHours.toFixed(2),
                  alignment: "right",
                },
                {
                  text: hoursDiff.toFixed(2),
                  alignment: "right",
                  color: hoursColor,
                },
              ]);
            });

            // Add hours table to task breakdown
            if (hoursTableBody.length > 1) {
              taskBreakdown.push({
                table: {
                  headerRows: 1,
                  widths: ["*", "*", "*", "*"],
                  body: hoursTableBody,
                },
                layout: HOURS_SERVICES_LAYOUT,
                margin: [0, 0, 0, 8],
              });
            }
          } else {
            // Other sections (materials, etc.)
            // taskBreakdown.push({
            //   text: sectionData.name || id,
            //   style: "sectionHeader",
            //   margin: [0, 10, 0, 5],
            // });

            const isOtherSection =
              id === "other" ||
              (sectionData.name || "").toLowerCase() === "other";
            const sectionTableBody = [
              [
                sectionData.name || id,
                {
                  text: `$${sectionData.estimate.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  alignment: "right",
                },
                {
                  text: `$${sectionData.actual_cost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  alignment: "right",
                },
                {
                  text: `$${(
                    sectionData.estimate - sectionData.actual_cost
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  alignment: "right",
                  color:
                    sectionData.estimate - sectionData.actual_cost > 0
                      ? "green"
                      : sectionData.estimate - sectionData.actual_cost < 0
                        ? "red"
                        : "blue",
                },
              ],
            ];

            if (isOtherSection && Array.isArray(sectionData.data)) {
              sectionData.data.forEach((row) => {
                const rowCost = parseFloat(row?.cost) || 0;
                sectionTableBody.push([
                  {
                    text: formatOtherInputRowLabel(row),
                    margin: [12, 0, 0, 0],
                  },
                  {
                    text: "",
                    alignment: "right",
                  },
                  {
                    text: `$${rowCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    alignment: "right",
                  },
                  {
                    text: "",
                    alignment: "right",
                  },
                ]);
              });
            }

            // Add section data
            taskBreakdown.push({
              table: {
                widths: ["*", "*", "*", "*"],
                body: sectionTableBody,
              },
              layout: NO_SECTION_LINES_LAYOUT,
              margin: [0, 0, 0, 8],
            });
          }
        });

        // Add task totals
        taskBreakdown.push({
          table: {
            widths: ["*", "*", "*", "*"],
            body: [
              [
                { text: "Totals", bold: true },
                {
                  text: `$${estimate.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  bold: true,
                  alignment: "right",
                },
                {
                  text: `$${actual.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  bold: true,
                  alignment: "right",
                },
                {
                  text: `$${taskProfit.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  bold: true,
                  alignment: "right",
                  color:
                    taskProfit > 0 ? "green" : taskProfit < 0 ? "red" : "blue",
                },
              ],
            ],
          },
          layout: TOTALS_LAYOUT,
          margin: [0, 4, 0, 8],
        });

        // Add page break after each task except the last one
        taskBreakdowns.push(...taskBreakdown);
        if (task !== projectFinancials[projectFinancials.length - 1]) {
          taskBreakdowns.push({ text: "", pageBreak: "after" });
        }
      });

      // Add summary table to content
      content.push({
        table: {
          headerRows: 1,
          widths: ["10%", "*", "15%", "15%", "15%", "8%"],
          body: summaryTableBody,
        },
        layout: COMPACT_TABLE_LAYOUT,
      });

      // Add page break before detailed breakdowns
      content.push({ text: "", pageBreak: "after" });

      // Add detailed breakdowns title
      //   content.push({
      //     text: "Detailed Task Breakdowns",
      //     style: "header",
      //     alignment: "center",
      //     margin: [0, 0, 0, 20],
      //   });

      // Add all task breakdowns
      content.push(...taskBreakdowns);

      const docDefinition = {
        pageSize: "Letter",
        pageMargins: [24, 28, 24, 32],
        content: content,
        footer: (currentPage, pageCount) => {
          return {
            text: `Report Date: ${today}           Page ${currentPage} of ${pageCount}`,
            alignment: "right",
            margin: [0, 8, 24, 0],
          };
        },
        styles: {
          header: {
            fontSize: 22,
            bold: true,
          },
          subheader: {
            fontSize: 16,
            bold: true,
          },
          taskHeader: {
            fontSize: 14,
            bold: true,
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
          },
        },
        defaultStyle: {
          fontSize: 10,
        },
      };

      // Use the global pdfMake instance
      window.pdfMake
        .createPdf(docDefinition)
        .download(`${project.project_name}-financials.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("There was an error generating the PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-[50px] z-[100] flex print:hidden">
      <button
        onClick={generatePdf}
        className={`${headerButtonClass} ${headerButtonColor}`}
        disabled={!project || !projectFinancials?.length || isGenerating}
      >
        {isGenerating ? "Generating..." : "Generate PDF"}
      </button>
    </div>
  );
};

GeneratePdfButton.propTypes = {
  project: PropTypes.object.isRequired,
  projectFinancials: PropTypes.array.isRequired,
  projectTotals: PropTypes.object.isRequired,
  dateUpdated: PropTypes.string.isRequired,
  services: PropTypes.array.isRequired,
};

export default GeneratePdfButton;
