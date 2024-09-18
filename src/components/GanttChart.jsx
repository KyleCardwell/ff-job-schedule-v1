import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSelector, useDispatch } from "react-redux";
import "./GanttChart.css";
import { updateJobStartDate } from "../redux/actions/ganttActions";
import {
	addDays,
	differenceInCalendarDays,
	isSaturday,
	isSunday,
} from "date-fns";

const GanttChart = () => {
	const jobs = useSelector((state) => state.gantt.jobs);
	const builders = useSelector((state) => state.builders.builders);
	const dispatch = useDispatch();
	const chartRef = useRef(null);
	const headerRef = useRef(null); // For the fixed header
	const leftColumnRef = useRef(null); // For the fixed left column
	const leftColumnHeaderRef = useRef(null); // For the fixed left column
	const scrollableRef = useRef(null);
	const leftScrollableRef = useRef(null);

	const countAllRooms = (jobs) => {
		return jobs.reduce((count, job) => count + job.rooms.length, 0);
	};

	const totalRooms = countAllRooms(jobs);

	const normalizeDate = (date) => {
		const normalized = new Date(date);
		normalized.setHours(0, 0, 0, 0); // Set time to 00:00:00
		return normalized;
	};

	const startDate = normalizeDate("2024-08-01"); // Initialize start date for the Gantt chart
	const dayWidth = 40;
	const workdayHours = 8;

	// Function to handle auto-scrolling when dragging near edges
	const handleAutoScroll = (event) => {
		const container = scrollableRef.current;
		const scrollSpeed = 20; // Speed of the auto-scroll
		const buffer = 50; // Distance from edge to trigger scroll

		const { left, right, top, bottom } = container.getBoundingClientRect();
		const { clientX, clientY } = event.sourceEvent;

		// Horizontal auto-scroll
		if (clientX < left + buffer) {
			container.scrollLeft -= scrollSpeed; // Scroll left
		} else if (clientX > right - buffer) {
			container.scrollLeft += scrollSpeed; // Scroll right
		}

		// Vertical auto-scroll
		if (clientY < top + buffer) {
			container.scrollTop -= scrollSpeed; // Scroll up
		} else if (clientY > bottom - buffer) {
			container.scrollTop += scrollSpeed; // Scroll down
		}
	};

	const totalJobHours = (startDate, jobHours) => {
		let currentDate = normalizeDate(startDate);

		// Calculate total days based on jobHours (e.g., 16 hours = 2 days)
		let totalDays = Math.ceil(jobHours / workdayHours);

		// Loop through each day in the range based on totalDays
		for (let i = 0; i < totalDays; i++) {
			// Check if the current day is a weekend
			if (isSaturday(currentDate) || isSunday(currentDate)) {
				jobHours += 8;
				totalDays += 1;
			}
			// Move to the next day
			currentDate = addDays(currentDate, 1);
		}

		return jobHours; // Total job hours
	};

	const calculateJobWidth = (jobStartDate, jobDuration, dayWidth) => {
		// Calculate the number of days (each workday is 8 hours)
		const totalDays = totalJobHours(jobStartDate, jobDuration) / workdayHours;

		// Return the width based on the total number of days
		return totalDays * dayWidth;
	};

	const calculateXPosition = (jobStartDate, startDate, dayWidth) => {
		// Calculate the difference in days between jobStartDate and startDate
		const diffInDays = differenceInCalendarDays(
			normalizeDate(jobStartDate),
			normalizeDate(startDate)
		);

		// Multiply the difference in days by dayWidth to get the x position
		return diffInDays * dayWidth;
	};

	useEffect(() => {
		const chartSvg = d3.select(chartRef.current);
		chartSvg.selectAll("*").remove(); // Clear previous SVG content

		const numDays = 180;
		// const numDays = (visibleRange.end - visibleRange.start) / (1000 * 3600 * 24);
		const barMargin = 3;
		const weekendColor = "#c1c1c1"; // Darker color for weekends
		const alternateRowColors = ["#f9f9f9", "#e0e0e0"]; // Alternating colors for rows
		const strokeColor = "#bebebe"; // stroke color

		const width = numDays * dayWidth;
		const rowHeight = 30;
		const height = totalRooms * rowHeight;

		// Create an array of dates for the column headers
		const dates = Array.from({ length: numDays }, (_, i) => {
			return addDays(startDate, i);
		});

		chartSvg
			.attr("width", width)
			.attr("height", height)
			.style("margin", "0")
			.style("padding", "0");

		const leftHeaderSvg = d3.select(leftColumnHeaderRef.current);
		leftHeaderSvg.selectAll("*").remove();
		leftHeaderSvg.attr("width", 300).attr("height", 40).style("margin", "0");

		// Add the left column header with titles
		leftHeaderSvg.append("g").each(function () {
			const leftHeaderGroup = d3.select(this);

			// Job Number header
			leftHeaderGroup
				.append("text")
				.attr("x", 10) // Adjust x for alignment
				.attr("y", rowHeight / 2)
				.text("Job #")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");

			// Job Name header
			leftHeaderGroup
				.append("text")
				.attr("x", 80) // Adjust x for alignment
				.attr("y", rowHeight / 2)
				.text("Job Name")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");

			// Room Name header
			leftHeaderGroup
				.append("text")
				.attr("x", 200) // Adjust x for alignment
				.attr("y", rowHeight / 2)
				.text("Room Name")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");
		});

		const headerSvg = d3.select(headerRef.current);
		headerSvg.selectAll("*").remove();
		headerSvg
			.attr("width", numDays * dayWidth)
			.attr("height", 40)
			.style("margin", "0");

		// Add column headers with both date and day of the week
		headerSvg
			.selectAll(".header")
			.data(dates)
			.enter()
			.append("g")
			.attr("class", "header")
			.each(function (d, i) {
				// Group for each header
				const group = d3.select(this);

				const isWeekend = d.getDay() === 0 || d.getDay() === 6;

				// Append a rectangle for weekends
				if (isWeekend) {
					group
						.append("rect")
						.attr("x", i * dayWidth)
						.attr("y", 0)
						.attr("width", dayWidth)
						.attr("height", 50) // Adjust to cover the header
						.attr("fill", "#e0e0e0"); // A slightly darker background for weekends
				}
				group
					.append("text")
					.attr("x", i * dayWidth + 10)
					.attr("y", 10)
					.text(d3.timeFormat("%b")(d))
					.attr("fill", "#000")
					.attr("font-size", "12px")
					.attr("text-anchor", "left");
				group
					.append("text")
					.attr("x", i * dayWidth + 10)
					.attr("y", 25)
					.text(d3.timeFormat("%d")(d))
					.attr("fill", "#000")
					.attr("font-size", "12px")
					.attr("text-anchor", "left");

				group
					.append("text")
					.attr("x", i * dayWidth + 10)
					.attr("y", 38) // Adjust vertical position for day of the week
					.text(d3.timeFormat("%a")(d))
					.attr("fill", "#000")
					.attr("font-size", "10px")
					.attr("text-anchor", "left");
			});

		headerSvg
			.selectAll(".vertical-line")
			.data(dates)
			.enter()
			.append("line")
			.attr("x1", (d, i) => i * dayWidth)
			.attr("x2", (d, i) => i * dayWidth)
			.attr("y1", 0)
			.attr("y2", height)
			.attr("stroke", strokeColor)
			.attr("stroke-width", 1);

		const leftColumnSvg = d3.select(leftColumnRef.current);
		leftColumnSvg.selectAll("*").remove();
		leftColumnSvg
			.attr("width", 300)
			.attr(
				"height",
				jobs.reduce((acc, job) => acc + job.rooms.length * rowHeight, 0)
			)
			.style("margin", "0");

		const roomsData = jobs.flatMap((job, i) =>
			job.rooms.map((room) => ({
				...room,
				jobsIndex: i,
				jobId: job.id,
				jobName: job.name,
				jobNumber: room.jobNumber,
				startDate: room.startDate,
				duration: room.duration,
				builderId: room.builderId,
			}))
		);

		console.log(roomsData);
		// Create row backgrounds for each room
		leftColumnSvg
			.selectAll(".row-background")
			.data(roomsData)
			.enter()
			.append("rect")
			.attr("x", 0)
			.attr("y", (d, i) => i * rowHeight) // Each room gets its own row
			.attr("width", 300)
			.attr("height", rowHeight)
			.attr("fill", (d) =>
				d.jobsIndex % 2 === 0 ? alternateRowColors[0] : alternateRowColors[1]
			); // Alternate colors

		// Create text elements for job number, job name, and room name
		leftColumnSvg
			.selectAll("text")
			.data(roomsData)
			.enter()
			.each(function (d, i) {
				// Append job number
				d3.select(this)
					.append("text")
					.attr("x", 10) // Adjust position for job number
					.attr("y", i * rowHeight + rowHeight / 2)
					.text(d.jobNumber) // Job number
					.attr("fill", "#000")
					.attr("dominant-baseline", "middle");

				// Append job name
				d3.select(this)
					.append("text")
					.attr("x", 80) // Adjust position for job name
					.attr("y", i * rowHeight + rowHeight / 2)
					.text(d.jobName) // Job name
					.attr("fill", "#000")
					.attr("dominant-baseline", "middle");

				// Append room name
				d3.select(this)
					.append("text")
					.attr("x", 200) // Adjust position for room name
					.attr("y", i * rowHeight + rowHeight / 2)
					.text(d.name) // Room name
					.attr("fill", "#000")
					.attr("dominant-baseline", "middle");
			});

		const drag = d3
			.drag()
			.on("drag", function (event, d) {
				const xPos = event.x;
				const newStartDate = normalizeDate(startDate);
				newStartDate.setDate(startDate.getDate() + Math.round(xPos / dayWidth));

				// Update the position of the dragged job
				d3.select(this).attr("x", Math.round(xPos / dayWidth) * dayWidth);

				// Update the job's start date in the local variable
				d.startDate = newStartDate;

				// Trigger scrolling when dragging near the edges
				handleAutoScroll(event);
			})
			.on("end", function (event, d) {
				// Update Redux store with the new job start date
				dispatch(updateJobStartDate(d.jobId, d.id, d.startDate));
			});

		// Remove previous SVG elements
		chartSvg.selectAll("*").remove();

		// Set SVG dimensions based on room count
		chartSvg.attr("width", width).attr("height", roomsData.length * rowHeight);

		// Create row backgrounds for each room
		chartSvg
			.selectAll(".row-background")
			.data(roomsData)
			.enter()
			.append("rect")
			.attr("x", 0)
			.attr("y", (d, i) => i * rowHeight)
			.attr("width", width)
			.attr("height", rowHeight)
			.attr("fill", (d) =>
				d.jobsIndex % 2 === 0 ? alternateRowColors[0] : alternateRowColors[1]
			) // Alternate colors
			.attr("stroke", strokeColor) // Set stroke color for bottom border
			.attr("stroke-width", 1) // Set stroke width
			.attr("stroke-dasharray", `0,${rowHeight},${width},0`); // Apply stroke only to the bottom

		// Draw weekend backgrounds
		chartSvg
			.selectAll(".weekend-background")
			.data(dates)
			.enter()
			.append("rect")
			.attr("class", "weekend-background")
			.attr("x", (d, i) => i * dayWidth)
			.attr("y", 0)
			.attr("width", dayWidth)
			.attr("height", roomsData.length * rowHeight) // Adjust height based on room count
			.attr("fill", (d) => {
				const dayOfWeek = d3.timeFormat("%a")(d);
				return dayOfWeek === "Sat" || dayOfWeek === "Sun"
					? weekendColor
					: "none"; // Darker color for weekends
			})
			.attr("opacity", 0.5);

		// Draw vertical grid lines for each day
		chartSvg
			.selectAll(".vertical-line")
			.data(dates)
			.enter()
			.append("line")
			.attr("x1", (d, i) => i * dayWidth)
			.attr("x2", (d, i) => i * dayWidth)
			.attr("y1", 0)
			.attr("y2", roomsData.length * rowHeight) // Adjust based on room count
			.attr("stroke", strokeColor)
			.attr("stroke-width", 1);

		// Create a group for jobs
		const jobsGroup = chartSvg
			.append("g")
			.attr("class", "jobs-group")
			.style("cursor", "ew-resize");

		// Append rectangles to the jobs group (for each room)
		jobsGroup
			.selectAll("rect.job")
			.data(roomsData)
			.enter()
			.append("rect")
			.attr("x", (d) => calculateXPosition(d.startDate, startDate, dayWidth))
			.attr("y", (d, i) => i * rowHeight + barMargin)
			.attr("width", (d) =>
				calculateJobWidth(d.startDate, d.duration, dayWidth)
			)
			.attr("height", rowHeight - 2 * barMargin)
			.attr(
				"fill",
				(d) => builders.find((builder) => builder.id === d.builderId).color
			)
			.attr("class", "job") // Add a class for job rectangles
			.attr("rx", 5) // Set the x-axis corner radius
			.attr("ry", 5) // Set the y-axis corner radius
			.call(drag); // Apply drag behavior to rectangles

		// Append text elements to the jobs group (for each room)
		jobsGroup
			.selectAll(".bar-text")
			.data(roomsData)
			.enter()
			.append("text")
			.attr(
				"x",
				(d) => calculateXPosition(d.startDate, startDate, dayWidth) + 5
			)
			.attr("y", (d, i) => i * rowHeight + rowHeight - 15 + 5)
			.text((d) => d.name) // Room name
			.attr("fill", "#fff")
			.style("pointer-events", "none"); // Disable pointer events on text to avoid interfering with dragging

		// Add scrolling behavior for the chart
		const scrollableDiv = d3.select(scrollableRef.current);
		scrollableDiv.on("scroll", () => {
			const scrollLeft = scrollableDiv.node().scrollLeft;
			const scrollTop = scrollableDiv.node().scrollTop;

			headerSvg.attr("transform", `translate(${-scrollLeft}, 0)`);
			leftColumnSvg.attr("transform", `translate(0, ${-scrollTop})`);
		});

		const leftScrollableDiv = d3.select(leftScrollableRef.current);
		leftScrollableDiv.on("scroll", () => {
			const scrollTop = leftScrollableDiv.node().scrollTop;

			chartSvg.attr("transform", `translate(0, ${-scrollTop})`);
		});
	}, [jobs, dispatch, builders, totalRooms, startDate]);

	useEffect(() => {
		const today = normalizeDate(new Date());
		const todayXPosition = calculateXPosition(today, startDate, dayWidth);

		// scroll to today's date
		if (scrollableRef.current) {
			scrollableRef.current.scrollLeft = todayXPosition;
		}
	}, []);

	return (
		<div className="gantt-container">
			<div className="gantt-left">
				<svg ref={leftColumnHeaderRef} className="gantt-left-header" />
				<div className="gantt-scrollable" ref={leftScrollableRef}>
					<svg ref={leftColumnRef} />
				</div>
			</div>
			<div className="gantt-main">
				<svg ref={headerRef} className="gantt-header" />
				<div className="gantt-scrollable" ref={scrollableRef}>
					<svg ref={chartRef} />
				</div>
			</div>
		</div>
	);
};

export default GanttChart;
