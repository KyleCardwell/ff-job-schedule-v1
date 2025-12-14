import PropTypes from "prop-types";
import { useState } from "react";
import { FiPrinter, FiX } from "react-icons/fi";

/**
 * Print-optimized estimate preview component
 * Opens in a modal and allows users to print directly from the browser
 */
const EstimatePdfPreview = ({ estimate, allSections, onClose }) => {
  const [showPreview, setShowPreview] = useState(false);

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

  const handlePrint = () => {
    window.print();
  };

  const handleOpenPreview = () => {
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    if (onClose) onClose();
  };

  if (!showPreview) {
    return (
      <button
        onClick={handleOpenPreview}
        disabled={!allSections || allSections.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors rounded"
        title="Open print preview"
      >
        <FiPrinter className="w-4 h-4" />
        Print Estimate
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] overflow-auto p-5 print:p-0 print:bg-white">
      {/* Modal Controls - Hidden when printing */}
      <div className="fixed top-5 right-5 flex gap-3 z-[10000] bg-white p-3 rounded-lg shadow-lg print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          title="Print this estimate"
        >
          <FiPrinter className="w-5 h-5" />
          Print
        </button>
        <button
          onClick={handleClosePreview}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors"
          title="Close preview"
        >
          <FiX className="w-5 h-5" />
          Close
        </button>
      </div>

      {/* Print Content */}
      <div className="max-w-[8.5in] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none">
        {/* Page Header */}
        <div className="px-[0.375in] py-5 border-b-2 border-black print:break-after-avoid">
          <div className="flex justify-between mb-3">
            <div className="w-[100px] h-[100px] border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500">
              Logo
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold m-0">Estimate</h1>
              <div className="text-[10pt] mt-1">Date: {formatDate(today)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-20 mt-3 text-center">
            <div className="border border-black">
              <div className="border-b border-black p-1 font-bold bg-gray-100">Client</div>
              <div className="p-2">{estimate.est_client_name}</div>
            </div>
            <div className="border border-black">
              <div className="border-b border-black p-1 font-bold bg-gray-100">Project</div>
              <div className="p-2">{estimate.est_project_name}</div>
            </div>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_9fr_2fr_2fr] border border-black border-b-0 mt-3 font-bold">
            <div className="p-2 flex items-center justify-center border-r border-black">Qty</div>
            <div className="p-2 flex items-center justify-center border-r border-black">Description</div>
            <div className="p-2 flex items-center justify-center border-r border-black">Cost</div>
            <div className="p-2 flex items-center justify-center">Total</div>
          </div>
        </div>

        {/* Estimate Notes */}
        <div className="text-[10pt] px-[0.375in] py-2 grid grid-cols-[1fr_9fr_2fr_2fr] border-x border-black">
          <div></div>
          <div className="pl-2">
            <div>Cabinetry to have the following description unless otherwise noted:</div>
            <div className="pl-1.5">
              Cabinetry to have the following description unless otherwise noted:
            </div>
          </div>
          <div></div>
          <div></div>
        </div>

        {/* Sections */}
        <div>
          {allSections.map((section, index) => {
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

            return (
              <div 
                key={index} 
                className="px-[0.375in] py-2 text-[10pt] grid grid-cols-[1fr_9fr_2fr_2fr] border-x border-black print:break-inside-avoid"
              >
                <div className="text-center p-2">{section.quantity}</div>
                <div className="p-2">
                  <div className="font-bold text-[10pt]">
                    {section.displayName || section.taskName}
                  </div>
                  <div className="flex gap-2 mt-1 pl-1.5">
                    <div className="flex-1">
                      {leftDetails.map((detail, i) => (
                        <div key={i} className="mb-0.5">
                          {detail}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      {rightDetails.map((detail, i) => (
                        <div key={i} className="mb-0.5">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                  {section.notes && (
                    <div className="mt-2 italic">Notes: {section.notes}</div>
                  )}
                </div>
                <div className="text-right p-2">{formatCurrency(section.unitPrice)}</div>
                <div className="text-right p-2">
                  {formatCurrency(section.totalPrice)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Page Footer */}
        <div className="px-[0.375in] pb-5 print:break-before-avoid">
          <div className="grid grid-cols-[1fr_9fr_2fr_2fr] border border-black">
            <div className="col-span-2 p-2 flex items-center justify-center border-r border-black font-bold">
              50% Deposit Required
            </div>
            <div className="col-span-2 flex justify-between px-2 py-2 items-center font-bold">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <div className="mt-2 text-[10pt] text-gray-600 text-right">
            Price Guaranteed Until {formatDate(guaranteeDate)}
          </div>
        </div>
      </div>
    </div>
  );
};

EstimatePdfPreview.propTypes = {
  estimate: PropTypes.object.isRequired,
  allSections: PropTypes.array.isRequired,
  onClose: PropTypes.func,
};

export default EstimatePdfPreview;
