import { v4 as uuid } from "uuid";

import { getCabinetFacePresets } from "../config/cabinetFacePresets";
import {
  getItemTypeConfig,
  hasFeature,
  shouldUseReveals,
  shouldUseRootReveals,
} from "../config/cabinetItemTypes";

import {
  CAN_BE_BEADED,
  CAN_HAVE_ROLL_OUTS_OR_SHELVES,
  DEFAULT_NO_SHELVES,
  FACE_NAMES,
  ITEM_TYPES,
  PART_NAMES,
  SPLIT_DIRECTIONS,
} from "./constants";
import { calculateRollOutDimensions } from "./getSectionCalculations";
import { calculateShelfQty } from "./helpers";

const ZERO_REVEALS = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  reveal: 0,
};

const roundTo16th = (value) => Math.round(Number(value) * 16) / 16;

const generateNodeId = (parentId, index) =>
  !parentId || parentId === FACE_NAMES.ROOT
    ? index.toString()
    : `${parentId}-${index}`;

const resolvePresetDimension = (
  dimensionConfig,
  cabinetStyleId,
  dimension,
  splitDirection,
  dividerSize,
) => {
  if (typeof dimensionConfig === "number") return dimensionConfig;
  if (!dimensionConfig || typeof dimensionConfig !== "object") return null;

  const styleValue =
    dimensionConfig.byCabinetStyleId?.[cabinetStyleId] ?? null;
  const baseValue =
    typeof styleValue === "number"
      ? styleValue
      : typeof dimensionConfig.default === "number"
        ? dimensionConfig.default
        : null;
  if (baseValue == null) return null;

  const multiplier =
    typeof dimensionConfig.multiply === "number"
      ? dimensionConfig.multiply
      : 1;
  const additive =
    typeof dimensionConfig.add === "number" ? dimensionConfig.add : 0;
  let value = baseValue * multiplier + additive;
  const splitDimension =
    splitDirection === SPLIT_DIRECTIONS.HORIZONTAL ? "width" : "height";

  if (
    dimension === splitDimension &&
    typeof dimensionConfig.addRevealGaps === "number"
  ) {
    value += dimensionConfig.addRevealGaps * dividerSize;
  }

  return value;
};

const buildFaceNode = ({
  layoutNode,
  nodeId,
  width,
  height,
  cabinetStyleId,
  dividerSize,
  usesReveals,
  itemType,
  itemConfig,
}) => {
  const childLayouts = layoutNode?.children;
  const hasChildren =
    Array.isArray(childLayouts) && childLayouts.length > 0 && layoutNode.direction;

  if (!hasChildren) {
    const nodeType = layoutNode?.type || itemConfig.defaultFaceType;
    const presetShelfQty = Number.isFinite(layoutNode?.shelfQty)
      ? Math.max(0, Math.trunc(layoutNode.shelfQty))
      : null;
    const supportsShelves =
      CAN_HAVE_ROLL_OUTS_OR_SHELVES.includes(nodeType) &&
      hasFeature(itemType, "shelves") &&
      (!DEFAULT_NO_SHELVES.includes(nodeType) || presetShelfQty !== null);
    const supportsRollouts =
      CAN_HAVE_ROLL_OUTS_OR_SHELVES.includes(nodeType) &&
      hasFeature(itemType, "rollouts");
    const presetRollOutQty = Number.isFinite(layoutNode?.rollOutQty)
      ? Math.max(0, Math.trunc(layoutNode.rollOutQty))
      : null;

    return {
      id: nodeId,
      type: nodeType,
      width,
      height,
      rollOutQty: supportsRollouts ? presetRollOutQty : null,
      drawersWithDividersQty: null,
      drawerDividers: Boolean(layoutNode?.drawerDividers),
      shelfQty: supportsShelves
        ? presetShelfQty ?? calculateShelfQty(height)
        : null,
      children: null,
      accessories: [],
    };
  }

  const splitDirection = layoutNode.direction;
  const isHorizontal = splitDirection === SPLIT_DIRECTIONS.HORIZONTAL;
  const childDividerSize = usesReveals ? dividerSize : 0;
  const dividerCount = usesReveals ? Math.max(childLayouts.length - 1, 0) : 0;
  const splitDimension = isHorizontal ? "width" : "height";
  const parentDimension = isHorizontal ? width : height;
  const availableDimension = Math.max(
    0,
    parentDimension - dividerCount * childDividerSize,
  );
  let requestedDimensions = childLayouts.map((child) =>
    resolvePresetDimension(
      child?.[splitDimension],
      cabinetStyleId,
      splitDimension,
      splitDirection,
      childDividerSize,
    ),
  );
  const requestedTotal = requestedDimensions.reduce(
    (total, value) => total + (value > 0 ? value : 0),
    0,
  );

  if (requestedTotal > availableDimension && requestedTotal > 0) {
    const scale = availableDimension / requestedTotal;
    requestedDimensions = requestedDimensions.map((value) =>
      value > 0 ? value * scale : value,
    );
  }

  const fixedTotal = requestedDimensions.reduce(
    (total, value) => total + (value > 0 ? value : 0),
    0,
  );
  const unspecifiedCount = requestedDimensions.filter(
    (value) => !(value > 0),
  ).length;
  const fallbackSize =
    unspecifiedCount > 0
      ? Math.max(0, availableDimension - fixedTotal) / unspecifiedCount
      : 0;
  const children = [];
  let slotIndex = 0;

  childLayouts.forEach((childLayout, index) => {
    const childSize =
      requestedDimensions[index] > 0
        ? requestedDimensions[index]
        : fallbackSize;
    children.push(
      buildFaceNode({
        layoutNode: childLayout,
        nodeId: generateNodeId(nodeId, slotIndex),
        width: isHorizontal ? childSize : width,
        height: isHorizontal ? height : childSize,
        cabinetStyleId,
        dividerSize,
        usesReveals,
        itemType,
        itemConfig,
      }),
    );
    slotIndex += 1;

    if (usesReveals && index < childLayouts.length - 1) {
      children.push({
        id: generateNodeId(nodeId, slotIndex),
        type: FACE_NAMES.REVEAL,
        width: isHorizontal ? childDividerSize : width,
        height: isHorizontal ? height : childDividerSize,
        accessories: [],
      });
      slotIndex += 1;
    }
  });

  return {
    id: nodeId,
    type: FACE_NAMES.CONTAINER,
    width,
    height,
    splitDirection,
    children,
    rollOutQty: 0,
    drawersWithDividersQty: 0,
    drawerDividers: false,
    shelfQty: 0,
    accessories: [],
  };
};

const positionFaceTree = (node, x, y, width, height) => {
  const positioned = { ...node, x, y, width, height };
  if (!node.children?.length) return positioned;

  if (node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL) {
    let currentX = x;
    positioned.children = node.children.map((child) => {
      const positionedChild = positionFaceTree(
        child,
        currentX,
        y,
        child.width,
        height,
      );
      currentX += child.width;
      return positionedChild;
    });
  } else {
    let currentY = y;
    positioned.children = node.children.map((child) => {
      const positionedChild = positionFaceTree(
        child,
        x,
        currentY,
        width,
        child.height,
      );
      currentY += child.height;
      return positionedChild;
    });
  }

  return positioned;
};

const populateDerivedFaceDimensions = (node, style, cabinetDepth) => {
  const nextNode = { ...node };

  if (nextNode.rollOutQty > 0) {
    nextNode.rollOutDimensions = calculateRollOutDimensions(
      style,
      nextNode.width,
      cabinetDepth,
      nextNode.height,
      nextNode.type,
      true,
    );
  }

  if (nextNode.type === FACE_NAMES.DRAWER_FRONT && cabinetDepth > 0.75) {
    nextNode.drawerBoxDimensions = calculateRollOutDimensions(
      style,
      nextNode.width,
      cabinetDepth,
      nextNode.height,
      nextNode.type,
      false,
    );
  }

  if (nextNode.shelfQty > 0) {
    nextNode.shelfDimensions = {
      width: cabinetDepth,
      height: nextNode.width,
    };
  }

  if (nextNode.children) {
    nextNode.children = nextNode.children.map((child) =>
      populateDerivedFaceDimensions(child, style, cabinetDepth),
    );
  }

  return nextNode;
};

const createFaceConfig = ({
  cabinetType,
  cabinetStyleId,
  cabinetStyles,
  width,
  height,
  depth,
  facePresetKey,
}) => {
  const itemType = cabinetType.item_type || ITEM_TYPES.CABINET.type;
  const itemConfig = getItemTypeConfig(itemType);
  const style = cabinetStyles.find(
    (candidate) => Number(candidate.cabinet_style_id) === Number(cabinetStyleId),
  );
  const styleType = style?.types?.find(
    (type) =>
      Number(type.cabinet_type_id) === Number(cabinetType.cabinet_type_id),
  );
  const usesReveals = shouldUseReveals(itemType, cabinetStyleId);
  const reveals = shouldUseRootReveals(itemType, cabinetStyleId)
    ? { ...ZERO_REVEALS, ...(styleType?.config || {}) }
    : { ...ZERO_REVEALS };
  const preset = facePresetKey
    ? getCabinetFacePresets(itemType, cabinetType.cabinet_type_id).find(
        (candidate) => candidate.key === facePresetKey,
      )
    : null;
  const layout = preset?.layout || { type: itemConfig.defaultFaceType };
  const faceWidth = width - reveals.left - reveals.right;
  const faceHeight = height - reveals.top - reveals.bottom;
  const tree = buildFaceNode({
    layoutNode: layout,
    nodeId: FACE_NAMES.ROOT,
    width: faceWidth,
    height: faceHeight,
    cabinetStyleId,
    dividerSize: reveals.reveal || 0,
    usesReveals,
    itemType,
    itemConfig,
  });
  const root = positionFaceTree(
    {
      ...tree,
      id: FACE_NAMES.ROOT,
      rootReveals: reveals,
      accessories: tree.accessories || [],
    },
    reveals.left,
    reveals.top,
    faceWidth,
    faceHeight,
  );

  return populateDerivedFaceDimensions(root, style, depth);
};

const countFaceHardware = (node, itemType) => {
  const totals = {
    totalHinges: 0,
    totalDoorPulls: 0,
    totalDrawerPulls: 0,
    totalAppliancePulls: 0,
    totalSlides: 0,
  };

  if (node.type === FACE_NAMES.DOOR) {
    totals.totalHinges += 2 + Math.floor(Math.max(node.height - 8, 0) / 33);
    totals.totalDoorPulls += 1;
  } else if (node.type === FACE_NAMES.PAIR_DOOR) {
    totals.totalHinges +=
      2 * (2 + Math.floor(Math.max(node.height - 8, 0) / 33));
    totals.totalDoorPulls += 2;
  } else if (
    node.type === FACE_NAMES.DRAWER_FRONT ||
    node.type === FACE_NAMES.FALSE_FRONT
  ) {
    totals.totalDrawerPulls += 1;
    if (node.type === FACE_NAMES.DRAWER_FRONT) totals.totalSlides += 1;
  } else if (itemType === ITEM_TYPES.APPLIANCE_PANEL.type && !node.children) {
    totals.totalAppliancePulls += 1;
  }

  if (node.rollOutQty > 0) totals.totalSlides += node.rollOutQty;
  node.children?.forEach((child) => {
    const childTotals = countFaceHardware(child, itemType);
    Object.keys(totals).forEach((key) => {
      totals[key] += childTotals[key];
    });
  });

  return totals;
};

const calculateFaceSummary = (root, itemType, cabinetDepth) => {
  const summary = {};

  const addFace = (type, face) => {
    if (!summary[type]) {
      summary[type] = { count: 0, totalArea: 0, faces: [], glass: [] };
    }
    summary[type].count += 1;
    summary[type].totalArea += face.area;
    summary[type].faces.push(face);
  };

  const visit = (node) => {
    if (node.children) {
      node.children.forEach(visit);
      return;
    }

    if (node.type === FACE_NAMES.REVEAL) return;
    if (node.type === FACE_NAMES.PAIR_DOOR) {
      const doorWidth = roundTo16th(node.width / 2);
      const doorHeight = roundTo16th(node.height);
      const area = roundTo16th(doorWidth * doorHeight);
      ["L", "R"].forEach((side) =>
        addFace(FACE_NAMES.DOOR, {
          id: `${node.id}-${side}`,
          width: doorWidth,
          height: doorHeight,
          area,
        }),
      );
      return;
    }

    const width = roundTo16th(node.width);
    const height = roundTo16th(node.height);
    const area =
      node.type === FACE_NAMES.OPEN || node.type === FACE_NAMES.CONTAINER
        ? 0
        : roundTo16th(width * height);
    addFace(node.type, {
      id: node.id,
      width,
      height,
      area,
      shelfQty: node.glassShelves ? 0 : node.shelfQty || 0,
      rollOutQty: node.rollOutQty || 0,
      drawersWithDividersQty: node.drawersWithDividersQty || 0,
      drawerDividers: node.drawerDividers === true ? true : null,
    });

    if (node.glassShelves && node.shelfQty > 0) {
      summary[node.type].glass.push({
        id: node.id,
        accessoryCatalogId: +node.glassShelves,
        quantity: node.shelfQty,
        width: cabinetDepth,
        height: width,
      });
    }
  };

  visit(root);
  return summary;
};

const calculateFaceFrames = (node, cabinetWidth, cabinetHeight, isRoot = false) => {
  let holeCount = 0;
  let beadLength = 0;
  let framePieces = [];

  if (isRoot && node.rootReveals) {
    const reveals = node.rootReveals;
    if (reveals.left && reveals.reveal) {
      framePieces.push({
        type: PART_NAMES.LEFT,
        length: cabinetHeight,
        width: reveals.reveal,
      });
    }
    if (reveals.right && reveals.reveal) {
      framePieces.push({
        type: PART_NAMES.RIGHT,
        length: cabinetHeight,
        width: reveals.reveal,
      });
    }
    if (reveals.top && reveals.reveal) {
      holeCount += 2;
      framePieces.push({
        type: PART_NAMES.TOP,
        length: cabinetWidth - (reveals.left || 0) - (reveals.right || 0),
        width: reveals.reveal,
      });
    }
    if (reveals.bottom && reveals.reveal) {
      holeCount += 2;
      framePieces.push({
        type: PART_NAMES.BOTTOM,
        length: cabinetWidth - (reveals.left || 0) - (reveals.right || 0),
        width: reveals.reveal,
      });
    }
  }

  if (node.children) {
    node.children.forEach((child) => {
      if (CAN_BE_BEADED.includes(child.type)) {
        beadLength += 2 * child.width + 2 * child.height;
      }
    });
    const frame = node.children[1];
    if (frame) {
      holeCount += 2;
      framePieces.push({
        type:
          node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
            ? SPLIT_DIRECTIONS.VERTICAL
            : SPLIT_DIRECTIONS.HORIZONTAL,
        length:
          node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
            ? frame.height
            : frame.width,
        width:
          node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
            ? frame.width
            : frame.height,
      });
    }
    node.children.forEach((child) => {
      const childResult = calculateFaceFrames(
        child,
        cabinetWidth,
        cabinetHeight,
        false,
      );
      holeCount += childResult.holeCount;
      beadLength += childResult.beadLength;
      framePieces = [...framePieces, ...childResult.framePieces];
    });
  }

  return { totalBoardFeet: 0, holeCount, beadLength, framePieces };
};

const collectShelfData = (node, finishedInterior) => {
  const result = {
    area: 0,
    banding: 0,
    count: 0,
    perimeter: 0,
    drillHoles: 0,
    parts: [],
  };

  if (node.shelfQty > 0 && node.shelfDimensions && !node.glassShelves) {
    const shelfWidth = roundTo16th(node.shelfDimensions.width);
    const shelfDepth = roundTo16th(node.shelfDimensions.height);
    const shelfArea = roundTo16th(shelfWidth * shelfDepth);
    result.area += node.shelfQty * shelfArea;
    result.banding += node.shelfQty * shelfWidth;
    result.count += node.shelfQty;
    result.perimeter += node.shelfQty * 2 * (shelfWidth + shelfDepth);
    result.drillHoles += Math.ceil((node.height - 4) / 1.25) * 4;
    result.parts.push({
      type: PART_NAMES.SHELF,
      width: shelfWidth,
      height: shelfDepth,
      area: shelfArea,
      quantity: node.shelfQty,
      finish: finishedInterior,
    });
  }

  node.children?.forEach((child) => {
    const childResult = collectShelfData(child, finishedInterior);
    result.area += childResult.area;
    result.banding += childResult.banding;
    result.count += childResult.count;
    result.perimeter += childResult.perimeter;
    result.drillHoles += childResult.drillHoles;
    result.parts.push(...childResult.parts);
  });
  return result;
};

const collectPartitionData = (node, depth, cabinetStyleId, finishedInterior) => {
  const result = { area: 0, banding: 0, count: 0, perimeter: 0, parts: [], openings: 0 };

  if (node.children?.length > 1) {
    node.children.forEach((child, index) => {
      if (child.type !== FACE_NAMES.REVEAL) return;
      const previous = node.children[index - 1];
      const next = node.children[index + 1];
      if (!previous || !next) return;
      if (
        node.splitDirection === SPLIT_DIRECTIONS.VERTICAL &&
        (previous.type === FACE_NAMES.DRAWER_FRONT ||
          previous.type === FACE_NAMES.FALSE_FRONT)
      ) {
        return;
      }

      const partitionWidth = roundTo16th(
        node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
          ? child.height
          : child.width,
      );
      const quantity =
        cabinetStyleId !== 13 &&
        node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL
          ? 2
          : 1;
      const area = roundTo16th(partitionWidth * depth);
      result.area += area * quantity;
      result.banding += cabinetStyleId === 13 ? partitionWidth : 0;
      result.count += quantity;
      result.perimeter += quantity * 2 * (partitionWidth + depth);
      result.openings += 1;
      result.parts.push({
        type: PART_NAMES.PARTITION,
        width: roundTo16th(depth),
        height: partitionWidth,
        area,
        quantity,
        finish: finishedInterior,
      });
    });

    node.children.forEach((child) => {
      const childResult = collectPartitionData(
        child,
        depth,
        cabinetStyleId,
        finishedInterior,
      );
      result.area += childResult.area;
      result.banding += childResult.banding;
      result.count += childResult.count;
      result.perimeter += childResult.perimeter;
      result.openings += childResult.openings;
      result.parts.push(...childResult.parts);
    });
  }

  return result;
};

const createEmptyBoxSummary = (quantity, hardware, frameParts = {}) => ({
  pieces: { sides: 0, topBottom: 0, back: 0 },
  cabinetCount: quantity,
  areaPerCabinet: 0,
  partitionArea: 0,
  bandingLength: 0,
  singleBoxPartsCount: 0,
  singleBoxPerimeterLength: 0,
  boxHardware: hardware,
  shelfDrillHoles: 0,
  boxPartsList: [],
  frameParts,
  openingsCount: 0,
});

const calculateBoxSummary = ({
  itemType,
  width,
  height,
  depth,
  quantity,
  faceConfig,
  cabinetStyleId,
  cabinetTypeId,
}) => {
  const w = roundTo16th(width);
  const h = roundTo16th(height);
  const d = roundTo16th(depth);
  const qty = Number(quantity);
  const hardware = countFaceHardware(faceConfig, itemType);

  if (
    itemType === ITEM_TYPES.END_PANEL.type ||
    itemType === ITEM_TYPES.APPLIANCE_PANEL.type
  ) {
    const frameParts =
      cabinetStyleId !== 13
        ? calculateFaceFrames(faceConfig, w, h, true)
        : {};
    return createEmptyBoxSummary(qty, hardware, frameParts);
  }

  if (itemType === ITEM_TYPES.FILLER.type) {
    const sideArea = roundTo16th(h * d);
    const faceArea = roundTo16th(w * h);
    return {
      ...createEmptyBoxSummary(qty, hardware),
      pieces: { sides: qty, topBottom: 0, back: 0 },
      areaPerCabinet: sideArea + faceArea,
      singleBoxPartsCount: 1,
      boxPartsList: [
        {
          type: ITEM_TYPES.FILLER.type,
          side: "face",
          width: w,
          height: h,
          area: faceArea,
          quantity: 1,
          finish: true,
        },
        {
          type: ITEM_TYPES.FILLER.type,
          side: "return",
          width: d,
          height: h,
          area: sideArea,
          quantity: 1,
          finish: true,
        },
      ],
    };
  }

  const sideArea = roundTo16th(h * d);
  const topBottomArea = roundTo16th(w * d);
  const backArea = roundTo16th(w * h);
  const shelfData = collectShelfData(faceConfig, false);
  const partitionData = collectPartitionData(
    faceConfig,
    d,
    cabinetStyleId,
    false,
  );
  let bandingLength = cabinetStyleId === 13 ? 2 * h + 2 * w : 0;
  if (Number(cabinetTypeId) === 2) bandingLength += 2 * d;
  const frameParts =
    cabinetStyleId !== 13
      ? calculateFaceFrames(faceConfig, w, h, true)
      : {};

  return {
    pieces: { sides: 2 * qty, topBottom: 2 * qty, back: qty },
    cabinetCount: qty,
    areaPerCabinet:
      2 * sideArea +
      2 * topBottomArea +
      backArea +
      shelfData.area +
      partitionData.area,
    partitionArea: partitionData.area,
    bandingLength:
      bandingLength + shelfData.banding + partitionData.banding,
    singleBoxPartsCount: 5 + shelfData.count + partitionData.count,
    singleBoxPerimeterLength:
      2 * (2 * (h + d)) +
      2 * (2 * (w + d)) +
      2 * (w + h) +
      shelfData.perimeter +
      partitionData.perimeter,
    boxHardware: hardware,
    shelfDrillHoles: shelfData.drillHoles,
    boxPartsList: [
      {
        type: PART_NAMES.SIDE,
        side: PART_NAMES.LEFT,
        width: d,
        height: h,
        area: sideArea,
        quantity: 1,
        finish: false,
      },
      {
        type: PART_NAMES.SIDE,
        side: PART_NAMES.RIGHT,
        width: d,
        height: h,
        area: sideArea,
        quantity: 1,
        finish: false,
      },
      {
        type: PART_NAMES.TOP_BOTTOM,
        side: PART_NAMES.TOP,
        width: d,
        height: w,
        area: topBottomArea,
        quantity: 1,
        finish: false,
      },
      {
        type: PART_NAMES.TOP_BOTTOM,
        side: PART_NAMES.BOTTOM,
        width: d,
        height: w,
        area: topBottomArea,
        quantity: 1,
        finish: false,
      },
      {
        type: PART_NAMES.BACK,
        width: w,
        height: h,
        area: backArea,
        quantity: 1,
        finish: false,
      },
      ...shelfData.parts,
      ...partitionData.parts,
    ],
    frameParts,
    openingsCount: 1 + partitionData.openings,
  };
};

const getDefaultTypeSpecificOptions = (itemTypeConfig, cabinetTypeId) => {
  const options = (itemTypeConfig.typeSpecificOptions || []).reduce(
    (defaults, option) => ({ ...defaults, [option.name]: option.defaultValue }),
    {},
  );
  const moldingDefaults = {
    1: { count_base_molding: true, count_top_molding: false },
    2: { count_base_molding: false, count_top_molding: true },
    3: { count_base_molding: true, count_top_molding: true },
  }[Number(cabinetTypeId)];

  return moldingDefaults ? { ...options, ...moldingDefaults } : options;
};

export const createCabinetItemFromPresetRow = ({
  row,
  cabinetTypes,
  cabinetStyles,
  cabinetStyleId,
}) => {
  const cabinetType = cabinetTypes.find(
    (type) => Number(type.cabinet_type_id) === Number(row.typeId),
  );
  if (!cabinetType) {
    throw new Error(`Cabinet type ${row.typeId} is not available.`);
  }

  const width = roundTo16th(row.width);
  const height = roundTo16th(row.height);
  const depth = roundTo16th(row.depth);
  const quantity = Math.trunc(Number(row.quantity));
  const itemType = cabinetType.item_type || ITEM_TYPES.CABINET.type;
  const itemTypeConfig = getItemTypeConfig(itemType);
  const faceConfig = createFaceConfig({
    cabinetType,
    cabinetStyleId,
    cabinetStyles,
    width,
    height,
    depth,
    facePresetKey: row.facePresetKey,
  });
  const typeSpecificOptions = getDefaultTypeSpecificOptions(
    itemTypeConfig,
    cabinetType.cabinet_type_id,
  );
  const boxSummary = calculateBoxSummary({
    itemType,
    width,
    height,
    depth,
    quantity,
    faceConfig,
    cabinetStyleId,
    cabinetTypeId: cabinetType.cabinet_type_id,
  });

  return {
    type: Number(cabinetType.cabinet_type_id),
    width,
    height,
    depth,
    quantity,
    face_config: {
      ...faceConfig,
      faceSummary: calculateFaceSummary(faceConfig, itemType, depth),
      boxSummary,
    },
    temp_id: uuid(),
    finished_interior: false,
    finished_left: false,
    finished_right: false,
    finished_top: false,
    finished_bottom: false,
    finished_back: false,
    finish_whole_interior: false,
    fin_back_mat: null,
    fin_back_finish: null,
    fin_back_panel_mod: null,
    cabinet_style_override: null,
    saved_style_id: cabinetStyleId,
    type_specific_options: typeSpecificOptions,
  };
};
