import PropTypes from "prop-types";
import { useState } from "react";

import { buttonClass, headerButtonClass, headerButtonColor } from "../../assets/tailwindConstants";

const PdfCompletedListComponent = ({ completedProjects }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [contentMode, setContentMode] = useState("all");

  const generatePdf = async () => {
    if (isGenerating || !completedProjects?.length) return;

    setIsGenerating(true);

    // completedProjects arrives already sorted to match the page; keep that order.
    const sortedProjects = completedProjects
      .map((project) => ({
        ...project,
        tasks:
          project.tasks && project.tasks.length > 0
            ? [...project.tasks].sort((a, b) =>
                a.task_number.localeCompare(b.task_number, undefined, { numeric: true })
              )
            : [],
      }));

    try {
      // Load pdfMake from CDN if not already loaded
      if (!window.pdfMake) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const projectsOnly = contentMode === "projects";
      const formatDate = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
      };

      const tableBody = projectsOnly
        ? [
            [
              { text: "Project", bold: true },
              { text: "Shop Completed", bold: true },
              { text: "Costing Complete", bold: true },
            ],
          ]
        : [
            [
              { text: "Project", bold: true },
              { text: "Job #", bold: true },
              { text: "Room", bold: true },
            ],
          ];

      sortedProjects.forEach((project) => {
        if (projectsOnly) {
          tableBody.push([
            project.project_name,
            formatDate(project.completion_date || project.project_completed_at),
            `${project.tasks.filter((t) => t.costing_complete).length}/${project.tasks.length}`,
          ]);
          return;
        }
        project.tasks.forEach((task) => {
          tableBody.push([project.project_name, task.task_number, task.task_name]);
        });
      });

      const today = new Date().toLocaleDateString();

      const docDefinition = {
        pageSize: "Letter",
        content: [
          {
            text: projectsOnly ? "Completed Projects Report — Projects Only" : "Completed Projects Report",
            style: "header",
            alignment: "center",
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              headerRows: 1,
              widths: projectsOnly ? ["*", "22%", "22%"] : ["20%", "10%", "*"],
              body: tableBody,
            },
            layout: "lightHorizontalLines",
          },
        ],
        footer: (currentPage, pageCount) => {
          return {
            text: `Report Date: ${today}           Page ${currentPage} of ${pageCount}`,
            alignment: "right",
            margin: [0, 10, 40, 0],
          };
        },
        styles: {
          header: {
            fontSize: 18,
            bold: true,
          },
        },
        defaultStyle: {
          fontSize: 10,
        },
      };

      window.pdfMake.createPdf(docDefinition).download("completed-projects.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("There was an error generating the PDF. Please try again.");
    } finally {
      setIsGenerating(false);
      setIsOptionsOpen(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-[50px] z-30 flex print:hidden">
      <button
        onClick={() => setIsOptionsOpen(true)}
        className={`${headerButtonClass} ${headerButtonColor}`}
        disabled={isGenerating || !completedProjects?.length}
      >
        {isGenerating ? "Generating..." : "Print to PDF"}
      </button>

      {isOptionsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-options-title"
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h2 id="pdf-options-title" className="text-lg font-bold mb-4 text-gray-900">
              Print to PDF
            </h2>
            <div className="space-y-2 mb-6 text-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pdf-content-mode"
                  checked={contentMode === "all"}
                  onChange={() => setContentMode("all")}
                />
                All tasks / rooms
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pdf-content-mode"
                  checked={contentMode === "projects"}
                  onChange={() => setContentMode("projects")}
                />
                Project names only (with shop completed date)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsOptionsOpen(false)}
                disabled={isGenerating}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={generatePdf}
                disabled={isGenerating}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Create PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

PdfCompletedListComponent.propTypes = {
  completedProjects: PropTypes.array.isRequired,
};

export default PdfCompletedListComponent;
