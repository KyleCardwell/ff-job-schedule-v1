import PropTypes from "prop-types";
import { useState } from "react";

import { buttonClass } from "../../assets/tailwindConstants";
import { calculateFinancialTotals } from "../../utils/helpers";

// Use CDN approach for pdfMake to avoid font loading issues
const GeneratePdfButton = ({ project, projectFinancials, projectTotals, dateUpdated, services }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (!project || !projectFinancials || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // Load pdfMake from CDN
      if (!window.pdfMake) {
        // Load pdfMake script
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        
        // Load fonts
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      const completedDate = new Date(
        project.project_completed_at
      ).toLocaleDateString();

      const tableBody = [
        [
          { text: "Job #", bold: true },
          { text: "Room Name", bold: true },
          { text: "Estimated", bold: true, alignment: "right" },
          { text: "Actual", bold: true, alignment: "right" },
          { text: "Profit/Loss", bold: true, alignment: "right" },
        ],
      ];

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

        tableBody.push([
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
      });

      const docDefinition = {
        content: [
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
                    text: `$${(projectTotals.actual || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    alignment: "center",
                  },
                  {
                    text: `$${(projectTotals.profit || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
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
            text: "Tasks Breakdown",
            style: "subheader",
            margin: [0, 10, 0, 5],
          },
          {
            table: {
              headerRows: 1,
              widths: ["auto", "*", "auto", "auto", "auto"],
              body: tableBody,
            },
            layout: "lightHorizontalLines",
          },
        ],
        styles: {
          header: {
            fontSize: 22,
            bold: true,
          },
          subheader: {
            fontSize: 16,
            bold: true,
          },
        },
      };

      // Use the global pdfMake instance
      window.pdfMake.createPdf(docDefinition).download(`${project.project_name}-financials.pdf`);
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
