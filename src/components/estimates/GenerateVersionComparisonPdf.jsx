import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";

import { buildVersionComparisonPdfDefinition } from "../../utils/versionComparisonPdf";

const sanitizeFileName = (value) =>
  String(value || "Estimate")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim();

const formatFileDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const GenerateVersionComparisonPdf = ({
  estimate,
  rooms,
  currentProjectTotal,
  disabled = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (disabled || isGenerating || !estimate) return;

    setIsGenerating(true);

    try {
      const [{ default: pdfMake }, fontsModule] = await Promise.all([
        import("pdfmake/build/pdfmake.js"),
        import("pdfmake/build/vfs_fonts.js"),
      ]);
      pdfMake.vfs = fontsModule.default || fontsModule;

      const definition = buildVersionComparisonPdfDefinition({
        estimate,
        rooms,
        currentProjectTotal,
      });
      const pdfDocument = pdfMake.createPdf(definition);
      const fileName = `${sanitizeFileName(estimate.est_project_name)} Version Comparison ${formatFileDate()}.pdf`;
      const pdfBlob = await new Promise((resolve, reject) => {
        pdfDocument.getBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Unable to generate comparison PDF."));
        });
      });

      const openPdfInNewTab = () => {
        const blobUrl = window.URL.createObjectURL(pdfBlob);
        const previewTab = window.open(blobUrl, "_blank");

        if (previewTab) {
          previewTab.opener = null;
        } else {
          alert(
            "PDF was saved, but your browser blocked opening it in a new tab. Please allow pop-ups and try again.",
          );
        }

        window.setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 60000);
      };

      if (typeof window.showSaveFilePicker === "function") {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "PDF Document",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });
          const writable = await fileHandle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
          openPdfInNewTab();
          return;
        } catch (saveError) {
          if (saveError?.name === "AbortError") return;
        }
      }

      pdfDocument.download(fileName);
      openPdfInNewTab();
    } catch {
      alert("There was an error generating the comparison PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={disabled || isGenerating}
      className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
    >
      <FiFileText className="w-4 h-4" />
      {isGenerating ? "Generating..." : "Export PDF"}
    </button>
  );
};

GenerateVersionComparisonPdf.propTypes = {
  estimate: PropTypes.object,
  rooms: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentProjectTotal: PropTypes.number,
  disabled: PropTypes.bool,
};

export default GenerateVersionComparisonPdf;
