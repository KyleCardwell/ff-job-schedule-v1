import * as d3 from "d3";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  differenceInDays,
  max,
} from "date-fns";
import { isEqual, omit } from "lodash";
import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { usePermissions } from "../hooks/usePermissions";
import { updateEmployeeSchedulingConflicts } from "../redux/actions/builders";
import { updateOneBuilderChartData } from "../redux/actions/chartData";
import {
  fetchEarliestAndLatestDates,
  updateSubtasksPositions,
} from "../redux/actions/projects";
import { updateTasksByOneBuilder } from "../redux/actions/taskData";
import { normalizeDate } from "../utils/dateUtils";
import {
  calculateAdjustedWidth,
  calculateXPosition,
  getNextWorkday,
  sortAndAdjustDates,
  totalJobHours,
} from "../utils/helpers";

const TaskGroups = ({
  chartRef,
  barMargin,
  chartHeight,
  numDays,
  handleAutoScroll,
  dayWidth,
  rowHeight,
  chartStartDate,
  workdayHours,
  setIsLoading,
  scrollToMonday,
  onDatabaseError,
  setEstimatedCompletionDate,
  earliestStartDate,
  latestStartDate,
  selectedEmployeeIds,
  dateFilter,
}) => {
  const dispatch = useDispatch();
  const { canEditSchedule } = usePermissions();

  const cannotEdit = useMemo(
    () => !canEditSchedule || dateFilter?.startDate || dateFilter?.endDate,
    [canEditSchedule, dateFilter]
  );

  // Configuration for hard start indicator dimensions
  const hardStartConfig = {
    width: 16, // Total width of the bracket
    offset: 9, // Offset from task start
    verticalWidth: 4, // Width of vertical bar
    horizontalWidth: 1, // Width of horizontal ends
    cornerRadius: 5, // Radius for interior corners
  };

  const employees = useSelector((state) => state.builders.employees);
  const { tasks } = useSelector((state) => state.taskData);
  const holidayMap = useSelector((state) => state.holidays.holidayMap);
  const { subTasksByEmployee } = useSelector(
    (state) => state.taskData,
    isEqual
  );

  const taskGroupsRef = useRef(null);
  const previousTaskStateRef = useRef(null);
  const totalDurationRef = useRef(0);

  // Get loading states from Redux
  const { loading: employeesLoading } = useSelector((state) => state.builders);
  const { loading: taskDataLoading } = useSelector((state) => state.taskData);
  const { loading: holidaysLoading } = useSelector((state) => state.holidays);

  const defaultEmployeeId = employees[0]?.employee_id;

  const activeTasksData = useMemo(() => {
    const today = normalizeDate(new Date());
    const earliestStart = normalizeDate(earliestStartDate);
    const currentDate = normalizeDate(
      max([parseISO(today), parseISO(earliestStart)])
    );

    // Reset the total duration
    totalDurationRef.current = 0;

    // Single pass through tasks array
    return tasks.reduce(
      (acc, task, index) => {
        // Skip inactive tasks
        if (task.task_active === false) return acc;

        // Determine if we're using filters
        const hasEmployeeFilter = selectedEmployeeIds.length > 0;
        const hasDateFilter = dateFilter.startDate || dateFilter.endDate;

        // Skip tasks that don't match any selected employee filter
        if (hasEmployeeFilter && !selectedEmployeeIds.includes(task.employee_id)) {
          return acc;
        }

        // Apply date filter
        // Unassigned employees (defaultEmployeeId) have inconsistent dates because they don't use sortAndAdjustDates
        // Never apply date filtering to defaultEmployeeId tasks
        if (hasDateFilter && task.employee_id !== defaultEmployeeId) {
          const taskStartDate = normalizeDate(task.start_date);
          const taskEndDate = normalizeDate(task.end_date);
          const filterStart = dateFilter.startDate || "-infinity";
          const filterEnd = dateFilter.endDate || "infinity";

          const passesDateFilter =
            taskEndDate > filterStart &&
            ((taskStartDate >= filterStart && taskStartDate <= filterEnd) ||
              (filterStart >= taskStartDate && filterStart <= filterEnd));

          if (!passesDateFilter) return acc;
        }

        // Calculate duration for all tasks
        if (
          task.employee_id === defaultEmployeeId ||
          task.start_date >= currentDate
        ) {
          totalDurationRef.current += task.duration || 0;
        } else if (
          task.end_date >= currentDate &&
          task.start_date <= currentDate
        ) {
          const remainingDays = differenceInDays(
            normalizeDate(task.end_date),
            normalizeDate(currentDate)
          );
          totalDurationRef.current += remainingDays * workdayHours;
        }

        // Only include non-defaultEmployeeId tasks in the return array
        if (task.employee_id !== defaultEmployeeId) {
          acc.tasks.push({
            ...task,
            rowNumber: acc.activeCount,
            xPosition: calculateXPosition(
              normalizeDate(task.start_date),
              normalizeDate(chartStartDate),
              dayWidth
            ),
          });
        }
        acc.activeCount++;
        return acc;
      },
      { tasks: [], activeCount: 0 }
    ).tasks;
  }, [
    tasks,
    subTasksByEmployee,
    chartStartDate,
    dayWidth,
    workdayHours,
    holidayMap,
    selectedEmployeeIds,
    earliestStartDate,
    employees,
    dateFilter,
  ]);

  // Calculate timeOffByBuilder independently
  const timeOffByBuilder = useMemo(() => {
    return employees.reduce((acc, builder) => {
      acc[builder.employee_id] = builder.time_off?.flatMap((period) => {
        const periodStart = parseISO(normalizeDate(period.start));
        const periodEnd = parseISO(normalizeDate(period.end));

        return eachDayOfInterval({
          start: periodStart,
          end: periodEnd,
        }).map((day) => normalizeDate(day));
      });
      return acc;
    }, {});
  }, [employees]);

  // Calculate timeOffData
  const timeOffData = useMemo(() => {
    const xPositions = new Map();
    return employees.flatMap((builder) =>
      builder.time_off?.flatMap((period) => {
        const periodStart = parseISO(normalizeDate(period.start));
        const periodEnd = parseISO(normalizeDate(period.end));
        const chartStart = parseISO(normalizeDate(chartStartDate));

        return eachDayOfInterval({
          start: periodStart,
          end: periodEnd,
        })
          .filter((day) =>
            isWithinInterval(day, {
              start: chartStart,
              end: addDays(chartStart, numDays - 1),
            })
          )
          .map((day) => {
            let x = differenceInCalendarDays(day, chartStart) * dayWidth;

            while (xPositions.has(x)) {
              x += 6;
            }
            xPositions.set(x, true);

            return {
              x,
              employee_color: builder.employee_color,
              employee_id: builder.employee_id,
              date: normalizeDate(day),
            };
          });
      })
    );
  }, [employees, chartStartDate, numDays, dayWidth]);

  // Calculate and update estimated completion date using the accumulated duration
  useEffect(() => {
    if (!tasks.length || !employees.length) return;

    const today = normalizeDate(new Date());
    const earliestStart = normalizeDate(earliestStartDate);
    const currentDate = normalizeDate(
      max([parseISO(today), parseISO(earliestStart)])
    );

    const estimatedTotalDays =
      totalJobHours(
        currentDate,
        totalDurationRef.current,
        workdayHours,
        holidayMap,
        0,
        {}
      ) / workdayHours;

    // Count only employees who can be scheduled
    const schedulableEmployees = employees.filter(
      (emp) => emp.can_schedule !== false
    ).length;
    const activeEmployees = Math.max(1, schedulableEmployees - 1); // Subtract 1 for default employee

    const estimCompletionDate = addDays(
      parseISO(currentDate),
      estimatedTotalDays / activeEmployees
    );

    setEstimatedCompletionDate(normalizeDate(estimCompletionDate));
  }, [
    tasks,
    employees,
    workdayHours,
    holidayMap,
    earliestStartDate,
    setEstimatedCompletionDate,
  ]);

  useEffect(() => {
    if (
      !chartRef.current ||
      !taskGroupsRef.current ||
      !Array.isArray(employees) ||
      employees.length === 0 ||
      !activeTasksData ||
      (activeTasksData.length === 0 &&
        !(
          selectedEmployeeIds.length === 1 &&
          selectedEmployeeIds[0] === employees[0]?.employee_id
        ))
    ) {
      return;
    }

    const taskGroupsSvg = d3.select(taskGroupsRef.current);

    // Clear existing content
    taskGroupsSvg.selectAll("*").remove();
    
    // Helper function to show hours calculation display
    const showHoursCalculation = (parentGroup, d, width) => {
      // Calculate hours
      const duration = calculateAdjustedWidth(
        d.start_date,
        width,
        dayWidth,
        holidayMap,
        d.employee_id,
        timeOffByBuilder,
        workdayHours
      );
      
      const dailyHours = Math.round(duration / workdayHours) * workdayHours;
      const hoursLabel = `${dailyHours} hrs`;
      
      // Calculate text dimensions for background sizing
      const textWidth = hoursLabel.length * 7;
      const textHeight = 18;
      const padding = 6;
      
      // Update hours calculation background
      parentGroup.select(".hours-calculation-bg")
        .style("display", "block")
        .attr("x", d.xPosition + width - textWidth - padding * 2 - 5)
        .attr("y", rowHeight / 2 - textHeight / 2)
        .attr("width", textWidth + padding * 2)
        .attr("height", textHeight);
      
      // Update hours calculation text
      parentGroup.select(".hours-calculation-text")
        .style("display", "block")
        .attr("x", d.xPosition + width - 5 - padding)
        .attr("y", rowHeight / 2)
        .text(hoursLabel)
        .style("text-anchor", "end");
    };
    // Define drag behavior
    const drag = d3
      .drag()
      .on("start", function (event, d) {
        // Skip drag if:
        // - user doesn't have permission
        // - task has hard_start_date
        // - date filters are active
        if (cannotEdit || d.hard_start_date) return;

        const employeeTasks = subTasksByEmployee[d.employee_id] || [];
        previousTaskStateRef.current = {
          employee_id: d.employee_id,
          tasks: [...employeeTasks],
        };

        d3.select(this).classed("dragging", true);
        d.dragStartX = d3.select(this).attr("x");
        d.dragStartEventX = event.x;
      })
      .on("drag", function (event, d) {
        // Skip drag if:
        // - user doesn't have permission
        // - task has hard_start_date
        // - date filters are active
        if (cannotEdit || d.hard_start_date) return;

        const dx = event.x - d.dragStartEventX;
        const newX = parseFloat(d.dragStartX) + dx;
        d3.select(this).attr("x", newX);
        d3.select(this.parentNode)
          .select(".bar-text")
          .attr("x", newX + 5);
        handleAutoScroll(event);
      })
      .on("end", function (event, d) {
        // Skip drag if:
        // - user doesn't have permission
        // - task has hard_start_date
        // - date filters are active
        if (cannotEdit || d.hard_start_date) return;

        const dx = event.x - d.dragStartEventX;
        const newX = parseFloat(d.dragStartX) + dx;
        // Calculate the day index and the percentage within the day
        const dayIndex = Math.floor(newX / dayWidth);
        const percentageWithinDay = (newX % dayWidth) / dayWidth;
        // Determine whether to snap left or right
        const snappedDayIndex =
          percentageWithinDay <= 0.67 ? dayIndex : dayIndex + 1;
        const daysMoved = snappedDayIndex - Math.floor(d.dragStartX / dayWidth);
        // let newStartDate = new Date(d.start_date);
        let newStartDate = new Date(
          Date.UTC(
            new Date(d.start_date).getFullYear(), // Use local date components
            new Date(d.start_date).getMonth(),
            new Date(d.start_date).getDate() + daysMoved
          )
        );
        // Snap to next workday if it's a weekend or holiday or if the builder has time off on that day
        newStartDate = getNextWorkday(
          newStartDate,
          holidayMap,
          d.employee_id,
          timeOffByBuilder
        );

        if (newStartDate === d.start_date) {
          // Move task back to original position
          const originalX = calculateXPosition(
            normalizeDate(d.start_date),
            normalizeDate(chartStartDate),
            dayWidth
          );
          // Animate the bar
          d3.select(this)
            .transition()
            .duration(300)
            .ease(d3.easeBackOut)
            .attr("x", originalX)
            .on("end", () => d3.select(this).classed("dragging", false));

          // Animate the text
          d3.select(this.parentNode)
            .select(".bar-text")
            .transition()
            .duration(300)
            .ease(d3.easeBackOut)
            .attr("x", originalX + 5);

          return;
        }

        // Update the dragged job
        const updatedDraggedJob = {
          ...d,
          start_date: normalizeDate(newStartDate),
          isDragged: true,
          draggedLeft: dx < 0,
        };

        // Get the current builder's jobs and update the dragged job
        const builderTasks = subTasksByEmployee[d.employee_id];
        const updatedBuilderTasks = builderTasks
          .map((subTask) =>
            subTask.subtask_id === d.subtask_id
              ? {
                  ...updatedDraggedJob,
                  dragStartX: undefined,
                  dragStartEventX: undefined,
                }
              : subTask
          )
          .filter((job) => job.task_active);

        // Sort and adjust dates for the builder's jobs
        const { tasks: sortedBuilderTasks, conflicts } = sortAndAdjustDates(
          updatedBuilderTasks,
          workdayHours,
          holidayMap,
          timeOffByBuilder,
          dayWidth,
          chartStartDate,
          defaultEmployeeId
        );
        // Transition all jobs in the builder group
        const jobGroups = taskGroupsSvg
          .selectAll(`.task-group-${d.employee_id}`)
          .data(sortedBuilderTasks, (job) => job.subtask_id);

        jobGroups
          .transition()
          .duration(300)
          .call((transition) => {
            transition
              .select("rect")
              .attr("x", (job) => job.xPosition)
              .attr("width", (job) => job.subtask_width);
            transition
              .select(".bar-text")
              .attr("x", (job) => job.xPosition + 5);
            transition.select(".hard-start-indicator").attr("d", (job) => {
              const x = job.xPosition + hardStartConfig.offset;
              const y = rowHeight * (job.yOffsetFactor || 0);
              const r = hardStartConfig.cornerRadius;
              const innerWidth =
                hardStartConfig.width - hardStartConfig.verticalWidth;

              return `M ${x} ${y}  
                        h -${hardStartConfig.width}
                        v ${rowHeight}
                        h ${hardStartConfig.width}
                        v -${hardStartConfig.horizontalWidth}
                        h -${innerWidth - r}
                        a ${r} ${r} 0 0 1 -${r} -${r}
                        v -${
                          rowHeight -
                          2 * hardStartConfig.horizontalWidth -
                          2 * r
                        }
                        a ${r} ${r} 0 0 1 ${r} -${r}
                        h ${innerWidth - r}
                        Z`;
            });
          })
          .end()
          .then(async () => {
            try {
              // Check if dragged task changed
              const currentTasks = subTasksByEmployee[d.employee_id];

              // Find dragged task in both arrays
              const draggedTaskNew = sortedBuilderTasks.find(
                (t) => t.subtask_id === d.subtask_id
              );
              const draggedTaskOld = currentTasks?.find(
                (t) => t.subtask_id === d.subtask_id
              );

              // Only compare fields that can change during drag/resize
              const draggedTaskChanged =
                draggedTaskNew?.start_date !== draggedTaskOld?.start_date ||
                draggedTaskNew?.subtask_width !==
                  draggedTaskOld?.subtask_width ||
                draggedTaskNew?.duration !== draggedTaskOld?.duration;

              // If dragged task didn't change, no need to check others or update anything
              if (!draggedTaskChanged) {
                previousTaskStateRef.current = null;
                return;
              }

              dispatch(updateOneBuilderChartData(sortedBuilderTasks));
              dispatch(
                updateTasksByOneBuilder(d.employee_id, sortedBuilderTasks)
              );
              dispatch(
                updateEmployeeSchedulingConflicts(d.employee_id, conflicts)
              );

              // Filter out unchanged tasks
              const tasksToUpdate = sortedBuilderTasks.filter((task) => {
                const originalTask = tasks.find(
                  (t) => t.subtask_id === task.subtask_id
                );
                if (!originalTask) {
                  return true; // Keep new tasks
                }

                // Only compare fields that can change during drag/resize
                return !isEqual(
                  omit(task, ["xPosition"]),
                  omit(originalTask, ["xPosition"])
                );
              });

              await updateSubtasksPositions(tasksToUpdate);

              if (
                tasksToUpdate[0].start_date < earliestStartDate ||
                tasksToUpdate[tasksToUpdate.length - 1].end_date >
                  latestStartDate
              ) {
                await dispatch(fetchEarliestAndLatestDates(defaultEmployeeId));
              }

              previousTaskStateRef.current = null;
            } catch (error) {
              // Revert to previous state if database update fails
              if (previousTaskStateRef.current) {
                dispatch(
                  updateOneBuilderChartData(previousTaskStateRef.current.tasks)
                );
                dispatch(
                  updateTasksByOneBuilder(
                    previousTaskStateRef.current.employee_id,
                    previousTaskStateRef.current.tasks
                  )
                );
              }
              onDatabaseError(error);
            }
          });
        d3.select(this).classed("dragging", false);
        delete d.dragStartX;
        delete d.dragStartEventX;
      });

    const resize = d3
      .drag()
      .on("start", function (event, d) {
        // Skip resize if:
        // - user doesn't have permission
        // - date filters are active
        if (cannotEdit) return;

        const employeeTasks = subTasksByEmployee[d.employee_id] || [];
        previousTaskStateRef.current = {
          employee_id: d.employee_id,
          tasks: [...employeeTasks],
        };
        d.resizeStartWidth = d3
          .select(this.parentNode)
          .select("rect")
          .attr("width");
        d.resizeStartX = event.x;
        
        // Show hours calculation display
        showHoursCalculation(
          d3.select(this.parentNode),
          d,
          parseFloat(d3.select(this.parentNode).select("rect").attr("width"))
        );
      })
      .on("drag", function (event, d) {
        // Skip resize if:
        // - user doesn't have permission
        // - date filters are active
        if (cannotEdit) return;

        const rect = d3.select(this.parentNode).select("rect");
        const dx = event.x - d.resizeStartX;
        const newWidth = Math.max(
          dayWidth,
          parseFloat(d.resizeStartWidth) + dx
        );
        rect.attr("width", newWidth);
        
        // Update hours calculation display
        showHoursCalculation(d3.select(this.parentNode), d, newWidth);
        
        handleAutoScroll(event);
      })
      .on("end", function (event, d) {
        // Skip resize if:
        // - user doesn't have permission
        // - date filters are active
        if (cannotEdit) return;
        
        // Hide hours calculation text and background
        d3.select(this.parentNode)
          .select(".hours-calculation-bg")
          .style("display", "none");
        d3.select(this.parentNode)
          .select(".hours-calculation-text")
          .style("display", "none");

        const rect = d3.select(this.parentNode).select("rect");
        const newWidth = parseFloat(rect.attr("width"));

        // Calculate adjusted width and duration
        const newDuration = calculateAdjustedWidth(
          d.start_date,
          newWidth,
          dayWidth,
          holidayMap,
          d.employee_id,
          timeOffByBuilder,
          workdayHours
        );

        // Update the resized job
        const updatedResizedJob = {
          ...d,
          subtask_width: newWidth,
          duration: newDuration,
        };

        // Get the current builder's jobs and update the resized job
        const builderTasks = subTasksByEmployee[d.employee_id];
        const updatedBuilderTasks = builderTasks.map((subTask) =>
          subTask.subtask_id === d.subtask_id
            ? {
                ...updatedResizedJob,
                resizeStartWidth: undefined,
                resizeStartX: undefined,
              }
            : subTask
        );
        //   .filter((job) => job.task_active);

        // Sort and adjust dates for the builder's jobs
        const { tasks: sortedBuilderTasks, conflicts } = sortAndAdjustDates(
          updatedBuilderTasks,
          workdayHours,
          holidayMap,
          timeOffByBuilder,
          dayWidth,
          chartStartDate,
          defaultEmployeeId
        );

        // Transition all jobs in the builder group
        const jobGroups = taskGroupsSvg
          .selectAll(`.task-group-${d.employee_id}`)
          .data(sortedBuilderTasks, (job) => job.subtask_id);

        jobGroups
          .transition()
          .duration(300)
          .call((transition) => {
            transition
              .select("rect")
              .attr("x", (job) => job.xPosition)
              .attr("width", (job) => job.subtask_width);
            transition
              .select(".bar-text")
              .attr("x", (job) => job.xPosition + 5);
            transition.select(".hard-start-indicator").attr("d", (job) => {
              const x = job.xPosition + hardStartConfig.offset;
              const y = rowHeight * (job.yOffsetFactor || 0);
              const r = hardStartConfig.cornerRadius;
              const innerWidth =
                hardStartConfig.width - hardStartConfig.verticalWidth;

              return `M ${x} ${y}  
                        h -${hardStartConfig.width}
                        v ${rowHeight}
                        h ${hardStartConfig.width}
                        v -${hardStartConfig.horizontalWidth}
                        h -${innerWidth - r}
                        a ${r} ${r} 0 0 1 -${r} -${r}
                        v -${
                          rowHeight -
                          2 * hardStartConfig.horizontalWidth -
                          2 * r
                        }
                        a ${r} ${r} 0 0 1 ${r} -${r}
                        h ${innerWidth - r}
                        Z`;
            });
          })
          .end()
          .then(async () => {
            try {
              // Check if dragged task changed
              const currentTasks = subTasksByEmployee[d.employee_id];

              // Find dragged task in both arrays
              const draggedTaskNew = sortedBuilderTasks.find(
                (t) => t.subtask_id === d.subtask_id
              );
              const draggedTaskOld = currentTasks?.find(
                (t) => t.subtask_id === d.subtask_id
              );

              // Only compare fields that can change during drag/resize
              const draggedTaskChanged =
                draggedTaskNew?.start_date !== draggedTaskOld?.start_date ||
                draggedTaskNew?.subtask_width !==
                  draggedTaskOld?.subtask_width ||
                draggedTaskNew?.duration !== draggedTaskOld?.duration;

              // If dragged task didn't change, no need to check others or update anything
              if (!draggedTaskChanged) {
                previousTaskStateRef.current = null;
                return;
              }

              dispatch(updateOneBuilderChartData(sortedBuilderTasks));
              dispatch(
                updateTasksByOneBuilder(d.employee_id, sortedBuilderTasks)
              );
              dispatch(
                updateEmployeeSchedulingConflicts(d.employee_id, conflicts)
              );

              // Filter out unchanged tasks
              const tasksToUpdate = sortedBuilderTasks.filter((task) => {
                const originalTask = tasks.find(
                  (t) => t.subtask_id === task.subtask_id
                );
                if (!originalTask) {
                  return true; // Keep new tasks
                }

                // Only compare fields that can change during drag/resize
                return !isEqual(
                  omit(task, ["xPosition"]),
                  omit(originalTask, ["xPosition"])
                );
              });

              await updateSubtasksPositions(tasksToUpdate);
              if (
                tasksToUpdate[0].start_date < earliestStartDate ||
                tasksToUpdate[tasksToUpdate.length - 1].end_date >
                  latestStartDate
              ) {
                dispatch(fetchEarliestAndLatestDates(defaultEmployeeId));
              }
              previousTaskStateRef.current = null;
            } catch (error) {
              if (previousTaskStateRef.current) {
                dispatch(
                  updateOneBuilderChartData(previousTaskStateRef.current.tasks)
                );
                dispatch(
                  updateTasksByOneBuilder(
                    previousTaskStateRef.current.employee_id,
                    previousTaskStateRef.current.tasks
                  )
                );
              }
              onDatabaseError(error);
            }
          });
      });

    const timeOffGroup = taskGroupsSvg
      .append("g")
      .attr("class", "time-off-group");

    // Create a group for jobs
    const jobsGroup = taskGroupsSvg.append("g").attr("class", "jobs-group");

    timeOffGroup
      .selectAll(".time-off-line")
      .data(timeOffData)
      .enter()
      .append("line")
      .attr("class", "time-off-line")
      .attr("x1", (d) => d?.x + 3)
      .attr("y1", 0)
      .attr("x2", (d) => d?.x + 3)
      .attr("y2", chartHeight)
      .attr("stroke", (d) => d?.employee_color)
      .attr("stroke-width", 6)
      .attr("opacity", 0.6);

    // Bind data to job groups using localJobs
    const jobGroups = jobsGroup
      .selectAll(".job-group")
      .data(activeTasksData, (d) => d.subtask_id);

    // Enter new elements
    const enterGroups = jobGroups
      .enter()
      .append("g")
      .attr("class", (d) => `job-group task-group-${d.employee_id}`)
      .attr("transform", (d) => `translate(0, ${d.rowNumber * rowHeight})`)
      .attr("font-size", "12px");

    enterGroups.append("rect").attr("class", "job").attr("rx", 5).attr("ry", 5);

    // Update cursor style for both new and existing rectangles
    jobGroups
      .select("rect")
      .style("cursor", (d) =>
        cannotEdit || d.hard_start_date ? "not-allowed" : "ew-resize"
      );

    enterGroups
      .append("text")
      .attr("class", "bar-text")
      .attr("dy", ".35em")
      .style("pointer-events", "none");

    // Add hours calculation background (only visible during resize)
    enterGroups
      .append("rect")
      .attr("class", "hours-calculation-bg")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#000000")
      .attr("opacity", 0.7)
      .style("pointer-events", "none")
      .style("display", "none"); // Hidden by default

    // Add hours calculation text (only visible during resize)
    enterGroups
      .append("text")
      .attr("class", "hours-calculation-text")
      .attr("dy", ".35em")
      .attr("fill", "#ffffff")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("stroke", "#424242")
      .attr("stroke-width", "2px")
      .attr("paint-order", "stroke")
      .style("pointer-events", "none")
      .style("display", "none"); // Hidden by default

    // Add hard start date indicator
    enterGroups
      .append("path")
      .attr("class", "hard-start-indicator")
      .attr("d", (d) => {
        const x = d.xPosition + hardStartConfig.offset;
        const y = rowHeight * (d.yOffsetFactor || 0);
        const r = hardStartConfig.cornerRadius;
        const innerWidth =
          hardStartConfig.width - hardStartConfig.verticalWidth;

        return `M ${x} ${y}  
                h -${hardStartConfig.width}
                v ${rowHeight}
                h ${hardStartConfig.width}
                v -${hardStartConfig.horizontalWidth}
                h -${innerWidth - r}
                a ${r} ${r} 0 0 1 -${r} -${r}
                v -${rowHeight - 2 * hardStartConfig.horizontalWidth - 2 * r}
                a ${r} ${r} 0 0 1 ${r} -${r}
                h ${innerWidth - r}
                Z`;
      })
      .attr("fill", "black")
      .style("display", (d) => (d.hard_start_date ? "block" : "none"));

    // Add resize handle to each task group
    enterGroups
      .append("rect")
      .attr("class", "resize-handle")
      .attr("width", 16)
      .attr("height", (d) => rowHeight - 2 * barMargin)
      .attr(
        "y",
        (d) => barMargin + (rowHeight - 2 * barMargin) * (d.yOffsetFactor || 0)
      )
      .style("cursor", cannotEdit ? "not-allowed" : "col-resize")
      .style("fill", "transparent")
      .on("mousedown", function(event, d) {
        if (cannotEdit) return;
        showHoursCalculation(d3.select(this.parentNode), d, d.subtask_width);
      });

    // Update all elements (both new and existing)
    const allGroups = enterGroups.merge(jobGroups);

    allGroups.attr(
      "transform",
      (d) => `translate(0, ${d.rowNumber * rowHeight})`
    );

    allGroups
      .select(".hard-start-indicator")
      .attr("d", (d) => {
        const x = d.xPosition + hardStartConfig.offset;
        const y = rowHeight * (d.yOffsetFactor || 0);
        const r = hardStartConfig.cornerRadius;
        const innerWidth =
          hardStartConfig.width - hardStartConfig.verticalWidth;

        return `M ${x} ${y}  
                h -${hardStartConfig.width}
                v ${rowHeight}
                h ${hardStartConfig.width}
                v -${hardStartConfig.horizontalWidth}
                h -${innerWidth - r}
                a ${r} ${r} 0 0 1 -${r} -${r}
                v -${rowHeight - 2 * hardStartConfig.horizontalWidth - 2 * r}
                a ${r} ${r} 0 0 1 ${r} -${r}
                h ${innerWidth - r}
                Z`;
      })
      .style("display", (d) => (d.hard_start_date ? "block" : "none"));

    allGroups
      .select("rect.job")
      .attr("x", (d) => d.xPosition)
      .attr(
        "y",
        (d) => barMargin + (rowHeight - 2 * barMargin) * (d.yOffsetFactor || 0)
      )
      .attr("width", (d) => d.subtask_width)
      .attr("height", (d) => rowHeight - 2 * barMargin)
      .attr("fill", (d) => {
        const employee = employees.find(
          (emp) => emp.employee_id === d.employee_id
        );
        return employee?.employee_color || "#808080"; // Fallback to gray if no color found
      })
      .style("cursor", (d) =>
        cannotEdit || d.hard_start_date ? "not-allowed" : "ew-resize"
      );

    allGroups
      .select("text")
      .attr("x", (d) => d.xPosition + 5)
      .attr("y", rowHeight / 2)
      .text((d) => d.task_name) // Always show the text
      .attr("fill", "#ffffff")
      .attr("font-size", "12px")
      .attr("stroke", "#424242") // Add black stroke
      .attr("stroke-width", "2px") // Adjust thickness of the stroke
      .attr("paint-order", "stroke") // Makes stroke appear behind the fill
      .style("pointer-events", "none");

    // // Remove old elements
    jobGroups.exit().remove();

    // Apply drag behavior
    allGroups.select("rect").call(drag);
    // Event listeners
    allGroups
      .on("mouseover", function (event, d) {
        d3.select(this)
          .select(".bar-text")
          .text(`${d.task_name} - Est. ${d.est_duration} Hrs`);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).select(".bar-text").text(d.task_name);
      });

    // Update resize handle positions
    allGroups
      .select(".resize-handle")
      .attr("x", (d) => d.xPosition + d.subtask_width - 4)
      .style("cursor", cannotEdit ? "not-allowed" : "col-resize")
      .on("mousedown", function(event, d) {
        if (cannotEdit) return;
        showHoursCalculation(d3.select(this.parentNode), d, d.subtask_width);
      })
      .call(resize);

    setIsLoading(false);
  }, [
    employees,
    dayWidth,
    rowHeight,
    chartStartDate,
    workdayHours,
    holidayMap,
    timeOffByBuilder,
    chartRef,
    activeTasksData,
    setIsLoading,
    barMargin,
    handleAutoScroll,
    subTasksByEmployee,
    canEditSchedule,
    selectedEmployeeIds,
    dateFilter,
  ]);

  // Move unassigned tasks to start at today
  // useEffect(() => {
  //   if (
  //     hasRunEffect.current ||
  //     employeesLoading ||
  //     taskDataLoading ||
  //     holidaysLoading ||
  //     !employees?.length ||
  //     !subTasksByEmployee ||
  //     !Object.keys(subTasksByEmployee).length ||
  //     !holidays
  //   ) {
  //     return;
  //   }

  //   const firstEmployeeId = employees[0].employee_id;
  //   const employeeTasks = [...subTasksByEmployee[firstEmployeeId]];

  //   if (!employeeTasks?.length) {
  //     hasRunEffect.current = true;
  //     return;
  //   }

  //   const today = normalizeDate(new Date());
  //   const firstTask = employeeTasks[0];

  //   if (firstTask.start_date.localeCompare(today) < 0) {
  //     employeeTasks[0] = {
  //       ...employeeTasks[0],
  //       start_date: getNextWorkday(
  //         today,
  //         holidayChecker,
  //         holidays,
  //         firstEmployeeId
  //       ),
  //     };
  //     // Adjust tasks for the first employee
  //     const adjustedTasks = sortAndAdjustDates(
  //       employeeTasks,
  //       workdayHours,
  //       holidayChecker,
  //       holidays,
  //       firstEmployeeId,
  //       null,
  //       {},
  //       dayWidth,
  //       chartStartDate,
  //       true
  //     );

  //     // Update the database and redux store
  //     updateSubtasksPositions(adjustedTasks)
  //       .then(() => {
  //         dispatch(updateTasksByOneBuilder(firstEmployeeId, adjustedTasks));
  //         hasRunEffect.current = true;
  //       })
  //       .catch((error) => {
  //         console.error("Error updating tasks:", error);
  //         if (onDatabaseError) {
  //           onDatabaseError(error);
  //         }
  //         hasRunEffect.current = true;
  //       });
  //   } else {
  //     hasRunEffect.current = true;
  //   }
  // }, [
  //   employees,
  //   subTasksByEmployee,
  //   holidays,
  //   employeesLoading,
  //   taskDataLoading,
  //   holidaysLoading,
  //   workdayHours,
  //   holidayChecker,
  //   dayWidth,
  //   chartStartDate,
  //   dispatch,
  //   onDatabaseError,
  // ]);

  useEffect(() => {
    scrollToMonday(new Date());
  }, []);

  return (
    <svg
      style={{
        width: numDays * dayWidth,
        height: chartHeight,
      }}
      className="task-groups-svg absolute top-0 left-0"
      ref={taskGroupsRef}
    />
  );
};

TaskGroups.propTypes = {
  chartRef: PropTypes.object,
  barMargin: PropTypes.number,
  chartHeight: PropTypes.number,
  numDays: PropTypes.number,
  handleAutoScroll: PropTypes.func,
  dayWidth: PropTypes.number,
  rowHeight: PropTypes.number,
  chartStartDate: PropTypes.string,
  workdayHours: PropTypes.number,
  setIsLoading: PropTypes.func,
  scrollToMonday: PropTypes.func,
  setEstimatedCompletionDate: PropTypes.func,
  earliestStartDate: PropTypes.string,
  latestStartDate: PropTypes.string,
  selectedEmployeeIds: PropTypes.array,
  dateFilter: PropTypes.object,
};

export default TaskGroups;
