import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";
import { useSelector } from "react-redux";

import { NONE, PRE_FINISHED } from "../../utils/constants";
import { createSectionContext } from "../../utils/createSectionContext";
import { formatDoorDrawerStyle } from "../../utils/helpers";
import {
  formatCurrency,
  formatHours,
  getBreakdownCategories,
  getServiceName,
  getLaborAdjustmentHours,
} from "../../utils/sectionBreakdownHelpers";

const GenerateSectionBreakdownPdf = ({
  sectionCalculations,
  section,
  projectName = "",
  taskName = "",
  sectionName = "",
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const allServices = useSelector((state) => state.services.allServices);
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const boxMaterials = useSelector((state) => state.materials.boxMaterials);
  const faceMaterials = useSelector((state) => state.materials.faceMaterials);
  const drawerBoxMaterials = useSelector(
    (state) => state.materials.drawerBoxMaterials,
  );
  const finishTypes = useSelector((state) => state.finishes.finishes);
  const cabinetStyles = useSelector(
    (state) =>
      state.cabinetStyles?.styles.filter((style) => style.is_active) || [],
  );
  const cabinetTypes = useSelector(
    (state) => state.cabinetTypes?.types.filter((type) => type.is_active) || [],
  );
  const hardware = useSelector((state) => state.hardware);
  const accessories = useSelector((state) => state.accessories);
  const lengthsCatalog = useSelector((state) => state.lengths.catalog);
  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors.itemsByPartsList,
  );
  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors.itemsByType,
  );
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults,
  );

  const generatePdf = async () => {
    if (!sectionCalculations || isGenerating) return;

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

      const today = new Date().toLocaleDateString();
      const serviceIds = sectionCalculations?.laborCosts?.costsByService
        ? Object.keys(sectionCalculations.laborCosts.costsByService)
            .map(Number)
            .sort()
        : [];

      const breakdownCategories = getBreakdownCategories(sectionCalculations);

      const activeCategories = breakdownCategories.filter((cat) => {
        const hasHours =
          cat.hoursByService &&
          Object.values(cat.hoursByService).some((hours) => hours > 0);
        return cat.cost > 0 || cat.count > 0 || hasHours;
      });

      // Get labor adjustment hours from section.add_hours
      const laborAdjustmentHours = getLaborAdjustmentHours(section?.add_hours);

      const totalServicesCost =
        sectionCalculations?.laborCosts?.totalLaborCost || 0;
      const subtotal = sectionCalculations?.subTotalPrice || 0;
      const sectionProfit = sectionCalculations?.profit || 0;
      const sectionCommission = sectionCalculations?.commission || 0;
      const sectionDiscount = sectionCalculations?.discount || 0;
      const sectionTotal = sectionCalculations?.totalPrice || 0;

      const catalogData = {
        boxMaterials,
        faceMaterials,
        drawerBoxMaterials,
        finishTypes,
        cabinetStyles,
        cabinetTypes,
        hardware,
        partsListAnchors,
        cabinetAnchors,
        globalServices: allServices,
        lengthsCatalog,
        accessories,
        teamDefaults,
      };

      const { context, effectiveSection } = createSectionContext(
        section,
        currentEstimate,
        catalogData,
      );

      const hasDoors =
        (sectionCalculations?.faceCounts?.door || 0) +
          (sectionCalculations?.faceCounts?.panel || 0) >
        0;
      const hasDrawerFronts =
        (sectionCalculations?.faceCounts?.drawer_front || 0) +
          (sectionCalculations?.faceCounts?.false_front || 0) >
        0;
      const hasDrawerBoxes =
        (sectionCalculations?.drawerBoxCount || 0) +
          (sectionCalculations?.rollOutCount || 0) >
        0;
      const hasBoxes = (sectionCalculations?.boxCount || 0) > 0;

      const faceMaterial = faceMaterials?.find(
        (m) => m.id === effectiveSection?.face_mat,
      );
      const faceFinishNames =
        faceMaterial?.needs_finish === false
          ? PRE_FINISHED
          : effectiveSection?.face_finish
              ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
              .filter(Boolean)
              .join(", ") || NONE;

      const boxMaterial = boxMaterials?.find(
        (m) => m.id === effectiveSection?.box_mat,
      );
      const boxFinishNames =
        boxMaterial?.needs_finish === false
          ? PRE_FINISHED
          : effectiveSection?.box_finish
              ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
              .filter(Boolean)
              .join(", ") || NONE;

      const drawerBoxMaterialName = hasDrawerBoxes
        ? drawerBoxMaterials?.find(
            (m) => m.id === effectiveSection?.drawer_box_mat,
          )?.name || NONE
        : NONE;

      const cabinetStyleName =
        cabinetStyles?.find(
          (s) => s.cabinet_style_id === effectiveSection?.cabinet_style_id,
        )?.cabinet_style_name || "—";
      const boxMaterialName = hasBoxes
        ? context?.selectedBoxMaterial?.material?.name || "—"
        : NONE;
      const faceMaterialName =
        context?.selectedFaceMaterial?.material?.name || "—";
      const doorStyleName = hasDoors
        ? formatDoorDrawerStyle(effectiveSection?.door_style)
        : NONE;
      const drawerFrontStyleName = hasDrawerFronts
        ? formatDoorDrawerStyle(effectiveSection?.drawer_front_style)
        : NONE;

      // Match GenerateEstimatePdf two-column detail snapshot layout
      const leftColumn = [];
      const rightColumn = [];

      // leftColumn.push(`Style: ${cabinetStyleName}`);
      // leftColumn.push(`Drawer Boxes: ${drawerBoxMaterialName}`);
      // leftColumn.push(`Cabinets: ${boxMaterialName}`);
      // leftColumn.push(`Finish: ${boxFinishNames}`);

      // rightColumn.push(`Doors: ${doorStyleName}`);
      // rightColumn.push(`Drawer Fronts: ${drawerFrontStyleName}`);
      // rightColumn.push(`Wood: ${faceMaterialName}`);
      // rightColumn.push(`Finish: ${faceFinishNames}`);

      leftColumn.push({
        text: [{ text: "Style: ", bold: true }, { text: cabinetStyleName }],
      });
      leftColumn.push({
        text: [
          { text: "Drawer Boxes: ", bold: true },
          { text: drawerBoxMaterialName },
        ],
      });
      leftColumn.push({
        text: [
          { text: "Cabinets: ", bold: true },
          { text: boxMaterialName },
        ],
      });
      leftColumn.push({
        text: [{ text: "Finish: ", bold: true }, { text: boxFinishNames }],
      });

      rightColumn.push({
        text: [{ text: "Doors: ", bold: true }, { text: doorStyleName }],
      });
      rightColumn.push({
        text: [
          { text: "Drawer Fronts: ", bold: true },
          { text: drawerFrontStyleName },
        ],
      });
      rightColumn.push({
        text: [{ text: "Wood: ", bold: true }, { text: faceMaterialName }],
      });
      rightColumn.push({
        text: [{ text: "Finish: ", bold: true }, { text: faceFinishNames }],
      });

      const maxDetailRows = Math.max(leftColumn.length, rightColumn.length);
      const sectionDetailsRows = [];

      for (let index = 0; index < maxDetailRows; index += 1) {
        sectionDetailsRows.push([
          {
            text: leftColumn[index] || "",
            color: "#111827",
          },
          {
            text: rightColumn[index] || "",
            color: "#111827",
          },
        ]);
      }

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
          {
            text: "-",
            alignment: "right",
            color: "#999999",
            fillColor: "#e3f2fd",
          },
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
        const countDisplay = category.count > 0 ? ` (${category.count})` : "";
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

      // Add totals rows
      const totalsRow = [
        { text: "Total Parts", style: "totalsRow", bold: true },
        {
          text: formatCurrency(sectionCalculations?.partsTotalPrice || 0),
          style: "totalsRow",
          alignment: "right",
          bold: true,
        },
      ];
      serviceIds.forEach((serviceId) => {
        const serviceData =
          sectionCalculations?.laborCosts?.costsByService?.[serviceId];
        totalsRow.push({
          text: serviceData ? formatHours(serviceData.hours).toString() : "-",
          style: "totalsRow",
          alignment: "right",
          bold: true,
        });
      });
      tableBody.push(totalsRow);

      const totalServicesRow = [
        { text: "Total Hours Price", style: "totalsRow", bold: true },
        {
          text: formatCurrency(totalServicesCost),
          style: "totalsRow",
          alignment: "right",
          bold: true,
        },
      ];
      serviceIds.forEach((serviceId) => {
        const serviceData =
          sectionCalculations?.laborCosts?.costsByService?.[serviceId];
        totalServicesRow.push({
          text: serviceData ? formatCurrency(serviceData.cost) : "-",
          style: "totalsRow",
          alignment: "right",
          color: "#999999",
          bold: true,
        });
      });
      tableBody.push(totalServicesRow);

      const sectionSummaryContent = [
        {
          columns: [
            { text: "Subtotal (Parts + Labor)", color: "#374151" },
            {
              text: formatCurrency(subtotal),
              alignment: "right",
              color: "#111827",
            },
          ],
          margin: [0, 0, 0, 4],
        },
        ...(sectionProfit > 0
          ? [
              {
                columns: [
                  { text: "Profit", color: "#047857" },
                  {
                    text: `+${formatCurrency(sectionProfit)}`,
                    alignment: "right",
                    color: "#047857",
                  },
                ],
                margin: [0, 0, 0, 4],
              },
            ]
          : []),
        ...(sectionCommission > 0
          ? [
              {
                columns: [
                  { text: "Commission", color: "#1d4ed8" },
                  {
                    text: `+${formatCurrency(sectionCommission)}`,
                    alignment: "right",
                    color: "#1d4ed8",
                  },
                ],
                margin: [0, 0, 0, 4],
              },
            ]
          : []),
        ...(sectionDiscount > 0
          ? [
              {
                columns: [
                  { text: "Discount", color: "#b91c1c" },
                  {
                    text: `-${formatCurrency(sectionDiscount)}`,
                    alignment: "right",
                    color: "#b91c1c",
                  },
                ],
                margin: [0, 0, 0, 6],
              },
            ]
          : []),
        {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 535,
              y2: 0,
              lineWidth: 0.5,
              lineColor: "#cccccc",
            },
          ],
          margin: [0, 2, 0, 6],
        },
        {
          columns: [
            {
              text: "Section Total",
              bold: true,
              fontSize: 11,
              color: "#0f766e",
            },
            {
              text: formatCurrency(sectionTotal),
              alignment: "right",
              bold: true,
              fontSize: 11,
              color: "#0f766e",
            },
          ],
        },
        {
          text: "",
          margin: [0, 2, 0, 2],
        },
        {
          table: {
            widths: ["*", "*"],
            body: sectionDetailsRows,
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
          margin: [0, 4, 0, 0],
        },
      ];

      // Calculate column widths dynamically
      const serviceColumnWidth = serviceIds.length > 0 ? 52 : 0; //service column widths
      const widths = ["*", 70]; //Table Headers => item (category), cost
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
                  projectName && {
                    text: `Project: ${projectName}`,
                    fontSize: 11,
                    margin: [0, 0, 0, 4],
                  },
                  taskName && {
                    text: `Room: ${taskName}`,
                    fontSize: 11,
                    margin: [0, 0, 0, 4],
                  },
                  sectionName && {
                    text: `Section: ${sectionName}`,
                    fontSize: 11,
                    margin: [0, 0, 0, 4],
                  },
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
              hLineWidth: (i, node) =>
                i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
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
          {
            margin: [0, 12, 0, 0],
            stack: sectionSummaryContent,
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
