import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";

import { generatePdfFromHtml, downloadPdf } from "../../services/pdfService";

/**
 * Generate HTML for estimate PDF
 */
function generateEstimateHtml({
  estimate,
  allSections,
  grandTotal,
  today,
  guaranteeDate,
  formatDate,
  formatCurrency,
}) {
  // Create header row (only once, not per section) - using inline styles for reliability
  const headerHtml = `
    <div style="width: 100%; display: grid; grid-template-columns: 1fr 9fr 2fr 2fr; border-top: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000;">
      <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; border-bottom: 1px solid #000;">Qty</div>
      <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; border-bottom: 1px solid #000;">Description</div>
      <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; border-bottom: 1px solid #000;">Cost</div>
      <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #000;">Total</div>
    </div>
  `;

  const sectionsHtml = allSections
    .map((section) => {
      const leftDetails = [
        `Style: ${section.cabinetStyle}`,
        `Drawer Boxes: ${section.drawerBoxMaterial}`,
        `Cabinets: ${section.boxMaterial}`,
        `Finish: ${section.boxFinish}`,
    ];
    
    const rightDetails = [
        `Doors: ${section.doorStyle}`,
        `Drawer Fronts: ${section.drawerFrontStyle}`,
        `Wood: ${section.faceMaterial}`,
        `Finish: ${section.faceFinish}`,
      ];

      return `
      <div style="width: 100%; display: grid; grid-template-columns: 1fr 9fr 2fr 2fr; font-size:9pt; page-break-inside: avoid; border-left: 1px solid #000; border-right: 1px solid #000;">
        <div style="text-align: center; padding: 8px; border-right: 1px solid #000;">${
          section.quantity
        }</div>
        <div style="padding: 8px; border-right: 1px solid #000;">
          <div style="font-weight: bold; font-size: 10pt;">${
            section.displayName || section.taskName
          }</div>
          <div style="display: flex; gap: 8px; margin-top: 4px; padding-left: 6px;">
            <div style="flex: 1;">
              ${leftDetails
                .map((d) => `<div style="margin-bottom: 2px;">${d}</div>`)
                .join("")}
            </div>
            <div style="flex: 1;">
              ${rightDetails
                .map((d) => `<div style="margin-bottom: 2px;">${d}</div>`)
                .join("")}
            </div>
          </div>
          ${
            section.notes
              ? `<div style="margin-top: 8px; font-style: italic;">Notes: ${section.notes}</div>`
              : ""
          }
        </div>
        <div style="text-align: right; padding: 8px; border-right: 1px solid #000;">${formatCurrency(
          section.unitPrice
        )}</div>
        <div style="text-align: right; padding: 8px;">${formatCurrency(
          section.totalPrice
        )}</div>
      </div>
    `;
    })
    .join("");

  const footerHtml = `
    <div style="width: 100%; display: grid; grid-template-columns: 1fr 9fr 2fr 2fr; border-top: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000;">
      <div style="grid-column: span 2; padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; border-bottom: 1px solid #000;">50% Deposit Required</div>
      <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #000;">Total</div>
      <div style="padding: 8px; display: flex; align-items: center; justify-content: end; border-bottom: 1px solid #000;">${formatCurrency(grandTotal)}</div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <!-- Estimate Notes Section (optional) -->
      ${
        estimate.notes
          ? `
      <div style="background-color: #fef9c3; padding: 12px; margin-bottom: 12px; border: 1px solid #000; font-size: 9pt;">
        <strong>Estimate Notes:</strong><br>
        ${estimate.notes}
      </div>
      `
          : ""
      }
      
      <!-- Header Row -->
      ${headerHtml}
      
      <!-- Sections -->
      <div>
      ${sectionsHtml}
      </div>
      
      <!-- Footer Row -->
      ${footerHtml}
    
    </body>
    </html>
  `;
}

/**
 * Playwright PDF Button for Estimates
 * Generates PDF using Playwright backend server with custom HTML layout
 * This works alongside the existing pdfMake estimate button
 */
const PlaywrightEstimatePdfButton = ({
  estimate,
  allSections,
  disabled = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generatePdf = async () => {
    if (
      !estimate ||
      !allSections ||
      allSections.length === 0 ||
      isGenerating ||
      disabled
    ) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log("Generating estimate PDF with Playwright using data");

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

      // Calculate grand total
      const grandTotal = allSections.reduce(
        (sum, section) => sum + (section.totalPrice || 0),
        0
      );

      // Build HTML matching the pdfMake layout
      const htmlContent = generateEstimateHtml({
        estimate,
        allSections,
        grandTotal,
        today,
        guaranteeDate,
        formatDate,
        formatCurrency,
      });

      // Debug: log first 500 chars of HTML
      console.log("Generated HTML preview:", htmlContent.substring(0, 500));
      console.log("Total HTML length:", htmlContent.length);

      // Build header template for Playwright (inline styles only - no external CSS)
      //   const headerTemplate = `
      //     <div style="width: 100%; font-size: 12px; padding: 0; margin: 0 30pt;">
      //       <div style="padding: 0 36px; margin-bottom: 8px;">
      //         <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      //           <div style="width: 100px; height: 40px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999;">[LOGO]</div>
      //           <div style="text-align: right;">
      //             <div style="font-size: 16px; font-weight: bold;">Estimate</div>
      //             <div style="margin-top: 2px;">${formatDate(today)}</div>
      //           </div>
      //         </div>
      //         <div style="display: flex; gap: 40px; margin-bottom: 6px;">
      //           <div style="flex: 1;">
      //             <div style="font-size: 9px; color: #666;">Client Name</div>
      //             <div style="font-size: 11px; font-weight: bold;">${
      //               estimate.client_name || "N/A"
      //             }</div>
      //           </div>
      //           <div style="flex: 1;">
      //             <div style="font-size: 9px; color: #666;">Project</div>
      //             <div style="font-size: 11px; font-weight: bold;">${
      //               estimate.est_project_name || "N/A"
      //             }</div>
      //           </div>
      //         </div>
      //       </div>
      //       <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0 36px; box-sizing: border-box;">
      //         <tr>
      //           <th style="background: #f0f0f0; padding: 6px 8px; text-align: center; border: 1px solid #000; width: 25px; box-sizing: border-box;">Qty</th>
      //           <th style="background: #f0f0f0; padding: 6px 8px; text-align: center; border-right: 1px solid #000; border-top: 1px solid #000; border-bottom: 1px solid #000; box-sizing: border-box;">Description</th>
      //           <th style="background: #f0f0f0; padding: 6px 8px; text-align: center; border-right: 1px solid #000; border-top: 1px solid #000; border-bottom: 1px solid #000; width: 60px; box-sizing: border-box;">Cost</th>
      //           <th style="background: #f0f0f0; padding: 6px 8px; text-align: center; border-right: 1px solid #000; border-top: 1px solid #000; border-bottom: 1px solid #000; width: 60px; box-sizing: border-box;">Total</th>
      //         </tr>
      //       </table>
      //     </div>
      //   `;

      //   // Build footer template for Playwright (inline styles only - no external CSS)
      //   const footerTemplate = `
      //     <div style="width: 100%; font-size: 10px; padding: 0; margin: 0 30pt;">
      //       <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0 36px; box-sizing: border-box;">
      //         <tr>
      //           <td colspan="4" style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0; box-sizing: border-box;">
      //             <div style="display: flex; padding: 6px 8px; align-items: center;">
      //               <div style="flex: 1; font-weight: bold; font-size: 12px;">50% deposit required</div>
      //               <div style="font-weight: bold; font-size: 12px; margin-right: 8px;">Total</div>
      //               <div style="font-weight: bold; font-size: 14px; min-width: 100px; text-align: right;">${formatCurrency(
      //                 grandTotal
      //               )}</div>
      //             </div>
      //           </td>
      //         </tr>
      //       </table>
      //       <div style="display: flex; justify-content: space-between; font-size: 9px; padding: 4px 36px;">
      //         <div></div>
      //         <div style="text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
      //         <div style="text-align: right;">Pricing guaranteed until ${formatDate(
      //           guaranteeDate
      //         )}</div>
      //       </div>
      //     </div>
      //   `;

      // Generate PDF using Playwright backend
      const pdfBlob = await generatePdfFromHtml(htmlContent, {
        format: "Letter",
        printBackground: true,
        landscape: false,
        margin: {
          top: ".5in",
          right: "0.5in",
          bottom: ".5in",
          left: "0.5in",
        },
        scale: 1,
        // displayHeaderFooter: true,
        // headerTemplate,
        // footerTemplate,
      });

      // Create filename
      const fileName = `${estimate.est_project_name || "Estimate"}_${formatDate(
        today
      )
        .replace(/,/g, "")
        .replace(/ /g, "_")}_playwright.pdf`;

      // Download the PDF
      downloadPdf(pdfBlob, fileName);

      console.log("Estimate PDF generated successfully with Playwright!");
    } catch (err) {
      console.error("Error generating estimate PDF with Playwright:", err);
      setError(err.message || "Failed to generate PDF");
      alert(
        `Failed to generate PDF: ${
          err.message
        }\n\nMake sure the backend server is running at ${
          import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed right-[160px] top-0 h-[50px] z-30 flex print:hidden">
      <button
        onClick={generatePdf}
        disabled={
          disabled || isGenerating || !allSections || allSections.length === 0
        }
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
        title="Generate PDF using Playwright (server-side rendering)"
      >
        <FiFileText className="w-4 h-4" />
        {isGenerating ? "Generating..." : "PDF (Playwright)"}
      </button>
      {error && (
        <div className="absolute top-full right-0 mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
};

PlaywrightEstimatePdfButton.propTypes = {
  estimate: PropTypes.object.isRequired,
  allSections: PropTypes.array.isRequired,
  disabled: PropTypes.bool,
};

export default PlaywrightEstimatePdfButton;
