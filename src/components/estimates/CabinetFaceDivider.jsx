import * as d3 from "d3";
import { cloneDeep } from "lodash";
import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback } from "react";
import { FiRotateCcw, FiX } from "react-icons/fi";

import {
  CAN_HAVE_ROLL_OUTS_OR_SHELVES,
  FACE_TYPES,
  FACE_REVEALS,
  FACE_NAMES,
  SPLIT_DIRECTIONS,
} from "../../utils/constants";
import { calculateRollOutDimensions } from "../../utils/getSectionCalculations";
import { truncateTrailingZeros } from "../../utils/helpers";

const CabinetFaceDivider = ({
  cabinetWidth,
  cabinetHeight,
  cabinetDepth,
  cabinetStyle = "euro",
  faceConfig = null,
  onSave,
  disabled = false,
  onDimensionChange = null,
}) => {
  const svgRef = useRef();
  const [config, setConfig] = useState(faceConfig);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const previousConfigRef = useRef();
  const originalConfigRef = useRef();
  // State for temporary input values
  const [inputValues, setInputValues] = useState({
    width: "",
    height: "",
    rollOutQty: "",
    shelfQty: "",
  });

  // Fixed display dimensions
  const fixedDisplayWidth = 300; // Fixed width for the SVG container
  const fixedDisplayHeight = 436; // Fixed height for the SVG container

  // Minimum face dimension (2 inches)
  const minValue = 2;

  // Calculate display scale and offsets
  const scaleX = fixedDisplayWidth / cabinetWidth;
  const scaleY = fixedDisplayHeight / cabinetHeight;
  const scale = Math.min(scaleX, scaleY);
  const displayWidth = cabinetWidth * scale;
  const displayHeight = cabinetHeight * scale;
  const offsetX = (fixedDisplayWidth - displayWidth) / 2;
  const offsetY = (fixedDisplayHeight - displayHeight) / 2;
  const reveals = FACE_REVEALS[cabinetStyle] || FACE_REVEALS.face_frame;

  // Function to normalize reveal dimensions in a loaded config
  const normalizeRevealDimensions = (node) => {
    if (!node || !node.children) return;

    const revealValue = reveals.reveal;

    node.children.forEach((child) => {
      if (child.type === FACE_NAMES.REVEAL) {
        if (node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL) {
          child.width = revealValue;
        } else if (node.splitDirection === SPLIT_DIRECTIONS.VERTICAL) {
          child.height = revealValue;
        }
      }
      // Recurse for nested containers
      normalizeRevealDimensions(child);
    });
  };

  useEffect(() => {
    if (!config || (Array.isArray(config) && config.length === 0)) {
      // Initialize with a single root node for new cabinets or empty configs
      setConfig({
        id: FACE_NAMES.ROOT,
        type: FACE_NAMES.DOOR,
        width: cabinetWidth - reveals.left - reveals.right,
        height: cabinetHeight - reveals.top - reveals.bottom,
        x: reveals.left,
        y: reveals.top,
        children: null,
      });
    } else if (config && !config.id) {
      // Ensure existing config has an id
      setConfig({
        ...config,
        id: FACE_NAMES.ROOT,
      });
    } else if (config && config.id === FACE_NAMES.ROOT) {
      // Update root dimensions when cabinet dimensions change
      // Create a new config object regardless of whether dimensions have changed
      // to ensure React detects the change and re-renders
      const updatedConfig = cloneDeep(config);

      // Normalize reveals before doing anything else
      normalizeRevealDimensions(updatedConfig);

      // Update root dimensions first so updateChildrenFromParent uses new values
      updatedConfig.width = cabinetWidth - reveals.left - reveals.right;
      updatedConfig.height = cabinetHeight - reveals.top - reveals.bottom;

      // Recursively update all children's dimensions based on new parent dimensions
      updateChildrenFromParent(updatedConfig);

      // Force recalculation of layout with new dimensions
      const layoutConfig = calculateLayout(updatedConfig);

      // Update state with the new configuration
      setConfig(layoutConfig);
    }
  }, [cabinetWidth, cabinetHeight, reveals]);

  useEffect(() => {
    renderCabinet();
  }, [config, displayWidth, displayHeight, disabled]);

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

  // Store the original config only once when component first mounts
  useEffect(() => {
    // Only set the original config if it hasn't been set yet
    if (!originalConfigRef.current) {
      if (faceConfig) {
        originalConfigRef.current = cloneDeep(faceConfig);
      } else {
        // Store the default single door config as original
        const defaultConfig = {
          id: FACE_NAMES.ROOT,
          type: FACE_NAMES.DOOR,
          width: cabinetWidth - reveals.left - reveals.right,
          height: cabinetHeight - reveals.top - reveals.bottom,
          x: reveals.left,
          y: reveals.top,
          children: null,
        };
        originalConfigRef.current = cloneDeep(defaultConfig);
      }
    }
  }, []); // Empty dependency array - only run once on mount

  // Generate unique ID for new nodes
  const generateId = (parentId, index) => {
    if (!parentId || parentId === FACE_NAMES.ROOT) {
      return index.toString();
    }
    return `${parentId}-${index}`;
  };

  // Calculate layout for all nodes recursively
  const calculateLayout = (
    node,
    x = node.x,
    y = node.y,
    width = node.width,
    height = node.height,
    isRoot = true
  ) => {
    if (!node) return null;

    let newX = x;
    let newY = y;
    let newWidth = width;
    let newHeight = height;

    // Apply outer reveals for the root container
    if (isRoot) {
      newX = reveals.left;
      newY = reveals.top;
      newWidth = cabinetWidth - (reveals.left + reveals.right);
      newHeight = cabinetHeight - (reveals.top + reveals.bottom);
    }

    const newNode = {
      ...node,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    };

    if (node.children && node.children.length > 0) {
      if (node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL) {
        const totalGapWidth = node.children
          .filter((c) => c.type === FACE_NAMES.REVEAL)
          .reduce((sum, c) => sum + c.width, 0);
        const availableWidth = newWidth - totalGapWidth;
        const totalFaceWidth = node.children
          .filter((c) => c.type !== FACE_NAMES.REVEAL)
          .reduce((sum, c) => sum + c.width, 0);

        let currentX = newX;
        newNode.children = node.children.map((child) => {
          let childWidth = child.width;
          if (child.type !== FACE_NAMES.REVEAL) {
            // Scale face nodes proportionally
            childWidth = (child.width / totalFaceWidth) * availableWidth;
          }
          const newChild = calculateLayout(
            child,
            currentX,
            newY,
            childWidth,
            newHeight,
            false
          );
          currentX += childWidth;
          return newChild;
        });
      } else {
        // Vertical split
        const totalGapHeight = node.children
          .filter((c) => c.type === FACE_NAMES.REVEAL)
          .reduce((sum, c) => sum + c.height, 0);
        const availableHeight = newHeight - totalGapHeight;
        const totalFaceHeight = node.children
          .filter((c) => c.type !== FACE_NAMES.REVEAL)
          .reduce((sum, c) => sum + c.height, 0);

        let currentY = newY;
        newNode.children = node.children.map((child) => {
          let childHeight = child.height;
          if (child.type !== FACE_NAMES.REVEAL) {
            // Scale face nodes proportionally
            childHeight = (child.height / totalFaceHeight) * availableHeight;
          }
          const newChild = calculateLayout(
            child,
            newX,
            currentY,
            newWidth,
            childHeight,
            false
          );
          currentY += childHeight;
          return newChild;
        });
      }
    }

    return newNode;
  };

  // Render a single node
  const renderNode = (node, parent = null) => {
    // Skip if node has no width or height
    if (!node || node.width <= 0 || node.height <= 0) return;

    const strokeWidth = node.type === FACE_NAMES.CONTAINER ? 1 : 2;

    // Calculate display position and size, accounting for stroke width
    const x = node.x * scale + strokeWidth / 2;
    const y = node.y * scale + strokeWidth / 2;
    const width = Math.max(0, node.width * scale - strokeWidth);
    const height = Math.max(0, node.height * scale - strokeWidth);

    const faceType = FACE_TYPES.find((t) => t.value === node.type);
    // Draw rectangle
    const cabinetGroup = d3.select(svgRef.current).select("g");
    cabinetGroup
      .append("rect")
      .attr("x", x)
      .attr("y", y)
      .attr("width", width)
      .attr("height", height)
      .attr(
        "fill",
        node.type === FACE_NAMES.REVEAL
          ? "#E5E7EB"
          : faceType?.color || "#6B7280"
      )
      .attr("fill-opacity", node.type === FACE_NAMES.CONTAINER ? 0.1 : 0.3)
      .attr("stroke", faceType?.color || "#6B7280")
      .attr("stroke-width", strokeWidth)
      .attr(
        "stroke-dasharray",
        node.type === FACE_NAMES.CONTAINER ? "3,3" : "none"
      )
      .attr("cursor", node.type === FACE_NAMES.REVEAL ? "pointer" : "pointer")
      .style("pointer-events", "all")
      .on("click", (event) => {
        event.stopPropagation();
        handleNodeClick(event, node);
      });

    // Add center vertical dashed line for pair_door faces
    if (node.type === FACE_NAMES.PAIR_DOOR) {
      const centerX = x + width / 2;
      cabinetGroup
        .append("line")
        .attr("x1", centerX)
        .attr("y1", y)
        .attr("x2", centerX)
        .attr("y2", y + height)
        .attr("stroke", faceType?.color || "#6B7280")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("pointer-events", "none");
    }

    // Recursively render children first (so they appear behind the parent's handles)
    if (node.children) {
      node.children.forEach((child) => renderNode(child, node));
    }

    // Add text label for non-containers
    if (node.type !== FACE_NAMES.CONTAINER) {
      cabinetGroup
        .append("text")
        .attr("x", x + width / 2)
        .attr("y", y + height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#FFFFFF")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("pointer-events", "none")
        .text(faceType?.label || "");
    }

    // Add dimensions text for leaf nodes
    if (!node.children && width > 60 && height > 30) {
      cabinetGroup
        .append("text")
        .attr("x", x + width / 2)
        .attr("y", y + height / 2 + 15)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#ffffff")
        .attr("font-size", "10px")
        .text(
          `${truncateTrailingZeros(node.width)}" × ${truncateTrailingZeros(
            node.height
          )} ${node.rollOutQty > 0 ? ` - ${node.rollOutQty} RO` : ""}`
        )
        .style("pointer-events", "none");
    }

    // Add drag handles for nodes with siblings
    const nodeParent = findParent(config, node.id);
    if (nodeParent && nodeParent.children && nodeParent.children.length > 1) {
      const siblings = nodeParent.children;
      const nodeIndex = siblings.findIndex((sibling) => sibling.id === node.id);
      const isLastSibling = nodeIndex === siblings.length - 1;

      // Create a group for handles with high z-index
      const handleGroup = cabinetGroup
        .append("g")
        .style("pointer-events", "all");

      // Only add right handle if not the last sibling in a horizontal split
      if (
        nodeParent.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL &&
        !isLastSibling
      ) {
        // Right edge handle for width adjustment between siblings
        handleGroup
          .append("rect")
          .attr("x", x + width - 4)
          .attr("y", y + height / 2 - 10)
          .attr("width", 8)
          .attr("height", 20)
          .attr("fill", "#3B82F6")
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 1)
          .attr("cursor", "ew-resize")
          .attr("opacity", 0.8)
          .style("pointer-events", "all")
          .on("mousedown", (event) => {
            event.stopPropagation();
            handleDragStart(event, node, "width");
          });
      }

      // Only add bottom handle if not the last sibling in a vertical split
      if (
        nodeParent.splitDirection === SPLIT_DIRECTIONS.VERTICAL &&
        !isLastSibling
      ) {
        // Bottom edge handle for height adjustment between siblings
        handleGroup
          .append("rect")
          .attr("x", x + width / 2 - 10)
          .attr("y", y + height - 4)
          .attr("width", 20)
          .attr("height", 8)
          .attr("fill", "#3B82F6")
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 1)
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
    const layoutConfig = calculateLayout(config);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear the SVG

    // Add a transform group to center the cabinet
    const cabinetGroup = svg
      .append("g")
      .attr("transform", `translate(${offsetX}, ${offsetY})`);

    // Add background
    cabinetGroup
      .append("rect")
      .attr("width", displayWidth)
      .attr("height", displayHeight)
      .attr("fill", "#F8FAFC")
      .attr("stroke", "#E2E8F0")
      .attr("stroke-width", 2);

    // Render the tree
    renderNode(layoutConfig);

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
    if (!node || !node.children || node.children.length === 0) return;

    const splitDimension =
      node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL ? "width" : "height";
    const fixedDimension =
      node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL ? "height" : "width";

    // All children inherit the fixed dimension from parent
    node.children.forEach((child) => {
      child[fixedDimension] = node[fixedDimension];
    });

    const faces = node.children.filter((c) => c.type !== FACE_NAMES.REVEAL);
    const reveal = node.children.find((c) => c.type === FACE_NAMES.REVEAL);

    // If there are two faces and a reveal, handle their resizing specially
    if (faces.length === 2 && reveal) {
      const firstFace = faces[0];
      const lastFace = faces[1];
      const revealSize = reveal[splitDimension] || 0;
      const parentSize = node[splitDimension];

      // Check if siblings were equal before the parent resize
      const areSiblingsEqual =
        firstFace[splitDimension] === lastFace[splitDimension];

      if (areSiblingsEqual) {
        // If they were equal, they should remain equal
        const newFaceSize = (parentSize - revealSize) / 2;
        firstFace[splitDimension] = newFaceSize;
        lastFace[splitDimension] = newFaceSize;
      } else {
        // If they were not equal, the last one fills the remaining space
        const firstFaceSize = firstFace[splitDimension] || 0;
        lastFace[splitDimension] = parentSize - firstFaceSize - revealSize;
      }
    } else {
      // Fallback to proportional scaling for other cases (e.g., no reveals)
      const totalChildDimension = node.children.reduce((sum, child) => {
        return sum + (child[splitDimension] || 0);
      }, 0);

      if (totalChildDimension > 0) {
        const scale = node[splitDimension] / totalChildDimension;
        node.children.forEach((child) => {
          child[splitDimension] = (child[splitDimension] || 0) * scale;
        });
      }
    }

    // Recursively update grandchildren
    node.children.forEach((child) => {
      updateChildrenFromParent(child);
    });
  };

  // Handle roll-out or shelf quantity change
  const handleRoShQtyChange = (e, type) => {
    const qty = parseInt(e.target.value) || 0;

    // Update input value state
    setInputValues({ ...inputValues, [type]: e.target.value });

    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    const node = findNode(newConfig, selectedNode.id);

    if (node) {
      // Update roll-out quantity
      node[type] = qty;

      setConfig(newConfig);
      setSelectedNode({
        ...selectedNode,
        [type]: qty,
      });
    }
  };

  // Check if face type supports roll-outs
  const supportsRollOutsOrShelves = (nodeType) => {
    return CAN_HAVE_ROLL_OUTS_OR_SHELVES.includes(nodeType);
  };

  // Handle type change
  const handleTypeChange = (newType) => {
    if (!selectedNode) return;

    setConfig((prevConfig) => {
      const newConfig = cloneDeep(prevConfig);
      const node = findNode(newConfig, selectedNode.id);
      if (!node || newType === FACE_NAMES.CONTAINER) return newConfig;

      node.type = newType;
      node.children = null; // containers only, so reset

      // Reset roll-outs & shelves if unsupported
      if (!CAN_HAVE_ROLL_OUTS_OR_SHELVES.includes(newType)) {
        node.rollOutQty = 0;
        node.shelfQty = 0;

        setInputValues((prev) => ({
          ...prev,
          rollOutQty: "",
          shelfQty: "",
        }));
      }

      return newConfig;
    });

    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  // Calculate face summary whenever config changes
  useEffect(() => {
    if (config && onSave) {
      // Only update if config has actually changed (not just a re-render)
      const configString = JSON.stringify(config);
      const previousConfigString = previousConfigRef.current;

      if (configString !== previousConfigString) {
        // Create a copy of the config for saving
        const configForSave = cloneDeep(config);

        // Calculate rollout dimensions for all nodes with rollouts
        const processNode = (node) => {
          // Calculate rollout dimensions if needed
          if (node.rollOutQty > 0) {
            node.rollOutDimensions = calculateRollOutDimensions(
              node.width,
              cabinetDepth,
              node.height,
              "rollOut",
              minValue
            );
          }

          if (node.type === FACE_NAMES.DRAWER_FRONT) {
            node.drawerBoxDimensions = calculateRollOutDimensions(
              node.width,
              cabinetDepth,
              node.height,
              node.type,
              minValue
            );
          }

          if (node.shelfQty > 0) {
            node.shelfDimensions = {
              width: node.width,
              height: cabinetDepth,
            };
          }

          // Process children recursively
          if (node.children) {
            node.children.forEach(processNode);
          }
        };

        // Process the entire tree
        processNode(configForSave);

        // Save the config with calculated dimensions
        onSave(configForSave);
        previousConfigRef.current = configString;
      }
    }
  }, [config, onSave, cabinetDepth]);

  const handleDimensionChange = (dimension, newValueStr) => {
    const newValue = newValueStr === "" ? 0 : parseFloat(newValueStr);
    if (!selectedNode) return;
    if (isNaN(newValue)) return;

    const newConfig = cloneDeep(config);
    const node = findNode(newConfig, selectedNode.id);
    if (!node) return;

    const parent = findParent(newConfig, selectedNode.id);
    if (!parent) return; // Cannot resize the root node directly

    const dimensionToChange =
      parent.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
        ? "width"
        : "height";
    if (dimension !== dimensionToChange) {
      // This is the perpendicular dimension, update all children
      parent.children.forEach((child) => {
        if (child.type !== FACE_NAMES.REVEAL) {
          child[dimension] = newValue;
        }
      });
      node[dimension] = newValue;
    } else {
      // This is the parallel dimension, use direct calculation
      const reveal = parent.children.find((c) => c.type === FACE_NAMES.REVEAL);
      const revealSize = reveal ? reveal[dimension] : 0;

      const sibling = parent.children.find(
        (c) => c.id !== node.id && c.type !== FACE_NAMES.REVEAL
      );

      if (!sibling) return; // Should not happen in a split with siblings

      const parentSize = parent[dimension];
      const newSiblingSize = parentSize - newValue - revealSize;

      // Check for constraints
      if (newValue < minValue || newSiblingSize < minValue) {
        console.warn(
          `Dimension change rejected: results in a size smaller than the minimum ${minValue}"`
        );
        return; // Exit if new value is invalid
      }

      // Update the current node's dimension and the sibling's dimension
      node[dimension] = newValue;
      sibling[dimension] = newSiblingSize;
    }

    // Recalculate the layout with the new dimensions
    const layoutConfig = calculateLayout(newConfig);
    setConfig(layoutConfig);

    // Update the selected node state to reflect the change immediately
    const updatedNode = findNode(newConfig, selectedNode.id);
    if (updatedNode) {
      setSelectedNode(updatedNode);
    }
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
      startY: event.clientY,
    });
  };

  const handleDrag = (event) => {
    if (!dragging) return;

    const { node, dimension, startX, startY } = dragging;

    // Calculate delta based on dimension
    let delta;
    if (dimension === "width") {
      delta = (event.clientX - startX) / scale;
    } else {
      delta = (event.clientY - startY) / scale;
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
      startY: event.clientY,
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
      parent.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
        ? "width"
        : "height";
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

  // Check if a dimension should be disabled (only for direct children of root)
  const isDimensionDisabled = (dimension, node) => {
    if (!node || node.id === FACE_NAMES.ROOT) return false;

    // Find the parent node
    const parent = findParent(config, node.id);

    // Only disable dimensions for direct children of the root
    if (parent && parent.id === FACE_NAMES.ROOT) {
      // For vertical splits, width is constrained for children
      if (
        parent.splitDirection === SPLIT_DIRECTIONS.VERTICAL &&
        dimension === "width"
      ) {
        return true;
      }
      // For horizontal splits, height is constrained for children
      if (
        parent.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL &&
        dimension === "height"
      ) {
        return true;
      }
    }

    return false;
  };

  const handleNodeClick = (event, node) => {
    if (disabled) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    setSelectorPosition({
      x: event.clientX - svgRect.left,
      y: event.clientY - svgRect.top,
    });
    setSelectedNode(node);

    // Initialize input values with current node dimensions
    setInputValues({
      width: node.width > 0 ? truncateTrailingZeros(node.width) : node.width,
      height:
        node.height > 0 ? truncateTrailingZeros(node.height) : node.height,
      rollOutQty:
        node.rollOutQty > 0
          ? truncateTrailingZeros(node.rollOutQty)
          : node.rollOutQty || "",
      shelfQty:
        node.shelfQty > 0
          ? truncateTrailingZeros(node.shelfQty)
          : node.shelfQty || "",
    });

    setShowTypeSelector(true);
  };

  const handleSplitHorizontal = () => {
    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    const node = findNode(newConfig, selectedNode.id);
    if (node) {
      const reveals = FACE_REVEALS[cabinetStyle] || FACE_REVEALS.face_frame;
      const revealWidth = reveals.reveal;
      const childWidth = (node.width - revealWidth) / 2;

      node.children = [
        {
          id: generateId(node.id, 0),
          type:
            node.type === FACE_NAMES.CONTAINER ? FACE_NAMES.DOOR : node.type,
          width: childWidth,
          height: node.height,
          children: null,
        },
        {
          id: generateId(node.id, 1),
          type: FACE_NAMES.REVEAL,
          width: revealWidth,
          height: node.height,
        },
        {
          id: generateId(node.id, 2),
          type:
            node.type === FACE_NAMES.CONTAINER ? FACE_NAMES.DOOR : node.type,
          width: childWidth,
          height: node.height,
          children: null,
        },
      ];
      node.splitDirection = SPLIT_DIRECTIONS.HORIZONTAL;
      node.type = FACE_NAMES.CONTAINER;
      node.rollOutQty = "";
      node.drawerBoxDimensions = null;
      node.shelfQty = "";
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
      const reveals = FACE_REVEALS[cabinetStyle] || FACE_REVEALS.face_frame;
      const revealHeight = reveals.reveal;
      const childHeight = (node.height - revealHeight) / 2;

      node.children = [
        {
          id: generateId(node.id, 0),
          type:
            node.type === FACE_NAMES.CONTAINER ? FACE_NAMES.DOOR : node.type,
          width: node.width,
          height: childHeight,
          children: null,
        },
        {
          id: generateId(node.id, 1),
          type: FACE_NAMES.REVEAL,
          width: node.width,
          height: revealHeight,
        },
        {
          id: generateId(node.id, 2),
          type:
            node.type === FACE_NAMES.CONTAINER ? FACE_NAMES.DOOR : node.type,
          width: node.width,
          height: childHeight,
          children: null,
        },
      ];
      node.splitDirection = SPLIT_DIRECTIONS.VERTICAL;
      node.type = FACE_NAMES.CONTAINER;
    }

    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  let canEqualize = false;
  if (selectedNode) {
    const parent = findParent(config, selectedNode.id);
    const container =
      selectedNode.type === FACE_NAMES.CONTAINER ? selectedNode : parent;

    if (container && container.children) {
      const faces = container.children.filter(
        (c) => c.type !== FACE_NAMES.REVEAL
      );
      if (faces.length > 1) {
        canEqualize = true;
      }
    }
  }

  const handleEqualizeSiblings = () => {
    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    let containerNode = null;

    if (selectedNode.type === FACE_NAMES.CONTAINER) {
      containerNode = findNode(newConfig, selectedNode.id);
    } else {
      containerNode = findParent(newConfig, selectedNode.id);
    }

    if (!containerNode || !containerNode.children) return;

    const splitDimension =
      containerNode.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
        ? "width"
        : "height";
    const faces = containerNode.children.filter(
      (c) => c.type !== FACE_NAMES.REVEAL
    );
    const reveals = containerNode.children.filter(
      (c) => c.type === FACE_NAMES.REVEAL
    );

    if (faces.length <= 1) return; // No siblings to equalize

    const totalRevealSize = reveals.reduce(
      (sum, r) => sum + r[splitDimension],
      0
    );
    const availableSize = containerNode[splitDimension] - totalRevealSize;
    const equalSize = availableSize / faces.length;

    if (equalSize < minValue) {
      console.warn(
        `Equalize rejected: results in a size smaller than the minimum ${minValue}"`
      );
      return;
    }

    faces.forEach((face) => {
      face[splitDimension] = equalSize;
    });

    const layoutConfig = calculateLayout(newConfig);
    setConfig(layoutConfig);
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    const parent = findParent(newConfig, selectedNode.id);

    if (!parent) {
      // Cannot delete the root, but can reset it
      Object.assign(newConfig, {
        type: FACE_NAMES.DOOR,
        children: null,
        splitDirection: null,
        // Keep original dimensions
      });
    } else {
      const nodeIndex = parent.children.findIndex(
        (c) => c.id === selectedNode.id
      );
      if (nodeIndex === -1) return;

      const deletedNodeSize =
        parent.children[nodeIndex][
          parent.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
            ? "width"
            : "height"
        ];

      // Remove the node and its adjacent reveal
      if (nodeIndex > 0) {
        // Remove the node and the reveal before it
        parent.children.splice(nodeIndex - 1, 2);
      } else {
        // Remove the node and the reveal after it
        parent.children.splice(nodeIndex, 2);
      }

      // If only one child remains, collapse the parent container
      if (parent.children.length === 1) {
        const grandParent = findParent(newConfig, parent.id);
        const lastChild = parent.children[0];

        // The last child should expand to fill the parent's dimensions
        lastChild.width = parent.width;
        lastChild.height = parent.height;

        if (grandParent) {
          const parentIndex = grandParent.children.findIndex(
            (c) => c.id === parent.id
          );
          // Replace parent with the last child
          grandParent.children[parentIndex] = lastChild;
          // Update child's id to reflect new position in tree
          lastChild.id = parent.id;
        } else {
          // Parent is the root, so the last child becomes the new root
          Object.assign(newConfig, {
            ...lastChild,
            width: cabinetWidth - reveals.left - reveals.right,
            height: cabinetHeight - reveals.top - reveals.bottom,
            x: parent.x,
            y: parent.y,
          });
        }
      } else {
        // Redistribute the deleted node's size among the remaining siblings
        const dimension =
          parent.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
            ? "width"
            : "height";
        const remainingFaces = parent.children.filter(
          (c) => c.type !== FACE_NAMES.REVEAL
        );
        const totalFaceSize = remainingFaces.reduce(
          (sum, f) => sum + f[dimension],
          0
        );

        remainingFaces.forEach((face) => {
          const proportion = face[dimension] / totalFaceSize;
          face[dimension] += deletedNodeSize * proportion;
        });
      }
    }

    setConfig(newConfig);
    setSelectedNode(null);
    setShowTypeSelector(false);
  };

  const handleReset = () => {
    if (disabled) return;

    const resetConfig = {
      id: FACE_NAMES.ROOT,
      type: FACE_NAMES.DOOR,
      width: cabinetWidth - reveals.left - reveals.right,
      height: cabinetHeight - reveals.top - reveals.bottom,
      x: reveals.left,
      y: reveals.top,
      children: null,
    };

    setConfig(resetConfig);
    setSelectedNode(null);
    setShowTypeSelector(false);
  };

  const handleCancelChanges = () => {
    if (disabled || !originalConfigRef.current) return;

    // Create a fresh copy of the original config
    const revertedConfig = cloneDeep(originalConfigRef.current);

    // Adjust the root dimensions of the reverted config to match current props
    revertedConfig.width = cabinetWidth - reveals.left - reveals.right;
    revertedConfig.height = cabinetHeight - reveals.top - reveals.bottom;

    // Run update logic to ensure children match parent dimensions
    updateChildrenFromParent(revertedConfig);

    // Revert to the original config state
    setConfig(revertedConfig);
    setSelectedNode(null);
    setShowTypeSelector(false);
    onDimensionChange({
      target: {
        name: "width",
        value: originalConfigRef.current.width,
      },
    });
    onDimensionChange({
      target: {
        name: "height",
        value: originalConfigRef.current.height,
      },
    });
  };

  // Input handling functions following the user's pattern
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setInputValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const commitValue = (name) => {
    const raw = inputValues[name];
    const parsed = parseFloat(raw);

    if (!isNaN(parsed)) {
      // Use the existing handleDimensionChange function to commit the value
      handleDimensionChange(name, parsed);
    }
  };

  const handleBlur = (e) => {
    commitValue(e.target.name);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      commitValue(e.target.name);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <h4 className="text-sm font-medium text-slate-700">
        Cabinet Face Designer
      </h4>
      <div className="bg-white border border-slate-200 rounded-lg p-2">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={handleCancelChanges}
            className="invisible px-2 py-1 text-xs text-slate-600 hover:text-slate-800 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Cancel changes and revert to original"
            disabled={disabled}
          >
            <FiX className="mr-1" />
            Cancel Changes
          </button>
          <button
            onClick={handleReset}
            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset to default single door"
            disabled={disabled}
          >
            <FiRotateCcw className="mr-1" />
            Default
          </button>
        </div>

        <div className="relative flex justify-center">
          <svg
            ref={svgRef}
            width={fixedDisplayWidth}
            height={fixedDisplayHeight}
            className={`${disabled ? "opacity-50" : ""}`}
          />

          {/* Disabled overlay */}
          {disabled && (
            <div className="absolute inset-0 bg-slate-100 bg-opacity-75 flex items-center justify-center rounded">
              <div className="text-center">
                <p className="text-sm text-slate-600 font-medium">
                  Face Designer Disabled
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Please enter valid width, height, and depth dimensions
                </p>
              </div>
            </div>
          )}

          {/* Type Selector Popup */}
          {showTypeSelector && selectedNode && !disabled && (
            <div
              className="type-selector-popup absolute bg-white border border-slate-300 rounded-lg shadow-lg p-2 z-100"
              style={{
                left: Math.min(selectorPosition.x, fixedDisplayWidth - 200),
                top: Math.min(selectorPosition.y, fixedDisplayHeight - 200),
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
                        name="width"
                        value={inputValues.width}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        disabled={
                          isDimensionDisabled("width", selectedNode) ||
                          selectedNode.type === "reveal"
                        }
                        className="w-16 px-1 py-0.5 text-xs border border-slate-300 rounded"
                        step="0.125"
                        min={getDimensionConstraints("width").min}
                        max={getDimensionConstraints("width").max}
                      />
                    </div>
                    <span className="text-xs text-slate-400">×</span>
                    <div className="flex items-center space-x-1">
                      <label className="text-xs text-slate-600">H:</label>
                      <input
                        type="number"
                        name="height"
                        value={inputValues.height}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        disabled={
                          isDimensionDisabled("height", selectedNode) ||
                          selectedNode.type === "reveal"
                        }
                        className="w-16 px-1 py-0.5 text-xs border border-slate-300 rounded"
                        step="0.125"
                        min={getDimensionConstraints("height").min}
                        max={getDimensionConstraints("height").max}
                      />
                    </div>
                  </div>

                  {/* Roll-Out Quantity Input */}
                  {supportsRollOutsOrShelves(selectedNode.type) && (
                    <div className="mt-2 flex justify-between">
                      <div className="flex flex-col items-center space-x-1">
                        <label className="text-xs text-slate-600">
                          Roll-Outs:
                        </label>
                        <input
                          type="number"
                          name="rollOutQty"
                          value={inputValues.rollOutQty}
                          onChange={(e) => handleRoShQtyChange(e, "rollOutQty")}
                          className="w-16 px-1 py-0.5 text-xs border border-slate-300 rounded"
                          step="1"
                        />
                      </div>
                      <div className="flex flex-col items-center space-x-1">
                        <label className="text-xs text-slate-600">
                          Shelves:
                        </label>
                        <input
                          type="number"
                          name="shelfQty"
                          value={inputValues.shelfQty}
                          onChange={(e) => handleRoShQtyChange(e, "shelfQty")}
                          className="w-16 px-1 py-0.5 text-xs border border-slate-300 rounded"
                          step="1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type === FACE_NAMES.CONTAINER && (
                <div className="border-t border-slate-200 mt-3 pt-3">
                  <div className="text-xs font-medium text-slate-700 mb-2">
                    Container Actions:
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {canEqualize && (
                      <button
                        onClick={handleEqualizeSiblings}
                        className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Equalize Children
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedNode.type !== FACE_NAMES.REVEAL && (
                <>
                  <div className="text-xs font-medium text-slate-700 mb-2">
                    Change Type:
                  </div>
                  <div className="grid grid-cols-1 gap-1 mb-3">
                    {FACE_TYPES.filter(
                      (type) =>
                        type.value !== FACE_NAMES.CONTAINER &&
                        type.value !== FACE_NAMES.REVEAL
                    ).map((type) => (
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
                    ))}
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
                      {canEqualize &&
                        selectedNode.type !== FACE_NAMES.CONTAINER && (
                          <button
                            onClick={handleEqualizeSiblings}
                            className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            Equalize Siblings
                          </button>
                        )}
                      {selectedNode.id !== FACE_NAMES.ROOT && (
                        <button
                          onClick={handleDeleteNode}
                          className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-slate-500">
          Cabinet: {cabinetWidth}&quot; W × {cabinetHeight}&quot; H
          <br />
          Click faces to change type, edit dimensions, or split them.
        </div>
      </div>
    </div>
  );
};

CabinetFaceDivider.propTypes = {
  cabinetWidth: PropTypes.number.isRequired,
  cabinetHeight: PropTypes.number.isRequired,
  cabinetDepth: PropTypes.number.isRequired,
  cabinetStyle: PropTypes.string.isRequired,
  faceConfig: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  onDimensionChange: PropTypes.func,
};

export default CabinetFaceDivider;
