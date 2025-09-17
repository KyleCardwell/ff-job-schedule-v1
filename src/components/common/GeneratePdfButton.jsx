import PropTypes from "prop-types";
import { useState } from "react";

import { buttonClass } from "../../assets/tailwindConstants";
import { calculateFinancialTotals } from "../../utils/helpers";

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
        project.project_completed_at
      ).toLocaleDateString();

      // Summary table for all tasks
      const summaryTableBody = [
        [
          { text: "Job #", bold: true },
          { text: "Room Name", bold: true },
          { text: "Estimate", bold: true, alignment: "right" },
          { text: "Actual", bold: true, alignment: "right" },
          { text: "Profit/Loss", bold: true, alignment: "right" },
        ],
      ];

      // Content array for the PDF
      const content = [
        {
          text: project.project_name,
          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 10],
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
          margin: [0, 0, 0, 20],
        },
        {
          text: "Project Totals",
          style: "subheader",
          margin: [0, 10, 0, 5],
        },
        {
          table: {
            widths: ["*", "*", "*"],
            body: [
              [
                { text: "Estimated", bold: true, alignment: "center" },
                { text: "Actual", bold: true, alignment: "center" },
                { text: "Profit/Loss", bold: true, alignment: "center" },
              ],
              [
                {
                  text: `$${(projectTotals.estimate || 0).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`,
                  alignment: "center",
                },
                {
                  text: `$${(projectTotals.actual || 0).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`,
                  alignment: "center",
                },
                {
                  text: `$${(projectTotals.profit || 0).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`,
                  color: (projectTotals.profit || 0) >= 0 ? "green" : "red",
                  alignment: "center",
                },
              ],
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 20],
        },
        {
          text: "Tasks Summary",
          style: "subheader",
          margin: [0, 10, 0, 5],
        },
      ];

      // Detailed task breakdowns
      const taskBreakdowns = [];

      projectFinancials.forEach((task) => {
        if (!task.financial_data || !services?.length) return;

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
          }
        );

        const taskTotals = calculateFinancialTotals(taskSections, services);
        const adjustedTotals = task.adjustments
          ? calculateFinancialTotals(taskSections, services, task.adjustments)
          : taskTotals;

        const estimate = adjustedTotals.total || adjustedTotals.estimate || 0;
        const actual = adjustedTotals.actual || 0;
        const taskProfit = estimate - actual;

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
            color: taskProfit >= 0 ? "green" : "red",
            alignment: "right",
          },
        ]);

        // Create detailed breakdown for this task
        const taskBreakdown = [
          {
            text: `${project.project_name} - ${task.task_number} - ${task.task_name}`,
            style: "taskHeader",
            margin: [0, 15, 0, 5],
          },
        ];

        // Process each section in the task
        const sections = Object.entries(task.financial_data);
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
                { text: "Hours", bold: true },
                { text: "Estimate", bold: true, alignment: "right" },
                { text: "Actual", bold: true, alignment: "right" },
                { text: "Profit/Loss", bold: true, alignment: "right" },
              ],
            ];

            // Add each service row
            (sectionData.data || []).forEach((service) => {
              const serviceInfo = services.find(
                (s) => s.team_service_id === service.team_service_id
              );
              const rate =
                service.rateOverride ?? serviceInfo?.hourly_rate ?? 0;
              const estimate =
                (service.estimate || 0) * rate + (service.fixedAmount || 0);

              // Calculate actual hours, excluding fixed_amount entries
              const actualHours = (service.inputRows || []).reduce(
                (sum, row) => {
                  if (row.employee_id === "fixed_amount") return sum;
                  const hoursValue = row.hours?.decimal ?? row.hours ?? 0;
                  return sum + hoursValue;
                },
                0
              );

              hoursTableBody.push([
                serviceInfo?.service_name || "Unknown Service",
                {
                  text: `(${service.estimate.toFixed(
                    2
                  )} hrs)  $${estimate.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  alignment: "right",
                },
                {
                  text: `(${actualHours.toFixed(
                    2
                  )} hrs)  $${service.actual_cost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  alignment: "right",
                },
                {
                  text: `(${(service.estimate - actualHours).toFixed(
                    2
                  )} hrs)  $${(estimate - service.actual_cost).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`,
                  alignment: "right",
                  color:
                    estimate - service.actual_cost > 0
                      ? "green"
                      : estimate - service.actual_cost < 0
                      ? "red"
                      : "blue",
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
                layout: "lightHorizontalLines",
                margin: [0, 0, 0, 10],
              });
            }
          } else {
            // Other sections (materials, etc.)
            // taskBreakdown.push({
            //   text: sectionData.name || id,
            //   style: "sectionHeader",
            //   margin: [0, 10, 0, 5],
            // });

            // Add section data
            taskBreakdown.push({
              table: {
                widths: ["*", "*", "*", "*"],
                body: [
                  //   [
                  //     { text: "Category", bold: true },
                  //     { text: "Estimated", bold: true, alignment: "right" },
                  //     { text: "Actual", bold: true, alignment: "right" },
                  //     { text: "Difference", bold: true, alignment: "right" },
                  //   ],
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
                      text: `$${sectionData.actual_cost.toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}`,
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
                ],
              },
              layout: "lightHorizontalLines",
              margin: [0, 0, 0, 10],
            });
          }
        });

        // Add task totals
        taskBreakdown.push({
          table: {
            widths: ["*", "*", "*", "*"],
            body: [
              [
                { text: "Task Totals", bold: true },
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
                  color: taskProfit >= 0 ? "green" : "red",
                },
              ],
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 5, 0, 10],
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
          widths: ["10%", "*", "15%", "15%", "15%"],
          body: summaryTableBody,
        },
        layout: "lightHorizontalLines",
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
        content: content,
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
    <button
      onClick={generatePdf}
      className={`${buttonClass} bg-green-500 print:hidden`}
      disabled={!project || !projectFinancials?.length || isGenerating}
    >
      {isGenerating ? "Generating..." : "Generate PDF"}
    </button>
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
