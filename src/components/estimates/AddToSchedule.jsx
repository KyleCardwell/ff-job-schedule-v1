import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BsDashSquare } from "react-icons/bs";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiMenu,
  FiMove,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchAccessoriesCatalog,
  fetchAccessoryTimeAnchors,
} from "../../redux/actions/accessories.js";
import { fetchCabinetAnchors } from "../../redux/actions/cabinetAnchors.js";
import { fetchTeamCabinetStyles } from "../../redux/actions/cabinetStyles.js";
import { fetchCabinetTypes } from "../../redux/actions/cabinetTypes.js";
import {
  fetchEstimateById,
  setCurrentEstimate,
} from "../../redux/actions/estimates";
import { fetchFinishes } from "../../redux/actions/finishes.js";
import {
  fetchHinges,
  fetchPulls,
  fetchSlides,
} from "../../redux/actions/hardware.js";
import { fetchLengthsCatalog } from "../../redux/actions/lengths.js";
import {
  fetchDrawerBoxMaterials,
  fetchSheetGoods,
} from "../../redux/actions/materials.js";
import { fetchPartsList } from "../../redux/actions/partsList.js";
import { fetchPartsListAnchors } from "../../redux/actions/partsListAnchors.js";
import { addEstimateToSchedule } from "../../redux/actions/projects.js";
import { fetchTeamDefaults } from "../../redux/actions/teamEstimateDefaults.js";
import { selectSchedulableEmployees } from "../../redux/selectors";
import { PATHS } from "../../utils/constants";
import { createSectionContext } from "../../utils/createSectionContext";
import { normalizeDate } from "../../utils/dateUtils";
import { roundToHundredth } from "../../utils/estimateHelpers";
import { getSectionCalculations } from "../../utils/getSectionCalculations";

// ---------- Sortable group wrapper (for reordering groups) ----------
const SortableGroup = ({ id, children }) => {
  // eslint-disable-line react/prop-types
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: "group" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ dragListeners: listeners })}
    </div>
  );
};

// ---------- Draggable section (for merging between groups) ----------
const DraggableSection = ({ id, children, isGrouped }) => {
  // eslint-disable-line react/prop-types
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id, data: { type: "section" } });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
        isGrouped
          ? "bg-slate-700/50 border-slate-600"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <button
        {...listeners}
        className="cursor-grab text-slate-400 hover:text-slate-200 p-1"
        aria-label="Drag to group with another section"
      >
        <FiMove size={14} />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

const normalizeEstimateSections = (sections = []) =>
  sections
    .map((section) => {
      if (!section) return null;
      if (typeof section === "string") {
        const name = section.trim();
        return {
          id: name.toLowerCase().replace(/\s+/g, "_"),
          name,
        };
      }
      if (section.name && !section.id) {
        return {
          ...section,
          id: section.name.toLowerCase().replace(/\s+/g, "_"),
        };
      }
      return section;
    })
    .filter(Boolean);

const getSectionCategoryCosts = (calculations = {}) => {
  const facePrices = calculations.facePrices || {};
  const doorCost =
    (facePrices.door || 0) +
    (facePrices.panel || 0) +
    (facePrices.drawer_front || 0) +
    (facePrices.false_front || 0);
  const drawerCost =
    (calculations.drawerBoxTotal || 0) + (calculations.rollOutTotal || 0);
  const hardwareCost =
    (calculations.hingesTotal || 0) +
    (calculations.slidesTotal || 0) +
    (calculations.pullsTotal || 0);

  return {
    cabinets: calculations.boxTotal || 0,
    doors: doorCost,
    drawers: drawerCost,
    hardware: hardwareCost,
    wood: calculations.woodTotal || 0,
    other: (calculations.otherTotal || 0) + (calculations.accessoriesTotal || 0),
  };
};

const allocateUnmappedCosts = (categoryTotals, estimateSections = []) => {
  const names = estimateSections
    .map((section) => section?.name?.toLowerCase?.() || "")
    .filter(Boolean);
  const hasDoor = names.some((name) => name.includes("door"));
  const hasDrawer = names.some((name) => name.includes("drawer"));
  const hasHardware = names.some(
    (name) =>
      name.includes("hardware") ||
      name.includes("hinge") ||
      name.includes("slide") ||
      name.includes("pull"),
  );
  const hasAccessories = names.some((name) => name.includes("accessor"));
  const hasLengths = names.some(
    (name) => name.includes("length") || name.includes("molding"),
  );
  const hasOther = names.some((name) => name.includes("other"));
  const hasCabinets = names.some(
    (name) =>
      name.includes("cabinet") || name.includes("box") || name.includes("case"),
  );
  const fallbackKey = hasOther ? "other" : "cabinets";
  const adjusted = { ...categoryTotals };
  const moveToFallback = (key, shouldMove) => {
    if (!shouldMove || !adjusted[key]) return;
    adjusted[fallbackKey] = (adjusted[fallbackKey] || 0) + adjusted[key];
    adjusted[key] = 0;
  };

  moveToFallback("doors", !hasDoor);
  moveToFallback("drawers", !hasDrawer);
  moveToFallback("hardware", !hasHardware);
  moveToFallback("accessories", !hasAccessories);
  moveToFallback("lengths", !hasLengths);

  if (!hasCabinets && fallbackKey !== "cabinets") {
    adjusted[fallbackKey] = (adjusted[fallbackKey] || 0) + adjusted.cabinets;
    adjusted.cabinets = 0;
  }

  return adjusted;
};

const getEstimateCostForSectionName = (sectionName, categoryTotals) => {
  const name = sectionName?.toLowerCase?.() || "";
  if (!name) return 0;
  if (name.includes("hour") || name.includes("labor")) return 0;
  if (
    name.includes("hardware") ||
    name.includes("hinge") ||
    name.includes("slide") ||
    name.includes("pull")
  ) {
    return categoryTotals.hardware || 0;
  }
  if (name.includes("door")) return categoryTotals.doors || 0;
  if (name.includes("drawer")) return categoryTotals.drawers || 0;
  if (name.includes("accessor")) return categoryTotals.accessories || 0;
  if (name.includes("length") || name.includes("molding")) {
    return categoryTotals.lengths || 0;
  }
  if (
    name.includes("cabinet") ||
    name.includes("box") ||
    name.includes("case")
  ) {
    return categoryTotals.cabinets || 0;
  }
  if (name.includes("other")) return categoryTotals.other || 0;
  return 0;
};

// ---------- Main Component ----------
const AddToSchedule = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { estimateId } = useParams();

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const estimates = useSelector((state) => state.estimates.estimates);
  const [loading, setLoading] = useState(true);

  // All catalog data from Redux
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials,
  );
  const services = useSelector((state) => state.services?.allServices || []);
  const finishTypes = useSelector((state) => state.finishes?.finishes || []);
  const cabinetStyles = useSelector(
    (state) =>
      state.cabinetStyles?.styles.filter((style) => style.is_active) || [],
  );
  const cabinetTypes = useSelector(
    (state) => state.cabinetTypes?.types.filter((type) => type.is_active) || [],
  );
  const { hardware, accessories, lengths } = useSelector((state) => state);
  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors?.itemsByPartsList || [],
  );
  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors?.itemsByType || [],
  );
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults?.teamDefaults,
  );

  // Schedule-related selectors
  const employees = useSelector(selectSchedulableEmployees);
  const defaultEmployeeId = employees[0]?.employee_id;
  const { chart_config_id: chartConfigId, next_task_number: nextTaskNumber } =
    useSelector((state) => state.chartConfig);
  const estimateSections = useSelector(
    (state) => state.chartConfig.estimate_sections || [],
  );
  const dayWidth = useSelector((state) => state.chartData.dayWidth);
  const workdayHours = useSelector((state) => state.chartConfig.workday_hours);

  // ---------- State ----------
  // groups: array of { groupId, sectionIds: [...] }
  // Each sectionId appears in exactly one group.
  // A group with 1 section is "ungrouped". A group with 2+ is "grouped".
  const [groups, setGroups] = useState([]);
  // selectedGroups: Set of groupIds that are checked
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  // Track active drag for overlay
  const [activeId, setActiveId] = useState(null);
  // Editable names: sectionId → string, groupId → string
  const [sectionNames, setSectionNames] = useState({});
  const [groupNames, setGroupNames] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const normalizedEstimateSections = useMemo(
    () => normalizeEstimateSections(estimateSections),
    [estimateSections],
  );

  // ---------- Fetch estimate + catalogs ----------
  useEffect(() => {
    const loadEstimate = async () => {
      try {
        if (estimateId) {
          const existing = estimates.find(
            (est) => est.est_project_id === estimateId,
          );
          if (existing) {
            dispatch(setCurrentEstimate(existing));
          } else {
            const result = await dispatch(fetchEstimateById(estimateId));
            if (!result) {
              navigate(PATHS.FINALIZED_ESTIMATES);
              return;
            }
          }
        }
        setLoading(false);
      } catch (error) {
        navigate(PATHS.FINALIZED_ESTIMATES);
        setLoading(false);
      }
    };
    loadEstimate();
  }, [dispatch, estimateId, navigate, estimates]);

  useEffect(() => {
    dispatch(fetchTeamDefaults());
    dispatch(fetchSheetGoods());
    dispatch(fetchDrawerBoxMaterials());
    dispatch(fetchHinges());
    dispatch(fetchPulls());
    dispatch(fetchSlides());
    dispatch(fetchCabinetTypes());
    dispatch(fetchCabinetAnchors());
    dispatch(fetchTeamCabinetStyles());
    dispatch(fetchPartsList());
    dispatch(fetchPartsListAnchors());
    dispatch(fetchFinishes());
    dispatch(fetchAccessoriesCatalog());
    dispatch(fetchAccessoryTimeAnchors());
    dispatch(fetchLengthsCatalog());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Calculate section hours ----------
  const catalogData = useMemo(
    () => ({
      boxMaterials,
      faceMaterials,
      drawerBoxMaterials,
      finishTypes,
      cabinetStyles,
      cabinetTypes,
      hardware,
      partsListAnchors,
      cabinetAnchors,
      globalServices: services,
      lengthsCatalog: lengths?.catalog || [],
      accessories,
      teamDefaults,
    }),
    [
      boxMaterials,
      faceMaterials,
      drawerBoxMaterials,
      finishTypes,
      cabinetStyles,
      cabinetTypes,
      hardware,
      partsListAnchors,
      cabinetAnchors,
      services,
      lengths,
      accessories,
      teamDefaults,
    ],
  );

  // sectionCalcsMap: { sectionId: { hoursByService: { serviceId: hours }, totalHours, sectionName, taskName, taskId } }
  const sectionCalcsMap = useMemo(() => {
    if (!currentEstimate?.tasks || services.length === 0) return {};
    const map = {};

    // Sort tasks by tasks_order
    const tasksOrder = currentEstimate.tasks_order || [];
    const sortedTasks = [...currentEstimate.tasks].sort((a, b) => {
      const aIdx = tasksOrder.indexOf(a.est_task_id);
      const bIdx = tasksOrder.indexOf(b.est_task_id);
      // Tasks not in order array go to the end
      return (aIdx === -1 ? Infinity : aIdx) - (bIdx === -1 ? Infinity : bIdx);
    });

    sortedTasks.forEach((task) => {
      task.sections?.forEach((section, sectionIndex) => {
        const { context, effectiveSection } = createSectionContext(
          section,
          currentEstimate,
          catalogData,
        );
        const calcs = getSectionCalculations(effectiveSection, context);

        const hoursByService = {};
        let totalHours = 0;

        if (calcs.laborCosts?.costsByService) {
          Object.entries(calcs.laborCosts.costsByService).forEach(
            ([serviceId, data]) => {
              const hours = roundToHundredth(data.hours || 0);
              hoursByService[serviceId] = hours;
              totalHours += hours;
            },
          );
        }

        const sectionName = section.section_name
          ? `${task.est_task_name} - ${section.section_name}`
          : task.sections.length > 1
            ? `${task.est_task_name} - Section ${sectionIndex + 1}`
            : task.est_task_name;

        map[section.est_section_id] = {
          sectionId: section.est_section_id,
          hoursByService,
          totalHours: roundToHundredth(totalHours),
          sectionName,
          taskName: task.est_task_name,
          taskId: task.est_task_id,
          scheduledTaskId: section.scheduled_task_id || null,
          calculations: calcs,
        };
      });
    });

    return map;
  }, [currentEstimate, catalogData, services]);

  // Build ordered lists of section IDs, split into unscheduled and already-scheduled.
  // Scheduled sections are grouped by shared scheduled_task_id so sections that were
  // added together appear as a group in the "Already Scheduled" area.
  const { unscheduledSectionIds, scheduledGroups } = useMemo(() => {
    if (!currentEstimate?.tasks)
      return { unscheduledSectionIds: [], scheduledGroups: [] };
    const tasksOrder = currentEstimate.tasks_order || [];
    const sortedTasks = [...currentEstimate.tasks].sort((a, b) => {
      const aIdx = tasksOrder.indexOf(a.est_task_id);
      const bIdx = tasksOrder.indexOf(b.est_task_id);
      return (aIdx === -1 ? Infinity : aIdx) - (bIdx === -1 ? Infinity : bIdx);
    });
    const unscheduled = [];
    const taskIdOrder = [];
    const taskIdMap = {};
    sortedTasks.forEach((task) => {
      task.sections?.forEach((section) => {
        const id = String(section.est_section_id);
        if (section.scheduled_task_id) {
          const tid = section.scheduled_task_id;
          if (!taskIdMap[tid]) {
            taskIdMap[tid] = [];
            taskIdOrder.push(tid);
          }
          taskIdMap[tid].push(id);
        } else {
          unscheduled.push(id);
        }
      });
    });
    const grouped = taskIdOrder.map((tid) => ({
      taskId: tid,
      sectionIds: taskIdMap[tid],
    }));
    return { unscheduledSectionIds: unscheduled, scheduledGroups: grouped };
  }, [currentEstimate]);

  // Initialize groups from unscheduled sections only
  // Auto-group sections belonging to the same task if the task has >1 section
  useEffect(() => {
    const allScheduledIds = scheduledGroups.flatMap((g) => g.sectionIds);
    if (unscheduledSectionIds.length === 0 && allScheduledIds.length === 0)
      return;
    if (groups.length !== 0) return;
    // Verify all sections have calcs (both unscheduled and scheduled)
    const allIds = [...unscheduledSectionIds, ...allScheduledIds];
    if (!allIds.every((id) => sectionCalcsMap[id])) return;

    // Group only unscheduled sections by taskId, preserving tasks_order
    const taskOrder = [];
    const taskMap = {};
    unscheduledSectionIds.forEach((sectionId) => {
      const calc = sectionCalcsMap[sectionId];
      if (!calc) return;
      if (!taskMap[calc.taskId]) {
        taskMap[calc.taskId] = [];
        taskOrder.push(calc.taskId);
      }
      taskMap[calc.taskId].push(sectionId);
    });

    const initialGroups = taskOrder.map((taskId) => ({
      groupId: `group-task-${taskId}`,
      sectionIds: taskMap[taskId],
    }));

    // Initialize editable section names for ALL sections (unscheduled + scheduled)
    const initialSectionNames = {};
    allIds.forEach((sectionId) => {
      const calc = sectionCalcsMap[sectionId];
      if (calc) initialSectionNames[sectionId] = calc.sectionName;
    });
    setSectionNames(initialSectionNames);

    // Initialize editable group names: default to first section's task name
    const initialGroupNames = {};
    initialGroups.forEach((group) => {
      const firstCalc = sectionCalcsMap[group.sectionIds[0]];
      initialGroupNames[group.groupId] = firstCalc?.taskName || "Group";
    });
    setGroupNames(initialGroupNames);

    setGroups(initialGroups);
    // Select all by default
    setSelectedGroups(new Set(initialGroups.map((g) => g.groupId)));
  }, [sectionCalcsMap, unscheduledSectionIds, scheduledGroups, groups.length]);

  // Active services (for column headers)
  const activeServices = useMemo(
    () => services.filter((s) => s.is_active),
    [services],
  );

  // ---------- Group hours aggregation ----------
  const getGroupHours = useCallback(
    (group) => {
      const aggregated = {};
      let total = 0;

      group.sectionIds.forEach((sectionId) => {
        const calc = sectionCalcsMap[sectionId];
        if (!calc) return;

        Object.entries(calc.hoursByService).forEach(([serviceId, hours]) => {
          if (!aggregated[serviceId]) aggregated[serviceId] = 0;
          aggregated[serviceId] += hours;
        });
        total += calc.totalHours;
      });

      // Round aggregated values
      Object.keys(aggregated).forEach((key) => {
        aggregated[key] = roundToHundredth(aggregated[key]);
      });

      return {
        hoursByService: aggregated,
        totalHours: roundToHundredth(total),
      };
    },
    [sectionCalcsMap],
  );

  const buildGroupFinancialData = useCallback(
    (group) => {
      const categoryTotals = {
        cabinets: 0,
        doors: 0,
        drawers: 0,
        hardware: 0,
        accessories: 0,
        lengths: 0,
        other: 0,
      };

      group.sectionIds.forEach((sectionId) => {
        const calculations = sectionCalcsMap[sectionId]?.calculations;
        if (!calculations) return;
        const costs = getSectionCategoryCosts(calculations);
        Object.keys(categoryTotals).forEach((key) => {
          categoryTotals[key] += costs[key] || 0;
        });
      });

      const adjustedTotals = allocateUnmappedCosts(
        categoryTotals,
        normalizedEstimateSections,
      );
      const groupHours = getGroupHours(group);

      const hoursData = services
        .map((service) => {
          const hours = groupHours.hoursByService[service.service_id] || 0;
          if (!hours) return null;
          return {
            team_service_id: service.team_service_id,
            estimate: roundToHundredth(hours),
            fixedAmount: 0,
            rateOverride: null,
            actual_cost: 0,
            inputRows: [],
          };
        })
        .filter(Boolean);

      const financialData = {
        hours: {
          name: "hours",
          estimate: 0,
          actual_cost: 0,
          data: hoursData,
        },
      };

      normalizedEstimateSections.forEach(({ id, name }) => {
        const estimate = getEstimateCostForSectionName(name, adjustedTotals);
        financialData[id] = {
          name: name.toLowerCase(),
          estimate: roundToHundredth(estimate),
          actual_cost: 0,
          data: [],
        };
      });

      return financialData;
    },
    [sectionCalcsMap, normalizedEstimateSections, services, getGroupHours],
  );

  // ---------- Selection ----------
  const handleToggleGroup = useCallback((groupId) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedGroups(new Set(groups.map((g) => g.groupId)));
  }, [groups]);

  const handleDeselectAll = useCallback(() => {
    setSelectedGroups(new Set());
  }, []);

  // ---------- DnD ----------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Group IDs for the SortableContext (group reordering)
  const groupIds = useMemo(() => groups.map((g) => g.groupId), [groups]);

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const activeType = active.data?.current?.type;
      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      if (activeType === "group") {
        // Reorder groups
        const oldIdx = groups.findIndex((g) => g.groupId === activeIdStr);
        // over could be a group ID or a section ID inside a group
        let newIdx = groups.findIndex((g) => g.groupId === overIdStr);
        if (newIdx === -1) {
          // Dropped onto a section — find which group it belongs to
          newIdx = groups.findIndex((g) => g.sectionIds.includes(overIdStr));
        }
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

        setGroups((prev) => {
          const newGroups = [...prev];
          const [moved] = newGroups.splice(oldIdx, 1);
          newGroups.splice(newIdx, 0, moved);
          return newGroups;
        });
      } else if (activeType === "section") {
        // Section drag → merge into a different group
        const activeGroup = groups.find((g) =>
          g.sectionIds.includes(activeIdStr),
        );

        // Find target group: over could be a group header or a section
        let overGroup = groups.find((g) => g.groupId === overIdStr);
        if (!overGroup) {
          overGroup = groups.find((g) => g.sectionIds.includes(overIdStr));
        }

        if (!activeGroup || !overGroup) return;

        if (activeGroup.groupId === overGroup.groupId) {
          // Reorder within same group
          setGroups((prev) =>
            prev.map((g) => {
              if (g.groupId !== activeGroup.groupId) return g;
              const oldIdx = g.sectionIds.indexOf(activeIdStr);
              const newIdx = g.sectionIds.indexOf(overIdStr);
              if (newIdx === -1) return g;
              const newIds = [...g.sectionIds];
              newIds.splice(oldIdx, 1);
              newIds.splice(newIdx, 0, activeIdStr);
              return { ...g, sectionIds: newIds };
            }),
          );
        } else {
          // Merge: move section into overGroup
          const overGroupWasSingle = overGroup.sectionIds.length === 1;

          setGroups((prev) => {
            let newGroups = prev.map((g) => {
              if (g.groupId === activeGroup.groupId) {
                return {
                  ...g,
                  sectionIds: g.sectionIds.filter((id) => id !== activeIdStr),
                };
              }
              if (g.groupId === overGroup.groupId) {
                return {
                  ...g,
                  sectionIds: [...g.sectionIds, activeIdStr],
                };
              }
              return g;
            });

            // Remove empty groups
            newGroups = newGroups.filter((g) => g.sectionIds.length > 0);

            // Transfer selection
            setSelectedGroups((prevSelected) => {
              const next = new Set(prevSelected);
              if (!newGroups.find((g) => g.groupId === activeGroup.groupId)) {
                next.delete(activeGroup.groupId);
              }
              if (prevSelected.has(activeGroup.groupId)) {
                next.add(overGroup.groupId);
              }
              return next;
            });

            // If the target group was a single section and is now becoming a group,
            // default the group name to the first section's task name
            if (overGroupWasSingle) {
              setGroupNames((prev) => {
                if (prev[overGroup.groupId]) return prev;
                const firstCalc = sectionCalcsMap[overGroup.sectionIds[0]];
                return {
                  ...prev,
                  [overGroup.groupId]: firstCalc?.taskName || "Group",
                };
              });
            }

            return newGroups;
          });
        }
      }
    },
    [groups, sectionCalcsMap],
  );

  // Ungroup: pull a section out of its group into its own group
  const handleUngroup = useCallback(
    (sectionId, groupId) => {
      setGroups((prev) => {
        const newGroupId = `group-${sectionId}`;
        const groupIdx = prev.findIndex((g) => g.groupId === groupId);
        if (groupIdx === -1) return prev;

        const group = prev[groupIdx];
        const wasSelected = selectedGroups.has(groupId);

        // Remove the section from its current group
        const updatedGroup = {
          ...group,
          sectionIds: group.sectionIds.filter((id) => id !== sectionId),
        };

        // Create new single-section group
        const newGroup = { groupId: newGroupId, sectionIds: [sectionId] };

        const newGroups = [...prev];
        if (updatedGroup.sectionIds.length === 0) {
          // Replace the empty group with the new one
          newGroups[groupIdx] = newGroup;
        } else {
          // Keep the updated group, insert new group right after it
          newGroups[groupIdx] = updatedGroup;
          newGroups.splice(groupIdx + 1, 0, newGroup);
        }

        // Carry over selection
        if (wasSelected) {
          setSelectedGroups((prevSel) => {
            const next = new Set(prevSel);
            next.add(newGroupId);
            return next;
          });
        }

        // Set the new group's name to the section's editable name
        setGroupNames((prev) => ({
          ...prev,
          [newGroupId]:
            sectionNames[sectionId] ||
            sectionCalcsMap[sectionId]?.sectionName ||
            "Section",
        }));

        return newGroups;
      });
    },
    [selectedGroups, sectionNames, sectionCalcsMap],
  );

  // ---------- Totals ----------
  const selectedTotals = useMemo(() => {
    const totals = {};
    let grandTotal = 0;

    groups.forEach((group) => {
      if (!selectedGroups.has(group.groupId)) return;
      const groupHours = getGroupHours(group);
      Object.entries(groupHours.hoursByService).forEach(
        ([serviceId, hours]) => {
          if (!totals[serviceId]) totals[serviceId] = 0;
          totals[serviceId] += hours;
        },
      );
      grandTotal += groupHours.totalHours;
    });

    Object.keys(totals).forEach((key) => {
      totals[key] = roundToHundredth(totals[key]);
    });

    return {
      hoursByService: totals,
      totalHours: roundToHundredth(grandTotal),
    };
  }, [groups, selectedGroups, getGroupHours]);

  // ---------- Add to Schedule handler ----------
  const handleAddToSchedule = useCallback(async () => {
    if (selectedGroups.size === 0 || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Build the groups payload for the RPC
      const selectedGroupsData = groups
        .filter((group) => selectedGroups.has(group.groupId))
        .map((group) => {
          const groupHours = getGroupHours(group);
          const shopHours = groupHours.hoursByService[2] || 0;
          const financialData = buildGroupFinancialData(group);

          // Determine task name: use group name for multi-section groups,
          // or section name for single-section groups
          const name =
            group.sectionIds.length > 1
              ? groupNames[group.groupId] || "Group"
              : sectionNames[group.sectionIds[0]] ||
                sectionCalcsMap[group.sectionIds[0]]?.sectionName ||
                "Section";

          return {
            name,
            duration: shopHours,
            section_ids: group.sectionIds.map((id) => parseInt(id, 10)),
            financial_data: financialData,
          };
        });

      const startDate = normalizeDate(new Date());

      // If sections from this estimate are already scheduled, find an
      // existing task_id so new tasks get added to the same project
      const existingTaskId =
        scheduledGroups.length > 0 ? scheduledGroups[0].taskId : null;

      const result = await dispatch(
        addEstimateToSchedule({
          projectName: currentEstimate.est_project_name,
          teamId: currentEstimate.team_id,
          employeeId: defaultEmployeeId,
          startDate,
          dayWidth,
          workdayHours,
          nextTaskNumber,
          chartConfigId,
          groups: selectedGroupsData,
          existingTaskId,
        }),
      );

      if (result.success) {
        setSaveSuccess(true);
        // Re-fetch estimate so scheduled_task_id values are up to date,
        // then reset groups so the init effect re-runs with the new split
        await dispatch(fetchEstimateById(currentEstimate.estimate_id));
        setGroups([]);
        setSelectedGroups(new Set());
      } else {
        setSaveError(result.error || "Failed to add to schedule");
      }
    } catch (error) {
      setSaveError(error.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedGroups,
    isSaving,
    groups,
    getGroupHours,
    buildGroupFinancialData,
    groupNames,
    sectionNames,
    sectionCalcsMap,
    scheduledGroups,
    dispatch,
    currentEstimate,
    defaultEmployeeId,
    dayWidth,
    workdayHours,
    nextTaskNumber,
    chartConfigId,
  ]);

  // ---------- Column template helper ----------
  const serviceColumns = activeServices.map(() => "80px").join(" ");
  const headerGridCols = `40px 40px 1fr ${serviceColumns} 90px`;
  const sectionGridCols = `1fr ${serviceColumns} 90px`;

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800 text-slate-200">
        Loading...
      </div>
    );
  }

  if (!currentEstimate) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800 text-slate-200">
        Estimate not found
      </div>
    );
  }

  const allSelected =
    groups.length > 0 && selectedGroups.size === groups.length;

  return (
    <div className="h-full bg-slate-900 text-slate-200 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(PATHS.FINALIZED_ESTIMATES)}
                className="hover:text-teal-400 transition-colors"
                aria-label="Back to finalized estimates"
              >
                <FiArrowLeft size={24} />
              </button>
              <div>
                <h2 className="text-2xl font-bold">
                  {currentEstimate.est_project_name}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saveError && (
                <span className="text-sm text-red-400">{saveError}</span>
              )}
              {saveSuccess && (
                <span className="text-sm text-green-400">
                  Added to schedule!
                </span>
              )}
              <button
                onClick={handleAddToSchedule}
                disabled={selectedGroups.size === 0 || isSaving || saveSuccess}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                <FiCalendar className="w-4 h-4" />
                {isSaving
                  ? "Adding..."
                  : saveSuccess
                    ? "Added"
                    : "Add to Schedule"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700 flex gap-4">
            <div className="flex-1">
              <p className="text-slate-300">
                Select which sections to add to the schedule.
              </p>
              <p>
                Click the{" "}
                <BsDashSquare className="inline text-lg text-red-400 bg-red-900/30" />{" "}
                to ungroup a section.
              </p>
            </div>
            <div className="flex-1">
              <p>
                Drag the <strong>☰</strong> handle to reorder groups.
              </p>
              <p>
                Drag the{" "}
                <strong>
                  <FiMove className="inline" />
                </strong>{" "}
                handle on a section to merge it into another group.
              </p>
            </div>
          </div>

          {/* Select All / Deselect All */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={allSelected ? handleDeselectAll : handleSelectAll}
              className="text-sm text-teal-400 hover:text-teal-300"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
            <span className="text-sm text-slate-400">
              {selectedGroups.size} of {groups.length} selected
            </span>
          </div>

          {/* Service columns header */}
          <div
            className="grid gap-2 mb-2 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider"
            style={{ gridTemplateColumns: headerGridCols }}
          >
            <div></div>
            <div></div>
            <div>Section</div>
            {activeServices.map((service) => (
              <div key={service.service_id} className="text-center">
                {service.service_name}
              </div>
            ))}
            <div className="text-center">Total</div>
          </div>

          {/* Groups list with DnD */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={groupIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {groups.map((group) => {
                  const groupHours = getGroupHours(group);
                  const isSelected = selectedGroups.has(group.groupId);
                  const isMulti = group.sectionIds.length > 1;

                  return (
                    <SortableGroup key={group.groupId} id={group.groupId}>
                      {({ dragListeners }) => (
                        <div
                          className={`rounded-lg border-2 transition-colors ${
                            isMulti
                              ? "border-teal-500/50 bg-slate-800/50"
                              : "border-transparent"
                          }`}
                        >
                          {/* Group header row (shown for multi-section groups) */}
                          {isMulti && (
                            <div
                              className="grid gap-2 px-4 py-2 items-center text-sm font-semibold text-teal-300 border-b border-teal-500/30"
                              style={{ gridTemplateColumns: headerGridCols }}
                            >
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleGroup(group.groupId)
                                  }
                                  className="w-4 h-4 rounded border-slate-500 text-teal-500 focus:ring-teal-500 cursor-pointer"
                                />
                              </div>
                              <button
                                {...dragListeners}
                                className="cursor-grab text-teal-400 hover:text-teal-200 p-1 flex items-center justify-center"
                                aria-label="Drag to reorder group"
                              >
                                <FiMenu size={16} />
                              </button>
                              <div className="min-w-0">
                                <input
                                  type="text"
                                  value={groupNames[group.groupId] || ""}
                                  onChange={(e) =>
                                    setGroupNames((prev) => ({
                                      ...prev,
                                      [group.groupId]: e.target.value,
                                    }))
                                  }
                                  className="w-full bg-transparent border-b border-transparent hover:border-teal-500/50 focus:border-teal-400 focus:outline-none text-teal-300 font-semibold text-sm px-0 py-0"
                                />
                              </div>
                              {activeServices.map((service) => (
                                <div
                                  key={service.service_id}
                                  className="text-center font-mono"
                                >
                                  {groupHours.hoursByService[
                                    service.service_id
                                  ]?.toFixed(2) || "—"}
                                </div>
                              ))}
                              <div className="text-center font-mono font-bold">
                                {groupHours.totalHours.toFixed(2)}
                              </div>
                            </div>
                          )}

                          {/* Individual sections */}
                          <div
                            className={isMulti ? "p-2 space-y-2" : "space-y-1"}
                          >
                            {group.sectionIds.map((sectionId) => {
                              const calc = sectionCalcsMap[sectionId];
                              if (!calc) return null;

                              if (!isMulti) {
                                // Single-section group: show checkbox + group drag + section content inline
                                return (
                                  <DraggableSection
                                    key={sectionId}
                                    id={sectionId}
                                    isGrouped={false}
                                  >
                                    <div
                                      className="grid gap-2 items-center text-sm"
                                      style={{
                                        gridTemplateColumns: `28px 28px ${sectionGridCols}`,
                                      }}
                                    >
                                      <div className="flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() =>
                                            handleToggleGroup(group.groupId)
                                          }
                                          className="w-4 h-4 rounded border-slate-500 text-teal-500 focus:ring-teal-500 cursor-pointer"
                                        />
                                      </div>
                                      <button
                                        {...dragListeners}
                                        className="cursor-grab text-slate-400 hover:text-slate-200 p-1 flex items-center justify-center"
                                        aria-label="Drag to reorder"
                                      >
                                        <FiMenu size={16} />
                                      </button>
                                      <div className="min-w-0">
                                        <input
                                          type="text"
                                          value={sectionNames[sectionId] || ""}
                                          onChange={(e) =>
                                            setSectionNames((prev) => ({
                                              ...prev,
                                              [sectionId]: e.target.value,
                                            }))
                                          }
                                          className="w-full bg-transparent border-b border-transparent hover:border-slate-500 focus:border-teal-400 focus:outline-none text-slate-200 text-sm px-0 py-0"
                                        />
                                      </div>
                                      {activeServices.map((service) => (
                                        <div
                                          key={service.service_id}
                                          className="text-center text-slate-300 font-mono text-xs"
                                        >
                                          {calc.hoursByService[
                                            service.service_id
                                          ]?.toFixed(2) || "—"}
                                        </div>
                                      ))}
                                      <div className="text-center text-slate-200 font-mono text-xs font-medium">
                                        {calc.totalHours.toFixed(2)}
                                      </div>
                                    </div>
                                  </DraggableSection>
                                );
                              }

                              // Multi-section group: individual section rows
                              return (
                                <DraggableSection
                                  key={sectionId}
                                  id={sectionId}
                                  isGrouped={true}
                                >
                                  <div
                                    className="grid gap-2 items-center text-sm"
                                    style={{
                                      gridTemplateColumns: sectionGridCols,
                                    }}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <input
                                        type="text"
                                        value={sectionNames[sectionId] || ""}
                                        onChange={(e) =>
                                          setSectionNames((prev) => ({
                                            ...prev,
                                            [sectionId]: e.target.value,
                                          }))
                                        }
                                        className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-slate-500 focus:border-teal-400 focus:outline-none text-slate-200 text-sm px-0 py-0"
                                      />
                                      <button
                                        onClick={() =>
                                          handleUngroup(
                                            sectionId,
                                            group.groupId,
                                          )
                                        }
                                        className="flex-shrink-0 text-lg text-red-400 hover:text-red-300 rounded bg-red-900/30 hover:bg-red-900/50"
                                        title="Ungroup this section"
                                      >
                                        <BsDashSquare />
                                      </button>
                                    </div>
                                    {activeServices.map((service) => (
                                      <div
                                        key={service.service_id}
                                        className="text-center text-slate-300 font-mono text-xs"
                                      >
                                        {calc.hoursByService[
                                          service.service_id
                                        ]?.toFixed(2) || "—"}
                                      </div>
                                    ))}
                                    <div className="text-center text-slate-200 font-mono text-xs font-medium">
                                      {calc.totalHours.toFixed(2)}
                                    </div>
                                  </div>
                                </DraggableSection>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </SortableGroup>
                  );
                })}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeId ? (
                <div className="px-4 py-3 rounded-lg border border-teal-500 bg-slate-700 shadow-xl text-sm text-slate-200">
                  {activeId.startsWith("group-")
                    ? groupNames[activeId] ||
                      sectionCalcsMap[
                        groups.find((g) => g.groupId === activeId)
                          ?.sectionIds[0]
                      ]?.taskName ||
                      "Group"
                    : sectionNames[activeId] ||
                      sectionCalcsMap[activeId]?.sectionName ||
                      "Section"}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Totals row */}
          <div
            className="grid gap-2 mt-6 px-4 py-4 items-center text-sm font-bold bg-slate-800 rounded-lg border border-slate-600"
            style={{ gridTemplateColumns: headerGridCols }}
          >
            <div></div>
            <div></div>
            <div className="text-teal-400">Selected Totals</div>
            {activeServices.map((service) => (
              <div
                key={service.service_id}
                className="text-center text-teal-400 font-mono"
              >
                {selectedTotals.hoursByService[service.service_id]?.toFixed(
                  2,
                ) || "—"}
              </div>
            ))}
            <div className="text-center text-teal-300 font-mono text-base">
              {selectedTotals.totalHours.toFixed(2)}
            </div>
          </div>

          {/* Already-scheduled sections (grayed out, non-interactive) */}
          {scheduledGroups.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                Already Scheduled (
                {scheduledGroups.reduce((n, g) => n + g.sectionIds.length, 0)}{" "}
                section
                {scheduledGroups.reduce(
                  (n, g) => n + g.sectionIds.length,
                  0,
                ) !== 1
                  ? "s"
                  : ""}
                )
              </h3>
              <div className="space-y-3 opacity-80 text-slate-300 font-mono text-xs font-medium">
                {scheduledGroups.map((schGroup) => {
                  const isMulti = schGroup.sectionIds.length > 1;
                  const groupHours = getGroupHours(schGroup);

                  return (
                    <div
                      key={schGroup.taskId}
                      className={`rounded-lg border-2 ${
                        isMulti
                          ? "border-slate-600/50 bg-slate-800/30"
                          : "border-transparent"
                      }`}
                    >
                      {/* Group header for multi-section scheduled groups */}
                      {isMulti && (
                        <div
                          className="grid gap-2 px-4 py-2 items-center text-sm font-semibold text-slate-400 border-b border-slate-600/30"
                          style={{ gridTemplateColumns: headerGridCols }}
                        >
                          <div className="flex items-center justify-center">
                            <FiCheck size={16} className="text-green-500" />
                          </div>
                          <div></div>
                          <div className="min-w-0 truncate">
                            {sectionCalcsMap[schGroup.sectionIds[0]]
                              ?.taskName || "Group"}
                          </div>
                          {activeServices.map((service) => (
                            <div
                              key={service.service_id}
                              className="text-center"
                            >
                              {groupHours.hoursByService[
                                service.service_id
                              ]?.toFixed(2) || "—"}
                            </div>
                          ))}
                          <div className="text-center font-bold">
                            {groupHours.totalHours.toFixed(2)}
                          </div>
                        </div>
                      )}

                      {/* Individual sections */}
                      <div className={isMulti ? "p-2 space-y-1" : "space-y-1"}>
                        {schGroup.sectionIds.map((sectionId) => {
                          const calc = sectionCalcsMap[sectionId];
                          if (!calc) return null;

                          return (
                            <div
                              key={sectionId}
                              className={`px-4 py-3 rounded-lg border ${
                                isMulti
                                  ? "bg-slate-700/20 border-slate-700/50"
                                  : "bg-slate-800 border-slate-700"
                              }`}
                            >
                              <div
                                className="grid gap-2 items-center text-sm"
                                style={{
                                  gridTemplateColumns: isMulti
                                    ? sectionGridCols
                                    : `28px 28px ${sectionGridCols}`,
                                }}
                              >
                                {!isMulti && (
                                  <>
                                    <div className="flex items-center justify-center">
                                      <FiCheck
                                        size={16}
                                        className="text-green-500"
                                      />
                                    </div>
                                    <div></div>
                                  </>
                                )}
                                <div className="min-w-0 truncate">
                                  {sectionNames[sectionId] || calc.sectionName}
                                </div>
                                {activeServices.map((service) => (
                                  <div
                                    key={service.service_id}
                                    className="text-center"
                                  >
                                    {calc.hoursByService[
                                      service.service_id
                                    ]?.toFixed(2) || "—"}
                                  </div>
                                ))}
                                <div className="text-center">
                                  {calc.totalHours.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddToSchedule;
