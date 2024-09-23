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
import BuilderModal from "./BuilderModal";

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
	const [isJobModalOpen, setIsJobModalOpen] = useState(false);
	const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);

	const handleRowDoubleClick = (job) => {
		setSelectedJob(job);
		setIsJobModalOpen(true);
	};

	const closeJobModal = () => {
		setIsJobModalOpen(false);
		setSelectedJob(null);
	};

	const saveJob = (updatedJob) => {
		// Update the job in your state or dispatch an action to save it
		setIsJobModalOpen(false);
		setSelectedJob(null);
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

		const leftColumnSvg = d3.select(leftColumnRef.current);
		leftColumnSvg.selectAll("*").remove();

		const leftHeaderSvg = d3.select(leftColumnHeaderRef.current);
		leftHeaderSvg.selectAll("*").remove();

		const headerSvg = d3.select(headerRef.current);
		headerSvg.selectAll("*").remove();

		const numDays = 180;
		// const numDays = (visibleRange.end - visibleRange.start) / (1000 * 3600 * 24);
		const barMargin = 3;
		const weekendColor = "#c1c1c1"; // Darker color for weekends
		const alternateRowColors = ["#f9f9f9", "#e0e0e0"]; // Alternating colors for rows
		const strokeColor = "#bebebe"; // stroke color

		const width = numDays * dayWidth;
		const rowHeight = 30;

		const countActiveRooms = (jobs) => {
			return jobs.reduce(
				(total, job) => total + job.rooms.filter((room) => room.active).length,
				0
			);
		};

		const height = countActiveRooms(jobs) * rowHeight;

		// Create an array of dates for the column headers
		const dates = Array.from({ length: numDays }, (_, i) => {
			return addDays(startDate, i);
		});

		const rightHeader = d3.select(".gantt-right-header");
		const rightBody = d3.select(".gantt-right-body");
		const leftBody = d3.select(".gantt-left-body");

		rightHeader.on("scroll", () => {
			rightBody.node().scrollLeft = rightHeader.node().scrollLeft;
		});

		rightBody.on("scroll", () => {
			rightHeader.node().scrollLeft = rightBody.node().scrollLeft;
			leftBody.node().scrollTop = rightBody.node().scrollTop;
		});

		leftBody.on("scroll", () => {
			rightBody.node().scrollTop = leftBody.node().scrollTop;
		});

		chartSvg.attr("width", width).attr("height", height);

		leftHeaderSvg.attr("width", 300).attr("height", 40);

		// Add the left column header with titles
		leftHeaderSvg.append("g").each(function () {
			const leftHeaderGroup = d3.select(this);

			// Job Number header
			leftHeaderGroup
				.append("text")
				.attr("x", 10) // Adjust x for alignment
				.attr("y", rowHeight / 2 + 6)
				.text("Job #")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");

			// Job Name header
			leftHeaderGroup
				.append("text")
				.attr("x", 80) // Adjust x for alignment
				.attr("y", rowHeight / 2 + 6)
				.text("Job Name")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");

			// Room Name header
			leftHeaderGroup
				.append("text")
				.attr("x", 200) // Adjust x for alignment
				.attr("y", rowHeight / 2 + 6)
				.text("Room Name")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");
		});

		headerSvg.attr("width", numDays * dayWidth).attr("height", 40);

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
					.attr("font-weight", "bold")
					.attr("text-anchor", "left");
				group
					.append("text")
					.attr("x", i * dayWidth + 10)
					.attr("y", 25)
					.text(d3.timeFormat("%d")(d))
					.attr("fill", "#000")
					.attr("font-size", "12px")
					.attr("font-weight", "bold")
					.attr("text-anchor", "left");

				group
					.append("text")
					.attr("x", i * dayWidth + 10)
					.attr("y", 37) // Adjust vertical position for day of the week
					.text(d3.timeFormat("%a")(d))
					.attr("fill", "#000")
					.attr("font-size", "10px")
					.attr("font-weight", "bold")
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
			}))
		);

		const activeRoomsData = roomsData.filter((room) => room.active);

		leftColumnSvg.attr("width", 300).attr("height", height);

		leftColumnSvg.on("dblclick", (event) => {
			const [x, y] = d3.pointer(event);
			const rowIndex = Math.floor(y / rowHeight); // Calculate which row was clicked based on y-coordinate
			const room = activeRoomsData[rowIndex]; // Get the room data based on the row index

			if (room) {
				const job = jobs.find((j) => j.id === room.jobId); // Find the job associated with the room
				handleRowDoubleClick(job); // Call the double-click handler with the job data
			}
		});

		// Background rows
		leftColumnSvg
			.selectAll(".row-background")
			.data(activeRoomsData)
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
			.data(activeRoomsData)
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
				const snappedX = Math.round(newX / dayWidth) * dayWidth;

				const daysMoved = Math.round((snappedX - d.dragStartX) / dayWidth);
				const newStartDate = new Date(d.startDate);
				newStartDate.setDate(newStartDate.getDate() + daysMoved);

				// Calculate new width
				const newWidth = calculateJobWidth(newStartDate, d.duration, dayWidth);

				// Apply transitions for both x and width
				d3.select(this)
					.transition()
					.duration(300)
					.attr("x", snappedX)
					.attr("width", newWidth)
					.on("end", () => {
						// Update Redux store after the transition is complete
						dispatch(
							updateJobStartDate(d.jobId, d.id, normalizeDate(newStartDate))
						);
					});

				d3.select(this.parentNode)
					.select(".bar-text")
					.transition()
					.duration(300)
					.attr("x", snappedX + 5);

				d3.select(this).classed("dragging", false);

				delete d.dragStartX;
				delete d.dragStartEventX;
			});

		// Remove previous SVG elements
		chartSvg.selectAll("*").remove().append("rect");

		// Set SVG dimensions based on room count
		chartSvg.attr("width", width).attr("height", height);

		// Create row backgrounds for each room
		chartSvg
			.selectAll(".row-background")
			.data(activeRoomsData)
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
			.attr("height", activeRoomsData.length * rowHeight) // Adjust height based on room count
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
			.attr("y2", activeRoomsData.length * rowHeight) // Adjust based on room count
			.attr("stroke", strokeColor)
			.attr("stroke-width", 1);

		// Create a group for jobs
		const jobsGroup = chartSvg
			.append("g")
			.attr("class", "job-group")
			.style("cursor", "ew-resize");

		jobsGroup
			.selectAll(".job-group")
			.data(activeRoomsData)
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
					.call(drag);

				group
					.append("text")
					.attr(
						"x",
						(d) => calculateXPosition(d.startDate, startDate, dayWidth) + 5
					)
					.attr("y", rowHeight / 2)
					.attr("dy", ".35em")
					.text((d) => d.name)
					.attr("fill", "#fff")
					.attr("class", "bar-text")
					.style("pointer-events", "none");

				group
					.on("mouseover", function (event, d) {
						d3.select(this)
							.select(".bar-text")
							.text(`${d.name} - ${d.duration} hours`);
					})
					.on("mouseout", function (event, d) {
						d3.select(this).select(".bar-text").text(d.name);
					});
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
		const rightHeaderScroll = d3.select(".gantt-right-header").node();
		const rightBodyScroll = d3.select(".gantt-right-body").node();

		if (rightHeaderScroll && rightBodyScroll) {
			const scrollPosition = todayXPosition;
			rightBodyScroll.scrollLeft = scrollPosition;
		}
	}, []);

	return (
		<>
			<div className="action-buttons">
				<button
					className="action-button add-job-button"
					onClick={() => setIsJobModalOpen(true)}
				>
					Add Job
				</button>
				<button
					className="action-button manage-builders-button"
					onClick={() => setIsBuilderModalOpen(true)}
				>
					Manage Builders
				</button>
			</div>
			<div className="gantt-container">
				<div className="gantt-left">
					<div className="gantt-left-header">
						<svg ref={leftColumnHeaderRef} />
					</div>
					<div className="gantt-left-body">
						<svg ref={leftColumnRef} />
					</div>
				</div>
				<div className="gantt-right">
					<div className="gantt-right-header">
						<svg ref={headerRef} />
					</div>
					<div className="gantt-right-body" ref={scrollableRef}>
						<svg ref={chartRef} />
					</div>
				</div>
			</div>
			<JobModal
				key={isJobModalOpen ? "open" : "closed"}
				isOpen={isJobModalOpen}
				onClose={() => {
					setSelectedJob(null);
					setIsJobModalOpen(false);
				}}
				onSave={saveJob}
				jobData={selectedJob}
			/>
			<BuilderModal
				isOpen={isBuilderModalOpen}
				onClose={() => setIsBuilderModalOpen(false)}
			/>
		</>
	);
};

export default GanttChart;
