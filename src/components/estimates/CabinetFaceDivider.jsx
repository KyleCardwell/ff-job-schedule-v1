import * as d3 from "d3";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { FiX, FiSave, FiRotateCcw } from "react-icons/fi";

const FACE_TYPES = [
  { value: "door", label: "Door", color: "#3B82F6" },
  { value: "drawer", label: "Drawer", color: "#10B981" },
  { value: "pair_door", label: "Pair Door", color: "#8B5CF6" },
  { value: "open", label: "Open", color: "#F59E0B" },
  { value: "panel", label: "Panel", color: "#6B7280" },
];

const CabinetFaceDivider = ({ 
  cabinetWidth, 
  cabinetHeight, 
  faceConfig = [], 
  onSave, 
  onCancel 
}) => {
  const svgRef = useRef();
  const [config, setConfig] = useState(faceConfig);
  const [selectedRect, setSelectedRect] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });

  // Scale factor to fit cabinet in a reasonable display size
  const maxDisplayWidth = 300;
  const maxDisplayHeight = 400;
  const scaleX = Math.min(maxDisplayWidth / cabinetWidth, maxDisplayHeight / cabinetHeight);
  const scaleY = scaleX; // Keep aspect ratio
  const displayWidth = cabinetWidth * scaleX;
  const displayHeight = cabinetHeight * scaleY;

  useEffect(() => {
    if (!config.length) {
      // Initialize with a single full-size rectangle
      setConfig([[{
        type: "door",
        width: cabinetWidth,
        height: cabinetHeight,
        id: "root"
      }]]);
    }
  }, [cabinetWidth, cabinetHeight, config.length]);

  useEffect(() => {
    renderCabinet();
  }, [config, displayWidth, displayHeight]);

  const renderCabinet = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Add background
    svg.append("rect")
      .attr("width", displayWidth)
      .attr("height", displayHeight)
      .attr("fill", "#F8FAFC")
      .attr("stroke", "#E2E8F0")
      .attr("stroke-width", 2);

    let currentY = 0;
    
    config.forEach((row, rowIndex) => {
      let currentX = 0;
      const rowHeight = row[0]?.height * scaleY || 0;

      row.forEach((rect, rectIndex) => {
        const rectWidth = rect.width * scaleX;
        const rectHeight = rect.height * scaleY;
        const faceType = FACE_TYPES.find(t => t.value === rect.type);
        
        // Draw rectangle
        const rectElement = svg.append("rect")
          .attr("x", currentX)
          .attr("y", currentY)
          .attr("width", rectWidth)
          .attr("height", rectHeight)
          .attr("fill", faceType?.color || "#6B7280")
          .attr("fill-opacity", 0.3)
          .attr("stroke", faceType?.color || "#6B7280")
          .attr("stroke-width", 2)
          .attr("cursor", "pointer")
          .on("click", (event) => {
            event.stopPropagation();
            handleRectClick(event, rowIndex, rectIndex, rect);
          });

        // Add text label
        svg.append("text")
          .attr("x", currentX + rectWidth / 2)
          .attr("y", currentY + rectHeight / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", faceType?.color || "#6B7280")
          .attr("font-size", "12px")
          .attr("font-weight", "500")
          .text(faceType?.label || rect.type)
          .style("pointer-events", "none");

        // Add dimensions text
        if (rectWidth > 60 && rectHeight > 30) {
          svg.append("text")
            .attr("x", currentX + rectWidth / 2)
            .attr("y", currentY + rectHeight / 2 + 15)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "#64748B")
            .attr("font-size", "10px")
            .text(`${rect.width}" × ${rect.height}"`)
            .style("pointer-events", "none");
        }

        currentX += rectWidth;
      });

      currentY += rowHeight;
    });

    // Add click handler to SVG background for closing selector
    svg.on("click", () => {
      setShowTypeSelector(false);
      setSelectedRect(null);
    });
  };

  const handleRectClick = (event, rowIndex, rectIndex, rect) => {
    const svgRect = svgRef.current.getBoundingClientRect();
    setSelectorPosition({
      x: event.clientX - svgRect.left,
      y: event.clientY - svgRect.top
    });
    setSelectedRect({ rowIndex, rectIndex, rect });
    setShowTypeSelector(true);
  };

  const handleTypeChange = (newType) => {
    if (!selectedRect) return;

    const newConfig = [...config];
    newConfig[selectedRect.rowIndex][selectedRect.rectIndex] = {
      ...selectedRect.rect,
      type: newType
    };
    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedRect(null);
  };

  const handleSplitHorizontal = () => {
    if (!selectedRect) return;

    const { rowIndex, rectIndex, rect } = selectedRect;
    const newConfig = [...config];
    const halfHeight = rect.height / 2;

    // Replace the selected rectangle with two stacked rectangles
    const newRow1 = [...newConfig[rowIndex]];
    const newRow2 = [...newConfig[rowIndex]];

    newRow1[rectIndex] = { ...rect, height: halfHeight };
    newRow2[rectIndex] = { ...rect, height: halfHeight };

    // Insert the new row
    newConfig.splice(rowIndex, 1, newRow1, newRow2);
    
    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedRect(null);
  };

  const handleSplitVertical = () => {
    if (!selectedRect) return;

    const { rowIndex, rectIndex, rect } = selectedRect;
    const newConfig = [...config];
    const halfWidth = rect.width / 2;

    // Split the rectangle in the current row
    const newRow = [...newConfig[rowIndex]];
    newRow.splice(rectIndex, 1, 
      { ...rect, width: halfWidth },
      { ...rect, width: halfWidth }
    );

    newConfig[rowIndex] = newRow;
    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedRect(null);
  };

  const handleReset = () => {
    setConfig([[{
      type: "door",
      width: cabinetWidth,
      height: cabinetHeight,
      id: "root"
    }]]);
    setShowTypeSelector(false);
    setSelectedRect(null);
  };

  const handleSave = () => {
    onSave(config);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium text-slate-700">
          Cabinet Face Designer
        </h4>
        <div className="flex space-x-2">
          <button
            onClick={handleReset}
            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 flex items-center"
            title="Reset to single door"
          >
            <FiRotateCcw className="mr-1" />
            Reset
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center"
          >
            <FiX className="mr-1" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center"
          >
            <FiSave className="mr-1" />
            Save
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          width={displayWidth}
          height={displayHeight}
          className="border border-slate-300 rounded"
        />

        {/* Type Selector Popup */}
        {showTypeSelector && selectedRect && (
          <div
            className="absolute bg-white border border-slate-300 rounded-lg shadow-lg p-2 z-10"
            style={{
              left: Math.min(selectorPosition.x, displayWidth - 200),
              top: Math.min(selectorPosition.y, displayHeight - 200)
            }}
          >
            <div className="text-xs font-medium text-slate-700 mb-2">
              Change Type:
            </div>
            <div className="grid grid-cols-1 gap-1 mb-3">
              {FACE_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleTypeChange(type.value)}
                  className={`px-2 py-1 text-xs rounded flex items-center ${
                    selectedRect.rect.type === type.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded mr-2"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.label}
                </button>
              ))}
            </div>
            
            <div className="border-t border-slate-200 pt-2">
              <div className="text-xs font-medium text-slate-700 mb-2">
                Split:
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={handleSplitHorizontal}
                  className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                >
                  Horizontal
                </button>
                <button
                  onClick={handleSplitVertical}
                  className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                >
                  Vertical
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Cabinet: {cabinetWidth}&quot; W × {cabinetHeight}&quot; H
        <br />
        Click rectangles to change type or split them into smaller sections.
      </div>
    </div>
  );
};

CabinetFaceDivider.propTypes = {
  cabinetWidth: PropTypes.number.isRequired,
  cabinetHeight: PropTypes.number.isRequired,
  faceConfig: PropTypes.array,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default CabinetFaceDivider;
