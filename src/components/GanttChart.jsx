import { useEffect, useRef, useState } from "react";
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
import JobModal from "./JobModal";
import { normalizeDate } from "../utils/dateUtils";

const GanttChart = () => {
	const jobs = useSelector((state) => state.jobs.jobs);
	const builders = useSelector((state) => state.builders.builders);
	const dispatch = useDispatch();
	const chartRef = useRef(null);
	const headerRef = useRef(null); // For the fixed header
	const leftColumnRef = useRef(null); // For the fixed left column
	const leftColumnHeaderRef = useRef(null); // For the fixed left column
	const scrollableRef = useRef(null);
	const leftScrollableRef = useRef(null);

	const [selectedJob, setSelectedJob] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleRowDoubleClick = (job) => {
		setSelectedJob(job);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setSelectedJob(null);
	};

	const saveJob = (updatedJob) => {
		// Update the job in your state or dispatch an action to save it
		setIsModalOpen(false);
	};

	const countAllRooms = (jobs) => {
		return jobs.reduce((count, job) => count + job.rooms.length, 0);
	};

	const totalRooms = countAllRooms(jobs);

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
		const normalizedJobStartDate = normalizeDate(jobStartDate);
		const normalizedStartDate = normalizeDate(startDate);
		const diffInDays = differenceInCalendarDays(
			normalizedJobStartDate,
			normalizedStartDate
		);
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

		const leftColumnSvg = d3.select(leftColumnRef.current);
		leftColumnSvg.selectAll("*").remove();
		leftColumnSvg
			.attr("width", 300)
			.attr(
				"height",
				jobs.reduce((acc, job) => acc + job.rooms.length * rowHeight, 0)
			)
			.style("margin", "0");

		leftColumnSvg.on("dblclick", (event) => {
			const [x, y] = d3.pointer(event);
			const rowIndex = Math.floor(y / rowHeight); // Calculate which row was clicked based on y-coordinate
			const room = roomsData[rowIndex]; // Get the room data based on the row index

			if (room) {
				const job = jobs.find((j) => j.id === room.jobId); // Find the job associated with the room
				handleRowDoubleClick(job); // Call the double-click handler with the job data
			}
		});

		// Background rows
		leftColumnSvg
			.selectAll(".row-background")
			.data(roomsData)
			.enter()
			.append("rect")
			.attr("x", 0)
			.attr("y", (d, i) => i * rowHeight)
			.attr("width", 300)
			.attr("height", rowHeight)
			.attr("fill", (d) =>
				d.jobsIndex % 2 === 0 ? alternateRowColors[0] : alternateRowColors[1]
			); // Alternate colors

		// Text elements for job number, job name, and room name
		leftColumnSvg
			.selectAll(".job-text")
			.data(roomsData)
			.enter()
			.append("g") // Group text elements together
			.attr(
				"transform",
				(d, i) => `translate(0, ${i * rowHeight + rowHeight / 2})`
			)
			.each(function (d) {
				const group = d3.select(this);

				// Job number
				group
					.append("text")
					.attr("x", 10)
					.text(d.jobNumber)
					.attr("fill", "#000")
					.attr("dominant-baseline", "middle");

				// Job name
				group
					.append("text")
					.attr("x", 80)
					.text(d.jobName)
					.attr("fill", "#000")
					.attr("dominant-baseline", "middle");

				// Room name
				group
					.append("text")
					.attr("x", 200)
					.text(d.name)
					.attr("fill", "#000")
					.attr("dominant-baseline", "middle");
			});

		const drag = d3
			.drag()
			.on("start", function (event, d) {
				tooltip.style("opacity", 0);
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
				tooltip.style("opacity", 0);
			})
			.on("end", function (event, d) {
				const dx = event.x - d.dragStartEventX;
				const newX = parseFloat(d.dragStartX) + dx;
				const snappedX = Math.round(newX / dayWidth) * dayWidth;

				const daysMoved = Math.round((snappedX - d.dragStartX) / dayWidth);
				const newStartDate = new Date(d.startDate);
				newStartDate.setDate(newStartDate.getDate() + daysMoved);

				d3.select(this).transition().duration(200).attr("x", snappedX);
				d3.select(this.parentNode)
					.select(".bar-text")
					.transition()
					.duration(200)
					.attr("x", snappedX + 5);

				dispatch(
					updateJobStartDate(d.jobId, d.id, normalizeDate(newStartDate))
				);
				d3.select(this).classed("dragging", false);

				delete d.dragStartX;
				delete d.dragStartEventX;
			});

		const tooltip = d3
			.select("body")
			.append("div")
			.attr("class", "tooltip")
			.style("opacity", 0);

		// Remove previous SVG elements
		chartSvg.selectAll("*").remove().append("rect");

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
			.attr("class", "job-group")
			.style("cursor", "ew-resize");

		jobsGroup
			.selectAll(".job-group")
			.data(roomsData)
			.enter()
			.append("g")
			.attr("class", "job-group")
			.attr("transform", (d, i) => `translate(0, ${i * rowHeight})`) // Position each group vertically
			.each(function (d, i) {
				const group = d3.select(this);

				group
					.append("rect")
					.attr("x", (d) =>
						calculateXPosition(d.startDate, startDate, dayWidth)
					)
					.attr("y", barMargin)
					.attr("width", (d) =>
						calculateJobWidth(d.startDate, d.duration, dayWidth)
					)
					.attr("height", rowHeight - 2 * barMargin)
					.attr(
						"fill",
						(d) => builders.find((builder) => builder.id === d.builderId).color
					)
					.attr("class", "job")
					.attr("rx", 5)
					.attr("ry", 5)
					.call(drag)
					.on("mouseover", function (event, d) {
						if (!d3.select(this).classed("dragging")) {
							const tooltipHeight = 40;
							const offset = 0;

							let topPosition = event.pageY - tooltipHeight - offset;
							// Ensure the tooltip doesn't go above the top of the window
							topPosition = Math.max(topPosition, 5);

							tooltip.transition().duration(200).style("opacity", 0.9);
							tooltip
								.html(`Duration: ${d.duration} hours`)
								.style("left", event.pageX + 10 + "px")
								.style("top", topPosition + "px");
						}
					})
					.on("mouseout", function (d) {
						if (!d3.select(this).classed("dragging")) {
							tooltip.transition().duration(500).style("opacity", 0);
						}
					});

				group
					.append("text")
					.attr(
						"x",
						(d) => calculateXPosition(d.startDate, startDate, dayWidth) + 5
					)
					.attr("y", rowHeight - 15 + 5)
					.text((d) => d.name)
					.attr("fill", "#fff")
					.attr("class", "bar-text")
					.style("pointer-events", "none");
			});

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
		<>
			<div className="instructions">Double-click a job to edit rooms</div>
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
				<JobModal
					isOpen={isModalOpen}
					onClose={closeModal}
					onSave={saveJob}
					jobData={selectedJob}
				/>
			</div>
			<button onClick={() => setIsModalOpen(true)}>Add Job</button>
		</>
	);
};

export default GanttChart;
