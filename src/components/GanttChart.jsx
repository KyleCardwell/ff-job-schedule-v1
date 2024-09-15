// // src/components/GanttChart.jsx
// import React, { useEffect, useRef } from "react";
// import * as d3 from "d3";
// import { useSelector } from "react-redux";

// const GanttChart = () => {
//   const jobs = useSelector((state) => state.jobs); // Get jobs from Redux
//   const svgRef = useRef();

//   useEffect(() => {
//     const svg = d3.select(svgRef.current);

//     // Clear previous renders
//     svg.selectAll("*").remove();

//     const width = 1000;
//     const height = 500;

//     // Set up the SVG dimensions
//     svg.attr("width", width).attr("height", height);

//     // Example data binding: draw bars for each job
//     svg
//       .selectAll("rect")
//       .data(jobs)
//       .enter()
//       .append("rect")
//       .attr("x", (d) => d.startDate * 100) // Temporary scaling for dates
//       .attr("y", (d, i) => i * 30) // Vertically stack bars
//       .attr("width", (d) => (d.duration / 8) * 100) // Scale by duration
//       .attr("height", 20)
//       .attr("fill", (d) => d.builderColor);

//     // Add job names as text labels inside the bars
//     svg
//       .selectAll("text")
//       .data(jobs)
//       .enter()
//       .append("text")
//       .attr("x", (d) => d.startDate * 100 + 5)
//       .attr("y", (d, i) => i * 30 + 15)
//       .text((d) => d.jobName)
//       .attr("fill", "#fff");
//   }, [jobs]);

//   return <svg ref={svgRef}></svg>;
// };

// export default GanttChart;

// *****************************************************************

// import React, { useEffect, useRef } from "react";
// import * as d3 from "d3";
// import { useSelector, useDispatch } from "react-redux";
// import { useDrop } from "react-dnd";
// import { saveJobs } from "../redux/ganttReducer";
// import JobBar from "./JobBar";

// const GanttChart = () => {
//   const jobs = useSelector((state) => state.jobs); // Get jobs from Redux
//   const dispatch = useDispatch();
//   const svgRef = useRef();

//   const [, drop] = useDrop({
//     accept: "JOB",
//     drop: (item, monitor) => {
//       const offset = monitor.getSourceClientOffset();
//       if (offset) {
//         const newStartDate = Math.floor(offset.x / 100); // Calculate new start date
//         const updatedJobs = jobs.map((job) =>
//           job.id === item.id ? { ...job, startDate: newStartDate } : job
//       );
//       dispatch(saveJobs(updatedJobs)); // Update the store with the new job positions
//     }
//   },
// });

// useEffect(() => {
//   const svg = d3.select(svgRef.current);
//   svg.selectAll("*").remove();

//   const width = 1000;
//   const height = 500;

//   svg.attr("width", width).attr("height", height);

//   // Draw bars for each job
//   svg
//   .selectAll("rect")
//   .data(jobs)
//   .enter()
//   .append("rect")
//   .attr("x", (d) => d.startDate * 100)
//   .attr("y", (d, i) => i * 30)
//   .attr("width", (d) => (d.duration / 8) * 100)
//   .attr("height", 20)
//   .attr("fill", (d) => d.builderColor);

//   // Add job names as text labels inside the bars
//   svg
//   .selectAll("text")
//   .data(jobs)
//   .enter()
//   .append("text")
//   .attr("x", (d) => d.startDate * 100 + 5)
//   .attr("y", (d, i) => i * 30 + 15)
//   .text((d) => d.jobName)
//   .attr("fill", "#fff");
// }, [jobs]);

// // return (
//   //   <div ref={drop}>
//   //     <svg ref={svgRef}></svg>
//   //   </div>
//   // );
//   return (
//     <div ref={drop}>
//       {jobs.map((job) => (
//         <JobBar key={job.id} job={job} />
//       ))}
//       <svg ref={svgRef}></svg>
//     </div>
//   );
// };

// export default GanttChart;

// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************

// import React, { useEffect, useRef } from "react";
// import * as d3 from "d3";
// import { useSelector, useDispatch } from "react-redux";
// import { saveJobs } from "../redux/ganttReducer";

// const GanttChart = () => {
//   const jobs = useSelector((state) => state.jobs); // Get jobs from Redux
//   const dispatch = useDispatch();
//   const svgRef = useRef();

//   useEffect(() => {
//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove(); // Clear previous chart

//     const width = 1000;
//     const height = jobs.length * 30; // Adjust height based on number of jobs
//     const dayWidth = 100; // Width of each day column

//     svg.attr("width", width).attr("height", height);

//     // Create drag behavior
//     const drag = d3.drag()
//       .on("drag", function (event, d) {
//         const xPos = event.x; // Use event.x from the D3 event
//         const newStartDate = Math.max(0, Math.floor(xPos / dayWidth)); // Snap to nearest day
//         d.startDate = newStartDate;

//         d3.select(this)
//           .attr("x", newStartDate * dayWidth);

//         // Update Redux store with new job positions
//         const updatedJobs = jobs.map((job) =>
//           job.id === d.id ? { ...job, startDate: newStartDate } : job
//         );
//         dispatch(saveJobs(updatedJobs));
//       });

//     // Render job bars
//     svg
//       .selectAll("rect")
//       .data(jobs)
//       .enter()
//       .append("rect")
//       .attr("x", (d) => d.startDate * dayWidth)
//       .attr("y", (d, i) => i * 30)
//       .attr("width", (d) => (d.duration / 8) * dayWidth)
//       .attr("height", 20)
//       .attr("fill", (d) => d.builderColor)
//       .call(drag); // Enable dragging

//     // Add job names as text labels
//     svg
//       .selectAll("text")
//       .data(jobs)
//       .enter()
//       .append("text")
//       .attr("x", (d) => d.startDate * dayWidth + 5)
//       .attr("y", (d, i) => i * 30 + 15)
//       .text((d) => d.jobName)
//       .attr("fill", "#fff");

//   }, [jobs, dispatch]);

//   return <svg ref={svgRef}></svg>;
// };

// export default GanttChart;

// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************

// import React, { useEffect, useRef } from "react";
// import * as d3 from "d3";
// import { useSelector, useDispatch } from "react-redux";
// import { saveJobs } from "../redux/ganttReducer";

// const GanttChart = () => {
//   const jobs = useSelector((state) => state.jobs); // Get jobs from Redux
//   const dispatch = useDispatch();
//   const svgRef = useRef();

//   useEffect(() => {
//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove(); // Clear previous chart

//     const width = 1000;
//     const height = jobs.length * 60; // Adjust height based on number of jobs
//     const dayWidth = 100; // Width of each day column

//     svg.attr("width", width).attr("height", height);

//     // Create drag behavior
//     const drag = d3.drag()
//       .on("drag", function (event, d) {
//         const xPos = event.x; // Use event.x from the D3 event
//         const newStartDate = Math.max(0, Math.floor(xPos / dayWidth)); // Snap to nearest day
//         d.startDate = newStartDate;

//         d3.select(this)
//           .attr("x", newStartDate * dayWidth);

//         // Update Redux store with new job positions
//         const updatedJobs = jobs.map((job) =>
//           job.id === d.id ? { ...job, startDate: newStartDate } : job
//         );
//         dispatch(saveJobs(updatedJobs));
//       });

//     // Render job bars
//     svg
//       .selectAll("rect")
//       .data(jobs)
//       .enter()
//       .append("rect")
//       .attr("x", (d) => d.startDate * dayWidth)
//       .attr("y", (d, i) => i * 60) // Increased row height for labels
//       .attr("width", (d) => (d.duration / 8) * dayWidth)
//       .attr("height", 40) // Increased height for labels
//       .attr("fill", (d) => d.builderColor)
//       .call(drag); // Enable dragging

//     // Add job details as text labels
//     svg
//       .selectAll(".job-text")
//       .data(jobs)
//       .enter()
//       .append("text")
//       .attr("x", (d) => d.startDate * dayWidth + 5)
//       .attr("y", (d, i) => i * 60 + 20)
//       .text((d) => `Job ${d.jobNumber}: ${d.jobName} (${d.roomName})`)
//       .attr("fill", "#fff")
//       .attr("font-size", "12px");

//     // Add job numbers to the left of bars
//     svg
//       .selectAll(".job-number")
//       .data(jobs)
//       .enter()
//       .append("text")
//       .attr("x", (d) => 5)
//       .attr("y", (d, i) => i * 60 + 20)
//       .text((d) => `Job ${d.jobNumber}`)
//       .attr("fill", "#fff")
//       .attr("font-size", "12px");

//   }, [jobs, dispatch]);

//   return <svg ref={svgRef}></svg>;
// };

// export default GanttChart;

// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************

// import React, { useEffect, useRef } from "react";
// import * as d3 from "d3";
// import { useSelector, useDispatch } from "react-redux";
// import { saveJobs } from "../redux/ganttReducer";

// const GanttChart = () => {
//   const jobs = useSelector((state) => state.jobs); // Get jobs from Redux
//   const dispatch = useDispatch();
//   const svgRef = useRef();

//   useEffect(() => {
//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove(); // Clear previous chart

//     const width = 1200; // Increased width for the additional columns
//     const height = jobs.length * 60; // Adjust height based on number of jobs
//     const dayWidth = 20; // Width of each day column
//     const leftColumnWidth = 150; // Width of the left columns

//     svg.attr("width", width).attr("height", height);

//     // Create drag behavior
//     const drag = d3.drag()
//       .on("drag", function (event, d) {
//         const xPos = event.x;
//         const newStartDate = Math.max(0, Math.floor(xPos / dayWidth));
//         d.startDate = newStartDate;

//         d3.select(this)
//           .attr("x", newStartDate * dayWidth + leftColumnWidth); // Adjust position with left columns width

//         // Update Redux store with new job positions
//         const updatedJobs = jobs.map((job) =>
//           job.id === d.id ? { ...job, startDate: newStartDate } : job
//         );
//         dispatch(saveJobs(updatedJobs));
//       });

//     // Render job bars
//     svg
//       .selectAll("rect")
//       .data(jobs)
//       .enter()
//       .append("rect")
//       .attr("x", (d) => Math.max(d.startDate * dayWidth, leftColumnWidth))
//       .attr("y", (d, i) => i * 60)
//       .attr("width", (d) => (d.duration / 8) * dayWidth)
//       .attr("height", 20)
//       .attr("fill", (d) => d.builderColor)
//       .call(drag); // Enable dragging

//     // Add job details as text labels
//     svg
//       .selectAll(".job-details")
//       .data(jobs)
//       .enter()
//       .append("text")
//       .attr("x", 10)
//       .attr("y", (d, i) => i * 60 + 20)
//       .text((d) => `${d.jobNumber} - ${d.jobName} - (${d.roomName})`)
//       .attr("fill", "#000")
//       .attr("font-size", "12px");

//     // Add job numbers to the left of bars
//     // svg
//     //   .selectAll(".job-number")
//     //   .data(jobs)
//     //   .enter()
//     //   .append("text")
//     //   .attr("x", 10)
//     //   .attr("y", (d, i) => i * 60 + 20)
//     //   .text((d) => `Job ${d.jobNumber}`)
//     //   .attr("fill", "#000")
//     //   .attr("font-size", "12px");

//     // Add job names to the left of bars
//     // svg
//     //   .selectAll(".job-name")
//     //   .data(jobs)
//     //   .enter()
//     //   .append("text")
//     //   .attr("x", 10)
//     //   .attr("y", (d, i) => i * 60 + 35)
//     //   .text((d) => d.jobName)
//     //   .attr("fill", "#000")
//     //   .attr("font-size", "12px");

//     // Add room names to the left of bars
//     // svg
//     //   .selectAll(".room-name")
//     //   .data(jobs)
//     //   .enter()
//     //   .append("text")
//     //   .attr("x", 10)
//     //   .attr("y", (d, i) => i * 60 + 50)
//     //   .text((d) => d.roomName)
//     //   .attr("fill", "#000")
//     //   .attr("font-size", "12px");

//   }, [jobs, dispatch]);

//   return <svg ref={svgRef}></svg>;
// };

// export default GanttChart;

// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************

// import React, { useEffect, useRef } from "react";
// import * as d3 from "d3";
// import { useSelector, useDispatch } from "react-redux";
// import { saveJobs } from "../redux/ganttReducer";

// const GanttChart = () => {
//   const jobs = useSelector((state) => state.jobs); // Get jobs from Redux
//   const dispatch = useDispatch();
//   const svgRef = useRef();

//   useEffect(() => {
//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove(); // Clear previous chart

//     const width = 1200; // Increased width for the additional columns
//     const height = jobs.length * 60 + 50; // Adjust height based on number of jobs, with space for headers
//     const dayWidth = 40; // Width of each day column
//     const leftColumnWidth = 150; // Width of the left columns
//     const numDays = 30; // Assume a 30-day range for simplicity, adjust as needed

//     const startDate = new Date(); // Assuming today's date as the start date
//     svg.attr("width", width).attr("height", height);

//     // Generate array of dates for the headers
//     const dates = Array.from({ length: numDays }, (_, i) => {
//       const date = new Date(startDate);
//       date.setDate(startDate.getDate() + i);
//       return date;
//     });

//     // Render date headers at the top
//     svg
//       .selectAll(".header")
//       .data(dates)
//       .enter()
//       .append("text")
//       .attr("x", (d, i) => i * dayWidth + leftColumnWidth)
//       .attr("y", 20)
//       .text((d) => d3.timeFormat("%b %d")(d)) // Format as 'Month Day' (e.g., 'Sep 15')
//       .attr("fill", "#000")
//       .attr("font-size", "12px");

//     // Create drag behavior
//     const drag = d3.drag()
//       .on("drag", function (event, d) {
//         const xPos = event.x;
//         const newStartDate = Math.max(0, Math.floor((xPos - leftColumnWidth) / dayWidth)); // Snap to nearest day
//         d.startDate = newStartDate;

//         d3.select(this)
//           .attr("x", newStartDate * dayWidth + leftColumnWidth);

//         // Update Redux store with new job positions
//         const updatedJobs = jobs.map((job) =>
//           job.id === d.id ? { ...job, startDate: newStartDate } : job
//         );
//         dispatch(saveJobs(updatedJobs));
//       });

//     // Render job bars
//     svg
//       .selectAll("rect")
//       .data(jobs)
//       .enter()
//       .append("rect")
//       .attr("x", (d) => d.startDate * dayWidth + leftColumnWidth)
//       .attr("y", (d, i) => i * 60 + 50) // Leave space for headers
//       .attr("width", (d) => (d.duration / 8) * dayWidth)
//       .attr("height", 40)
//       .attr("fill", (d) => d.builderColor)
//       .call(drag); // Enable dragging

//     // Add job details as text labels
//     svg
//       .selectAll(".job-details")
//       .data(jobs)
//       .enter()
//       .append("text")
//       .attr("x", 10)
//       .attr("y", (d, i) => i * 60 + 70) // Leave space for headers
//       .text((d) => `Job ${d.jobNumber}: ${d.jobName} (${d.roomName})`)
//       .attr("fill", "#000")
//       .attr("font-size", "12px");

//     // Add job numbers to the left of bars
//     // svg
//     //   .selectAll(".job-number")
//     //   .data(jobs)
//     //   .enter()
//     //   .append("text")
//     //   .attr("x", 10)
//     //   .attr("y", (d, i) => i * 60 + 70) // Align with job rows
//     //   .text((d) => `Job ${d.jobNumber}`)
//     //   .attr("fill", "#000")
//     //   .attr("font-size", "12px");

//     // Add job names to the left of bars
//     // svg
//     //   .selectAll(".job-name")
//     //   .data(jobs)
//     //   .enter()
//     //   .append("text")
//     //   .attr("x", 10)
//     //   .attr("y", (d, i) => i * 60 + 85) // Adjust y position for job name
//     //   .text((d) => d.jobName)
//     //   .attr("fill", "#000")
//     //   .attr("font-size", "12px");

//     // Add room names to the left of bars
//     // svg
//     //   .selectAll(".room-name")
//     //   .data(jobs)
//     //   .enter()
//     //   .append("text")
//     //   .attr("x", 10)
//     //   .attr("y", (d, i) => i * 60 + 100) // Adjust y position for room name
//     //   .text((d) => d.roomName)
//     //   .attr("fill", "#000")
//     //   .attr("font-size", "12px");

//   }, [jobs, dispatch]);

//   return <svg ref={svgRef}></svg>;
// };

// export default GanttChart;

// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************

// import React, { useEffect, useRef } from "react";
// import * as d3 from "d3";
// import { useSelector, useDispatch } from "react-redux";
// import { saveJobs } from "../redux/ganttReducer";
// import './GanttChart.css'; // Add this for custom styles

// const GanttChart = () => {
//   const jobs = useSelector((state) => state.jobs); // Get jobs from Redux
//   const dispatch = useDispatch();
//   const svgRef = useRef();

//   useEffect(() => {
//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove(); // Clear previous chart

//     const dayWidth = 50; // Width of each day column
//     const numDays = 180; // Assume a 30-day range for simplicity, adjust as needed
//     const leftColumnWidth = 300; // Width of the left columns (job number, name, room)

//     const startDate = new Date(); // Assuming today's date as the start date
//     const width = numDays * dayWidth; // Width of the SVG for the date columns
//     const height = jobs.length * 60 + 50; // Adjust height based on the number of jobs

//     svg.attr("width", width).attr("height", height);

//     // Generate array of dates for the headers
//     const dates = Array.from({ length: numDays }, (_, i) => {
//       const date = new Date(startDate);
//       date.setDate(startDate.getDate() + i);
//       return date;
//     });

//     // Render date headers at the top (inside the scrollable container)
//     svg
//       .selectAll(".header")
//       .data(dates)
//       .enter()
//       .append("text")
//       .attr("x", (d, i) => i * dayWidth)
//       .attr("y", 20)
//       .text((d) => d3.timeFormat("%b %d")(d)) // Format as 'Month Day' (e.g., 'Sep 15')
//       .attr("fill", "#000")
//       .attr("font-size", "12px");

//     // Create drag behavior
//     const drag = d3.drag()
//       .on("drag", function (event, d) {
//         const xPos = event.x;
//         const newStartDate = Math.max(0, Math.floor(xPos / dayWidth)); // Snap to nearest day
//         d.startDate = newStartDate;

//         d3.select(this)
//           .attr("x", newStartDate * dayWidth);

//         // Update Redux store with new job positions
//         const updatedJobs = jobs.map((job) =>
//           job.id === d.id ? { ...job, startDate: newStartDate } : job
//         );
//         dispatch(saveJobs(updatedJobs));
//       });

//     // Render job bars
//     svg
//       .selectAll("rect")
//       .data(jobs)
//       .enter()
//       .append("rect")
//       .attr("x", (d) => d.startDate * dayWidth)
//       .attr("y", (d, i) => i * 60 + 50) // Leave space for headers
//       .attr("width", (d) => (d.duration / 8) * dayWidth)
//       .attr("height", 40)
//       .attr("fill", (d) => d.builderColor)
//       .call(drag); // Enable dragging

//     // Add job bars text labels
//     svg
//       .selectAll(".bar-text")
//       .data(jobs)
//       .enter()
//       .append("text")
//       .attr("x", (d) => d.startDate * dayWidth + 5)
//       .attr("y", (d, i) => i * 60 + 75) // Adjust for each row
//       .text((d) => d.jobName)
//       .attr("fill", "#fff");

//   }, [jobs, dispatch]);

//   return (
//     <div className="gantt-container">
//       {/* Left non-scrollable part for job details */}
//       <div className="gantt-left">
//         <div className="gantt-row header">
//           <div className="gantt-cell">Job Number</div>
//           <div className="gantt-cell">Job Name</div>
//           <div className="gantt-cell">Room Name</div>
//         </div>
//         {jobs.map((job, i) => (
//           <div key={job.id} className="gantt-row">
//             <div className="gantt-cell">{job.jobNumber}</div>
//             <div className="gantt-cell">{job.jobName}</div>
//             <div className="gantt-cell">{job.roomName}</div>
//           </div>
//         ))}
//       </div>

//       {/* Right scrollable part for the Gantt chart */}
//       <div className="gantt-right">
//         <svg ref={svgRef}></svg>
//       </div>
//     </div>
//   );
// };

// export default GanttChart;

// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************
// *****************************************************************

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSelector, useDispatch } from "react-redux";
import "./GanttChart.css";
import { saveJobs, updateJobStartDate } from "../redux/actions/ganttActions";
import { startOfDay, addDays, format } from "date-fns";

const GanttChart = () => {
	const jobs = useSelector((state) => state.jobs);
	const dispatch = useDispatch();
	const svgRef = useRef();
	const containerRef = useRef(); // Ref for the scrollable container

	useEffect(() => {
		const svg = d3.select(svgRef.current);
		svg.selectAll("*").remove(); // Clear previous SVG content

		const dayWidth = 40;
		const numDays = 180;
		const startDate = new Date("2024-09-01"); // Initialize start date for the Gantt chart
		// startDate.setHours(0, 0, 0, 0); // Set start date time to midnight
		const startOfDayDate = addDays(startOfDay(startDate), 1);

		// Create an array of dates for the column headers
		const dates = Array.from({ length: numDays }, (_, i) => {
			return addDays(startOfDayDate, i);
		});

		const width = numDays * dayWidth;
		const rowHeight = 40;
		const height = jobs.length * rowHeight + 50;

		svg.attr("width", width).attr("height", height);

		// Add column headers with both date and day of the week
		svg
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

		svg
			.selectAll(".row-background")
			.data(jobs)
			.enter()
			.append("rect")
			.attr("x", 0)
			.attr("y", (d, i) => i * rowHeight + 50)
			.attr("width", width)
			.attr("height", rowHeight)
			.attr("fill", (d, i) => (i % 2 === 0 ? "#f9f9f9" : "#e0e0e0")); // Alternate colors

		svg
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

		// Function to calculate x-position based on the start date of the job
		// const calculateXPosition = (jobStartDate) => {
		// 	const diffInTime = jobStartDate.getTime() - startDate.getTime();
		// 	const diffInDays = diffInTime / (1000 * 3600 * 24); // Convert time difference to days
		// 	return diffInDays * dayWidth;
		// };

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

		svg
			.selectAll("rect.job")
			.data(jobs)
			.enter()
			.append("rect")
			.attr("x", (d) => calculateXPosition(d.startDate))
			.attr("y", (d, i) => i * rowHeight + 50 + 5)
			.attr("width", (d) => (d.duration / 8) * dayWidth)
			.attr("height", rowHeight - 10)
			.attr("fill", (d) => d.builderColor)
			.attr("class", "job") // Add a class for job rectangles
			.attr("rx", 5) // Set the x-axis corner radius
			.attr("ry", 5) // Set the y-axis corner radius
			.call(drag);

		svg
			.selectAll(".bar-text")
			.data(jobs)
			.enter()
			.append("text")
			.attr("x", (d) => calculateXPosition(d.startDate) + 5)
			.attr("y", (d, i) => i * rowHeight + 75 + 5)
			.text((d) => d.jobName)
			.attr("fill", "#fff");

		d3.selectAll(".gantt-chart-row").style("background-color", (d, i) =>
			i % 2 === 0 ? "#f9f9f9" : "#ffffff"
		);

		// Function to handle auto-scrolling when dragging near edges
		function handleAutoScroll(event) {
			const container = containerRef.current;
			const scrollSpeed = 10; // Adjust this to control scroll speed
			const buffer = 50; // Distance from the edge where scrolling should start

			const { left, right, top, bottom } = container.getBoundingClientRect();
			const { clientX, clientY } = event.sourceEvent;

			if (clientX < left + buffer) {
				container.scrollLeft -= scrollSpeed; // Scroll left
			} else if (clientX > right - buffer) {
				container.scrollLeft += scrollSpeed; // Scroll right
			}

			if (clientY < top + buffer) {
				container.scrollTop -= scrollSpeed; // Scroll up
			} else if (clientY > bottom - buffer) {
				container.scrollTop += scrollSpeed; // Scroll down
			}
		}
	}, [jobs, dispatch]);

	return (
		<div className="gantt-container">
			<div className="gantt-left">
				<div className="gantt-row header">
					<div className="gantt-cell">Job Number</div>
					<div className="gantt-cell">Job Name</div>
					<div className="gantt-cell">Room Name</div>
				</div>
				{jobs.map((job, i) => (
					<div key={job.id} className="gantt-row">
						<div className="gantt-cell">{job.jobNumber}</div>
						<div className="gantt-cell">{job.jobName}</div>
						<div className="gantt-cell">{job.roomName}</div>
					</div>
				))}
			</div>

			<div className="gantt-right" ref={containerRef}>
				<svg ref={svgRef}></svg>
			</div>
		</div>
	);
};

export default GanttChart;
