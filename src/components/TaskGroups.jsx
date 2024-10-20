import { useEffect, useMemo, useRef, useState } from "react";
import {
	addDays,
	differenceInCalendarDays,
	eachDayOfInterval,
	isWithinInterval,
} from "date-fns";
import { normalizeDate } from "../utils/dateUtils";
import { useDispatch, useSelector } from "react-redux";
import * as d3 from "d3";
import { getNextWorkday, sortAndAdjustDates } from "../utils/helpers";
import {
	updateEarliestStartDate,
	updateLatestStartDate,
	updateOneBuilderChartData,
} from "../redux/actions/chartData";
import { updateTasksByOneBuilder } from "../redux/actions/taskData";

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
}) => {
	const dispatch = useDispatch();

	const builders = useSelector((state) => state.builders.builders);
	const holidays = useSelector((state) => state.holidays.holidays);
	const { tasks, tasksByBuilder } = useSelector(
		(state) => state.taskData
	);
	const { earliestStartDate, latestStartDate } = useSelector(
		(state) => state.chartData
	);
	const taskGroupsRef = useRef(null);

	const activeTasksData = useMemo(() => {
		return tasks
			.filter((task) => task.active !== false)
			.map((task, index) => ({
				...task,
				rowNumber: index,
			}));
	}, [tasks]);

	// Calculate timeOffByBuilder independently
	const timeOffByBuilder = useMemo(() => {
		return builders.reduce((acc, builder) => {
			acc[builder.id] = builder.timeOff.flatMap((period) =>
				eachDayOfInterval({
					start: normalizeDate(new Date(period.start)),
					end: normalizeDate(new Date(period.end)),
				}).map((day) => normalizeDate(day).toISOString())
			);
			return acc;
		}, {});
	}, [builders]);

	// Calculate timeOffData
	const timeOffData = useMemo(() => {
		const xPositions = new Map();
		return builders.flatMap((builder) =>
			builder.timeOff.flatMap((period) => {
				const periodStart = normalizeDate(new Date(period.start));
				const periodEnd = normalizeDate(new Date(period.end));
				const chartEndDate = addDays(
					normalizeDate(chartStartDate),
					numDays - 1
				);

				return eachDayOfInterval({ start: periodStart, end: periodEnd })
					.filter((day) =>
						isWithinInterval(normalizeDate(day), {
							start: normalizeDate(chartStartDate),
							end: chartEndDate,
						})
					)
					.map((day) => {
						let x =
							differenceInCalendarDays(
								normalizeDate(day),
								normalizeDate(chartStartDate)
							) * dayWidth;
						while (xPositions.has(x)) {
							x += 6; //Width of the time off bar
						}
						xPositions.set(x, true);
						return {
							x,
							color: builder.color,
							builderId: builder.id,
							date: normalizeDate(day),
						};
					});
			})
		);
	}, [builders, chartStartDate, numDays, dayWidth]);

	useEffect(() => {
		if (
			!chartRef.current ||
			!taskGroupsRef.current ||
			!activeTasksData ||
			activeTasksData.length === 0 ||
			!Array.isArray(builders) ||
			builders.length === 0
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
				let newStartDate = new Date(d.startDate);
				newStartDate.setDate(newStartDate.getDate() + daysMoved);
				// Snap to next workday if it's a weekend or holiday or if the builder has time off on that day
				newStartDate = getNextWorkday(
					newStartDate,
					holidayChecker,
					holidays,
					d.id,
					timeOffByBuilder
				);

				// update earliest and latest start date
				if (!earliestStartDate || newStartDate < earliestStartDate) {
					dispatch(updateEarliestStartDate(newStartDate));
				}
				if (!latestStartDate || newStartDate > latestStartDate) {
					dispatch(updateLatestStartDate(newStartDate));
				}

				// Update the dragged job
				const updatedDraggedJob = {
					...d,
					startDate: newStartDate,
				};

				// Get the current builder's jobs and update the dragged job
				const builderTasks = tasksByBuilder[d.builderId];
				const updatedBuilderTasks = builderTasks.map((job) =>
					job.id === d.id
						? {
								...updatedDraggedJob,
								dragStartX: undefined,
								dragStartEventX: undefined,
						  }
						: job
				);
				// Sort and adjust dates for the builder's jobs
				const sortedBuilderTasks = sortAndAdjustDates(
					updatedBuilderTasks,
					workdayHours,
					holidayChecker,
					holidays,
					d.id,
					newStartDate,
					timeOffByBuilder,
					dayWidth,
					chartStartDate
				);
				// Transition all jobs in the builder group
				const jobGroups = taskGroupsSvg
					.selectAll(`.task-group-${d.builderId}`)
					.data(sortedBuilderTasks, (job) => job.id);

				jobGroups
					.transition()
					.duration(300)
					.call((transition) => {
						transition
							.select("rect")
							.attr(
								"x",
								(job) =>
									// calculateXPosition(job.startDate, chartStartDate, dayWidth)
									job.xPosition
							)
							.attr("width", (job) => job.workPeriodDuration);
						transition.select(".bar-text").attr(
							"x",
							(job) =>
								// calculateXPosition(job.startDate, chartStartDate, dayWidth)
								job.xPosition + 5
						);
					})
					.end()
					.then(() => {
						dispatch(updateOneBuilderChartData(sortedBuilderTasks));
						dispatch(updateTasksByOneBuilder(d.builderId, sortedBuilderTasks));
					});
				d3.select(this).classed("dragging", false);
				delete d.dragStartX;
				delete d.dragStartEventX;
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
			.attr("x1", (d) => d.x + 3)
			.attr("y1", 0)
			.attr("x2", (d) => d.x + 3)
			.attr("y2", chartHeight)
			.attr("stroke", (d) => d.color)
			.attr("stroke-width", 6)
			.attr("opacity", 0.6);

		// const adjustTaskHeights = (tasks) => {
		// 	return tasks.map((task, index) => {
		// 		let heightFactor = 1;
		// 		let yOffsetFactor = 0;

		// 		// Check all other tasks for overlaps
		// 		tasks.forEach((otherTask, otherIndex) => {
		// 			if (otherIndex !== index && otherTask.roomId === task.roomId) {
		// 				const taskStart = task.xPosition;
		// 				const taskEnd = task.xPosition + task.workPeriodDuration;
		// 				const otherTaskStart = otherTask.xPosition;
		// 				const otherTaskEnd =
		// 					otherTask.xPosition + otherTask.workPeriodDuration;

		// 				// Check for any overlap
		// 				if (
		// 					(taskStart < otherTaskEnd && taskStart >= otherTaskStart) ||
		// 					(otherTaskStart < taskEnd && otherTaskStart >= taskStart)
		// 				) {
		// 					heightFactor = 0.5;
		// 					// Only adjust yOffsetFactor if this task comes later in the array
		// 					if (index > otherIndex) {
		// 						yOffsetFactor = 0.5;
		// 					}
		// 				}
		// 			}
		// 		});

		// 		return {
		// 			...task,
		// 			heightFactor,
		// 			yOffsetFactor,
		// 		};
		// 	});
		// };

		// Bind data to job groups using localJobs
		const jobGroups = jobsGroup
			.selectAll(".job-group")
			.data(activeTasksData, (d) => d.id);

		// Enter new elements
		const enterGroups = jobGroups
			.enter()
			.append("g")
			.attr("class", (d) => `job-group task-group-${d.builderId}`)
			.attr("transform", (d) => `translate(0, ${d.rowNumber * rowHeight})`)
			.attr("font-size", "12px");

		enterGroups.append("rect").attr("class", "job").attr("rx", 5).attr("ry", 5);
		enterGroups
			.append("text")
			.attr("class", "bar-text")
			.attr("dy", ".35em")
			.style("pointer-events", "none");

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
			.attr("width", (d) => d.workPeriodDuration)
			.attr(
				"height",
				(d) => (rowHeight - 2 * barMargin) * (d.heightFactor || 1)
			)
			.attr(
				"fill",
				(d) => builders.find((builder) => builder.id === d.builderId).color
			);

		allGroups
			.select("text")
			.attr("x", (d) => d.xPosition + 5)
			.attr("y", rowHeight / 2)
			.text((d) => d.roomName) // Always show the text
			.attr("fill", "#ffffff")
			.attr("font-size", "12px")
			// .attr("font-weight", "bold")
			.style("text-shadow", "1px 1px 2px rgba(0, 0, 0, 0.5)")
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
					.text(`${d.roomName} - ${d.duration} hours`);
			})
			.on("mouseout", function (event, d) {
				d3.select(this).select(".bar-text").text(d.roomName);
			});
	}, [
		builders,
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
		tasksByBuilder,
	]);

	return (
		<svg
			style={{
				width: numDays * dayWidth,
				height: chartHeight,
			}}
			className="inner-chart task-groups-svg"
			ref={taskGroupsRef}
		/>
	);
};

export default TaskGroups;
