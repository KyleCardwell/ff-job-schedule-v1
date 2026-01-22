import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";
import { useSelector } from "react-redux";

import {
  formatCurrency,
  formatHours,
  getBreakdownCategories,
  getServiceName,
  getLaborAdjustmentHours
} from "../../utils/sectionBreakdownHelpers";

const GenerateSectionBreakdownPdf = ({ 
  sectionCalculations,
  section,
  projectName = "",
  taskName = "",
  sectionName = ""
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const allServices = useSelector((state) => state.services.allServices);

  const generatePdf = async () => {
    if (!sectionCalculations || isGenerating) return;

    setIsGenerating(true);

    try {
      // Load pdfMake from CDN
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

      const today = new Date().toLocaleDateString();
      const serviceIds = sectionCalculations?.laborCosts?.costsByService
        ? Object.keys(sectionCalculations.laborCosts.costsByService).map(Number).sort()
        : [];

      const breakdownCategories = getBreakdownCategories(sectionCalculations);
      const activeCategories = breakdownCategories.filter(
        (cat) => cat.cost > 0 || cat.count > 0
      );

      // Get labor adjustment hours from section.add_hours
      const laborAdjustmentHours = getLaborAdjustmentHours(section?.add_hours);

      // Build table header row
      const headerRow = [
        { text: "Item", style: "tableHeader" },
        { text: "Cost", style: "tableHeader", alignment: "right" },
      ];
      serviceIds.forEach((serviceId) => {
        headerRow.push({
          text: getServiceName(serviceId, allServices),
          style: "tableHeader",
          alignment: "right",
        });
      });

      // Build data rows
      const tableBody = [headerRow];

      // Add Labor Adjustments row if there are any
      if (laborAdjustmentHours) {
        const laborRow = [
          { text: "Labor Adds", style: "itemName", fillColor: "#e3f2fd" },
          { text: "-", alignment: "right", color: "#999999", fillColor: "#e3f2fd" },
        ];

        serviceIds.forEach((serviceId) => {
          const hours = laborAdjustmentHours[serviceId];
          laborRow.push({
            text: hours ? formatHours(hours).toString() : "-",
            alignment: "right",
            fillColor: "#e3f2fd",
            bold: true,
            color: hours ? "#1976d2" : "#999999",
          });
        });

        tableBody.push(laborRow);
      }

      activeCategories.forEach((category) => {
        const countDisplay = category.count > 0 ? ` (${category.count})` : '';
        const row = [
          { text: `${category.title}${countDisplay}`, style: "itemName" },
          { text: formatCurrency(category.cost), alignment: "right" },
        ];

        serviceIds.forEach((serviceId) => {
          if (category.skipHours) {
            row.push({ text: "-", alignment: "right", color: "#999999" });
          } else {
            const hours = category.hoursByService?.[serviceId];
            row.push({
              text: hours ? formatHours(hours).toString() : "-",
              alignment: "right",
            });
          }
        });

        tableBody.push(row);
      });

      // Add totals row
      const totalsRow = [
        { text: "Total", style: "totalsRow", bold: true },
        {
          text: formatCurrency(sectionCalculations?.partsTotalPrice || 0),
          style: "totalsRow",
          alignment: "right",
          bold: true,
        },
      ];
      serviceIds.forEach((serviceId) => {
        const serviceData = sectionCalculations?.laborCosts?.costsByService?.[serviceId];
        totalsRow.push({
          text: serviceData ? formatHours(serviceData.hours).toString() : "-",
          style: "totalsRow",
          alignment: "right",
          bold: true,
        });
      });
      tableBody.push(totalsRow);

      // Calculate column widths dynamically
      const serviceColumnWidth = serviceIds.length > 0 ? 40 : 0; //service column widths
      const widths = ["*", 80]; //category, cost
      serviceIds.forEach(() => widths.push(serviceColumnWidth));

      const docDefinition = {
        pageSize: "LETTER",
        pageOrientation: "portrait",
        pageMargins: [30, 30, 30, 40],
        content: [
          {
            text: "Section Parts & Labor Breakdown",
            style: "header",
            margin: [0, 0, 0, 10],
          },
          {
            columns: [
              {
                stack: [
                  projectName && { text: `Project: ${projectName}`, fontSize: 11, margin: [0, 0, 0, 4] },
                  taskName && { text: `Room: ${taskName}`, fontSize: 11, margin: [0, 0, 0, 4] },
                  sectionName && { text: `Section: ${sectionName}`, fontSize: 11, margin: [0, 0, 0, 4] },
                ].filter(Boolean),
                width: "*",
              },
            ],
            margin: [0, 0, 0, 15],
          },
          {
            table: {
              headerRows: 1,
              widths: widths,
              body: tableBody,
            },
            layout: {
              hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => "#cccccc",
              vLineColor: () => "#cccccc",
              paddingLeft: () => 8,
              paddingRight: () => 8,
              paddingTop: () => 6,
              paddingBottom: () => 6,
              fillColor: (i, node) => {
                if (i === 0) return "#f0f0f0";
                if (i === node.table.body.length - 1) return "#e6f7ff";
                return null;
              },
            },
          },
        ],
        footer: (currentPage, pageCount) => ({
          text: `Generated: ${today}           Page ${currentPage} of ${pageCount}`,
          alignment: "right",
          margin: [0, 10, 40, 0],
          fontSize: 9,
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
          itemName: {
            fontSize: 9,
          },
          totalsRow: {
            fontSize: 10,
            fillColor: "#e6f7ff",
          },
        },
        defaultStyle: {
          fontSize: 9,
        },
      };

      const fileName = `${projectName} - ${taskName} - ${sectionName} - Breakdown`;
      window.pdfMake.createPdf(docDefinition).download(`${fileName}.pdf`);
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
      disabled={isGenerating}
      className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
    >
      <FiFileText size={18} />
      {isGenerating ? "Generating..." : "PDF"}
    </button>
  );
};

GenerateSectionBreakdownPdf.propTypes = {
  sectionCalculations: PropTypes.object.isRequired,
  section: PropTypes.object,
  projectName: PropTypes.string,
  taskName: PropTypes.string,
  sectionName: PropTypes.string,
};

export default GenerateSectionBreakdownPdf;
