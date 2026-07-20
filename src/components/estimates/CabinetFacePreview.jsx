import PropTypes from "prop-types";
import { useMemo } from "react";

import { shouldUseRootReveals } from "../../config/cabinetItemTypes";
import {
  FACE_DETAILS,
  FACE_NAMES,
  ITEM_TYPES,
  SPLIT_DIRECTIONS,
} from "../../utils/constants";

const PREVIEW_WIDTH = 92;
const PREVIEW_HEIGHT = 78;

const FACE_COLOR_MAP = Object.values(FACE_DETAILS).reduce((acc, faceDetail) => {
  acc[faceDetail.value] = faceDetail.color;
  return acc;
}, {});

const normalizeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeReveals = (reveals = {}) => ({
  top: normalizeNumber(reveals.top),
  bottom: normalizeNumber(reveals.bottom),
  left: normalizeNumber(reveals.left),
  right: normalizeNumber(reveals.right),
  reveal: normalizeNumber(reveals.reveal),
});

const flattenNodes = (node, acc = []) => {
  if (!node) return acc;

  acc.push(node);

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => flattenNodes(child, acc));
  }

  return acc;
};

const cloneFaceConfig = (config) => {
  if (!config) return null;
  return JSON.parse(JSON.stringify(config));
};

const updateChildrenFromParent = (node) => {
  if (!node || !Array.isArray(node.children) || node.children.length === 0) {
    return;
  }

  const splitDimension =
    node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL ? "width" : "height";
  const fixedDimension =
    node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL ? "height" : "width";

  node.children.forEach((child) => {
    child[fixedDimension] = node[fixedDimension];
  });

  const faces = node.children.filter((child) => child.type !== FACE_NAMES.REVEAL);
  const reveal = node.children.find((child) => child.type === FACE_NAMES.REVEAL);

  if (faces.length > 0) {
    const totalFaceSize = faces.reduce(
      (sum, face) => sum + normalizeNumber(face[splitDimension]),
      0,
    );
    const revealSize = reveal ? normalizeNumber(reveal[splitDimension]) : 0;

    if (totalFaceSize > 0) {
      const availableSize = normalizeNumber(node[splitDimension]) - revealSize;
      const scaleFactor = availableSize / totalFaceSize;

      faces.forEach((face) => {
        face[splitDimension] = normalizeNumber(face[splitDimension]) * scaleFactor;
      });
    }
  }

  node.children.forEach((child) => {
    updateChildrenFromParent(child);
  });
};

const calculateLayout = (
  node,
  options,
  x = normalizeNumber(node?.x),
  y = normalizeNumber(node?.y),
  width = normalizeNumber(node?.width),
  height = normalizeNumber(node?.height),
  isRoot = true,
) => {
  if (!node) return null;

  let nextX = x;
  let nextY = y;
  let nextWidth = width;
  let nextHeight = height;

  if (isRoot) {
    const rootReveals = node.rootReveals || options.reveals;
    nextX = normalizeNumber(rootReveals.left);
    nextY = normalizeNumber(rootReveals.top);
    nextWidth =
      normalizeNumber(options.cabinetWidth) -
      (normalizeNumber(rootReveals.left) + normalizeNumber(rootReveals.right));
    nextHeight =
      normalizeNumber(options.cabinetHeight) -
      (normalizeNumber(rootReveals.top) + normalizeNumber(rootReveals.bottom));
  }

  const layoutNode = {
    ...node,
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };

  if (Array.isArray(node.children) && node.children.length > 0) {
    if (node.splitDirection === SPLIT_DIRECTIONS.HORIZONTAL) {
      let currentX = nextX;
      layoutNode.children = node.children.map((child) => {
        const childWidth = normalizeNumber(child.width);
        const nextChild = calculateLayout(
          child,
          options,
          currentX,
          nextY,
          childWidth,
          nextHeight,
          false,
        );
        currentX += childWidth;
        return nextChild;
      });
    } else if (node.splitDirection === SPLIT_DIRECTIONS.VERTICAL) {
      let currentY = nextY;
      layoutNode.children = node.children.map((child) => {
        const childHeight = normalizeNumber(child.height);
        const nextChild = calculateLayout(
          child,
          options,
          nextX,
          currentY,
          nextWidth,
          childHeight,
          false,
        );
        currentY += childHeight;
        return nextChild;
      });
    }
  }

  return layoutNode;
};

const buildRootRevealNodes = (
  reveals,
  cabinetWidth,
  cabinetHeight,
  cabinetTypeId,
  itemType,
  cabinetStyleId,
  usesRootReveals,
) => {
  if (!usesRootReveals) return [];

  const isFaceFrame = itemType === ITEM_TYPES.FACE_FRAME.type;
  const shouldRenderReveals = isFaceFrame || cabinetStyleId !== 13;
  if (!shouldRenderReveals) return [];

  const nodes = [];
  const isUpperCabinet = cabinetTypeId === 2;
  const bottomOverhang =
    isUpperCabinet && reveals.bottom ? reveals.reveal - reveals.bottom : 0;

  if (reveals.left) {
    const leftRevealHeight = cabinetHeight + bottomOverhang;
    nodes.push({
      id: "root-reveal-left",
      type: FACE_NAMES.REVEAL,
      width: reveals.reveal,
      height: leftRevealHeight,
      x: cabinetTypeId === 10 || isFaceFrame ? 0 : reveals.left - reveals.reveal,
      y: 0,
    });
  }

  if (reveals.right) {
    const rightRevealHeight = cabinetHeight + bottomOverhang;
    nodes.push({
      id: "root-reveal-right",
      type: FACE_NAMES.REVEAL,
      width: reveals.reveal,
      height: rightRevealHeight,
      x: cabinetWidth - reveals.right,
      y: 0,
    });
  }

  if (reveals.top) {
    const topWidth = cabinetWidth - (reveals.left || 0) - (reveals.right || 0);
    const topX = reveals.left || 0;
    nodes.push({
      id: "root-reveal-top",
      type: FACE_NAMES.REVEAL,
      width: topWidth,
      height: reveals.top,
      x: topX,
      y: 0,
    });
  }

  if (reveals.bottom) {
    const bottomWidth =
      cabinetWidth - (reveals.left || 0) - (reveals.right || 0);
    const bottomX = reveals.left || 0;
    const bottomHeight = isUpperCabinet ? reveals.reveal : reveals.bottom;
    const bottomY = cabinetHeight - reveals.bottom;
    nodes.push({
      id: "root-reveal-bottom",
      type: FACE_NAMES.REVEAL,
      width: bottomWidth,
      height: bottomHeight,
      x: bottomX,
      y: bottomY,
    });
  }

  return nodes;
};

const normalizeFaceConfig = (faceConfig) => {
  if (!faceConfig) return null;
  if (Array.isArray(faceConfig)) return faceConfig[0] || null;
  return faceConfig;
};

const CabinetFacePreview = ({
  faceConfig,
  cabinetWidth,
  cabinetHeight,
  cabinetStyleId,
  cabinetTypeId,
  itemType,
}) => {
  const normalizedConfig = useMemo(
    () => normalizeFaceConfig(faceConfig),
    [faceConfig],
  );

  const width = normalizeNumber(cabinetWidth);
  const height = normalizeNumber(cabinetHeight);
  const usesRootReveals = useMemo(
    () => shouldUseRootReveals(itemType, cabinetStyleId),
    [itemType, cabinetStyleId],
  );

  const reveals = useMemo(() => {
    if (!usesRootReveals) {
      return normalizeReveals();
    }

    if (!normalizedConfig?.rootReveals) {
      return normalizeReveals();
    }

    return normalizeReveals(normalizedConfig.rootReveals);
  }, [normalizedConfig, usesRootReveals]);

  const displayGeometry = useMemo(() => {
    let revealLeft = Math.abs(Math.min(0, reveals.left));
    let revealRight = Math.abs(Math.min(0, reveals.right));
    let revealTop = Math.abs(Math.min(0, reveals.top));
    let revealBottom = Math.abs(Math.min(0, reveals.bottom));

    if (cabinetStyleId !== 13 && cabinetTypeId !== 10 && reveals.reveal) {
      if (reveals.left) {
        revealLeft = Math.max(revealLeft, reveals.reveal - reveals.left);
      }
      if (reveals.right) {
        revealRight = Math.max(revealRight, reveals.reveal - reveals.right);
      }
      if (reveals.top) {
        revealTop = Math.max(revealTop, reveals.reveal - reveals.top);
      }
      if (reveals.bottom) {
        revealBottom = Math.max(revealBottom, reveals.reveal - reveals.bottom);
      }
    }

    const totalDisplayWidth = Math.max(1, width + revealLeft + revealRight);
    const totalDisplayHeight = Math.max(1, height + revealTop + revealBottom);

    const scale = Math.min(
      PREVIEW_WIDTH / totalDisplayWidth,
      PREVIEW_HEIGHT / totalDisplayHeight,
    );

    const scaledWidth = totalDisplayWidth * scale;
    const scaledHeight = totalDisplayHeight * scale;

    return {
      scale,
      offsetX: (PREVIEW_WIDTH - scaledWidth) / 2,
      offsetY: (PREVIEW_HEIGHT - scaledHeight) / 2,
      cabinetOffsetX: revealLeft * scale,
      cabinetOffsetY: revealTop * scale,
    };
  }, [cabinetStyleId, cabinetTypeId, height, reveals, width]);

  const layoutConfig = useMemo(() => {
    if (!normalizedConfig || !width || !height) return null;

    const clonedConfig = cloneFaceConfig(normalizedConfig);
    if (!clonedConfig) return null;

    const effectiveReveals = usesRootReveals ? reveals : normalizeReveals();
    const expectedWidth =
      width - normalizeNumber(effectiveReveals.left) - normalizeNumber(effectiveReveals.right);
    const expectedHeight =
      height - normalizeNumber(effectiveReveals.top) - normalizeNumber(effectiveReveals.bottom);

    const hasDimensionChange =
      normalizeNumber(clonedConfig.width) !== expectedWidth ||
      normalizeNumber(clonedConfig.height) !== expectedHeight ||
      normalizeNumber(clonedConfig.x) !== normalizeNumber(effectiveReveals.left) ||
      normalizeNumber(clonedConfig.y) !== normalizeNumber(effectiveReveals.top);

    clonedConfig.rootReveals = effectiveReveals;
    clonedConfig.width = expectedWidth;
    clonedConfig.height = expectedHeight;
    clonedConfig.x = normalizeNumber(effectiveReveals.left);
    clonedConfig.y = normalizeNumber(effectiveReveals.top);

    if (hasDimensionChange) {
      updateChildrenFromParent(clonedConfig);
    }

    return calculateLayout(clonedConfig, {
      cabinetWidth: width,
      cabinetHeight: height,
      reveals: effectiveReveals,
    });
  }, [height, normalizedConfig, reveals, usesRootReveals, width]);

  const renderedNodes = useMemo(() => {
    if (!layoutConfig) return [];

    return flattenNodes(layoutConfig).filter((node) => {
      if (!node) return false;

      const nodeWidth = normalizeNumber(node.width);
      const nodeHeight = normalizeNumber(node.height);
      return nodeWidth > 0 && nodeHeight > 0;
    });
  }, [layoutConfig]);

  const rootRevealNodes = useMemo(
    () =>
      buildRootRevealNodes(
        reveals,
        width,
        height,
        cabinetTypeId,
        itemType,
        cabinetStyleId,
        usesRootReveals,
      ),
    [
      cabinetStyleId,
      cabinetTypeId,
      height,
      itemType,
      reveals,
      usesRootReveals,
      width,
    ],
  );

  if (!width || !height || !normalizedConfig) {
    return (
      <div className="w-[92px] h-[78px] border border-slate-500/60 rounded bg-slate-800/40 flex items-center justify-center text-[10px] text-slate-400">
        N/A
      </div>
    );
  }

  const groupTranslateX = displayGeometry.offsetX + displayGeometry.cabinetOffsetX;
  const groupTranslateY = displayGeometry.offsetY + displayGeometry.cabinetOffsetY;
  const cabinetStrokeWidth = cabinetStyleId === 13 ? 0 : 1;

  return (
    <svg
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
      className="rounded border border-slate-500/60 bg-slate-800/40"
      role="img"
      aria-label="Cabinet face layout preview"
    >
      <g transform={`translate(${groupTranslateX}, ${groupTranslateY})`}>
        <rect
          x={0}
          y={0}
          width={width * displayGeometry.scale}
          height={height * displayGeometry.scale}
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth={cabinetStrokeWidth}
        />

        {rootRevealNodes.map((node) => (
          <rect
            key={node.id}
            x={normalizeNumber(node.x) * displayGeometry.scale}
            y={normalizeNumber(node.y) * displayGeometry.scale}
            width={normalizeNumber(node.width) * displayGeometry.scale}
            height={normalizeNumber(node.height) * displayGeometry.scale}
            fill="#E5E7EB"
            fillOpacity={0.3}
            stroke={FACE_COLOR_MAP[FACE_NAMES.REVEAL] || "#6B7280"}
            strokeWidth={1}
          />
        ))}

        {renderedNodes.map((node, index) => {
          const effectiveNodeType =
            node.type === FACE_NAMES.ROOT ? FACE_NAMES.CONTAINER : node.type;
          const isContainer = effectiveNodeType === FACE_NAMES.CONTAINER;
          const strokeWidth = isContainer ? 0.8 : 1;

          const x = normalizeNumber(node.x) * displayGeometry.scale + strokeWidth / 2;
          const y = normalizeNumber(node.y) * displayGeometry.scale + strokeWidth / 2;
          const scaledWidth = Math.max(
            0,
            normalizeNumber(node.width) * displayGeometry.scale - strokeWidth,
          );
          const scaledHeight = Math.max(
            0,
            normalizeNumber(node.height) * displayGeometry.scale - strokeWidth,
          );

          const faceColor =
            effectiveNodeType === FACE_NAMES.REVEAL
              ? "#E5E7EB"
              : FACE_COLOR_MAP[effectiveNodeType] || "#6B7280";

          return (
            <g key={`${node.id || node.type}-${index}`}>
              <rect
                x={x}
                y={y}
                width={scaledWidth}
                height={scaledHeight}
                fill={faceColor}
                fillOpacity={isContainer ? 0.1 : 0.3}
                stroke={FACE_COLOR_MAP[effectiveNodeType] || "#6B7280"}
                strokeWidth={strokeWidth}
                strokeDasharray={isContainer ? "2,2" : "none"}
              />

              {effectiveNodeType === FACE_NAMES.PAIR_DOOR && (
                <line
                  x1={x + scaledWidth / 2}
                  y1={y}
                  x2={x + scaledWidth / 2}
                  y2={y + scaledHeight}
                  stroke={FACE_COLOR_MAP[effectiveNodeType] || "#6B7280"}
                  strokeWidth={1}
                  strokeDasharray="3,2"
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

CabinetFacePreview.propTypes = {
  faceConfig: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  cabinetWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cabinetHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cabinetStyleId: PropTypes.number,
  cabinetTypeId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  itemType: PropTypes.string,
};

CabinetFacePreview.defaultProps = {
  faceConfig: null,
  cabinetWidth: 0,
  cabinetHeight: 0,
  cabinetStyleId: null,
  cabinetTypeId: null,
  itemType: ITEM_TYPES.CABINET.type,
};

export default CabinetFacePreview;
