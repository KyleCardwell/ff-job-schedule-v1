import PropTypes from "prop-types";
import { useState } from "react";

import { buttonClass, headerButtonClass, headerButtonColor } from "../../assets/tailwindConstants";

const PdfCompletedListComponent = ({ completedProjects }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (isGenerating || !completedProjects?.length) return;

    setIsGenerating(true);

    const sortedProjects = [...completedProjects]
      .sort((a, b) => {
        const projectA = a.project_name.toLowerCase();
        const projectB = b.project_name.toLowerCase();
        return projectA.localeCompare(projectB);
      })
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

      const tableBody = [
        [
          { text: "Project", bold: true },
          { text: "Job #", bold: true },
          { text: "Room", bold: true },
        ],
      ];

      sortedProjects.forEach((project) => {
        project.tasks.forEach((task) => {
          tableBody.push([project.project_name, task.task_number, task.task_name]);
        });
      });

      const today = new Date().toLocaleDateString();

      const docDefinition = {
        pageSize: "Letter",
        content: [
          {
            text: "Completed Projects Report",
            style: "header",
            alignment: "center",
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              headerRows: 1,
              widths: ["20%", "10%", "*"],
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
    }
  };

  return (
    <div className="fixed right-0 top-0 h-[50px] z-30 flex print:hidden">
    <button
      onClick={generatePdf}
      className={`${headerButtonClass} ${headerButtonColor}`}
      disabled={isGenerating || !completedProjects?.length}
    >
      {isGenerating ? "Generating..." : "Print to PDF"}
    </button>

    </div>
  );
};

PdfCompletedListComponent.propTypes = {
  completedProjects: PropTypes.array.isRequired,
};

export default PdfCompletedListComponent;
