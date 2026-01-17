import * as d3 from "d3";
import { cloneDeep, isEqual } from "lodash";
import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { FiRotateCcw, FiX } from "react-icons/fi";
import { useSelector } from "react-redux";

import {
  getItemTypeConfig,
  getAvailableFaceTypes,
  shouldUseReveals,
  shouldUseRootReveals,
  hasFeature,
} from "../../config/cabinetItemTypes";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import {
  CAN_HAVE_ROLL_OUTS_OR_SHELVES,
  FACE_NAMES,
  ITEM_TYPES,
  SPLIT_DIRECTIONS,
} from "../../utils/constants";
import { calculateRollOutDimensions } from "../../utils/getSectionCalculations";
import { truncateTrailingZeros, calculateShelfQty } from "../../utils/helpers";

import FaceAccessories from "./FaceAccessories.jsx";

const CabinetFaceDivider = ({
  cabinetWidth,
  cabinetHeight,
  cabinetDepth,
  cabinetStyleId,
  cabinetTypeId,
  faceConfig = null,
  onSave,
  disabled = false,
  onDimensionChange = null,
}) => {
  const svgRef = useRef();
  const typeSelectorPopupRef = useRef(null);
  const handleEditorPopupRef = useRef(null);

  const cabinetStyles = useSelector((state) => state.cabinetStyles.styles);
  const cabinetTypes = useSelector((state) => state.cabinetTypes.types);
  const accessories = useSelector((state) => state.accessories);

  // Derive itemType from cabinetTypeId by looking it up in cabinetTypes
  const itemType = useMemo(() => {
    const type = cabinetTypes.find((t) => t.cabinet_type_id === cabinetTypeId);
    return type?.item_type || ITEM_TYPES.CABINET.type;
  }, [cabinetTypes, cabinetTypeId]);

  // Get item type configuration
  const itemConfig = useMemo(() => getItemTypeConfig(itemType), [itemType]);

  // Get available face types for this item type
  const availableFaceTypes = useMemo(
    () => getAvailableFaceTypes(itemType),
    [itemType]
  );

  // Check if this item type should use reveals
  const usesReveals = useMemo(
    () => shouldUseReveals(itemType, cabinetStyleId),
    [itemType, cabinetStyleId]
  );

  const usesRootReveals = useMemo(
    () => shouldUseRootReveals(itemType, cabinetStyleId),
    [itemType, cabinetStyleId]
  );

  const [config, setConfig] = useState(faceConfig);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const [showHandlePopup, setShowHandlePopup] = useState(false);
  const [handlePopupPosition, setHandlePopupPosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedHandle, setSelectedHandle] = useState(null); // e.g., { parent, splitDirection }
  const [handleInputValues, setHandleInputValues] = useState({});
  const [dragging, setDragging] = useState(null);
  const dragHappened = useRef(false); // Ref to track if a drag occurred
  const previousConfigRef = useRef();
  const originalConfigRef = useRef();
  const previousCabinetTypeIdRef = useRef(cabinetTypeId); // Track previous cabinet type
  // State for temporary input values
  const [inputValues, setInputValues] = useState({
    rollOutQty: "",
    shelfQty: "",
    glassPanel: "",
    glassShelves: "",
  });

  // Apply focus trap to popups
  useFocusTrap(typeSelectorPopupRef, showTypeSelector);
  useFocusTrap(handleEditorPopupRef, showHandlePopup);

  // Fixed display dimensions
  const fixedDisplayWidth = 300; // Fixed width for the SVG container
  const fixedDisplayHeight = 515; // Fixed height for the SVG container

  // Minimum face dimension (2 inches)
  const minValue = 2;

  // Memoize style and type lookups to prevent infinite loops in useEffect
  const style = useMemo(
    () =>
      cabinetStyles.find((style) => style.cabinet_style_id === cabinetStyleId),
    [cabinetStyles, cabinetStyleId]
  );

  const type = useMemo(
    () => style?.types?.find((type) => type.cabinet_type_id === cabinetTypeId),
    [style, cabinetTypeId]
  );

  // Use rootReveals from config if available, otherwise fall back to type config
  // Use ref to maintain stable reference and only update when values actually change
  const revealsRef = useRef(null);

  // Default reveals if nothing else is available
  const defaultReveals = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    reveal: 0,
  };

  // If !usesRootReveals, always use zero reveals, otherwise use config or type reveals
  const currentReveals = usesRootReveals
    ? config?.rootReveals || type?.config || defaultReveals
    : defaultReveals;

  // Only update ref if reveals actually changed (deep comparison)
  if (!isEqual(revealsRef.current, currentReveals)) {
    revealsRef.current = currentReveals;
  }

  const reveals = revealsRef.current;

  // Calculate display scale and offsets accounting for negative reveals (overhangs)
  // Get the actual bounds including any negative reveals
  let revealLeft = Math.abs(Math.min(0, reveals.left));
  let revealRight = Math.abs(Math.min(0, reveals.right));
  let revealTop = Math.abs(Math.min(0, reveals.top));
  let revealBottom = Math.abs(Math.min(0, reveals.bottom));

  // For non-Euro cabinets (cabinetStyleId !== 13), add root reveal overhangs
  if (cabinetStyleId !== 13 && cabinetTypeId !== 10 && reveals) {
    // Left overhang: reveal width minus the overlap (reveals.left)
    if (reveals.left && reveals.reveal) {
      revealLeft = Math.max(revealLeft, reveals.reveal - reveals.left);
    }
    // Right overhang: reveal width minus the overlap (reveals.right)
    if (reveals.right && reveals.reveal) {
      revealRight = Math.max(revealRight, reveals.reveal - reveals.right);
    }
    // Top overhang (if any)
    if (reveals.top && reveals.reveal) {
      revealTop = Math.max(revealTop, reveals.reveal - reveals.top);
    }
    // Bottom overhang - for upper cabinets (type 2), bottom reveal overhangs
    if (reveals.bottom && reveals.reveal) {
      if (cabinetTypeId === 2) {
        // Upper cabinets: bottom reveal is full reveal height, overhangs below
        revealBottom = Math.max(revealBottom, reveals.reveal - reveals.bottom);
      } else {
        // Other cabinets: standard behavior
        revealBottom = Math.max(revealBottom, reveals.reveal - reveals.bottom);
      }
    }
  }

  // Total display area includes cabinet + any overhangs
  const totalDisplayWidth = cabinetWidth + revealLeft + revealRight;
  const totalDisplayHeight = cabinetHeight + revealTop + revealBottom;

  const scaleX = fixedDisplayWidth / totalDisplayWidth;
  const scaleY = fixedDisplayHeight / totalDisplayHeight;
  const scale = Math.min(scaleX, scaleY);
  const displayWidth = totalDisplayWidth * scale;
  const displayHeight = totalDisplayHeight * scale;
  const offsetX = (fixedDisplayWidth - displayWidth) / 2;
  const offsetY = (fixedDisplayHeight - displayHeight) / 2;

  // Offset for the cabinet box within the display area (to account for overhangs)
  const cabinetOffsetX = revealLeft * scale;
  const cabinetOffsetY = revealTop * scale;

  // Function to normalize reveal dimensions in a loaded config
  const normalizeRevealDimensions = (node, revealsToUse = reveals) => {
    if (!node || !node.children) return;

    const revealValue = revealsToUse.reveal;

    node.children.forEach((child) => {
      if (child.type === FACE_NAMES.REVEAL) {
        if (node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL) {
          child.width = revealValue;
        } else if (node.splitDirection === SPLIT_DIRECTIONS.VERTICAL) {
          child.height = revealValue;
        }
      }
      // Recurse for nested containers
      normalizeRevealDimensions(child, revealsToUse);
    });
  };

  // Separate useEffect to handle rootReveals changes from parent (faceConfig prop)
  useEffect(() => {
    // Check if the incoming faceConfig has different rootReveals than our local config state
    if (
      faceConfig?.rootReveals &&
      config?.id === FACE_NAMES.ROOT &&
      !isEqual(faceConfig.rootReveals, config.rootReveals)
    ) {
      // Update the ref to the new reveals
      revealsRef.current = faceConfig.rootReveals;

      const updatedConfig = cloneDeep(config);

      // Update rootReveals with the new values from parent
      updatedConfig.rootReveals = faceConfig.rootReveals;

      // Update root dimensions based on new reveals FIRST
      updatedConfig.width =
        cabinetWidth -
        faceConfig.rootReveals.left -
        faceConfig.rootReveals.right;
      updatedConfig.height =
        cabinetHeight -
        faceConfig.rootReveals.top -
        faceConfig.rootReveals.bottom;
      updatedConfig.x = faceConfig.rootReveals.left;
      updatedConfig.y = faceConfig.rootReveals.top;

      // Normalize reveal dimensions with new reveals throughout the entire tree
      // We need to use the new reveals value directly
      const normalizeWithNewReveals = (node) => {
        if (!node || !node.children) return;

        const revealValue = faceConfig.rootReveals.reveal;

        node.children.forEach((child) => {
          if (child.type === FACE_NAMES.REVEAL) {
            if (node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL) {
              child.width = revealValue;
            } else if (node.splitDirection === SPLIT_DIRECTIONS.VERTICAL) {
              child.height = revealValue;
            }
          }
          // Recurse for nested containers
          normalizeWithNewReveals(child);
        });
      };

      // Normalize all reveals first
      normalizeWithNewReveals(updatedConfig);

      // THEN recursively update all children to scale proportionally
      // This ensures the scaling calculations use the correct reveal sizes
      updateChildrenFromParent(updatedConfig);

      // Force recalculation of layout with new dimensions and positions
      const layoutConfig = calculateLayout(updatedConfig);

      // Update state with the new configuration
      setConfig(layoutConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    faceConfig?.rootReveals,
    config?.rootReveals,
    cabinetWidth,
    cabinetHeight,
  ]);

  useEffect(() => {
    // Check if cabinet type has actually changed
    const cabinetTypeChanged =
      previousCabinetTypeIdRef.current !== cabinetTypeId;

    if (cabinetTypeChanged) {
      // Cabinet type changed - reset to default config with no children
      const initialReveals = usesRootReveals
        ? type?.config || {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            reveal: 0,
          }
        : {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            reveal: 0,
          };

      const initialHeight =
        cabinetHeight - initialReveals.top - initialReveals.bottom;

      const needsShelves = itemConfig.features.shelves;

      setConfig({
        id: FACE_NAMES.ROOT,
        type: itemConfig.defaultFaceType,
        width: cabinetWidth - initialReveals.left - initialReveals.right,
        height: initialHeight,
        x: initialReveals.left,
        y: initialReveals.top,
        children: null,
        shelfQty: needsShelves ? calculateShelfQty(initialHeight) : 0,
        rootReveals: initialReveals,
        accessories: [],
      });

      // Update the ref to the new type
      previousCabinetTypeIdRef.current = cabinetTypeId;
      return;
    }

    if (!config || (Array.isArray(config) && config.length === 0)) {
      // Initialize with a single root node for new cabinets or empty configs
      // If !usesRootReveals, all reveals should be 0
      const initialReveals = usesRootReveals
        ? type?.config || {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            reveal: 0,
          }
        : {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            reveal: 0,
          };

      const initialHeight =
        cabinetHeight - initialReveals.top - initialReveals.bottom;

      const needsShelves = itemConfig.features.shelves;

      setConfig({
        id: FACE_NAMES.ROOT,
        type: itemConfig.defaultFaceType,
        width: cabinetWidth - initialReveals.left - initialReveals.right,
        height: initialHeight,
        x: initialReveals.left,
        y: initialReveals.top,
        children: null,
        shelfQty: needsShelves ? calculateShelfQty(initialHeight) : 0,
        rootReveals: initialReveals,
        accessories: [],
      });
    } else if (config && !config.id) {
      // Ensure existing config has an id and rootReveals
      // If !usesRootReveals, all reveals should be 0
      const configReveals =
        config.rootReveals ||
        (usesRootReveals
          ? type?.config || {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              reveal: 0,
            }
          : {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              reveal: 0,
            });

      setConfig({
        ...config,
        id: FACE_NAMES.ROOT,
        rootReveals: configReveals,
      });
    } else if (config && config.id === FACE_NAMES.ROOT) {
      // Get the current reveals from type config
      // If !usesRootReveals, all reveals should be 0
      const currentReveals = usesRootReveals
        ? type?.config || {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            reveal: 0,
          }
        : {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            reveal: 0,
          };

      // Calculate expected dimensions
      const expectedWidth =
        cabinetWidth - currentReveals.left - currentReveals.right;
      const expectedHeight =
        cabinetHeight - currentReveals.top - currentReveals.bottom;

      // Only update if dimensions or reveals changed (NOT face type)
      const needsUpdate =
        config.width !== expectedWidth ||
        config.height !== expectedHeight ||
        !config.rootReveals ||
        !isEqual(config.rootReveals, currentReveals);

      if (needsUpdate) {
        const updatedConfig = cloneDeep(config);

        // Update rootReveals
        updatedConfig.rootReveals = currentReveals;

        // DO NOT update root face type - preserve the saved type
        // Only cabinet type changes should reset the face type

        // Normalize reveals before doing anything else - pass currentReveals explicitly
        normalizeRevealDimensions(updatedConfig, currentReveals);

        // Update root dimensions first so updateChildrenFromParent uses new values
        updatedConfig.width = expectedWidth;
        updatedConfig.height = expectedHeight;
        updatedConfig.x = currentReveals.left;
        updatedConfig.y = currentReveals.top;

        // Recursively update all children to scale proportionally
        updateChildrenFromParent(updatedConfig);

        // Force recalculation of layout with new dimensions
        const layoutConfig = calculateLayout(updatedConfig);

        // Update state with the new configuration
        setConfig(layoutConfig);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinetWidth, cabinetHeight, cabinetTypeId, usesRootReveals, type]);

  useEffect(() => {
    renderCabinet();
  }, [
    config,
    displayWidth,
    displayHeight,
    disabled,
    showHandlePopup,
    selectedHandle,
  ]);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHandlePopup) {
        const popup = event.target.closest(".handle-editor-popup");
        // Check if the click is on a handle element
        const handle = event.target.closest(
          '[cursor="ew-resize"], [cursor="ns-resize"]'
        );

        if (!popup && !handle) {
          setShowHandlePopup(false);
        }
      }
    };

    if (showHandlePopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showHandlePopup]);

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
          const childWidth = child.width;
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
          const childHeight = child.height;
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

    if (faces.length > 0) {
      const totalChildSize = faces.reduce(
        (sum, f) => sum + f[splitDimension],
        0
      );
      const revealSize = reveal ? reveal[splitDimension] : 0;
      const scaleFactor = (node[splitDimension] - revealSize) / totalChildSize;

      faces.forEach((face) => {
        face[splitDimension] *= scaleFactor;
      });
    }

    // Recursively update grandchildren
    node.children.forEach((child) => {
      updateChildrenFromParent(child);
    });
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

    const faceType = availableFaceTypes.find((t) => t.value === node.type);
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
      const isMidOrLastSibling = nodeIndex > 0;

      // Create a group for handles with high z-index
      const handleGroup = cabinetGroup
        .append("g")
        .style("pointer-events", "all");

      // Only add right handle if not the last sibling in a horizontal split
      if (
        nodeParent.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL &&
        !isMidOrLastSibling
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
            dragHappened.current = false; // Reset drag flag
            handleDragStart(event, node, "width");
          })
          .on("click", (event) => {
            if (dragHappened.current) return; // Don't open popup if a drag happened
            event.stopPropagation();
            handleHandleClick(event, nodeParent, SPLIT_DIRECTIONS.HORIZONTAL);
          });
      }

      // Only add bottom handle if not the last sibling in a vertical split
      if (
        nodeParent.splitDirection === SPLIT_DIRECTIONS.VERTICAL &&
        !isMidOrLastSibling
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
            dragHappened.current = false; // Reset drag flag
            handleDragStart(event, node, "height");
          })
          .on("click", (event) => {
            if (dragHappened.current) return; // Don't open popup if a drag happened
            event.stopPropagation();
            handleHandleClick(event, nodeParent, SPLIT_DIRECTIONS.VERTICAL);
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

    // Add a transform group to center the cabinet (includes space for overhangs)
    const cabinetGroup = svg
      .append("g")
      .attr(
        "transform",
        `translate(${offsetX + cabinetOffsetX}, ${offsetY + cabinetOffsetY})`
      );

    // Create a dedicated group for highlights, added last to be on top
    const highlightGroup = svg
      .append("g")
      .attr(
        "transform",
        `translate(${offsetX + cabinetOffsetX}, ${offsetY + cabinetOffsetY})`
      );

    const strokeWidth = cabinetStyleId === 13 ? 0 : 2;
    // Add background for the cabinet box
    cabinetGroup
      .append("rect")
      .attr("width", cabinetWidth * scale)
      .attr("height", cabinetHeight * scale)
      .attr("fill", "#F8FAFC")
      .attr("stroke", "#E2E8F0")
      .attr("stroke-width", strokeWidth);

    // Add root reveals if item type supports them
    if (usesRootReveals && cabinetStyleId !== 13 && reveals) {
      const revealColor =
        availableFaceTypes.find((t) => t.value === FACE_NAMES.REVEAL)?.color ||
        "#6B7280";

      // For upper cabinets (type 2), bottom reveal overhangs
      const isUpperCabinet = cabinetTypeId === 2;
      const bottomOverhang =
        isUpperCabinet && reveals.bottom ? reveals.reveal - reveals.bottom : 0;

      // Left reveal - full cabinet height, overhangs on left side
      // For upper cabinets, extends to include bottom overhang
      if (reveals.left) {
        const leftRevealHeight = cabinetHeight + bottomOverhang;
        const leftRevealNode = {
          id: "root-reveal-left",
          type: FACE_NAMES.REVEAL,
          width: reveals.reveal,
          height: leftRevealHeight,
          x: reveals.left - reveals.reveal,
          y: 0,
        };

        const xVal = cabinetTypeId === 10 ? 0 : -reveals.left;

        cabinetGroup
          .append("rect")
          .attr("x", xVal * scale)
          .attr("y", 0)
          .attr("width", reveals.reveal * scale)
          .attr("height", leftRevealHeight * scale)
          .attr("fill", "#E5E7EB")
          .attr("fill-opacity", 0.3)
          .attr("stroke", revealColor)
          .attr("stroke-width", 2)
          .attr("cursor", "pointer")
          .style("pointer-events", "all")
          .on("click", (event) => {
            event.stopPropagation();
            handleNodeClick(event, leftRevealNode);
          });
      }

      // Right reveal - full cabinet height, overhangs on right side
      // For upper cabinets, extends to include bottom overhang
      if (reveals.right) {
        const rightRevealHeight = cabinetHeight + bottomOverhang;
        const rightRevealNode = {
          id: "root-reveal-right",
          type: FACE_NAMES.REVEAL,
          width: reveals.reveal,
          height: rightRevealHeight,
          x: cabinetWidth - reveals.right,
          y: 0,
        };

        cabinetGroup
          .append("rect")
          .attr("x", (cabinetWidth - reveals.right) * scale)
          .attr("y", 0)
          .attr("width", reveals.reveal * scale)
          .attr("height", rightRevealHeight * scale)
          .attr("fill", "#E5E7EB")
          .attr("fill-opacity", 0.3)
          .attr("stroke", revealColor)
          .attr("stroke-width", 2)
          .attr("cursor", "pointer")
          .style("pointer-events", "all")
          .on("click", (event) => {
            event.stopPropagation();
            handleNodeClick(event, rightRevealNode);
          });
      }

      // Top reveal - width is cabinet width minus left and right reveals
      if (reveals.top) {
        const topWidth =
          cabinetWidth - (reveals.left || 0) - (reveals.right || 0);
        const topX = reveals.left || 0;

        const topRevealNode = {
          id: "root-reveal-top",
          type: FACE_NAMES.REVEAL,
          width: topWidth,
          height: reveals.top,
          x: topX,
          y: 0,
        };

        cabinetGroup
          .append("rect")
          .attr("x", topX * scale)
          .attr("y", 0)
          .attr("width", topWidth * scale)
          .attr("height", reveals.top * scale)
          .attr("fill", "#E5E7EB")
          .attr("fill-opacity", 0.3)
          .attr("stroke", revealColor)
          .attr("stroke-width", 2)
          .attr("cursor", "pointer")
          .style("pointer-events", "all")
          .on("click", (event) => {
            event.stopPropagation();
            handleNodeClick(event, topRevealNode);
          });
      }

      // Bottom reveal - width is cabinet width minus left and right reveals
      // For upper cabinets (type 2), bottom reveal overhangs below the cabinet
      if (reveals.bottom) {
        const bottomWidth =
          cabinetWidth - (reveals.left || 0) - (reveals.right || 0);
        const bottomX = reveals.left || 0;
        const bottomHeight = isUpperCabinet ? reveals.reveal : reveals.bottom;
        const bottomY = isUpperCabinet
          ? cabinetHeight - reveals.bottom
          : cabinetHeight - reveals.bottom;

        const bottomRevealNode = {
          id: "root-reveal-bottom",
          type: FACE_NAMES.REVEAL,
          width: bottomWidth,
          height: bottomHeight,
          x: bottomX,
          y: bottomY,
        };

        cabinetGroup
          .append("rect")
          .attr("x", bottomX * scale)
          .attr("y", bottomY * scale)
          .attr("width", bottomWidth * scale)
          .attr("height", bottomHeight * scale)
          .attr("fill", "#E5E7EB")
          .attr("fill-opacity", 0.3)
          .attr("stroke", revealColor)
          .attr("stroke-width", 2)
          .attr("cursor", "pointer")
          .style("pointer-events", "all")
          .on("click", (event) => {
            event.stopPropagation();
            handleNodeClick(event, bottomRevealNode);
          });
      }
    }

    // Render the tree
    renderNode(layoutConfig);

    // Add highlight borders if the handle popup is open
    if (showHandlePopup && selectedHandle) {
      const parentNode = findNode(layoutConfig, selectedHandle.parent.id);
      if (parentNode && parentNode.children) {
        parentNode.children.forEach((child) => {
          if (child.type !== FACE_NAMES.REVEAL) {
            const strokeWidth = child.type === FACE_NAMES.CONTAINER ? 1 : 2;
            const x = child.x * scale + strokeWidth / 2;
            const y = child.y * scale + strokeWidth / 2;
            const width = Math.max(0, child.width * scale - strokeWidth);
            const height = Math.max(0, child.height * scale - strokeWidth);

            highlightGroup
              .append("rect")
              .attr("x", x + 1)
              .attr("y", y + 1)
              .attr("width", width - 2)
              .attr("height", height - 2)
              .attr("fill", "none")
              .attr("stroke", "#000000")
              .attr("stroke-width", 3)
              .attr("pointer-events", "none");
          }
        });
      }
    }

    // Add click handler to SVG background for closing selector
    svg.on("click", () => {
      setShowTypeSelector(false);
      setSelectedNode(null);
      setShowHandlePopup(false);
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

  // Check if rollouts should be shown for this face type and item type
  const supportsRollouts = (nodeType) => {
    const faceTypeSupports = CAN_HAVE_ROLL_OUTS_OR_SHELVES.includes(nodeType);
    const itemTypeAllows = hasFeature(itemType, "rollouts");
    return faceTypeSupports && itemTypeAllows;
  };

  // Check if shelves should be shown for this face type and item type
  const supportsShelves = (nodeType) => {
    const faceTypeSupports = CAN_HAVE_ROLL_OUTS_OR_SHELVES.includes(nodeType);
    const itemTypeAllows = hasFeature(itemType, "shelves");
    return faceTypeSupports && itemTypeAllows;
  };

  const supportsGlassPanel = itemType !== ITEM_TYPES.FILLER.type;

  const glassPanelOptions = (nodeType) => {
    const glassOptions = accessories.glass.filter((glass) =>
      glass.applies_to.includes(nodeType)
    );
    return glassOptions;
  };

  // Handle glass panel change
  const handleGlassPanelChange = (e) => {
    const glassPanelId = e.target.value;

    // Update input value state
    setInputValues({ ...inputValues, glassPanel: glassPanelId });

    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    const node = findNode(newConfig, selectedNode.id);

    if (node) {
      // Store the glass panel ID on the node
      node.glassPanel = glassPanelId || null;

      setConfig(newConfig);
      setSelectedNode({
        ...selectedNode,
        glassPanel: glassPanelId || null,
      });
    }
  };

  // Handle glass shelves change
  const handleGlassShelvesChange = (e) => {
    const glassShelvesId = e.target.value;

    // Update input value state
    setInputValues({ ...inputValues, glassShelves: glassShelvesId });

    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    const node = findNode(newConfig, selectedNode.id);

    if (node) {
      // Store the glass shelves ID on the node
      node.glassShelves = glassShelvesId || null;

      setConfig(newConfig);
      setSelectedNode({
        ...selectedNode,
        glassShelves: glassShelvesId || null,
      });
    }
  };

  // Handle accessories change
  const handleAccessoriesChange = (updatedAccessories) => {
    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    const node = findNode(newConfig, selectedNode.id);

    if (node) {
      // Store the accessories array on the node
      node.accessories = updatedAccessories;

      setConfig(newConfig);
      setSelectedNode({
        ...selectedNode,
        accessories: updatedAccessories,
      });
    }
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

      // Clear drawer box dimensions if changing away from drawer_front
      if (newType !== FACE_NAMES.DRAWER_FRONT) {
        delete node.drawerBoxDimensions;
      }

      // Set default shelf quantity for supported types
      if (supportsShelves(newType)) {
        const standardShelfQty = calculateShelfQty(node.height);
        node.shelfQty = node.shelfQty || standardShelfQty;

        setInputValues((prev) => ({
          ...prev,
          shelfQty: node.shelfQty || standardShelfQty,
        }));
      } else {
        // Reset roll-outs & shelves if unsupported
        node.rollOutQty = 0;
        node.shelfQty = 0;
        delete node.rollOutDimensions;

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
              style,
              node.width,
              cabinetDepth,
              node.height,
              node.type,
              true // isRollout
            );
          }

          if (node.type === FACE_NAMES.DRAWER_FRONT) {
            node.drawerBoxDimensions = calculateRollOutDimensions(
              style,
              node.width,
              cabinetDepth,
              node.height,
              node.type,
              false // isRollout
            );
          }

          if (node.shelfQty > 0) {
            node.shelfDimensions = {
              width: cabinetDepth,
              height: node.width,
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

  const handleDragStart = (event, node, dimension) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();

    const parent = findParent(config, node.id);
    if (!parent) return;
    const sibling = parent.children.find(
      (c) => c.id !== node.id && c.type !== FACE_NAMES.REVEAL
    );
    if (!sibling) return;

    setDragging({
      node,
      dimension,
      startX: event.clientX,
      startY: event.clientY,
      originalNodeSize: node[dimension],
      originalSiblingSize: sibling[dimension],
    });
  };

  const handleDrag = (event) => {
    if (!dragging) return;

    const {
      node,
      dimension,
      startX,
      startY,
      originalNodeSize,
      originalSiblingSize,
    } = dragging;

    // If mouse has moved more than a small threshold, consider it a drag
    if (
      Math.abs(event.clientX - startX) > 3 ||
      Math.abs(event.clientY - startY) > 3
    ) {
      dragHappened.current = true;
    }

    // Calculate raw delta from the start of the drag
    let rawDelta;
    if (dimension === "width") {
      rawDelta = (event.clientX - startX) / scale;
    } else {
      rawDelta = (event.clientY - startY) / scale;
    }

    // Quantize the delta to the desired step
    const dragStep = 0.0625;
    const delta = Math.round(rawDelta / dragStep) * dragStep;

    // Get the current node value from config (not the stale dragging reference)
    const newConfig = cloneDeep(config);
    const currentNode = findNode(newConfig, node.id);
    if (!currentNode) return;

    const parent = findParent(newConfig, node.id);
    if (!parent) return;

    const sibling = parent.children.find(
      (c) => c.id !== node.id && c.type !== FACE_NAMES.REVEAL
    );
    if (!sibling) return;

    const newValue = originalNodeSize + delta;
    const newSiblingValue = originalSiblingSize - delta;

    if (newValue < minValue || newSiblingValue < minValue) {
      return; // Prevent resizing below minimum
    }

    currentNode[dimension] = newValue;
    sibling[dimension] = newSiblingValue;

    // Update children if the resized nodes are containers
    if (currentNode.children) {
      updateChildrenFromParent(currentNode);
    }
    if (sibling.children) {
      updateChildrenFromParent(sibling);
    }

    // Update the config
    setConfig(newConfig);
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
  }, [dragging, config, scale]);

  const handleHandleClick = (event, parentNode, splitDirection) => {
    if (disabled) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    setHandlePopupPosition({
      x: event.clientX - svgRect.left,
      y: event.clientY - svgRect.top,
    });
    setSelectedHandle({ parent: parentNode, splitDirection });

    // Initialize input values for the handle popup
    const initialValues = {};
    const dimension =
      splitDirection === SPLIT_DIRECTIONS.HORIZONTAL ? "width" : "height";
    parentNode.children.forEach((child) => {
      initialValues[child.id] = child[dimension];
    });
    setHandleInputValues(initialValues);

    setShowHandlePopup(true);

    // Also close the other popup if it's open
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleSiblingDimensionChange = (childId, dimension, newValueStr) => {
    const step = 0.0625;
    const roundedValue = Math.round(parseFloat(newValueStr) / step) * step;

    const newValue = roundedValue === "" ? 0 : parseFloat(roundedValue);
    if (!selectedHandle || isNaN(newValue)) return;

    const newConfig = cloneDeep(config);
    const parentNode = findNode(newConfig, selectedHandle.parent.id);

    if (!parentNode || !parentNode.children) return;

    const node = parentNode.children.find((c) => c.id === childId);
    if (!node) return;

    if (node.type === FACE_NAMES.REVEAL) {
      // Logic for when a REVEAL is edited
      const siblings = parentNode.children.filter(
        (c) => c.type !== FACE_NAMES.REVEAL
      );
      if (siblings.length !== 2) return; // This logic only works for exactly 2 siblings

      const originalRevealNode = selectedHandle.parent.children.find(
        (c) => c.id === childId
      );
      const oldRevealSize = originalRevealNode[dimension];
      const revealDelta = newValue - oldRevealSize;
      const adjustment = revealDelta / 2;

      const newSibling1Size = siblings[0][dimension] - adjustment;
      const newSibling2Size = siblings[1][dimension] - adjustment;

      if (newSibling1Size < minValue || newSibling2Size < minValue) {
        console.warn(
          `Change rejected: Sibling size would be less than ${minValue}"`
        );
        setHandleInputValues((prev) => ({ ...prev, [childId]: oldRevealSize }));
        return;
      }

      node[dimension] = newValue;
      siblings[0][dimension] = newSibling1Size;
      siblings[1][dimension] = newSibling2Size;

      setHandleInputValues((prev) => ({
        ...prev,
        [node.id]: newValue,
        [siblings[0].id]: newSibling1Size,
        [siblings[1].id]: newSibling2Size,
      }));
    } else {
      // Logic for when a regular FACE is edited
      const sibling = parentNode.children.find(
        (c) => c.id !== childId && c.type !== FACE_NAMES.REVEAL
      );
      const reveal = parentNode.children.find(
        (c) => c.type === FACE_NAMES.REVEAL
      );

      if (!sibling || !reveal) return;

      const parentSize = parentNode[dimension];
      const revealSize = reveal[dimension];
      const newSiblingSize = parentSize - newValue - revealSize;

      if (newSiblingSize < minValue) {
        console.warn(
          `Change rejected: Sibling size would be less than ${minValue}"`
        );
        const originalNode = selectedHandle.parent.children.find(
          (c) => c.id === childId
        );
        const originalSibling = selectedHandle.parent.children.find(
          (c) => c.id === sibling.id
        );
        setHandleInputValues((prev) => ({
          ...prev,
          [originalNode.id]: originalNode[dimension],
          [originalSibling.id]: originalSibling[dimension],
        }));
        return;
      }

      node[dimension] = newValue;
      sibling[dimension] = newSiblingSize;

      setHandleInputValues((prev) => ({
        ...prev,
        [node.id]: newValue,
        [sibling.id]: newSiblingSize,
      }));
    }

    // Update children of all affected nodes if they are containers
    parentNode.children.forEach((child) => {
      if (child.children) {
        updateChildrenFromParent(child);
      }
    });

    const layoutConfig = calculateLayout(newConfig);
    setConfig(layoutConfig);
  };

  const handleSiblingInputChange = (e) => {
    const { name, value } = e.target;

    setHandleInputValues((prev) => ({ ...prev, [name]: value }));
  };

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
      rollOutQty:
        node.rollOutQty > 0
          ? truncateTrailingZeros(node.rollOutQty)
          : node.rollOutQty || "",
      shelfQty:
        node.shelfQty > 0
          ? truncateTrailingZeros(node.shelfQty)
          : node.shelfQty || "",
      glassPanel: node.glassPanel || "",
      glassShelves: node.glassShelves || "",
    });

    setShowTypeSelector(true);
  };

  const handleSplitHorizontal = () => {
    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    const node = findNode(newConfig, selectedNode.id);
    if (node) {
      // Use reveals for dividers
      const reveals = faceConfig.rootReveals;
      const dividerType = FACE_NAMES.REVEAL;
      const dividerWidth = reveals.reveal;

      const childWidth = (node.width - dividerWidth) / 2;

      const childType =
        node.type === FACE_NAMES.CONTAINER
          ? usesReveals
            ? FACE_NAMES.DOOR
            : FACE_NAMES.PANEL
          : node.type;

      const canHaveShelves = supportsShelves(childType);

      node.children = [
        {
          id: generateId(node.id, 0),
          type: childType,
          width: childWidth,
          height: node.height,
          rollOutQty: null,
          shelfQty: canHaveShelves ? calculateShelfQty(node.height) : null,
          children: null,
          accessories: [],
        },
        {
          id: generateId(node.id, 1),
          type: dividerType,
          width: dividerWidth,
          height: node.height,
          accessories: [],
        },
        {
          id: generateId(node.id, 2),
          type: childType,
          width: childWidth,
          height: node.height,
          rollOutQty: null,
          shelfQty: canHaveShelves ? calculateShelfQty(node.height) : null,
          children: null,
          accessories: [],
        },
      ];
      node.splitDirection = SPLIT_DIRECTIONS.HORIZONTAL;
      node.type = FACE_NAMES.CONTAINER;
      node.rollOutQty = 0;
      node.drawerBoxDimensions = null;
      node.shelfQty = 0;
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
      // Use reveals for dividers
      const reveals = faceConfig.rootReveals;
      const dividerType = FACE_NAMES.REVEAL;
      const dividerHeight = reveals.reveal;

      const childHeight = (node.height - dividerHeight) / 2;

      const childType =
        node.type === FACE_NAMES.CONTAINER
          ? usesReveals
            ? FACE_NAMES.DOOR
            : FACE_NAMES.PANEL
          : node.type;

      const canHaveShelves = supportsShelves(childType);

      node.children = [
        {
          id: generateId(node.id, 0),
          type: childType,
          width: node.width,
          height: childHeight,
          rollOutQty: null,
          shelfQty: canHaveShelves ? calculateShelfQty(childHeight) : null,
          children: null,
          accessories: [],
        },
        {
          id: generateId(node.id, 1),
          type: dividerType,
          width: node.width,
          height: dividerHeight,
          accessories: [],
        },
        {
          id: generateId(node.id, 2),
          type: childType,
          width: node.width,
          height: childHeight,
          rollOutQty: null,
          shelfQty: canHaveShelves ? calculateShelfQty(childHeight) : null,
          children: null,
          accessories: [],
        },
      ];
      node.splitDirection = SPLIT_DIRECTIONS.VERTICAL;
      node.type = FACE_NAMES.CONTAINER;
      node.rollOutQty = 0;
      node.shelfQty = 0;
      node.drawerBoxDimensions = null;
    }

    setConfig(newConfig);
    setShowTypeSelector(false);
    setSelectedNode(null);
  };

  const handleEqualizeSiblings = () => {
    if (!selectedHandle) return;

    const newConfig = cloneDeep(config);
    const containerNode = findNode(newConfig, selectedHandle.parent.id);

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

    const newInputValues = { ...handleInputValues };
    faces.forEach((face) => {
      face[splitDimension] = equalSize;
      newInputValues[face.id] = equalSize;
    });

    const layoutConfig = calculateLayout(newConfig);
    setConfig(layoutConfig);
    setHandleInputValues(newInputValues);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;

    const newConfig = cloneDeep(config);
    const parent = findParent(newConfig, selectedNode.id);

    if (!parent) {
      // Cannot delete the root, but can reset it
      Object.assign(newConfig, {
        type: itemConfig.defaultFaceType,
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
          const canHaveShelves = supportsShelves(lastChild.type);
          const newHeight = cabinetHeight - reveals.top - reveals.bottom;
          // Parent is the root, so the last child becomes the new root
          Object.assign(newConfig, {
            ...lastChild,
            width: cabinetWidth - reveals.left - reveals.right,
            height: newHeight,
            x: parent.x,
            y: parent.y,
            rollOutQty: null,
            shelfQty: canHaveShelves ? calculateShelfQty(newHeight) : null,
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

    const needsShelves = itemConfig.features.shelves;
    const resetHeight = cabinetHeight - reveals.top - reveals.bottom;

    const resetConfig = {
      id: FACE_NAMES.ROOT,
      type: itemConfig.defaultFaceType,
      width: cabinetWidth - reveals.left - reveals.right,
      height: resetHeight,
      x: reveals.left,
      y: reveals.top,
      children: null,
      shelfQty: needsShelves ? calculateShelfQty(resetHeight) : 0,
      rootReveals: reveals,
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

          {/* Handle Dimension Editor Popup */}
          {showHandlePopup && selectedHandle && !disabled && (
            <div
              ref={handleEditorPopupRef}
              className="handle-editor-popup absolute bg-white border border-slate-300 rounded-lg shadow-lg p-3 z-20"
              style={{
                left: Math.min(
                  selectedHandle.splitDirection === SPLIT_DIRECTIONS.VERTICAL
                    ? handlePopupPosition.x - 180 // Position to the left of vertical handle
                    : handlePopupPosition.x,
                  fixedDisplayWidth - 250
                ),
                top: Math.min(
                  selectedHandle.splitDirection === SPLIT_DIRECTIONS.VERTICAL
                    ? handlePopupPosition.y - 100
                    : handlePopupPosition.y,
                  fixedDisplayHeight - 200
                ),
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
              <div className="text-xs font-medium text-slate-700 mb-2">
                Edit Sibling Dimensions
              </div>
              <div className="text-xs text-slate-500 mb-2 border-b pb-2">
                Container: {truncateTrailingZeros(selectedHandle.parent.width)}
                &quot; W × {truncateTrailingZeros(selectedHandle.parent.height)}
                &quot; H
              </div>
              <div className="text-xs text-right font-semibold text-slate-500 mb-2 capitalize">
                Modify{" "}
                {selectedHandle.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
                  ? "Widths"
                  : "Heights"}
              </div>
              {selectedHandle.parent.children.map((child) => {
                const dimension =
                  selectedHandle.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
                    ? "width"
                    : "height";
                const faceType = availableFaceTypes.find(
                  (t) => t.value === child.type
                );
                const isReveal = child.type === FACE_NAMES.REVEAL;

                return (
                  <div
                    key={child.id}
                    className="flex items-center justify-between space-x-2 mb-1"
                  >
                    <label className="text-xs text-slate-600 truncate w-24">
                      {faceType?.label || "Reveal"}
                    </label>
                    <input
                      type="number"
                      name={child.id}
                      value={handleInputValues[child.id] || ""}
                      onChange={handleSiblingInputChange}
                      onBlur={(e) =>
                        handleSiblingDimensionChange(
                          child.id,
                          dimension,
                          e.target.value
                        )
                      }
                      className="w-20 px-1 py-0.5 text-xs border border-slate-300 rounded"
                      step="0.0625"
                    />
                  </div>
                );
              })}
              {selectedHandle.parent.children.filter(
                (c) => c.type !== FACE_NAMES.REVEAL
              ).length > 1 && (
                <button
                  onClick={handleEqualizeSiblings}
                  className="mt-2 w-full px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                >
                  Equalize Siblings
                </button>
              )}
            </div>
          )}

          {/* Type Selector Popup */}
          {showTypeSelector && selectedNode && !disabled && (
            <div
              ref={typeSelectorPopupRef}
              className="type-selector-popup absolute bg-white border border-slate-300 rounded-lg shadow-lg p-2 z-10 flex space-x-2"
              style={{
                left: Math.min(selectorPosition.x, fixedDisplayWidth - 200),
                top: Math.min(selectorPosition.y, fixedDisplayHeight - 200),
              }}
            >
              <div>
                {/* Dimensions for leaf nodes */}
                {!selectedNode.children && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-slate-700 mb-2">
                      Dimensions:
                    </div>
                    <div className="flex space-x-2 items-center">
                      <div className="flex items-center space-x-1">
                        <label className="text-xs text-slate-600">W:</label>
                        <span className="w-20 px-1 py-0.5 text-xs font-semibold text-slate-800">
                          {truncateTrailingZeros(selectedNode.width)}&quot;
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">×</span>
                      <div className="flex items-center space-x-1">
                        <label className="text-xs text-slate-600">H:</label>
                        <span className="w-20 px-1 py-0.5 text-xs font-semibold text-slate-800">
                          {truncateTrailingZeros(selectedNode.height)}&quot;
                        </span>
                      </div>
                    </div>

                    {/* Roll-Out and Shelf Quantity Inputs */}
                    {(supportsRollouts(selectedNode.type) ||
                      supportsShelves(selectedNode.type)) && (
                      <div className="mt-2 flex justify-between">
                        {supportsRollouts(selectedNode.type) && (
                          <div className="flex flex-col items-center space-x-1">
                            <label className="text-xs text-slate-600">
                              Roll-Outs:
                            </label>
                            <input
                              type="number"
                              name="rollOutQty"
                              value={inputValues.rollOutQty}
                              onChange={(e) =>
                                handleRoShQtyChange(e, "rollOutQty")
                              }
                              className="w-16 px-1 py-0.5 text-xs border border-slate-300 rounded"
                              step="1"
                            />
                          </div>
                        )}
                        {supportsShelves(selectedNode.type) && (
                          <div className="flex flex-col items-center space-x-1">
                            <label className="text-xs text-slate-600">
                              Shelves:
                            </label>
                            <input
                              type="number"
                              name="shelfQty"
                              value={inputValues.shelfQty}
                              onChange={(e) =>
                                handleRoShQtyChange(e, "shelfQty")
                              }
                              className="w-16 px-1 py-0.5 text-xs border border-slate-300 rounded"
                              step="1"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex space-x-4">
                      {supportsGlassPanel && glassPanelOptions(selectedNode.type).length > 0 && (
                        <div className="flex-1 flex flex-col items-center space-x-1">
                          <label className="text-xs text-slate-600">
                            Glass Panel:
                          </label>
                          <select
                            name="glassPanel"
                            value={inputValues.glassPanel}
                            onChange={(e) => handleGlassPanelChange(e)}
                            className="px-1 py-0.5 text-xs border border-slate-300 rounded"
                          >
                            <option value="">None</option>
                            {glassPanelOptions(selectedNode.type).map(
                              (glass) => (
                                <option key={glass.id} value={glass.id}>
                                  {glass.name}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      )}
                      {supportsShelves(selectedNode.type) && accessories.glass.length > 0 && (
                        <div className="flex-1 flex flex-col items-center space-x-1">
                          <label className="text-xs text-slate-600">
                            Shelves:
                          </label>
                          <select
                            name="glassShelves"
                            value={inputValues.glassShelves}
                            onChange={(e) => handleGlassShelvesChange(e)}
                            className="px-1 py-0.5 text-xs border border-slate-300 rounded"
                          >
                            <option value="">Box Material</option>
                            {accessories.glass.map((glass) => (
                              <option key={glass.id} value={glass.id}>
                                {glass.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedNode.type === FACE_NAMES.CONTAINER && (
                  <div className="border-t border-slate-200 mt-3 pt-3">
                    <div className="text-xs font-medium text-slate-700 mb-2">
                      Container Actions:
                    </div>
                    <div className="grid grid-cols-1 gap-1">
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
                  </div>
                )}

                {selectedNode.type !== FACE_NAMES.REVEAL && (
                  <>
                    <div className="text-xs font-medium text-slate-700 mb-2">
                      Change Type:
                    </div>
                    <div className="grid grid-cols-1 gap-1 mb-3">
                      {availableFaceTypes
                        .filter(
                          (type) =>
                            type.value !== FACE_NAMES.CONTAINER &&
                            type.value !== FACE_NAMES.REVEAL
                        )
                        .map((type) => (
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
                      <div className="flex-1 flex flex-col space-y-1">
                        {itemConfig.allowsSplitting && (
                          <div className="flex space-x-1">
                            <button
                              onClick={handleSplitHorizontal}
                              className="flex-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              Split Horizontal
                            </button>
                            <button
                              onClick={handleSplitVertical}
                              className="flex-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              Split Vertical
                            </button>
                          </div>
                        )}
                        <button
                          onClick={handleDeleteNode}
                          className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="border-l border-slate-200 pl-2 w-64">
                <FaceAccessories
                  faceNode={selectedNode}
                  accessories={accessories}
                  onAccessoriesChange={handleAccessoriesChange}
                />
              </div>  
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
  cabinetStyleId: PropTypes.number.isRequired,
  cabinetTypeId: PropTypes.number.isRequired,
  faceConfig: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  onSave: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  onDimensionChange: PropTypes.func,
};

export default CabinetFaceDivider;
