import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";
import { buttonClass } from "../assets/tailwindConstants";

const GenerateJobSchedulePdf = ({
  jobName,
  depositDate,
  deliveryDate,
  projectNotes,
  localRooms,
  employees,
  formatDateForDisplay,
  disabled,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (!jobName || isGenerating) {
      return;
    }

    const activeRooms = localRooms.filter((room) => room.task_active);
    if (!activeRooms || activeRooms.length === 0) {
      return;
    }

    setIsGenerating(true);

    try {
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

      const today = new Date();
      const formatDate = (date) => {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      const formatDateShort = (date) => {
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        const yyyy = date.getFullYear();
        return `${mm}-${dd}-${yyyy}`;
      };

      const getEmployeeName = (employeeId) => {
        const employee = employees.find((e) => e.employee_id === employeeId);
        return employee ? employee.employee_name : "";
      };

      const tableBody = [
        [
          { text: "Job", style: "tableHeader", alignment: "center" },
          { text: "Room Name", style: "tableHeader", alignment: "center" },
        //   {
        //     text: "Estimated Hours",
        //     style: "tableHeader",
        //     alignment: "center",
        //   },
          {
            text: "Scheduled Hours",
            style: "tableHeader",
            alignment: "center",
          },
          { text: "Employee", style: "tableHeader", alignment: "center" },
          { text: "Start Date", style: "tableHeader", alignment: "center" },
          { text: "Hard Start?", style: "tableHeader", alignment: "center" },
        ],
      ];

      activeRooms.forEach((room) => {
        room.workPeriods.forEach((workPeriod, index) => {
          tableBody.push([
            {
              text: index === 0 ? room.task_number || "" : "",
              alignment: "center",
            },
            {
              text: index === 0 ? room.task_name || "" : "",
              alignment: "left",
            },
            // {
            //   text: workPeriod.est_duration
            //     ? workPeriod.est_duration.toString()
            //     : "",
            //   alignment: "center",
            // },
            {
              text: workPeriod.duration ? workPeriod.duration.toString() : "",
              alignment: "center",
            },
            {
              text: getEmployeeName(workPeriod.employee_id),
              alignment: "left",
            },
            {
              text: formatDateForDisplay(workPeriod.start_date),
              alignment: "center",
            },
            {
              text: workPeriod.hard_start_date ? "Yes" : "",
              alignment: "center",
            },
          ]);
        });
      });

      const content = [
        // {
        //   text: jobName,
        //   style: "header",
        //   alignment: "center",
        //   margin: [0, 0, 0, 10],
        // },
      ];

      if (depositDate || deliveryDate) {
        const dateInfo = [];
        if (depositDate) {
          dateInfo.push({
            text: `Deposit Date: ${formatDateForDisplay(depositDate)}`,
            fontSize: 10,
          });
        }
        if (deliveryDate) {
          dateInfo.push({
            text: `Delivery Date: ${formatDateForDisplay(deliveryDate)}`,
            fontSize: 10,
          });
        }
        content.push({
          columns: dateInfo,
          margin: [0, 0, 0, 10],
        });
      }

      if (projectNotes && projectNotes.trim()) {
        content.push({
          text: "Project Notes:",
          bold: true,
          fontSize: 10,
          margin: [0, 0, 0, 2],
        });
        content.push({
          text: projectNotes,
          fontSize: 9,
          italics: true,
          margin: [0, 0, 0, 15],
        });
      }

      content.push({
        table: {
          headerRows: 1,
          widths: [40, "*", 60, 80, 70, 50],
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
      });

      const docDefinition = {
        pageSize: "LETTER",
        pageOrientation: "portrait",
        pageMargins: [30, 40, 30, 30],
        content: content,
        header: (currentPage, pageCount) => ({
          stack: [
            {
              text: jobName,
              alignment: "center",
              fontSize: 14,
              color: "#000000",
              margin: [0, 2, 0, 0],
            },
          ],
          margin: [0, 15, 0, 10],
        }),
        footer: (currentPage, pageCount) => ({
          columns: [
            {
              text: `Generated on ${formatDate(today)}`,
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
          margin: [40, 0, 40, 15],
        }),
        styles: {
          header: {
            fontSize: 18,
            bold: true,
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            fillColor: "#f0f0f0",
          },
        },
        defaultStyle: {
          fontSize: 9,
        },
      };

      const fileName = `${jobName} Schedule ${formatDateShort(today)}.pdf`;
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
      disabled={disabled || isGenerating}
      className={`${buttonClass} bg-green-500`}
    >
      {isGenerating ? "Generating..." : "Print"}
    </button>
  );
};

GenerateJobSchedulePdf.propTypes = {
  jobName: PropTypes.string.isRequired,
  depositDate: PropTypes.string,
  deliveryDate: PropTypes.string,
  projectNotes: PropTypes.string,
  localRooms: PropTypes.array.isRequired,
  employees: PropTypes.array.isRequired,
  formatDateForDisplay: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default GenerateJobSchedulePdf;
