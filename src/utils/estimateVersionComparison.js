import { createSectionContext } from "./createSectionContext";
import { getSectionCalculations } from "./getSectionCalculations";

const numberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const quantityOrOne = (value) =>
  value == null ? 1 : numberOrDefault(value, 1);

export const normalizeEstimateRevisionRows = (data) => {
  if (Array.isArray(data)) return data;

  if (typeof data === "string") {
    try {
      const parsedData = JSON.parse(data);
      return Array.isArray(parsedData) ? parsedData : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const buildEstimateVersionComparison = ({
  estimate,
  revisionRows,
  catalogData,
}) => {
  if (!estimate || !Array.isArray(revisionRows)) {
    return {
      rooms: [],
      currentProjectTotal: 0,
      sectionCount: 0,
      alternateVersionCount: 0,
      pricingErrorCount: 0,
    };
  }

  const roomMap = new Map();

  revisionRows.forEach((row) => {
    const revision = row?.revision;
    if (!revision) return;

    const taskId = row.taskId;
    const lineageId = row.sectionLineageId;
    const roomKey = String(taskId);
    const sectionKey = String(lineageId);

    if (!roomMap.has(roomKey)) {
      roomMap.set(roomKey, {
        taskId,
        taskName: row.taskName || "Untitled Room",
        taskQuantity: quantityOrOne(row.taskQuantity),
        taskPosition: numberOrDefault(row.taskPosition, Number.MAX_SAFE_INTEGER),
        sections: new Map(),
      });
    }

    const room = roomMap.get(roomKey);
    if (!room.sections.has(sectionKey)) {
      room.sections.set(sectionKey, {
        lineageId,
        sectionName: row.sectionName || `Section ${row.sectionPosition || ""}`.trim(),
        sectionPosition: numberOrDefault(
          row.sectionPosition,
          Number.MAX_SAFE_INTEGER,
        ),
        activeSectionId: row.activeSectionId,
        versions: [],
      });
    }

    const section = room.sections.get(sectionKey);
    const sectionQuantity = quantityOrOne(revision.quantity);
    let unitPrice = null;
    let pricingError = false;

    try {
      const { context, effectiveSection } = createSectionContext(
        revision,
        estimate,
        catalogData,
      );
      const calculations = getSectionCalculations(effectiveSection, context);
      unitPrice = numberOrDefault(calculations?.unitPrice, 0);
    } catch {
      pricingError = true;
    }

    section.versions.push({
      sectionId: revision.est_section_id,
      revision: numberOrDefault(revision.revision, 1),
      isActive: String(revision.est_section_id) === String(row.activeSectionId),
      sectionQuantity,
      unitPrice,
      totalPrice:
        unitPrice == null
          ? null
          : unitPrice * sectionQuantity * room.taskQuantity,
      pricingError,
      createdAt: revision.created_at || null,
    });
  });

  const rooms = Array.from(roomMap.values())
    .sort((a, b) => a.taskPosition - b.taskPosition || a.taskId - b.taskId)
    .map((room) => {
      const sections = Array.from(room.sections.values())
        .sort(
          (a, b) =>
            a.sectionPosition - b.sectionPosition ||
            Number(a.lineageId) - Number(b.lineageId),
        )
        .map((section) => {
          const versions = section.versions.sort(
            (a, b) => a.revision - b.revision,
          );
          const activeVersion =
            versions.find((version) => version.isActive) || versions.at(-1);

          return {
            ...section,
            versions,
            activeVersion,
            activeTotal: activeVersion?.totalPrice ?? null,
          };
        });

      const activeRoomTotal = sections.some(
        (section) => section.activeTotal == null,
      )
        ? null
        : sections.reduce((sum, section) => sum + section.activeTotal, 0);

      return {
        ...room,
        sections: sections.map((section) => ({
          ...section,
          versions: section.versions.map((version) => {
            const differenceFromActive =
              version.totalPrice == null || section.activeVersion?.totalPrice == null
                ? null
                : version.totalPrice - section.activeVersion.totalPrice;

            return {
              ...version,
              differenceFromActive,
              roomTotalIfSelected:
                differenceFromActive == null || activeRoomTotal == null
                  ? null
                  : activeRoomTotal + differenceFromActive,
            };
          }),
        })),
        activeRoomTotal,
      };
    });

  const currentProjectTotal = rooms.some(
    (room) => room.activeRoomTotal == null,
  )
    ? null
    : rooms.reduce((sum, room) => sum + room.activeRoomTotal, 0);

  let sectionCount = 0;
  let alternateVersionCount = 0;
  let pricingErrorCount = 0;

  const roomsWithProjectTotals = rooms.map((room) => ({
    ...room,
    sections: room.sections.map((section) => {
      sectionCount += 1;
      alternateVersionCount += Math.max(section.versions.length - 1, 0);

      return {
        ...section,
        versions: section.versions.map((version) => {
          if (version.pricingError) pricingErrorCount += 1;
          return {
            ...version,
            projectTotalIfSelected:
              version.differenceFromActive == null || currentProjectTotal == null
                ? null
                : currentProjectTotal + version.differenceFromActive,
          };
        }),
      };
    }),
  }));

  return {
    rooms: roomsWithProjectTotals,
    currentProjectTotal,
    sectionCount,
    alternateVersionCount,
    pricingErrorCount,
  };
};

export const flattenEstimateVersionComparison = (rooms) =>
  rooms.flatMap((room) =>
    room.sections.flatMap((section) =>
      section.versions.map((version) => ({
        room: room.taskName,
        section: section.sectionName,
        roomQuantity: room.taskQuantity,
        sectionQuantity: version.sectionQuantity,
        version: version.revision,
        active: version.isActive,
        totalPrice: version.totalPrice,
        differenceFromActive: version.differenceFromActive,
        roomTotalIfSelected: version.roomTotalIfSelected,
        projectTotalIfSelected: version.projectTotalIfSelected,
      })),
    ),
  );
