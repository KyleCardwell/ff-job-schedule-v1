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
  // Fixed column borders that span full height of content area
  // Using same padding as body content (10px) since this is in the body, not header/footer
  const columnBordersHtml = `
    <div style="width: calc(100% - 20px); height: 100%; position: fixed; top: 0; bottom: 0; left: 10px; pointer-events: none; z-index: 500;">
      <div style="width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 9fr 2fr 2fr; border-left: 1px solid #000; border-right: 1px solid #000;">
        <div style="border-right: 1px solid #000; height: 100%;"></div>
        <div style="border-right: 1px solid #000; height: 100%;"></div>
        <div style="border-right: 1px solid #000; height: 100%;"></div>
        <div style="height: 100%;"></div>
      </div>
    </div>
  `;

  // Header content for Playwright headerTemplate
  // Note: Playwright header/footer templates render at full page width, so we need to add padding to match body margins
  const playwrightHeaderHtml = `
    <div style="width: 100%; padding: 0 34.5pt; box-sizing: border-box; font-size: 11pt; font-family: Arial, sans-serif;">
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 100px; height:100px;">Logo</div>
        <div style="text-align: right;">
          <h1 style="margin: 0;">Estimate</h1>
          <div style="font-size: 10pt;">Date: ${formatDate(today)}</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; margin-top: 12px; text-align: center;">
        <div>
          <div style="border-bottom: 1px solid #000; padding: 4px;">Client</div>
          <div style="padding: 4px;">${estimate.est_client_name}</div>
        </div>
        <div>
          <div style="border-bottom: 1px solid #000; padding: 4px;">Project</div>
          <div style="padding: 4px;">${estimate.est_project_name}</div>
        </div>
      </div>

      <div style="margin-top: 12px; width: 100%; display: grid; grid-template-columns: 1fr 9fr 2fr 2fr; border-top: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000;">
        <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; border-bottom: 1px solid #000;">Qty</div>
        <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; border-bottom: 1px solid #000;">Description</div>
        <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; border-bottom: 1px solid #000;">Cost</div>
        <div style="padding: 8px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #000;">Total</div>
      </div>
    </div>
  `;

  const estimateNotesHtml = `
      <div style="font-size: 10pt; width: calc(100% - 20px); margin: 8px 10px; display: grid; grid-template-columns: 1fr 9fr 2fr 2fr;">
        <div></div>
        <div style="padding-left: 8px;">
          <div>Cabinetry to have the following description unless otherwise noted:</div>
          <div style="padding-left: 6px;">Cabinetry to have the following description unless otherwise noted:</div>
        </div>
        <div></div>
        <div></div>
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
      <div style="width: calc(100% - 20px); margin: 8px 10px; display: grid; grid-template-columns: 1fr 9fr 2fr 2fr; font-size: 10pt; page-break-inside: avoid;">
        <div style="text-align: center; padding: 8px;">${
          section.quantity
        }</div>
        <div style="padding: 8px;">
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
        <div style="text-align: right; padding: 8px;">${formatCurrency(
          section.unitPrice
        )}</div>
        <div style="text-align: right; padding: 8px;">${formatCurrency(
          section.totalPrice
        )}</div>
      </div>
    `;
    })
    .join("");

  // Footer content for Playwright footerTemplate
  // Note: Playwright header/footer templates render at full page width, so we need to add padding to match body margins
  const playwrightFooterHtml = `
    <div style="width: 100%; padding: 0 34.5pt; box-sizing: border-box; font-size: 12pt; font-family: Arial, sans-serif;">
      <div style="width: 100%; display: grid; grid-template-columns: 1fr 9fr 2fr 2fr; border-top: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000;">
        <div style="grid-column: span 2; padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; border-bottom: 1px solid #000;">50% Deposit Required</div>
        <div style="grid-column: span 2; display: flex; justify-content: space-between; padding: 0 8px; align-items: center; border-bottom: 1px solid #000;">
          <div>Total</div>
          <div style="display: flex; align-items: center; justify-content: end;">${formatCurrency(
            grandTotal
          )}</div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 10pt; color: #666;">
        <div style="text-align: center; flex: 1;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        <div style="position: fixed; right: 45px; bottom: 20px;text-align: right;">Price Guaranteed Until ${formatDate(
          guaranteeDate
        )}</div>
      </div>
    </div>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      
      <!-- Fixed Column Borders -->
      ${columnBordersHtml}

      <!-- Estimate Details Row -->
      ${estimateNotesHtml}
      
      <!-- Sections -->
      ${sectionsHtml}
    
    </body>
    </html>
  `;

  return {
    htmlContent,
    headerTemplate: playwrightHeaderHtml,
    footerTemplate: playwrightFooterHtml,
  };
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
      const { htmlContent, headerTemplate, footerTemplate } = generateEstimateHtml({
        estimate,
        allSections,
        grandTotal,
        today,
        guaranteeDate,
        formatDate,
        formatCurrency,
      });

      // Generate PDF using Playwright backend
      const pdfBlob = await generatePdfFromHtml(htmlContent, {
        format: "Letter",
        printBackground: true,
        landscape: false,
        margin: {
          top: "2.35in",
          right: "0.375in",
          bottom: ".82in",
          left: "0.375in",
        },
        scale: 1,
        displayHeaderFooter: true,
        headerTemplate: headerTemplate,
        footerTemplate: footerTemplate,
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
    <div className="fixed right-0 top-0 h-[50px] z-30 flex print:hidden">
      <button
        onClick={generatePdf}
        disabled={
          disabled || isGenerating || !allSections || allSections.length === 0
        }
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
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
