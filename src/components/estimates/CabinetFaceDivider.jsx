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
  { value: "container", label: "Container", color: "#E5E7EB" },
];

const CabinetFaceDivider = ({
  cabinetWidth,
  cabinetHeight,
  faceConfig = null,
  onSave,
  onCancel,
}) => {
  const svgRef = useRef();
  const [config, setConfig] = useState(faceConfig);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });

  // Scale factor to fit cabinet in a reasonable display size
  const maxDisplayWidth = 300;
  const maxDisplayHeight = 400;
  const scaleX = Math.min(
    maxDisplayWidth / cabinetWidth,
    maxDisplayHeight / cabinetHeight
  );
  const scaleY = scaleX; // Keep aspect ratio
  const displayWidth = cabinetWidth * scaleX;
  const displayHeight = cabinetHeight * scaleY;

  useEffect(() => {
    if (!config || (Array.isArray(config) && config.length === 0)) {
      // Initialize with a single root node for new cabinets or empty configs
      setConfig({
        id: "root",
        type: "door",
        width: cabinetWidth,
        height: cabinetHeight,
        x: 0,
        y: 0,
        children: null,
      });
    } else if (config && !config.id) {
      // Ensure existing config has an id
      setConfig({
        ...config,
        id: "root",
      });
    }
  }, [cabinetWidth, cabinetHeight, config]);

  useEffect(() => {
    renderCabinet();
  }, [config, displayWidth, displayHeight]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && showTypeSelector) {
        setShowTypeSelector(false);
        setSelectedNode(null);
      }
    };

    const handleClickOutside = (event) => {
      if (showTypeSelector) {
        // Check if click is outside the popup
        const popup = event.target.closest(".type-selector-popup");
        const svg = event.target.closest("svg");

        // Close if clicking outside popup but not on SVG (SVG has its own handler)
        if (!popup && !svg) {
          setShowTypeSelector(false);
          setSelectedNode(null);
        }
      }
    };

    if (showTypeSelector) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTypeSelector]);

  // Generate unique ID for new nodes
  const generateId = (parentId, index) => {
    if (!parentId || parentId === "root") {
      return index.toString();
    }
    return `${parentId}-${index}`;
  };

  // Calculate layout for all nodes recursively
  const calculateLayout = (
    node,
    x = 0,
    y = 0,
    width = cabinetWidth,
    height = cabinetHeight
  ) => {
    node.x = x;
    node.y = y;

    if (!node.children || node.children.length === 0) {
      // For leaf nodes, use their stored dimensions or default to calculated ones
      node.width = node.width || width;
      node.height = node.height || height;
    } else {
      // For container nodes, use calculated dimensions
      node.width = width;
      node.height = height;

      if (node.splitDirection === "horizontal") {
        // Side by side - use actual widths of children
        let currentX = x;
        node.children.forEach((child) => {
          // Use the child's stored width or calculate proportionally
          const childWidth = child.width || width / node.children.length;
          calculateLayout(child, currentX, y, childWidth, height);
          currentX += childWidth;
        });
      } else {
        // Stacked - use actual heights of children
        let currentY = y;
        node.children.forEach((child) => {
          // Use the child's stored height or calculate proportionally
          const childHeight = child.height || height / node.children.length;
          calculateLayout(child, x, currentY, width, childHeight);
          currentY += childHeight;
        });
      }
    }
  };

  // Render a single node
  const renderNode = (svg, node) => {
    const faceType = FACE_TYPES.find((t) => t.value === node.type);
    const x = node.x * scaleX;
    const y = node.y * scaleY;
    const rectWidth = node.width * scaleX;
    const rectHeight = node.height * scaleY;

    // Draw rectangle
    svg
      .append("rect")
      .attr("x", x)
      .attr("y", y)
      .attr("width", rectWidth)
      .attr("height", rectHeight)
      .attr("fill", faceType?.color || "#6B7280")
      .attr("fill-opacity", node.type === "container" ? 0.1 : 0.3)
      .attr("stroke", faceType?.color || "#6B7280")
      .attr("stroke-width", node.type === "container" ? 1 : 2)
      .attr("stroke-dasharray", node.type === "container" ? "3,3" : "none")
      .attr("cursor", "pointer")
      .on("click", (event) => {
        event.stopPropagation();
        handleNodeClick(event, node);
      });

    // Add text label for non-containers
    if (node.type !== "container") {
      svg
        .append("text")
        .attr("x", x + rectWidth / 2)
        .attr("y", y + rectHeight / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#FFFFFF")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("pointer-events", "none")
        .text(faceType?.label || "Unknown");
    }

    // Add dimensions text for leaf nodes
    if (!node.children && rectWidth > 60 && rectHeight > 30) {
      svg
        .append("text")
        .attr("x", x + rectWidth / 2)
        .attr("y", y + rectHeight / 2 + 15)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#64748B")
        .attr("font-size", "10px")
        .text(`${node.width.toFixed(1)}" × ${node.height.toFixed(1)}"`)
        .style("pointer-events", "none");
    }

    // Recursively render children
    if (node.children) {
      node.children.forEach((child) => renderNode(svg, child));
    }
  };

  const renderCabinet = () => {
    if (!config) return;

    // Calculate layout for all nodes
    calculateLayout(config);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Add background
    svg
      .append("rect")
      .attr("width", displayWidth)
      .attr("height", displayHeight)
      .attr("fill", "#F8FAFC")
      .attr("stroke", "#E2E8F0")
      .attr("stroke-width", 2);

    // Render the tree
    renderNode(svg, config);

    // Add click handler to SVG background for closing selector
    svg.on("click", () => {
      setShowTypeSelector(false);
      setSelectedNode(null);
    });
  };

  // Find a node by ID in the tree
  const findNode = (node, id) => {
    if (node.id === id) return node;
    if (node.children) {
      for (let child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Find parent of a node
  const findParent = (node, targetId, parent = null) => {
    if (node.id === targetId) return parent;
    if (node.children) {
      for (let child of node.children) {
        const found = findParent(child, targetId, node);
        if (found) return found;
      }
    }
    return null;
  };

  const handleDimensionChange = (dimension, newValue) => {
    if (!selectedNode || newValue <= 0) return;

    // Ensure we have a valid numeric value
    const numericValue = parseFloat(newValue);
    if (isNaN(numericValue)) return;

    const newConfig = { ...config };
    const node = findNode(newConfig, selectedNode.id);
    if (!node) return;

    // Find the parent to understand the layout context
    const parent = findParent(newConfig, selectedNode.id);

    if (!parent || !parent.children || parent.children.length <= 1) {
      // If no parent or only one child, just update the dimension directly
      // But constrain to cabinet dimensions
      const maxDimension = dimension === 'width' ? cabinetWidth : cabinetHeight;
      const constrainedValue = Math.max(1, Math.min(numericValue, maxDimension));
      node[dimension] = constrainedValue;
    } else {
      // Handle proportional scaling for siblings
      const siblings = parent.children;
      const nodeIndex = siblings.findIndex((child) => child.id === selectedNode.id);

      if (nodeIndex === -1) return;

      // Determine which dimension to scale based on split direction
      const scaleDimension = parent.splitDirection === "horizontal" ? "width" : "height";
      
      // Get container dimension for constraints
      const containerDimension = parent[scaleDimension] || (scaleDimension === 'width' ? cabinetWidth : cabinetHeight);

      if (dimension === scaleDimension) {
        // Ensure all siblings have initial dimensions
        siblings.forEach(sibling => {
          if (!sibling[scaleDimension]) {
            sibling[scaleDimension] = containerDimension / siblings.length;
          }
        });

        // Calculate constraints
        const minValue = 1;
        const otherSiblingsMinTotal = (siblings.length - 1) * minValue;
        const maxValue = Math.max(minValue, containerDimension - otherSiblingsMinTotal);
        
        // Constrain the new value
        const constrainedValue = Math.max(minValue, Math.min(numericValue, maxValue));
        
        // Calculate how much space is left for other siblings
        const remainingSpace = containerDimension - constrainedValue;
        
        // Update the changed node
        node[dimension] = constrainedValue;

        // Get other siblings and their current total
        const otherSiblings = siblings.filter((_, index) => index !== nodeIndex);
        const currentOtherTotal = otherSiblings.reduce((sum, sibling) => 
          sum + (sibling[scaleDimension] || 0), 0);

        // Distribute remaining space proportionally among other siblings
        if (otherSiblings.length > 0 && currentOtherTotal > 0) {
          otherSiblings.forEach((sibling) => {
            const currentSize = sibling[scaleDimension] || (containerDimension / siblings.length);
            const proportion = currentSize / currentOtherTotal;
            const newSize = remainingSpace * proportion;
            sibling[scaleDimension] = Math.max(minValue, newSize);
          });
        } else if (otherSiblings.length > 0) {
          // If no current sizes, distribute equally
          const equalShare = remainingSpace / otherSiblings.length;
          otherSiblings.forEach((sibling) => {
            sibling[scaleDimension] = Math.max(minValue, equalShare);
          });
        }
      } else {
        // For the non-scaling dimension, update all siblings to maintain consistency
        // But constrain to container bounds
        const containerDim = dimension === 'width' ? cabinetWidth : cabinetHeight;
        const constrainedValue = Math.max(1, Math.min(numericValue, containerDim));
        
        siblings.forEach((sibling) => {
          sibling[dimension] = constrainedValue;
        });
      }
    }

    // Update the selected node reference to reflect changes
    const updatedNode = findNode(newConfig, selectedNode.id);
    if (updatedNode) {
      setSelectedNode({ ...selectedNode, [dimension]: updatedNode[dimension] });
    }

    // Update the config which will trigger a re-render
    setConfig(newConfig);
  };

  // Calculate min/max constraints for dimension inputs
  const getDimensionConstraints = (dimension) => {
    if (!selectedNode) return { min: 1, max: cabinetWidth };
    
    const parent = findParent(config, selectedNode.id);
    
    if (!parent || !parent.children || parent.children.length <= 1) {
      // No siblings, constrain to cabinet dimensions
      const maxDimension = dimension === 'width' ? cabinetWidth : cabinetHeight;
      return { min: 1, max: maxDimension };
    }
    
    // Has siblings - calculate based on container and sibling constraints
    const scaleDimension = parent.splitDirection === "horizontal" ? "width" : "height";
    const containerDimension = parent[scaleDimension] || (scaleDimension === 'width' ? cabinetWidth : cabinetHeight);
    
    if (dimension === scaleDimension) {
      // This dimension affects siblings
      const siblings = parent.children;
      const otherSiblingsMinTotal = (siblings.length - 1) * 1; // 1 inch minimum per sibling
      const maxValue = Math.max(1, containerDimension - otherSiblingsMinTotal);
      return { min: 1, max: maxValue };
    } else {
      // This dimension doesn't affect siblings, constrain to container
      const containerDim = dimension === 'width' ? cabinetWidth : cabinetHeight;
      return { min: 1, max: containerDim };
    }
  };

  const handleNodeClick = (event, node) => {
    const svgRect = svgRef.current.getBoundingClientRect();
    setSelectorPosition({
      x: event.clientX - svgRect.left,
      y: event.clientY - svgRect.top,
    });
    setSelectedNode(node);
    setShowTypeSelector(true);
  };

  const handleTypeChange = (newType) => {
    if (!selectedNode) return;

    const newConfig = { ...config };
    const node = findNode(newConfig, selectedNode.id);
    if (node && newType !== "container") {
      node.type = newType;
      // Remove children if changing from container to face type
      if (node.children) {
        node.children = null;
      }
    }

    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleSplitHorizontal = () => {
    if (!selectedNode) return;

    const newConfig = { ...config };
    const node = findNode(newConfig, selectedNode.id);
    if (node) {
      node.children = [
        {
          id: generateId(node.id, 0),
          type: node.type === "container" ? "door" : node.type,
          children: null,
        },
        {
          id: generateId(node.id, 1),
          type: node.type === "container" ? "door" : node.type,
          children: null,
        },
      ];
      node.splitDirection = "horizontal";
      node.type = "container";
    }

    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleSplitVertical = () => {
    if (!selectedNode) return;

    const newConfig = { ...config };
    const node = findNode(newConfig, selectedNode.id);
    if (node) {
      node.children = [
        {
          id: generateId(node.id, 0),
          type: node.type === "container" ? "door" : node.type,
          children: null,
        },
        {
          id: generateId(node.id, 1),
          type: node.type === "container" ? "door" : node.type,
          children: null,
        },
      ];
      node.splitDirection = "vertical";
      node.type = "container";
    }

    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleDelete = () => {
    if (!selectedNode || selectedNode.id === "root") return;

    const newConfig = { ...config };
    const parent = findParent(newConfig, selectedNode.id);

    if (parent && parent.children) {
      parent.children = parent.children.filter(
        (child) => child.id !== selectedNode.id
      );

      // If parent has only one child left, merge it up
      if (parent.children.length === 1) {
        const remainingChild = parent.children[0];
        parent.type = remainingChild.type;
        parent.children = remainingChild.children;
        parent.splitDirection = remainingChild.splitDirection;
      }

      // If parent has no children, make it a face type
      if (parent.children.length === 0) {
        parent.children = null;
        parent.type = "door";
      }
    }

    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleReset = () => {
    setConfig({
      id: "root",
      type: "door",
      width: cabinetWidth,
      height: cabinetHeight,
      x: 0,
      y: 0,
      children: null,
    });
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleSave = () => {
    onSave(config);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex flex-col justify-between items-center mb-4">
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
        {showTypeSelector && selectedNode && (
          <div
            className="type-selector-popup absolute bg-white border border-slate-300 rounded-lg shadow-lg p-2 z-10"
            style={{
              left: Math.min(selectorPosition.x, displayWidth - 200),
              top: Math.min(selectorPosition.y, displayHeight - 200),
            }}
          >
            {/* Dimensions for leaf nodes */}
            {!selectedNode.children && (
              <div className="mb-3">
                <div className="text-xs font-medium text-slate-700 mb-2">
                  Dimensions:
                </div>
                <div className="flex space-x-2 items-center">
                  <div className="flex items-center space-x-1">
                    <label className="text-xs text-slate-600">W:</label>
                    <input
                      type="number"
                      value={selectedNode.width.toFixed(2)}
                      onChange={(e) =>
                        handleDimensionChange("width", e.target.value)
                      }
                      className="w-16 px-1 py-0.5 text-xs border border-slate-300 rounded"
                      step="0.25"
                      min={getDimensionConstraints("width").min}
                      max={getDimensionConstraints("width").max}
                    />
                  </div>
                  <span className="text-xs text-slate-400">×</span>
                  <div className="flex items-center space-x-1">
                    <label className="text-xs text-slate-600">H:</label>
                    <input
                      type="number"
                      value={selectedNode.height.toFixed(2)}
                      onChange={(e) =>
                        handleDimensionChange("height", e.target.value)
                      }
                      className="w-16 px-1 py-0.5 text-xs border border-slate-300 rounded"
                      step="0.25"
                      min={getDimensionConstraints("height").min}
                      max={getDimensionConstraints("height").max}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs font-medium text-slate-700 mb-2">
              Change Type:
            </div>
            <div className="grid grid-cols-1 gap-1 mb-3">
              {FACE_TYPES.filter((type) => type.value !== "container").map(
                (type) => (
                  <button
                    key={type.value}
                    onClick={() => handleTypeChange(type.value)}
                    className={`px-2 py-1 text-xs rounded flex items-center ${
                      selectedNode.type === type.value
                        ? "bg-blue-100 text-blue-700"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded mr-2"
                      style={{ backgroundColor: type.color }}
                    />
                    {type.label}
                  </button>
                )
              )}
            </div>

            <div className="border-t border-slate-200 pt-2">
              <div className="text-xs font-medium text-slate-700 mb-2">
                Actions:
              </div>
              <div className="flex flex-col space-y-1">
                <div className="flex space-x-1">
                  <button
                    onClick={handleSplitHorizontal}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                  >
                    Split Horizontal
                  </button>
                  <button
                    onClick={handleSplitVertical}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                  >
                    Split Vertical
                  </button>
                </div>
                {selectedNode.id !== "root" && (
                  <button
                    onClick={handleDelete}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Cabinet: {cabinetWidth}&quot; W × {cabinetHeight}&quot; H
        <br />
        Click rectangles to change type, edit dimensions, or split them.
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
