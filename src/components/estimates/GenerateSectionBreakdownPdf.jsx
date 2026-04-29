import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";
import { useSelector } from "react-redux";

import {
  EXCLUDED_HOURS_PART_KEYS_BY_CATEGORY,
  NONE,
  PANEL_MOD_PART_KEY_BY_FACE_TYPE,
  PRE_FINISHED,
  PULLS_PART_KEYS_BY_TYPE,
} from "../../utils/constants";
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

  const hasExcludedPartKey = (partKey) =>
    sectionCalculations?.partsIncluded?.[partKey] === false;

  const getExcludedHoursForCategoryService = (
    categoryTitle,
    serviceId,
    totalHours,
  ) => {
    const numericTotalHours = Number(totalHours) || 0;
    if (numericTotalHours <= 0) return 0;

    if (categoryTitle === "Pulls") {
      if (hasExcludedPartKey("pullsTotal")) return numericTotalHours;

      const pullsByType = sectionCalculations?.categoryHours?.pullsByType || {};
      const excludedPullHours = Object.entries(PULLS_PART_KEYS_BY_TYPE).reduce(
        (sum, [pullType, partKeys]) => {
          const shouldExcludePullType = (partKeys || []).some((partKey) =>
            hasExcludedPartKey(partKey),
          );
          if (!shouldExcludePullType) return sum;

          return sum + (Number(pullsByType?.[pullType]?.[serviceId]) || 0);
        },
        0,
      );

      return Math.min(numericTotalHours, excludedPullHours);
    }

    if (categoryTitle === "Panel Mods") {
      const panelModsByFaceType =
        sectionCalculations?.categoryHours?.panelModsByFaceType || {};

      const excludedPanelModHours = Object.entries(
        PANEL_MOD_PART_KEY_BY_FACE_TYPE,
      ).reduce((sum, [faceType, partKey]) => {
        if (!hasExcludedPartKey(partKey)) return sum;
        return (
          sum +
          (Number(panelModsByFaceType?.[faceType]?.[serviceId]) || 0)
        );
      }, 0);

      return Math.min(numericTotalHours, excludedPanelModHours);
    }

    const partKeys = EXCLUDED_HOURS_PART_KEYS_BY_CATEGORY[categoryTitle] || [];
    const excludeCategoryHours = partKeys.some((partKey) =>
      hasExcludedPartKey(partKey),
    );
    return excludeCategoryHours ? numericTotalHours : 0;
  };

  const getCategoryServiceHoursPdfText = ({
    categoryTitle,
    serviceId,
    totalHours,
    hasItemHourRows,
    showAggregate,
  }) => {
    if (!totalHours) return "-";

    const excludedHours = getExcludedHoursForCategoryService(
      categoryTitle,
      serviceId,
      totalHours,
    );
    const includedHours = Math.max(0, (Number(totalHours) || 0) - excludedHours);

    if (excludedHours <= 0) {
      const includedText = hasItemHourRows
        ? `(${formatHours(includedHours).toString()})`
        : formatHours(includedHours).toString();
      return showAggregate && includedHours > 0 ? `${includedText} ^` : includedText;
    }

    const text = [
      {
        text: `(${formatHours(excludedHours).toString()})`,
        color: "#d97706",
      },
    ];

    if (includedHours > 0) {
      const includedText = hasItemHourRows
        ? `(${formatHours(includedHours).toString()})`
        : formatHours(includedHours).toString();
      text.push({ text: ` ${includedText}` });

      if (showAggregate) {
        text.push({ text: " ^", color: "#6b7280" });
      }
    }

    return text;
  };

  const getItemServiceHoursPdfText = (hours, hasExcludedHours) => {
    if (!hours) return "-";

    const excludedHours = hasExcludedHours ? Number(hours) || 0 : 0;
    const includedHours = Math.max(0, (Number(hours) || 0) - excludedHours);

    if (excludedHours > 0) {
      return [
        {
          text: `(${formatHours(excludedHours).toString()})`,
          color: "#d97706",
        },
        {
          text: ` ${includedHours > 0 ? formatHours(includedHours).toString() : "-"}`,
        },
      ];
    }

    return formatHours(hours).toString();
  };

  const getItemHourRows = (categoryTitle) => {
    if (categoryTitle === "Other") {
      const otherItems = Array.isArray(section?.other) ? section.other : [];

      return otherItems
        .map((item, index) => ({
          id: item?.id || item?.temp_id || `other-${index}`,
          name: item?.name || "Other",
          quantity: Number(item?.quantity) || 0,
          price: (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
          hoursByService: {},
        }))
        .filter(
          (item) =>
            item.name || Number(item.quantity) > 0 || Number(item.price) > 0,
        )
        .sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    }

    const itemHoursByCatalog =
      categoryTitle === "Lengths"
        ? sectionCalculations?.categoryHours?.lengthsByCatalog
        : categoryTitle === "Accessories"
          ? sectionCalculations?.categoryHours?.accessoriesByCatalog
          : null;

    if (!itemHoursByCatalog || typeof itemHoursByCatalog !== "object") {
      return [];
    }

    return Object.values(itemHoursByCatalog)
      .filter((item) => {
        if (!item?.hoursByService) return false;
        return Object.values(item.hoursByService).some((hours) => hours > 0);
      })
      .sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
  };

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

      const hasExcludedHoursMarker = activeCategories.some((cat) => {
        if (cat.skipHours) return false;
        return Object.entries(cat.hoursByService || {}).some(
          ([serviceId, hours]) =>
            getExcludedHoursForCategoryService(cat.title, serviceId, hours) > 0,
        );
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
      const boxFinishNames = hasBoxes
        ? boxMaterial?.needs_finish === false
          ? PRE_FINISHED
          : effectiveSection?.box_finish
              ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
              .filter(Boolean)
              .join(", ") || NONE
        : NONE;

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

      const sectionDetailsColumns = [
        {
          topLabel: "Style",
          topValue: cabinetStyleName,
          bottomLabel: "Drawers",
          bottomValue: drawerBoxMaterialName,
        },
        {
          topLabel: "Cabinets",
          topValue: boxMaterialName,
          bottomLabel: "Finish",
          bottomValue: boxFinishNames,
        },
        {
          topLabel: "Doors",
          topValue: doorStyleName,
          bottomLabel: "DF's",
          bottomValue: drawerFrontStyleName,
        },
        {
          topLabel: "Wood",
          topValue: faceMaterialName,
          bottomLabel: "Finish",
          bottomValue: faceFinishNames,
        },
      ];

      const sectionDetailsCells = sectionDetailsColumns.map((col) => ({
        stack: [
          {
            text: [
              { text: `${col.topLabel}: `, bold: true },
              { text: col.topValue },
            ],
            color: "#111827",
          },
          {
            text: [
              { text: `${col.bottomLabel}: `, bold: true },
              { text: col.bottomValue },
            ],
            color: "#111827",
            margin: [0, 2, 0, 0],
          },
        ],
      }));

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
          if (serviceId === 3 && !sectionCalculations.finishSetupNeeded) {
            laborRow.push({
              text: "-",
              alignment: "right",
              color: "#999999",
              fillColor: "#e3f2fd",
            });
            return;
          }
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
        const showAggregate = category.showAggregateNote && !category.skipHours;
        const itemHourRows = getItemHourRows(category.title);
        const hasItemHourRows = itemHourRows.length > 0;
        const hasExcludedHours =
          !category.skipHours &&
          Object.entries(category.hoursByService || {}).some(
            ([serviceId, hours]) =>
              getExcludedHoursForCategoryService(category.title, serviceId, hours) >
              0,
          );
        const row = [
          {
            text: hasExcludedHours
              ? [
                  { text: category.title },
                  { text: "*", color: "#d97706" },
                  { text: countDisplay },
                ]
              : `${category.title}${countDisplay}`,
            style: "itemName",
          },
          {
            text: hasItemHourRows
              ? `(${formatCurrency(category.cost)})`
              : formatCurrency(category.cost),
            alignment: "right",
          },
        ];

        serviceIds.forEach((serviceId) => {
          if (category.skipHours) {
            row.push({ text: "-", alignment: "right", color: "#999999" });
          } else {
            const hours = category.hoursByService?.[serviceId];
            row.push({
              text: getCategoryServiceHoursPdfText({
                categoryTitle: category.title,
                serviceId,
                totalHours: hours,
                hasItemHourRows,
                showAggregate,
              }),
              alignment: "right",
            });
          }
        });

        tableBody.push(row);

        itemHourRows.forEach((itemHours) => {
          const itemRow = [
            {
              text: `- ${itemHours.name} ${itemHours.length ? `(${itemHours.quantity > 1 ? `${itemHours.quantity} @ ` : ""}${itemHours.length} ft)` : itemHours.quantity ? `(${itemHours.quantity})` : ""}`,
              style: "itemSubRow",
              color: "#4b5563",
            },
            {
              text: itemHours.price ? formatCurrency(itemHours.price) : "-",
              alignment: "right",
              color: itemHours.price ? "#4b5563" : "#9ca3af",
            },
          ];

          serviceIds.forEach((serviceId) => {
            const hours = itemHours.hoursByService?.[serviceId];
            itemRow.push({
              text: getItemServiceHoursPdfText(hours, hasExcludedHours),
              alignment: "right",
              color: hours ? "#4b5563" : "#9ca3af",
            });
          });

          tableBody.push(itemRow);
        });
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
        ...(hasExcludedHoursMarker
          ? [
              {
                text: "(x) is excluded from totals; values outside parentheses are included.",
                color: "#b45309",
                margin: [0, 0, 0, 4],
              },
            ]
          : []),
        {
          columns: [
            {
              stack: [
                {
                  text: "Subtotal (Parts + Labor)",
                  color: "#374151",
                  alignment: "center",
                },
                {
                  text: formatCurrency(subtotal),
                  color: "#111827",
                  alignment: "center",
                  bold: true,
                  margin: [0, 2, 0, 0],
                },
              ],
            },
            {
              stack: [
                {
                  text: "Profit",
                  color: "#047857",
                  alignment: "center",
                },
                {
                  text:
                    sectionProfit >= 0
                      ? `+${formatCurrency(sectionProfit)}`
                      : `-${formatCurrency(Math.abs(sectionProfit))}`,
                  color: "#047857",
                  alignment: "center",
                  bold: true,
                  margin: [0, 2, 0, 0],
                },
              ],
            },
            {
              stack: [
                {
                  text: "Commission",
                  color: "#1d4ed8",
                  alignment: "center",
                },
                {
                  text:
                    sectionCommission >= 0
                      ? `+${formatCurrency(sectionCommission)}`
                      : `-${formatCurrency(Math.abs(sectionCommission))}`,
                  color: "#1d4ed8",
                  alignment: "center",
                  bold: true,
                  margin: [0, 2, 0, 0],
                },
              ],
            },
            {
              stack: [
                {
                  text: "Section Total",
                  color: "#0f766e",
                  alignment: "center",
                  bold: true,
                },
                {
                  text: formatCurrency(sectionTotal),
                  color: "#0f766e",
                  alignment: "center",
                  bold: true,
                  fontSize: 11,
                  margin: [0, 2, 0, 0],
                },
              ],
            },
          ],
          columnGap: 8,
          margin: [0, 0, 0, 4],
        },
        ...(sectionDiscount > 0
          ? [
              {
                text: `Discount Applied: -${formatCurrency(sectionDiscount)}`,
                alignment: "right",
                color: "#b91c1c",
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
              x2: 552,
              y2: 0,
              lineWidth: 0.5,
              lineColor: "#cccccc",
            },
          ],
          margin: [0, 2, 0, 6],
        },
        {
          table: {
            widths: [130, 190, 80, 190],
            body: [sectionDetailsCells],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
          margin: [0, 2, 0, 0],
        },
      ];

      // Calculate column widths dynamically
      const serviceColumnWidth = serviceIds.length > 0 ? 52 : 0; //service column widths
      const widths = ["*", 70]; //Table Headers => item (category), cost
      serviceIds.forEach(() => widths.push(serviceColumnWidth));

      const docDefinition = {
        pageSize: "LETTER",
        pageOrientation: "portrait",
        pageMargins: [24, 24, 24, 40],
        content: [
          {
            columns: [
              {
                stack: [
                  projectName && {
                    text: `Project: ${projectName}`,
                    fontSize: 9,
                    margin: [0, 0, 0, 2],
                  },
                  taskName && {
                    text: `Room: ${taskName}`,
                    fontSize: 9,
                    margin: [0, 0, 0, 2],
                  },
                  sectionName && {
                    text: `Section: ${sectionName}`,
                    fontSize: 9,
                    margin: [0, 0, 0, 2],
                  },
                ].filter(Boolean),
                width: "*",
              },
              {
                text: "Section Parts & Labor Breakdown",
                style: "header",
                alignment: "right",
                width: "auto",
              },
            ],
            columnGap: 12,
            margin: [0, 0, 0, 4],
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
              paddingLeft: () => 6,
              paddingRight: () => 6,
              paddingTop: () => 4,
              paddingBottom: () => 4,
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
            fontSize: 14,
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
          itemSubRow: {
            fontSize: 8,
          },
          totalsRow: {
            fontSize: 9,
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
