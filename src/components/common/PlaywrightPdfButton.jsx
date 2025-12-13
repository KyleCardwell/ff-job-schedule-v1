import PropTypes from "prop-types";
import { useState } from "react";

import { headerButtonClass, headerButtonColor } from "../../assets/tailwindConstants";
import { generatePdfFromUrl, downloadPdf } from "../../services/pdfService";

/**
 * Playwright PDF Button Component
 * Generates PDF using Playwright backend server
 * This works alongside the existing pdfMake button
 */
const PlaywrightPdfButton = ({ project, disabled = false }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generatePdf = async () => {
    if (!project || isGenerating || disabled) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Get current page URL - this will capture the rendered page
      const currentUrl = window.location.href;
      
      console.log('Generating PDF with Playwright from:', currentUrl);

      // Generate PDF using Playwright backend
      const pdfBlob = await generatePdfFromUrl(currentUrl, {
        format: 'Letter',
        printBackground: true,
        landscape: false,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        scale: 1,
        displayHeaderFooter: true,
        footerTemplate: `
          <div style="font-size: 10px; text-align: right; width: 100%; padding-right: 40px;">
            Report Date: ${new Date().toLocaleDateString()}
            <span style="margin-left: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `
      });

      // Download the PDF
      const filename = `${project.project_name}-playwright.pdf`;
      downloadPdf(pdfBlob, filename);

      console.log('PDF generated successfully with Playwright!');
    } catch (err) {
      console.error('Error generating PDF with Playwright:', err);
      setError(err.message || 'Failed to generate PDF');
      alert(`Failed to generate PDF: ${err.message}\n\nMake sure the backend server is running at ${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed right-[120px] top-0 h-[50px] z-[100] flex print:hidden">
      <button
        onClick={generatePdf}
        className={`${headerButtonClass} ${headerButtonColor} ${
          (disabled || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={disabled || isGenerating}
        title="Generate PDF using Playwright (server-side rendering)"
      >
        {isGenerating ? 'Generating...' : 'PDF (Playwright)'}
      </button>
      {error && (
        <div className="absolute top-full right-0 mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
};

PlaywrightPdfButton.propTypes = {
  project: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
};

export default PlaywrightPdfButton;
