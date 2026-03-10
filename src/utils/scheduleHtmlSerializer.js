import { format } from "date-fns";

/**
 * Serializes the visible schedule DOM into a self-contained HTML string
 * suitable for Playwright PDF rendering. Clones the export container,
 * inlines all computed styles, clips SVGs to the visible date window,
 * and returns a complete HTML document string.
 */
export function serializeScheduleHtml({
  exportContainer,
  scrollableContainer,
  dayWidth,
  leftColumnWidth,
  printVisibleDays,
  numDays,
  chartHeight,
  employeesScheduledHeight,
  headerHeight,
}) {
  if (!exportContainer || !scrollableContainer) return null;

  const scrollLeft = scrollableContainer.scrollLeft || 0;
  const snappedScrollLeft =
    Math.max(0, Math.floor(scrollLeft / dayWidth) * dayWidth);

  const calendarWidthPx = dayWidth * printVisibleDays;
  const exportWidthPx = leftColumnWidth + calendarWidthPx;
  const fullContentHeight = headerHeight + employeesScheduledHeight + chartHeight;
  const footerHeight = 48;
  const exportHeightPx = fullContentHeight + footerHeight;
  const fullChartWidth = numDays * dayWidth;

  // Clone the export container
  const clone = exportContainer.cloneNode(true);

  // 1. Remove all sticky positioning
  clone.querySelectorAll("*").forEach((el) => {
    if (el.style.position === "sticky" || el.classList.contains("sticky")) {
      el.style.position = "relative";
    }
  });

  // 2. Fix the export root
  const clonedExportRoot = clone;
  clonedExportRoot.style.width = `${exportWidthPx}px`;
  clonedExportRoot.style.height = `${exportHeightPx}px`;
  clonedExportRoot.style.maxHeight = "none";
  clonedExportRoot.style.overflow = "visible";
  clonedExportRoot.style.display = "block";

  // 3. Fix viewport
  const clonedViewport = clone.querySelector(
    "[data-schedule-export-viewport='true']"
  );
  if (clonedViewport) {
    clonedViewport.style.overflow = "visible";
    clonedViewport.style.maxHeight = "none";
    clonedViewport.style.height = `${fullContentHeight}px`;
    clonedViewport.style.flexGrow = "0";
  }

  // 4. Fix the grid
  const clonedScrollable = clone.querySelector(
    "[data-schedule-scrollable='true']"
  );
  if (clonedScrollable) {
    clonedScrollable.style.transform = "none";
    clonedScrollable.style.width = `${exportWidthPx}px`;
    clonedScrollable.style.maxWidth = `${exportWidthPx}px`;
    clonedScrollable.style.height = `${fullContentHeight}px`;
    clonedScrollable.style.maxHeight = "none";
    clonedScrollable.style.overflow = "hidden";
    clonedScrollable.style.display = "grid";
    clonedScrollable.style.gridTemplateColumns = `${leftColumnWidth}px ${calendarWidthPx}px`;
  }

  // 5. Fix left column elements
  const clonedLeftHeader = clone.querySelector(
    "[data-schedule-left-header='true']"
  );
  if (clonedLeftHeader) {
    clonedLeftHeader.style.position = "relative";
    clonedLeftHeader.style.marginLeft = "0";
    clonedLeftHeader.style.width = `${leftColumnWidth}px`;
  }

  const clonedLeftColumn = clone.querySelector(
    "[data-schedule-left-column='true']"
  );
  if (clonedLeftColumn) {
    clonedLeftColumn.style.position = "relative";
    clonedLeftColumn.style.marginLeft = "0";
    clonedLeftColumn.style.width = `${leftColumnWidth}px`;
  }

  // 6. Clip SVGs to visible window using viewBox
  if (clonedScrollable) {
    clonedScrollable.querySelectorAll("svg").forEach((svg) => {
      const attrW = parseFloat(svg.getAttribute("width"));
      const styleW = parseFloat(svg.style.width);
      const svgWidth = attrW || styleW || 0;

      const attrH = parseFloat(svg.getAttribute("height"));
      const styleH = parseFloat(svg.style.height);
      const svgHeight = attrH || styleH || 0;

      if (svgWidth > leftColumnWidth && svgHeight > 0) {
        svg.setAttribute(
          "viewBox",
          `${snappedScrollLeft} 0 ${calendarWidthPx} ${svgHeight}`
        );
        svg.setAttribute("width", calendarWidthPx);
        svg.setAttribute("height", svgHeight);
        svg.style.width = `${calendarWidthPx}px`;
        svg.style.height = `${svgHeight}px`;
      }
    });
  }

  // 7. Fix month header row
  const rightHeaderCell = clone.querySelector(
    "[data-schedule-right-header='true']"
  );
  if (rightHeaderCell) {
    rightHeaderCell.style.overflow = "hidden";
    rightHeaderCell.style.width = `${calendarWidthPx}px`;
    rightHeaderCell.style.top = "0";
    rightHeaderCell.style.alignSelf = "start";
    rightHeaderCell.style.position = "relative";

    const monthRow = rightHeaderCell.firstElementChild;
    if (monthRow && monthRow.tagName !== "SVG") {
      monthRow.style.width = `${fullChartWidth}px`;
      monthRow.style.minWidth = `${fullChartWidth}px`;
      monthRow.style.flexShrink = "0";
      monthRow.style.transform = `translateX(-${snappedScrollLeft}px)`;

      Array.from(monthRow.children).forEach((monthDiv) => {
        monthDiv.style.flexShrink = "0";
      });

      monthRow.querySelectorAll(".sticky").forEach((stickyLabel) => {
        stickyLabel.style.position = "static";
        stickyLabel.style.left = "auto";
      });
    }
  }

  // 8. Fix chart cell
  const chartCell = clone.querySelector(
    "[data-schedule-scrollable='true'] > .relative.z-10"
  );
  if (chartCell) {
    chartCell.style.overflow = "hidden";
    chartCell.style.width = `${calendarWidthPx}px`;
    chartCell.style.height = `${chartHeight}px`;
  }

  // 9. Footer
  const clonedFooter = clone.querySelector(".gantt-footer");
  if (clonedFooter) {
    clonedFooter.style.position = "static";
    clonedFooter.style.width = `${exportWidthPx}px`;
    clonedFooter.style.boxShadow = "none";
  }

  // 10. Hide elements not needed in export
  const clonedDateFilter = clone.querySelector(
    "[data-schedule-date-filter='true']"
  );
  if (clonedDateFilter) clonedDateFilter.style.display = "none";

  const clonedLoadingOverlay = clone.querySelector(
    "[data-schedule-loading-overlay='true']"
  );
  if (clonedLoadingOverlay) clonedLoadingOverlay.style.display = "none";

  // Now inline all computed styles from the live DOM onto the cloned DOM
  inlineComputedStyles(exportContainer, clone);

  // Build self-contained HTML document
  const htmlString = buildHtmlDocument(clone, exportWidthPx, exportHeightPx);
  return htmlString;
}

/**
 * Walk the live DOM and cloned DOM in parallel, copying key computed styles
 * to inline style on the clone. This ensures Playwright renders identically
 * without needing Tailwind CSS loaded.
 */
function inlineComputedStyles(liveRoot, cloneRoot) {
  const liveElements = liveRoot.querySelectorAll("*");
  const cloneElements = cloneRoot.querySelectorAll("*");

  // Properties that matter for layout/visual fidelity
  const styleProps = [
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "margin",
    "padding",
    "border",
    "borderRadius",
    "backgroundColor",
    "color",
    "fontSize",
    "fontWeight",
    "fontFamily",
    "lineHeight",
    "textAlign",
    "verticalAlign",
    "overflow",
    "overflowX",
    "overflowY",
    "flex",
    "flexDirection",
    "flexWrap",
    "flexGrow",
    "flexShrink",
    "alignItems",
    "justifyContent",
    "gap",
    "gridTemplateColumns",
    "gridTemplateRows",
    "gridColumn",
    "gridRow",
    "zIndex",
    "opacity",
    "transform",
    "boxSizing",
    "whiteSpace",
    "textOverflow",
    "letterSpacing",
    "cursor",
    "visibility",
    "boxShadow",
    "borderBottom",
    "borderTop",
    "borderLeft",
    "borderRight",
    "printColorAdjust",
    "WebkitPrintColorAdjust",
  ];

  for (let i = 0; i < liveElements.length && i < cloneElements.length; i++) {
    const liveEl = liveElements[i];
    const cloneEl = cloneElements[i];

    // Skip SVG internals — their attributes are already correct
    if (liveEl.closest("svg") && liveEl.tagName !== "svg") continue;

    try {
      const computed = window.getComputedStyle(liveEl);
      for (const prop of styleProps) {
        const val = computed[prop];
        if (val && val !== "auto" && val !== "none" && val !== "normal") {
          // Don't override styles we explicitly set in the serializer
          if (!cloneEl.style[prop]) {
            cloneEl.style[prop] = val;
          }
        }
      }
    } catch {
      // Skip elements that can't be computed
    }
  }
}

/**
 * Build a complete HTML document string from the cloned DOM.
 * Includes a minimal reset and the serialized content.
 */
function buildHtmlDocument(cloneRoot, widthPx, heightPx) {
  const dateStr = format(new Date(), "MM-dd-yyyy");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Schedule ${dateStr}</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    width: ${widthPx}px;
    height: ${heightPx}px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #ffffff;
  }
  svg {
    overflow: visible;
  }
</style>
</head>
<body>
${cloneRoot.outerHTML}
</body>
</html>`;
}

/**
 * Send the serialized HTML to the backend for Playwright PDF generation.
 * Returns the PDF as a Blob for download.
 */
export async function generatePlaywrightPdf({
  html,
  pdfWidthInches,
  pdfHeightInches,
  fileName,
}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (!backendUrl) {
    throw new Error(
      "VITE_BACKEND_URL is not configured. Set it in your .env file."
    );
  }

  const response = await fetch(`${backendUrl}/api/generate-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html,
      options: {
        width: `${pdfWidthInches}in`,
        height: `${pdfHeightInches}in`,
        printBackground: true,
        margin: {
          top: "0.25in",
          right: "0.25in",
          bottom: "0.25in",
          left: "0.25in",
        },
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.pdf) {
    throw new Error("Server did not return a valid PDF");
  }

  // Convert base64 to blob and trigger download
  const binaryStr = atob(data.pdf);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
