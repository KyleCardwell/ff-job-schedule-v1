import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSelector, useDispatch } from "react-redux";
import "./GanttChart.css";
import { updateJobStartDate } from "../redux/actions/ganttActions";
import { startOfDay, addDays, format } from "date-fns";

const GanttChart = () => {
	const jobs = useSelector((state) => state.jobs);
	const dispatch = useDispatch();
	const chartRef = useRef(null);
	const headerRef = useRef(null); // For the fixed header
	const leftColumnRef = useRef(null); // For the fixed left column
	const leftColumnHeaderRef = useRef(null); // For the fixed left column
	const scrollableRef = useRef(null);
	const leftScrollableRef = useRef(null);

	// Function to handle auto-scrolling when dragging near edges
	const handleAutoScroll = (event) => {
		const container = scrollableRef.current;
		const scrollSpeed = 10; // Speed of the auto-scroll
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

	useEffect(() => {
		const chartSvg = d3.select(chartRef.current);
		chartSvg.selectAll("*").remove(); // Clear previous SVG content

		const dayWidth = 40;
		const numDays = 180;
		const startDate = new Date("2024-09-01"); // Initialize start date for the Gantt chart
		const startOfDayDate = addDays(startOfDay(startDate), 1);

		const width = numDays * dayWidth;
		const rowHeight = 30;
		const height = jobs.length * rowHeight + 50;

		// Create an array of dates for the column headers
		const dates = Array.from({ length: numDays }, (_, i) => {
			return addDays(startOfDayDate, i);
		});

		chartSvg.attr("width", width).attr("height", height).style("margin", "0");

		const leftHeaderSvg = d3.select(leftColumnHeaderRef.current);
		leftHeaderSvg.selectAll("*").remove();
		leftHeaderSvg.attr("width", 300).attr("height", 40).style("margin", "0");

		// Add the left column header with titles
		leftHeaderSvg.append("g").each(function () {
			const headerGroup = d3.select(this);

			// Job Number header
			headerGroup
				.append("text")
				.attr("x", 10) // Adjust x for alignment
				.attr("y", rowHeight / 2)
				.text("Job #")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");

			// Job Name header
			headerGroup
				.append("text")
				.attr("x", 80) // Adjust x for alignment
				.attr("y", rowHeight / 2)
				.text("Job Name")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");

			// Room Name header
			headerGroup
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
				group
					.append("text")
					.attr("x", i * dayWidth)
					.attr("y", 10)
					.text(d3.timeFormat("%b")(d))
					.attr("fill", "#000")
					.attr("font-size", "12px")
					.attr("text-anchor", "left");
				group
					.append("text")
					.attr("x", i * dayWidth)
					.attr("y", 25)
					.text(d3.timeFormat("%d")(d))
					.attr("fill", "#000")
					.attr("font-size", "12px")
					.attr("text-anchor", "left");

				group
					.append("text")
					.attr("x", i * dayWidth)
					.attr("y", 40) // Adjust vertical position for day of the week
					.text(d3.timeFormat("%a")(d))
					.attr("fill", "#000")
					.attr("font-size", "10px")
					.attr("text-anchor", "left");
			});

		const leftColumnSvg = d3.select(leftColumnRef.current);
		leftColumnSvg.selectAll("*").remove();
		leftColumnSvg
			.attr("width", 300)
			.attr("height", jobs.length * rowHeight)
			.style("margin", "0");

		leftColumnSvg
			.selectAll(".row-background")
			.data(jobs)
			.enter()
			.append("rect")
			.attr("x", 0)
			.attr("y", (d, i) => i * rowHeight)
			.attr("width", width)
			.attr("height", rowHeight)
			.attr("fill", (d, i) => (i % 2 === 0 ? "#f9f9f9" : "#e0e0e0")); // Alternate colors

		leftColumnSvg
			.selectAll("text")
			.data(jobs)
			.enter()
			.each(function (d, i) {
				// Append job number
				d3.select(this)
					.append("text")
					.attr("x", 10) // Adjust position for job number
					.attr("y", i * rowHeight + rowHeight / 2)
					.text(d.jobNumber) // Job number
					.attr("fill", "#000")
					.attr("dominant-baseline", "middle"); // Vertical alignment

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
					.text(d.roomName) // Room name
					.attr("fill", "#000")
					.attr("dominant-baseline", "middle");
			});

		chartSvg
			.selectAll(".row-background")
			.data(jobs)
			.enter()
			.append("rect")
			.attr("x", 0)
			.attr("y", (d, i) => i * rowHeight)
			.attr("width", width)
			.attr("height", rowHeight)
			.attr("fill", (d, i) => (i % 2 === 0 ? "#f9f9f9" : "#e0e0e0")); // Alternate colors

		chartSvg
			.selectAll(".vertical-line")
			.data(dates)
			.enter()
			.append("line")
			.attr("x1", (d, i) => i * dayWidth)
			.attr("x2", (d, i) => i * dayWidth)
			.attr("y1", 0)
			.attr("y2", height)
			.attr("stroke", "#ccc")
			.attr("stroke-width", 1);

		const calculateXPosition = (jobStartDate) => {
			const startDateTime = startDate.getTime();
			const jobStartDateTime = new Date(jobStartDate).getTime();
			const diffInTime = jobStartDateTime - startDateTime;
			const diffInDays = diffInTime / (1000 * 3600 * 24); // Convert time difference to days
			return diffInDays * dayWidth;
		};

		const drag = d3
			.drag()
			.on("drag", function (event, d) {
				const xPos = event.x;
				const newStartDate = new Date(startDate);
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
				dispatch(updateJobStartDate(d.id, d.startDate));
			});

		const barMargin = 3;

		chartSvg
			.selectAll("rect.job")
			.data(jobs)
			.enter()
			.append("rect")
			.attr("x", (d) => calculateXPosition(d.startDate))
			.attr("y", (d, i) => i * rowHeight + barMargin)
			.attr("width", (d) => (d.duration / 8) * dayWidth)
			.attr("height", rowHeight - 2 * barMargin)
			.attr("fill", (d) => d.builderColor)
			.attr("class", "job") // Add a class for job rectangles
			.attr("rx", 5) // Set the x-axis corner radius
			.attr("ry", 5) // Set the y-axis corner radius
			.call(drag);

		chartSvg
			.selectAll(".bar-text")
			.data(jobs)
			.enter()
			.append("text")
			.attr("x", (d) => calculateXPosition(d.startDate) + 5)
			.attr("y", (d, i) => i * rowHeight + rowHeight - 15 + 5)
			.text((d) => d.jobName)
			.attr("fill", "#fff");

		d3.selectAll(".gantt-chart-row").style("background-color", (d, i) =>
			i % 2 === 0 ? "#f9f9f9" : "#ffffff"
		);

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
		
	}, [jobs, dispatch]);

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
