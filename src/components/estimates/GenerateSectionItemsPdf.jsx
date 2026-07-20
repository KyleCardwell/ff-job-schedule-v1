import PropTypes from "prop-types";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";
import { useSelector } from "react-redux";

import { PANEL_MOD_DISPLAY_NAMES } from "../../utils/constants.js";
import { createSectionContext } from "../../utils/createSectionContext";
import { getEffectiveValueOnly } from "../../utils/estimateDefaults";
import { generateCabinetSummary } from "../../utils/estimateHelpers.js";
import { getSectionCalculations } from "../../utils/getSectionCalculations";
import { decimalToFraction } from "../../utils/mathUtils";
import {
  buildAdditionalSectionNotesText,
  buildDisplayNotesLines,
  buildProcessedSectionNotes,
} from "../../utils/sectionNotesHelpers";

const LENGTH_TYPE_LABELS = {
  molding: "Molding",
  base: "Base",
  shelf: "Shelf",
  top: "Top",
  other: "Other",
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);

  return Number.isInteger(numeric) ? String(numeric) : String(numeric);
};

const formatDimensionInches = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return decimalToFraction(value);
};

const formatFeet = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  return Number.isNaN(numeric) ? String(value) : String(numeric);
};

const buildTableBody = (headerCells, rows) => {
  const headerRow = headerCells.map((cell) => ({
    text: cell,
    style: "tableHeader",
  }));

  const bodyRows = rows.map((row) =>
    row.map((cell) => ({
      text: cell == null || cell === "" ? "-" : String(cell),
      style: "tableCell",
    })),
  );

  return [headerRow, ...bodyRows];
};

const loadPdfMake = async () => {
  if (window.pdfMake) return;

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
};

const GenerateSectionItemsPdf = ({
  section,
  projectName = "",
  taskName = "",
  sectionName = "",
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials,
  );
  const finishTypes = useSelector((state) => state.finishes.finishes);
  const allCabinetStyles = useSelector((state) => state.cabinetStyles?.styles || []);
  const allCabinetTypes = useSelector((state) => state.cabinetTypes?.types || []);
  const hardware = useSelector((state) => state.hardware);
  const accessories = useSelector((state) => state.accessories);
  const lengthsCatalog = useSelector((state) => state.lengths.catalog || []);
  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors.itemsByPartsList,
  );
  const cabinetAnchors = useSelector((state) => state.cabinetAnchors.itemsByType);
  const globalServices = useSelector((state) => state.services.allServices);
  const { teamDefaults } = useSelector((state) => state.teamEstimateDefaults);

  const generatePdf = async () => {
    if (isGenerating) return;

    setIsGenerating(true);

    try {
      await loadPdfMake();

      const sectionId = Number(section?.est_section_id);
      const currentSection = currentEstimate?.tasks
        ?.flatMap((task) => task.sections || [])
        ?.find((estimateSection) =>
          Number.isFinite(sectionId)
            ? Number(estimateSection.est_section_id) === sectionId
            : estimateSection.est_section_id === section?.est_section_id,
        );

      const effectiveDoorPanelModId = getEffectiveValueOnly(
        currentSection?.door_panel_mod_id,
        currentEstimate?.default_door_panel_mod_id,
        teamDefaults?.default_door_panel_mod_id,
      );
      const effectiveDrawerPanelModId = getEffectiveValueOnly(
        currentSection?.drawer_panel_mod_id,
        currentEstimate?.default_drawer_panel_mod_id,
        teamDefaults?.default_drawer_panel_mod_id,
      );
      const effectiveDoorStyle = getEffectiveValueOnly(
        currentSection?.door_style,
        currentEstimate?.default_door_style,
        teamDefaults?.default_door_style,
      );
      const effectiveDrawerStyle = getEffectiveValueOnly(
        currentSection?.drawer_front_style,
        currentEstimate?.default_drawer_front_style,
        teamDefaults?.default_drawer_front_style,
      );
      const effectiveDoorInsideMolding = getEffectiveValueOnly(
        currentSection?.door_inside_molding,
        currentEstimate?.default_door_inside_molding,
        teamDefaults?.default_door_inside_molding,
      );
      const effectiveDoorOutsideMolding = getEffectiveValueOnly(
        currentSection?.door_outside_molding,
        currentEstimate?.default_door_outside_molding,
        teamDefaults?.default_door_outside_molding,
      );
      const effectiveDrawerInsideMolding = getEffectiveValueOnly(
        currentSection?.drawer_inside_molding,
        currentEstimate?.default_drawer_inside_molding,
        teamDefaults?.default_drawer_inside_molding,
      );
      const effectiveDrawerOutsideMolding = getEffectiveValueOnly(
        currentSection?.drawer_outside_molding,
        currentEstimate?.default_drawer_outside_molding,
        teamDefaults?.default_drawer_outside_molding,
      );

      const effectiveSectionLengthMaterialId = getEffectiveValueOnly(
        currentSection?.face_mat ?? null,
        currentEstimate?.default_face_mat ?? null,
        teamDefaults?.default_face_mat ?? null,
      );

      const getCabinetTypeName = (typeId) =>
        allCabinetTypes.find((type) => type.cabinet_type_id === typeId)
          ?.cabinet_type_name || `Type ${typeId}`;

      const getAccessoryName = (item) => {
        if (item.hardware_pull_id) {
          return (
            hardware?.pulls?.find((pull) => pull.id === item.hardware_pull_id)
              ?.name || "Unknown"
          );
        }

        if (item.hardware_hinge_id) {
          return (
            hardware?.hinges?.find((hinge) => hinge.id === item.hardware_hinge_id)
              ?.name || "Unknown"
          );
        }

        if (item.hardware_slide_id) {
          return (
            hardware?.slides?.find((slide) => slide.id === item.hardware_slide_id)
              ?.name || "Unknown"
          );
        }

        return (
          accessories?.catalog?.find((accessory) => accessory.id === item.accessory_catalog_id)
            ?.name || "Unknown"
        );
      };

      const getAccessoryType = (item) => {
        if (item.hardware_pull_id) return "Pull";
        if (item.hardware_hinge_id) return "Hinge";
        if (item.hardware_slide_id) return "Slide";

        const accessoryType = accessories?.catalog?.find(
          (accessory) => accessory.id === item.accessory_catalog_id,
        )?.type;

        const typeLabels = {
          glass: "Glass",
          insert: "Insert",
          hardware: "Hardware",
          shop_built: "Shop-Built",
          organizer: "Organizer",
          other: "Other",
        };

        return typeLabels[accessoryType] || accessoryType || "Unknown";
      };

      const getLengthSummary = (item) => {
        const summaryParts = [];

        const effectiveLengthMaterialId =
          item.length_mat !== null && item.length_mat !== undefined
            ? item.length_mat
            : effectiveSectionLengthMaterialId;
        const effectiveLengthMaterial = faceMaterials?.find(
          (material) => String(material.id) === String(effectiveLengthMaterialId),
        );
        const shouldShowFinish = effectiveLengthMaterial?.needs_finish === true;

        if (item.length_mat !== null && item.length_mat !== undefined) {
          const materialName =
            faceMaterials?.find((material) => material.id === item.length_mat)?.name ||
            `Material ${item.length_mat}`;
          summaryParts.push(materialName);
        }

        if (shouldShowFinish && Array.isArray(item.length_finish)) {
          const finishName =
            item.length_finish.length === 0
              ? "None"
              : item.length_finish
                  .map(
                    (finishId) =>
                      finishTypes?.find((finish) => finish.id === finishId)?.name ||
                      `Finish ${finishId}`,
                  )
                  .join(", ");

          if (finishName) {
            summaryParts.push(`Finish: ${finishName}`);
          }
        }

        return summaryParts.join(" | ");
      };

      const getCabinetSummary = (item) => {
        if (!item?.face_config || item.type === 5) return "";

        const styleOverrideName = item.cabinet_style_override
          ? allCabinetStyles.find(
              (style) => style.cabinet_style_id === item.cabinet_style_override,
            )?.cabinet_style_name || ""
          : "";

        const finBackMaterialSummary =
          item.fin_back_mat != null
            ? faceMaterials.find(
                (material) => Number(material.id) === Number(item.fin_back_mat),
              )?.name || `Material ${item.fin_back_mat}`
            : null;

        const finBackFinishSummary =
          item.fin_back_finish != null
            ? Array.isArray(item.fin_back_finish) && item.fin_back_finish.length === 0
              ? "None"
              : (Array.isArray(item.fin_back_finish) ? item.fin_back_finish : [])
                  .map(
                    (finishId) =>
                      finishTypes.find(
                        (finish) => Number(finish.id) === Number(finishId),
                      )?.name || `Finish ${finishId}`,
                  )
                  .join(", ")
            : null;

        const normalizedFinBackPanelModId =
          item.fin_back_panel_mod != null ? Number(item.fin_back_panel_mod) : null;
        const finBackPanelModSummary =
          item.fin_back_panel_mod != null
            ? normalizedFinBackPanelModId === 0
              ? "None"
              : PANEL_MOD_DISPLAY_NAMES[normalizedFinBackPanelModId] ||
                `Panel Mod ${item.fin_back_panel_mod}`
            : null;

        return (
          generateCabinetSummary(
            item.face_config,
            {
              ...item.type_specific_options,
              cabinetStyleOverride: styleOverrideName,
              finishedLeft: item.finished_left,
              finishedRight: item.finished_right,
              finishedTop: item.finished_top,
              finishedBottom: item.finished_bottom,
              finishedBack: item.finished_back,
              finBackMaterialSummary,
              finBackFinishSummary,
              finBackPanelModSummary,
              quantity: item.quantity,
            },
            item.type,
            item.quantity,
            accessories?.glass || [],
            {
              effectiveDoorPanelModId,
              effectiveDrawerPanelModId,
              effectiveDoorStyle,
              effectiveDrawerStyle,
              effectiveDoorInsideMolding,
              effectiveDoorOutsideMolding,
              effectiveDrawerInsideMolding,
              effectiveDrawerOutsideMolding,
            },
          ) || ""
        );
      };

      const cabinetRows = (Array.isArray(section?.cabinets) ? section.cabinets : []).map(
        (item, index) => [
          index + 1,
          formatNumber(item.quantity),
          getCabinetTypeName(item.type),
          item.finished_interior ? "F" : "U",
          formatDimensionInches(item.width),
          formatDimensionInches(item.height),
          formatDimensionInches(item.depth),
          getCabinetSummary(item),
        ],
      );

      const lengthRows = (Array.isArray(section?.lengths) ? section.lengths : []).map(
        (item, index) => {
          const catalogItem = lengthsCatalog.find(
            (lengthItem) => lengthItem.id === item.length_catalog_id,
          );
          const width = item.width ?? catalogItem?.default_width;
          const thickness = item.thickness ?? catalogItem?.default_thickness;

          return [
            index + 1,
            formatNumber(item.quantity),
            LENGTH_TYPE_LABELS[catalogItem?.type] || catalogItem?.type || "-",
            catalogItem?.name || "Unknown",
            formatFeet(item.length),
            formatDimensionInches(width),
            formatDimensionInches(thickness),
            formatNumber(item.miter_count || 0),
            formatNumber(item.cutout_count || 0),
            getLengthSummary(item),
          ];
        },
      );

      const accessoryRows = (
        Array.isArray(section?.accessories) ? section.accessories : []
      ).map((item, index) => [
        index + 1,
        formatNumber(item.quantity),
        getAccessoryType(item),
        getAccessoryName(item),
        formatDimensionInches(item.width),
        formatDimensionInches(item.height),
        formatDimensionInches(item.depth),
      ]);

      const otherRows = (Array.isArray(section?.other) ? section.other : []).map(
        (item, index) => [
          index + 1,
          formatNumber(item.quantity),
          item.name || "-",
          formatCurrency(item.price || 0),
          formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0)),
          item.note_included ? "Yes" : "No",
        ],
      );

      const catalogData = {
        boxMaterials,
        faceMaterials,
        drawerBoxMaterials,
        finishTypes,
        cabinetStyles: allCabinetStyles.filter((style) => style.is_active),
        cabinetTypes: allCabinetTypes.filter((type) => type.is_active),
        hardware,
        partsListAnchors,
        cabinetAnchors,
        globalServices,
        lengthsCatalog,
        accessories,
        teamDefaults,
      };

      const { context, effectiveSection } = createSectionContext(
        section,
        currentEstimate,
        catalogData,
      );
      const calculations = getSectionCalculations(effectiveSection, context);

      const hasDoors =
        (calculations.faceCounts?.door || 0) + (calculations.faceCounts?.panel || 0) > 0;
      const hasDrawerFronts =
        (calculations.faceCounts?.drawer_front || 0) +
          (calculations.faceCounts?.false_front || 0) >
        0;
      const hasDrawerBoxes =
        (calculations.drawerBoxCount || 0) + (calculations.rollOutCount || 0) > 0;

      const { additionalNotesText, includesText, doesNotIncludeText } =
        buildAdditionalSectionNotesText({
          effectiveSection,
          section,
          estimate: currentEstimate,
          team: teamDefaults,
          hasDoors,
          hasDrawerFronts,
          hasDrawerBoxes,
          faceMaterials,
          finishTypes,
          hardware: context?.hardware,
          lengthsCatalog: context?.lengthsCatalog,
        });

      const processedNotes = buildProcessedSectionNotes(
        section?.notes,
        additionalNotesText,
        doesNotIncludeText,
        includesText,
      );
      const notesLines = buildDisplayNotesLines(processedNotes) || [];

      const today = new Date().toLocaleDateString();
      const content = [
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
              text: "Section Itemized List",
              style: "header",
              alignment: "right",
              width: "auto",
            },
          ],
          columnGap: 12,
          margin: [0, 0, 0, 8],
        },
      ];

      const pushSection = ({ title, headers, widths, rows }) => {
        content.push({ text: title, style: "sectionHeader", margin: [0, 8, 0, 4] });

        if (!rows.length) {
          content.push({ text: "No items.", style: "emptyText", margin: [0, 0, 0, 2] });
          return;
        }

        content.push({
          table: {
            headerRows: 1,
            widths,
            body: buildTableBody(headers, rows),
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => "#d1d5db",
            vLineColor: () => "#d1d5db",
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 3,
            paddingBottom: () => 3,
            fillColor: (rowIndex) => (rowIndex === 0 ? "#f3f4f6" : null),
          },
          margin: [0, 0, 0, 4],
        });
      };

      pushSection({
        title: "Cabinets",
        headers: ["#", "Qty", "Type", "Interior", "W (in)", "H (in)", "D (in)", "Notes"],
        widths: [20, 28, 88, 52, 50, 50, 50, "*"],
        rows: cabinetRows,
      });

      pushSection({
        title: "Lengths",
        headers: [
          "#",
          "Qty",
          "Type",
          "Name",
          "Length (ft)",
          "Width (in)",
          "Thk (in)",
          "Miters",
          "Cutouts",
          "Notes",
        ],
        widths: [20, 28, 50, 88, 46, 46, 40, 38, 44, "*"],
        rows: lengthRows,
      });

      pushSection({
        title: "Accessories",
        headers: ["#", "Qty", "Type", "Name", "W (in)", "H (in)", "D (in)"],
        widths: [20, 28, 58, "*", 50, 50, 50],
        rows: accessoryRows,
      });

      pushSection({
        title: "Other",
        headers: ["#", "Qty", "Name", "Cost", "Total", "Include"],
        widths: [20, 28, "*", 60, 60, 55],
        rows: otherRows,
      });

      content.push({ text: "Section Notes", style: "sectionHeader", margin: [0, 8, 0, 4] });

      if (notesLines.length > 0) {
        content.push({
          ul: notesLines.map((line) => ({ text: line, style: "noteLine" })),
          margin: [0, 0, 0, 6],
        });
      } else {
        content.push({ text: "No section notes.", style: "emptyText", margin: [0, 0, 0, 6] });
      }

      const docDefinition = {
        pageSize: "LETTER",
        pageOrientation: "portrait",
        pageMargins: [24, 24, 24, 40],
        content,
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
          sectionHeader: {
            fontSize: 11,
            bold: true,
            color: "#0f172a",
          },
          tableHeader: {
            bold: true,
            fontSize: 8,
            color: "#111827",
          },
          tableCell: {
            fontSize: 8,
            color: "#1f2937",
          },
          noteLine: {
            fontSize: 9,
            color: "#111827",
          },
          emptyText: {
            fontSize: 9,
            italics: true,
            color: "#6b7280",
          },
        },
        defaultStyle: {
          fontSize: 9,
        },
      };

      const fileName = `${projectName} - ${taskName} - ${sectionName} - Itemized List`;
      window.pdfMake.createPdf(docDefinition).download(`${fileName}.pdf`);
    } catch (error) {
      void error;
      alert("There was an error generating the itemized PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePdf}
      disabled={isGenerating}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
    >
      <FiFileText size={18} />
      {isGenerating ? "Generating..." : "Items PDF"}
    </button>
  );
};

GenerateSectionItemsPdf.propTypes = {
  section: PropTypes.object,
  projectName: PropTypes.string,
  taskName: PropTypes.string,
  sectionName: PropTypes.string,
};

export default GenerateSectionItemsPdf;
