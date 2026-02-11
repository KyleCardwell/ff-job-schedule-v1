import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";

const GeneratePartsListPdf = ({ groupedParts, localAnchors, services, cabinetStyles }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (isGenerating || !groupedParts || groupedParts.length === 0) return;

    setIsGenerating(true);

    try {
      // Load pdfMake from CDN
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

      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const activeServices = services.filter((s) => s.is_active);

      // Build column widths: Width, Height, Depth, Style, ...services
      const columnWidths = [40, 40, 40, 70];
      activeServices.forEach(() => columnWidths.push("*"));

      const content = [
        {
          text: "Parts List Anchors - Time (minutes)",
          style: "header",
          margin: [0, 0, 0, 15],
        },
      ];

      groupedParts.forEach((group) => {
        // Group header (Unfinished Parts / Finished Parts)
        content.push({
          text: group.label,
          style: "groupHeader",
          margin: [0, 15, 0, 8],
        });

        group.items.forEach((part) => {
          const anchors = (localAnchors[part.id] || []).filter(
            (a) => !a.markedForDeletion
          );

          if (anchors.length === 0) return;

          // Part name header
          const partTitle = `${part.name}${part.description ? ` ${part.description}` : ""}`;

          // Build table header row
          const headerRow = [
            { text: "Width", style: "tableHeader", alignment: "center" },
            { text: "Height", style: "tableHeader", alignment: "center" },
            { text: "Depth", style: "tableHeader", alignment: "center" },
            { text: "Style", style: "tableHeader", alignment: "center" },
          ];
          activeServices.forEach((s) => {
            headerRow.push({
              text: s.service_name,
              style: "tableHeader",
              alignment: "center",
            });
          });

          // Build data rows
          const tableBody = [headerRow];

          // Group anchors by cabinet_style_id for visual separation
          const groupedAnchors = {};
          anchors.forEach((anchor) => {
            const styleId = anchor.cabinet_style_id || "all";
            if (!groupedAnchors[styleId]) {
              groupedAnchors[styleId] = [];
            }
            groupedAnchors[styleId].push(anchor);
          });

          // Sort groups: "all" first, then by style name
          const sortedGroups = Object.entries(groupedAnchors).sort(
            ([a], [b]) => {
              if (a === "all") return -1;
              if (b === "all") return 1;
              const styleA = cabinetStyles.find(
                (s) => s.cabinet_style_id === parseInt(a)
              );
              const styleB = cabinetStyles.find(
                (s) => s.cabinet_style_id === parseInt(b)
              );
              return (styleA?.cabinet_style_name || "").localeCompare(
                styleB?.cabinet_style_name || ""
              );
            }
          );

          sortedGroups.forEach(([styleId, styleAnchors]) => {
            styleAnchors.forEach((anchor) => {
              const styleName =
                styleId === "all"
                  ? "All"
                  : cabinetStyles.find(
                      (s) =>
                        s.cabinet_style_id === parseInt(anchor.cabinet_style_id)
                    )?.cabinet_style_name || "All";

              const row = [
                { text: anchor.width ?? "", alignment: "center" },
                { text: anchor.height ?? "", alignment: "center" },
                { text: anchor.depth ?? "", alignment: "center" },
                { text: styleName, alignment: "center", fontSize: 8 },
              ];

              activeServices.forEach((s) => {
                const serviceData = anchor.services?.find(
                  (ans) => ans.team_service_id === s.team_service_id
                );
                row.push({
                  text: serviceData?.minutes ? String(serviceData.minutes) : "-",
                  alignment: "center",
                  color: serviceData?.minutes ? "#000000" : "#999999",
                });
              });

              tableBody.push(row);
            });
          });

          // Wrap title + table in unbreakable stack to keep them together
          content.push({
            unbreakable: true,
            stack: [
              {
                text: partTitle,
                style: "partHeader",
                margin: [0, 10, 0, 4],
              },
              {
                table: {
                  headerRows: 1,
                  widths: columnWidths,
                  body: tableBody,
                  dontBreakRows: true,
                },
                layout: {
                  hLineWidth: (i, node) =>
                    i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
                  vLineWidth: () => 0.5,
                  hLineColor: () => "#cccccc",
                  vLineColor: () => "#cccccc",
                  paddingLeft: () => 4,
                  paddingRight: () => 4,
                  paddingTop: () => 4,
                  paddingBottom: () => 4,
                  fillColor: (i) => (i === 0 ? "#f0f0f0" : null),
                },
              },
            ],
            margin: [0, 0, 0, 2],
          });
        });
      });

      const docDefinition = {
        pageSize: "LETTER",
        pageOrientation: activeServices.length > 4 ? "landscape" : "portrait",
        pageMargins: [30, 30, 30, 40],
        content: content,
        footer: (currentPage, pageCount) => ({
          columns: [
            {
              text: `Generated: ${today}`,
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
          margin: [30, 10, 30, 0],
        }),
        styles: {
          header: {
            fontSize: 16,
            bold: true,
          },
          groupHeader: {
            fontSize: 13,
            bold: true,
            color: "#333333",
          },
          partHeader: {
            fontSize: 10,
            bold: true,
            color: "#444444",
          },
          tableHeader: {
            bold: true,
            fontSize: 8,
            fillColor: "#f0f0f0",
          },
        },
        defaultStyle: {
          fontSize: 9,
        },
      };

      const formatDateShort = (date) => {
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        const yyyy = date.getFullYear();
        return `${mm}-${dd}-${yyyy}`;
      };

      const fileName = `Parts List Anchors ${formatDateShort(new Date())}.pdf`;
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
      disabled={isGenerating || !groupedParts || groupedParts.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
      title="Generate PDF of parts list anchors"
    >
      <FiFileText size={18} />
      {isGenerating ? "Generating..." : "Generate PDF"}
    </button>
  );
};

GeneratePartsListPdf.propTypes = {
  groupedParts: PropTypes.array.isRequired,
  localAnchors: PropTypes.object.isRequired,
  services: PropTypes.array.isRequired,
  cabinetStyles: PropTypes.array.isRequired,
};

export default GeneratePartsListPdf;
