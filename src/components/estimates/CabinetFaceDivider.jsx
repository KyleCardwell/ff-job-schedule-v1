import * as d3 from "d3";
import { cloneDeep } from "lodash";
import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback } from "react";
import { FiRotateCcw } from "react-icons/fi";

const FACE_TYPES = [
  { value: "door", label: "Door", color: "#3B82F6" },
  { value: "pair_door", label: "Pair Door", color: "#8B5CF6" },
  { value: "drawer", label: "Drawer", color: "#10B981" },
  { value: "false_front", label: "False Front", color: "#f54d0b" },
  { value: "panel", label: "Panel", color: "#6B7280" },
  { value: "open", label: "Open", color: "#F59E0B" },
  { value: "container", label: "Container", color: "#E5E7EB" },
];

const CabinetFaceDivider = ({
  cabinetWidth,
  cabinetHeight,
  faceConfig = null,
  onSave,
  disabled = false,
}) => {
  const svgRef = useRef();
  const [config, setConfig] = useState(faceConfig);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const previousConfigRef = useRef();

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
  const minValue = 2;

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

  // Update children positions and sizes when parent changes
  useEffect(() => {
    updateChildrenFromParent(config);
  }, [config]);

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
      .style("pointer-events", "all")
      .on("click", (event) => {
        event.stopPropagation();
        handleNodeClick(event, node);
      });

    // Recursively render children first (so they appear behind the parent's handles)
    if (node.children) {
      node.children.forEach((child) => renderNode(svg, child));
    }

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

    // Add drag handles for nodes with siblings
    const parent = findParent(config, node.id);
    if (parent && parent.children && parent.children.length > 1) {
      const siblings = parent.children;
      const nodeIndex = siblings.findIndex((sibling) => sibling.id === node.id);
      const isLastSibling = nodeIndex === siblings.length - 1;

      // Create a group for handles with high z-index
      const handleGroup = svg.append("g")
        .style("pointer-events", "all");

      // Only add right handle if not the last sibling in a horizontal split
      if (parent.splitDirection === "horizontal" && !isLastSibling) {
        // Right edge handle for width adjustment between siblings
        handleGroup
          .append("rect")
          .attr("x", x + rectWidth - 4)
          .attr("y", y + rectHeight / 2 - 10)
          .attr("width", 8)
          .attr("height", 20)
          .attr("fill", "#3B82F6")
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 1)
          .attr("rx", 2)
          .attr("cursor", "ew-resize")
          .attr("opacity", 0.8)
          .style("pointer-events", "all")
          .on("mousedown", (event) => {
            event.stopPropagation();
            handleDragStart(event, node, "width");
          });
      }

      // Only add bottom handle if not the last sibling in a vertical split
      if (parent.splitDirection === "vertical" && !isLastSibling) {
        // Bottom edge handle for height adjustment between siblings
        handleGroup
          .append("rect")
          .attr("x", x + rectWidth / 2 - 10)
          .attr("y", y + rectHeight - 4)
          .attr("width", 20)
          .attr("height", 8)
          .attr("fill", "#3B82F6")
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 1)
          .attr("rx", 2)
          .attr("cursor", "ns-resize")
          .attr("opacity", 0.8)
          .style("pointer-events", "all")
          .on("mousedown", (event) => {
            event.stopPropagation();
            handleDragStart(event, node, "height");
          });
      }
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

  // Update children dimensions based on parent constraints
  const updateChildrenFromParent = (node) => {
    if (!node.children || node.children.length === 0) return;

    const splitDimension =
      node.splitDirection === "horizontal" ? "width" : "height";
    const fixedDimension =
      node.splitDirection === "horizontal" ? "height" : "width";

    // All children inherit the fixed dimension from parent
    node.children.forEach((child) => {
      child[fixedDimension] = node[fixedDimension];
    });

    // Ensure split dimension children sum to parent's dimension
    const totalSplitDimension = node.children.reduce((sum, child) => {
      return sum + (child[splitDimension] || 0);
    }, 0);

    if (totalSplitDimension !== node[splitDimension]) {
      // If totals don't match, distribute proportionally
      const scale = node[splitDimension] / totalSplitDimension;
      node.children.forEach((child) => {
        if (!child[splitDimension]) {
          child[splitDimension] = node[splitDimension] / node.children.length;
        } else {
          child[splitDimension] = child[splitDimension] * scale;
        }
      });
    }

    // Recursively update grandchildren
    node.children.forEach((child) => {
      updateChildrenFromParent(child);
    });
  };

  // Helper function to round to nearest 1/16"
  const roundTo16th = (value) => {
    return Math.round(value * 16) / 16;
  };

  // Calculate and update face type summary
  // Removed face summary calculation logic

  // Update face summary after any config changes
  // Removed face summary update logic

  // Update face summary after layout changes
  // Removed face summary update logic

  // Calculate face summary whenever config changes
  useEffect(() => {
    if (config && onSave) {
      // Only update if config has actually changed (not just a re-render)
      const configString = JSON.stringify(config);
      const previousConfigString = previousConfigRef.current;
      
      if (configString !== previousConfigString) {
        onSave(config);
        previousConfigRef.current = configString;
      }
    }
  }, [config, onSave]);

  const handleDimensionChange = (dimension, newValue) => {
    if (!selectedNode || newValue <= 0) return;

    const newConfig = cloneDeep(config);
    const node = findNode(newConfig, selectedNode.id);
    if (!node) return;

    const parent = findParent(newConfig, selectedNode.id);

    // Root node cannot be resized - it's always the cabinet dimensions
    if (!parent) {
      return;
    }

    if (!parent.children || parent.children.length <= 1) {
      // No siblings, just update the dimension directly
      // But constrain to cabinet dimensions
      const maxDimension = dimension === "width" ? cabinetWidth : cabinetHeight;
      node[dimension] = Math.max(minValue, Math.min(newValue, maxDimension));
    } else {
      // Determine which dimension the parent controls (split dimension) vs inherited dimension
      const parentSplitDimension =
        parent.splitDirection === "horizontal" ? "width" : "height";
      const parentFixedDimension =
        parent.splitDirection === "horizontal" ? "height" : "width";

      if (dimension === parentSplitDimension) {
        // Child is adjusting the dimension it can control among siblings
        // Handle proportional scaling for siblings
        const siblings = parent.children;
        const nodeIndex = siblings.findIndex((sibling) => sibling.id === node.id);
        const isLastSibling = nodeIndex === siblings.length - 1;

        // Get container dimension for constraints
        const containerDimension = parent[parentSplitDimension];

        // Ensure all siblings have initial dimensions
        siblings.forEach((sibling) => {
          if (!sibling[parentSplitDimension]) {
            sibling[parentSplitDimension] =
              containerDimension / siblings.length;
          }
        });

        // Calculate constraints
        const otherSiblingsMinTotal = (siblings.length - 1) * minValue;
        const maxValue = Math.max(
          minValue,
          containerDimension - otherSiblingsMinTotal
        );

        // Constrain the new value
        const constrainedValue = Math.max(
          minValue,
          Math.min(newValue, maxValue)
        );

        // Calculate how much space is left for other siblings
        const remainingSpace = containerDimension - constrainedValue;

        // Update the changed node
        node[dimension] = constrainedValue;

        // Distribute remaining space proportionally among other siblings
        const otherSiblings = siblings.filter((_, index) => index !== nodeIndex);
        const currentOtherTotal = otherSiblings.reduce(
          (sum, sibling) => sum + (sibling[parentSplitDimension] || 0),
          0
        );

        if (otherSiblings.length > 0 && currentOtherTotal > 0) {
          // Distribute proportionally based on current sizes
          otherSiblings.forEach((sibling) => {
            const currentSize =
              sibling[parentSplitDimension] ||
              containerDimension / siblings.length;
            const proportion = currentSize / currentOtherTotal;
            const newSize = remainingSpace * proportion;
            sibling[parentSplitDimension] = Math.max(minValue, newSize);
          });
        } else if (otherSiblings.length > 0) {
          // If no current sizes, distribute equally
          const equalShare = remainingSpace / otherSiblings.length;
          otherSiblings.forEach((sibling) => {
            sibling[parentSplitDimension] = Math.max(minValue, equalShare);
          });
        }
      } else {
        // Child is trying to adjust the dimension it inherited from parent
        // Check if parent is root - if so, don't allow changing cabinet-locked dimensions
        const grandparent = findParent(newConfig, parent.id);

        if (!grandparent) {
          // Parent is root, child cannot change cabinet-locked dimensions
          const rootFixedDimension =
            parent.splitDirection === "horizontal" ? "height" : "width";
          if (dimension === rootFixedDimension) {
            // This dimension is locked to cabinet size, don't allow changes
            return;
          }
        }

        // Propagate this change up the tree iteratively
        let currentParent = parent;
        let currentValue = Math.max(
          minValue,
          Math.min(
            newValue,
            dimension === "width" ? cabinetWidth : cabinetHeight
          )
        );

        while (currentParent) {
          // Update the parent's dimension
          currentParent[dimension] = currentValue;

          // Update all children of this parent to inherit the new dimension
          if (currentParent.children) {
            currentParent.children.forEach((child) => {
              child[dimension] = currentValue;
            });
          }

          // Check if we need to continue propagating up
          const grandparent = findParent(newConfig, currentParent.id);
          if (grandparent) {
            const grandparentFixedDimension =
              grandparent.splitDirection === "horizontal" ? "height" : "width";
            if (dimension === grandparentFixedDimension) {
              // Continue up the tree
              currentParent = grandparent;
              continue;
            }
          }

          // Stop propagating
          break;
        }
      }
    }

    // Update the selected node reference to reflect changes
    const updatedNode = findNode(newConfig, selectedNode.id);
    if (updatedNode) {
      setSelectedNode({ ...selectedNode, [dimension]: updatedNode[dimension] });
    }

    setConfig(newConfig);
    updateChildrenFromParent(newConfig);
  };

  const handleDragStart = (event, node, dimension) => {
    if (disabled) return;
    
    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(node); // Set the selected node so handleDimensionChange works properly
    setDragging({ 
      node, 
      dimension, 
      startX: event.clientX, 
      startY: event.clientY 
    });
  };

  const handleDrag = (event) => {
    if (!dragging) return;
    
    const { node, dimension, startX, startY } = dragging;
    
    // Calculate delta based on dimension
    let delta;
    if (dimension === "width") {
      delta = (event.clientX - startX) / scaleX;
    } else {
      delta = (event.clientY - startY) / scaleY;
    }
    
    // Get the current node value from config (not the stale dragging reference)
    const currentNode = findNode(config, node.id);
    if (!currentNode) return;
    
    // Use the existing handleDimensionChange function with the new calculated value
    const newValue = currentNode[dimension] + delta;
    handleDimensionChange(dimension, newValue);
    
    // Update drag start position for next move
    setDragging({
      ...dragging,
      startX: event.clientX,
      startY: event.clientY
    });
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", handleDragEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  }, [dragging]);

  // Calculate min/max constraints for dimension inputs
  const getDimensionConstraints = (dimension) => {
    if (!selectedNode) return { min: 1, max: cabinetWidth };

    const parent = findParent(config, selectedNode.id);

    // Root node cannot be resized - it's always the cabinet dimensions
    if (!parent) {
      const fixedValue = dimension === "width" ? cabinetWidth : cabinetHeight;
      return { min: fixedValue, max: fixedValue };
    }

    if (!parent.children || parent.children.length <= 1) {
      // No siblings, constrain to cabinet dimensions
      const maxDimension = dimension === "width" ? cabinetWidth : cabinetHeight;
      return { min: 1, max: maxDimension };
    }

    // Has siblings - calculate based on container and sibling constraints
    const scaleDimension =
      parent.splitDirection === "horizontal" ? "width" : "height";
    const containerDimension =
      parent[scaleDimension] ||
      (scaleDimension === "width" ? cabinetWidth : cabinetHeight);

    if (dimension === scaleDimension) {
      // This dimension affects siblings
      const siblings = parent.children;
      const otherSiblingsMinTotal = (siblings.length - 1) * minValue;
      const maxValue = Math.max(
        minValue,
        containerDimension - otherSiblingsMinTotal
      );
      return { min: minValue, max: maxValue };
    } else {
      // Child is trying to adjust inherited dimension
      // Check if parent is root - if so, this dimension is locked to cabinet size
      const grandparent = findParent(config, parent.id);
      if (!grandparent) {
        // Parent is root, this dimension is locked to cabinet size
        const fixedValue = dimension === "width" ? cabinetWidth : cabinetHeight;
        return { min: fixedValue, max: fixedValue };
      }
      // This dimension doesn't affect siblings, constrain to container
      const containerDim = dimension === "width" ? cabinetWidth : cabinetHeight;
      return { min: 1, max: containerDim };
    }
  };

  const handleNodeClick = (event, node) => {
    if (disabled) return;
    
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

    const newConfig = cloneDeep(config);
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

    const newConfig = cloneDeep(config);
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

    const newConfig = cloneDeep(config);
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

    // First clear UI state to avoid stale references
    setShowTypeSelector(false);
    setSelectedNode(null);

    // Create a deep copy of the config to avoid reference issues
    const newConfig = cloneDeep(config);
    const parent = findParent(newConfig, selectedNode.id);

    if (parent && parent.children) {
      // If there are exactly 2 children (which is the max in this structure)
      if (parent.children.length === 2) {
        // Find the index of the node being deleted
        const deleteIndex = parent.children.findIndex(
          (child) => child.id === selectedNode.id
        );
        // Get the remaining sibling that will stay after deletion
        const remainingSibling = parent.children.filter(
          (child) => child.id !== selectedNode.id
        )[0];

        // For horizontal splits, handle x position and width
        if (parent.splitDirection === "horizontal") {
          // If deleting the first (left) child, the right child should move left
          if (deleteIndex === 0) {
            remainingSibling.x = parent.x;
          }
          // In either case, the remaining child should expand to full parent width
          remainingSibling.width = parent.width;
        }
        // For vertical splits, handle y position and height
        else if (parent.splitDirection === "vertical") {
          // If deleting the first (top) child, the bottom child should move up
          if (deleteIndex === 0) {
            remainingSibling.y = parent.y;
          }
          // In either case, the remaining child should expand to full parent height
          remainingSibling.height = parent.height;
        }

        // If the remaining sibling has children, update their dimensions too
        if (remainingSibling.children && remainingSibling.children.length > 0) {
          updateChildrenFromParent(remainingSibling);
        }
      }

      // Remove the selected node
      parent.children = parent.children.filter(
        (child) => child.id !== selectedNode.id
      );

      // If parent has only one child left, merge it up
      if (parent.children.length === 1) {
        const remainingChild = parent.children[0];
        
        // Before merging, ensure the remaining child takes up the full parent dimension
        if (parent.splitDirection === "horizontal") {
          remainingChild.width = parent.width;
          remainingChild.x = parent.x;
        } else if (parent.splitDirection === "vertical") {
          remainingChild.height = parent.height;
          remainingChild.y = parent.y;
        }
        
        // If the remaining child has children, update their dimensions too
        if (remainingChild.children && remainingChild.children.length > 0) {
          updateChildrenFromParent(remainingChild);
        }
        
        parent.type = remainingChild.type;
        parent.children = remainingChild.children;
        parent.splitDirection = remainingChild.splitDirection;
      }

      // If parent has no children, make it a face type
      if (parent.children && parent.children.length === 0) {
        parent.children = null;
        parent.type = "door";
      }
    }

    // After all modifications, recalculate layout for the entire tree
    calculateLayout(newConfig);
    
    // Use React's state update with a fresh object to ensure React detects the change
    const updatedConfig = cloneDeep(newConfig);
    setConfig(updatedConfig);
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleReset = () => {
    if (disabled) return;
    
    const resetConfig = {
      id: "root",
      type: "door",
      width: cabinetWidth,
      height: cabinetHeight,
      x: 0,
      y: 0,
      children: null,
    };
    
    setConfig(resetConfig);
    setSelectedNode(null);
    setShowTypeSelector(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium text-slate-700">
          Cabinet Face Designer
        </h4>
        <button
          onClick={handleReset}
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reset to single door"
          disabled={disabled}
        >
          <FiRotateCcw className="mr-1" />
          Reset
        </button>
      </div>

      <div className="relative flex justify-center">
        <svg
          ref={svgRef}
          width={displayWidth}
          height={displayHeight}
          className={`border border-slate-300 rounded ${disabled ? 'opacity-50' : ''}`}
        />

        {/* Disabled overlay */}
        {disabled && (
          <div className="absolute inset-0 bg-slate-100 bg-opacity-75 flex items-center justify-center rounded">
            <div className="text-center">
              <p className="text-sm text-slate-600 font-medium">Face Designer Disabled</p>
              <p className="text-xs text-slate-500 mt-1">
                Please enter valid width, height, and depth dimensions
              </p>
            </div>
          </div>
        )}

        {/* Type Selector Popup */}
        {showTypeSelector && selectedNode && !disabled && (
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
  faceConfig: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default CabinetFaceDivider;
