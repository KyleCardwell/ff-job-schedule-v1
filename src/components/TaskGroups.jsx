import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  differenceInDays,
} from "date-fns";
import { normalizeDate } from "../utils/dateUtils";
import { useDispatch, useSelector } from "react-redux";
import * as d3 from "d3";
import {
  calculateAdjustedWidth,
  calculateXPosition,
  getNextWorkday,
  sortAndAdjustDates,
  totalJobHours,
} from "../utils/helpers";
import { updateOneBuilderChartData } from "../redux/actions/chartData";
import { updateTasksByOneBuilder } from "../redux/actions/taskData";
import { isEqual, omit } from "lodash";
import { updateSubtasksPositions } from "../redux/actions/projects";

const TaskGroups = ({
  chartRef,
  barMargin,
  chartHeight,
  numDays,
  handleAutoScroll,
  dayWidth,
  rowHeight,
  chartStartDate,
  holidayChecker,
  workdayHours,
  setIsLoading,
  scrollToMonday,
  onDatabaseError,
  setEstimatedCompletionDate,
}) => {
  const dispatch = useDispatch();

  const employees = useSelector((state) => state.builders.employees);
  const holidays = useSelector((state) => state.holidays);
  const { tasks } = useSelector((state) => state.taskData);
  const { subTasksByEmployee } = useSelector(
    (state) => state.taskData,
    isEqual
  );

  const taskGroupsRef = useRef(null);
  const previousTaskStateRef = useRef(null);
  const hasRunEffect = useRef(false);
  const totalDurationRef = useRef(0);

  // Get loading states from Redux
  const { loading: employeesLoading } = useSelector((state) => state.builders);
  const { loading: taskDataLoading } = useSelector((state) => state.taskData);
  const { loading: holidaysLoading } = useSelector((state) => state.holidays);

  const activeTasksData = useMemo(() => {
    const currentDate = normalizeDate(new Date());
    const defaultEmployeeId = employees[0]?.employee_id;

    // Reset the total duration at the start of each calculation
    totalDurationRef.current = 0;

    // Map tasks and accumulate duration
    const mappedTasks = tasks
      .filter((task) => task.task_active !== false)
      .map((task, index) => {
        // Update totalDuration if task is relevant
        if (task.end_date >= currentDate && task.start_date <= currentDate) {
          const remainingDays = differenceInDays(
            new Date(task.end_date),
            new Date(currentDate)
          );
          const remainingHours = remainingDays * workdayHours;
          totalDurationRef.current += remainingHours;
        } else if (
          task.employee_id === defaultEmployeeId ||
          task.start_date >= currentDate
        ) {
          totalDurationRef.current += task.duration || 0;
        }

        return {
          ...task,
          rowNumber: index,
          xPosition: calculateXPosition(
            normalizeDate(task.start_date),
            normalizeDate(chartStartDate),
            dayWidth
          ),
        };
      });

    return mappedTasks;
  }, [
    tasks,
    subTasksByEmployee,
    chartStartDate,
    dayWidth,
    workdayHours,
    holidays,
    holidayChecker,
    employees,
    setEstimatedCompletionDate,
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

    const currentDate = normalizeDate(new Date());
    const estimatedTotalDays =
      totalJobHours(
        currentDate,
        totalDurationRef.current,
        workdayHours,
        holidayChecker,
        holidays,
        0,
        {}
      ) / workdayHours;

    const estimCompletionDate = addDays(
      parseISO(currentDate),
      estimatedTotalDays / Math.max(1, employees.length - 1)
    );

    setEstimatedCompletionDate(normalizeDate(estimCompletionDate));
  }, [
    tasks,
    employees,
    workdayHours,
    holidayChecker,
    holidays,
    subTasksByEmployee,
    totalDurationRef.current,
    setEstimatedCompletionDate,
  ]);

  useEffect(() => {
    if (
      !chartRef.current ||
      !taskGroupsRef.current ||
      !activeTasksData ||
      activeTasksData.length === 0 ||
      !Array.isArray(employees) ||
      employees.length === 0
    ) {
      return;
    }

    const taskGroupsSvg = d3.select(taskGroupsRef.current);

    // Clear existing content
    taskGroupsSvg.selectAll("*").remove();
    // Define drag behavior
    const drag = d3
      .drag()
      .on("start", function (event, d) {
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
        const dx = event.x - d.dragStartEventX;
        const newX = parseFloat(d.dragStartX) + dx;
        d3.select(this).attr("x", newX);
        d3.select(this.parentNode)
          .select(".bar-text")
          .attr("x", newX + 5);
        handleAutoScroll(event);
      })
      .on("end", function (event, d) {
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
          holidayChecker,
          holidays,
          d.employee_id,
          timeOffByBuilder
        );

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
        const sortedBuilderTasks = sortAndAdjustDates(
          updatedBuilderTasks,
          workdayHours,
          holidayChecker,
          holidays,
          d.subtask_id,
          newStartDate,
          timeOffByBuilder,
          dayWidth,
          chartStartDate
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
          })
          .end()
          .then(async () => {
            try {
              dispatch(updateOneBuilderChartData(sortedBuilderTasks));
              dispatch(
                updateTasksByOneBuilder(d.employee_id, sortedBuilderTasks)
              );

              // Filter out unchanged tasks
              const tasksToUpdate = sortedBuilderTasks.filter((task) => {
                const originalTask = tasks.find(
                  (t) => t.subtask_id === task.subtask_id
                );
                if (!originalTask) {
                  return true; // Keep new tasks
                }

                // Debug the comparison
                const cleanTask = omit(task, ["xPosition"]);
                const cleanOriginal = omit(originalTask, ["xPosition"]);

                const isTaskEqual = isEqual(cleanTask, cleanOriginal);

                if (!isTaskEqual) {
                  return true;
                }
                return false;
              });

              await updateSubtasksPositions(tasksToUpdate);

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
      })
      .on("drag", function (event, d) {
        const rect = d3.select(this.parentNode).select("rect");
        const dx = event.x - d.resizeStartX;
        const newWidth = Math.max(
          dayWidth,
          parseFloat(d.resizeStartWidth) + dx
        );
        rect.attr("width", newWidth);
        handleAutoScroll(event);
      })
      .on("end", function (event, d) {
        const rect = d3.select(this.parentNode).select("rect");
        const newWidth = parseFloat(rect.attr("width"));

        // Calculate adjusted width and duration
        const newDuration = calculateAdjustedWidth(
          d.start_date,
          newWidth,
          dayWidth,
          holidayChecker,
          holidays,
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
        const sortedBuilderTasks = sortAndAdjustDates(
          updatedBuilderTasks,
          workdayHours,
          holidayChecker,
          holidays,
          d.subtask_id,
          d.start_date,
          timeOffByBuilder,
          dayWidth,
          chartStartDate
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
          })
          .end()
          .then(async () => {
            try {
              dispatch(updateOneBuilderChartData(sortedBuilderTasks));
              dispatch(
                updateTasksByOneBuilder(d.employee_id, sortedBuilderTasks)
              );

              // Filter out unchanged tasks
              const tasksToUpdate = sortedBuilderTasks.filter((task) => {
                const originalTask = tasks.find(
                  (t) => t.subtask_id === task.subtask_id
                );
                if (!originalTask) {
                  return true;
                }
                const cleanTask = omit(task, ["xPosition"]);
                const cleanOriginal = omit(originalTask, ["xPosition"]);
                return !isEqual(cleanTask, cleanOriginal);
              });

              await updateSubtasksPositions(tasksToUpdate);
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
    const jobsGroup = taskGroupsSvg
      .append("g")
      .attr("class", "jobs-group")
      .style("cursor", "ew-resize");

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
    enterGroups
      .append("text")
      .attr("class", "bar-text")
      .attr("dy", ".35em")
      .style("pointer-events", "none");

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
      .style("cursor", "col-resize")
      .style("fill", "transparent");

    // Update all elements (both new and existing)
    const allGroups = enterGroups.merge(jobGroups);

    allGroups.attr(
      "transform",
      (d) => `translate(0, ${d.rowNumber * rowHeight})`
    );

    allGroups
      .select("rect")
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
      });

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
      .call(resize);

    setIsLoading(false);
  }, [
    employees,
    dayWidth,
    rowHeight,
    chartStartDate,
    holidayChecker,
    workdayHours,
    holidays,
    timeOffByBuilder,
    chartRef,
    activeTasksData,
    setIsLoading,
    barMargin,
    handleAutoScroll,
    subTasksByEmployee,
  ]);

  // Move unassigne tasks to start at today
  useEffect(() => {
    if (
      hasRunEffect.current ||
      employeesLoading ||
      taskDataLoading ||
      holidaysLoading ||
      !employees?.length ||
      !subTasksByEmployee ||
      !Object.keys(subTasksByEmployee).length ||
      !holidays
    ) {
      return;
    }

    const firstEmployeeId = employees[0].employee_id;
    const employeeTasks = [...subTasksByEmployee[firstEmployeeId]];

    if (!employeeTasks?.length) {
      hasRunEffect.current = true;
      return;
    }

    const today = normalizeDate(new Date());
    const firstTask = employeeTasks[0];

    if (firstTask.start_date.localeCompare(today) < 0) {
      employeeTasks[0] = {
        ...employeeTasks[0],
        start_date: getNextWorkday(
          today,
          holidayChecker,
          holidays,
          firstEmployeeId
        ),
      };
      // Adjust tasks for the first employee
      const adjustedTasks = sortAndAdjustDates(
        employeeTasks,
        workdayHours,
        holidayChecker,
        holidays,
        firstEmployeeId,
        null,
        {},
        dayWidth,
        chartStartDate,
        true
      );

      // Update the database and redux store
      updateSubtasksPositions(adjustedTasks)
        .then(() => {
          dispatch(updateTasksByOneBuilder(firstEmployeeId, adjustedTasks));
          hasRunEffect.current = true;
        })
        .catch((error) => {
          console.error("Error updating tasks:", error);
          if (onDatabaseError) {
            onDatabaseError(error);
          }
          hasRunEffect.current = true;
        });
    } else {
      hasRunEffect.current = true;
    }
  }, [
    employees,
    subTasksByEmployee,
    holidays,
    employeesLoading,
    taskDataLoading,
    holidaysLoading,
    workdayHours,
    holidayChecker,
    dayWidth,
    chartStartDate,
    dispatch,
    onDatabaseError,
  ]);

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

export default TaskGroups;
