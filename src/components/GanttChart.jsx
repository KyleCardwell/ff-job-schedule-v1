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


import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSelector, useDispatch } from "react-redux";
import { saveJobs } from "../redux/ganttReducer";

const GanttChart = () => {
  const jobs = useSelector((state) => state.jobs); // Get jobs from Redux
  const dispatch = useDispatch();
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous chart

    const width = 1200; // Increased width for the additional columns
    const height = jobs.length * 60; // Adjust height based on number of jobs
    const dayWidth = 20; // Width of each day column
    const leftColumnWidth = 150; // Width of the left columns

    svg.attr("width", width).attr("height", height);

    // Create drag behavior
    const drag = d3.drag()
      .on("drag", function (event, d) {
        const xPos = event.x;
        const newStartDate = Math.max(0, Math.floor(xPos / dayWidth));
        d.startDate = newStartDate;

        d3.select(this)
          .attr("x", newStartDate * dayWidth + leftColumnWidth); // Adjust position with left columns width

        // Update Redux store with new job positions
        const updatedJobs = jobs.map((job) =>
          job.id === d.id ? { ...job, startDate: newStartDate } : job
        );
        dispatch(saveJobs(updatedJobs));
      });

    // Render job bars
    svg
      .selectAll("rect")
      .data(jobs)
      .enter()
      .append("rect")
      .attr("x", (d) => Math.max(d.startDate * dayWidth, leftColumnWidth))
      .attr("y", (d, i) => i * 60)
      .attr("width", (d) => (d.duration / 8) * dayWidth)
      .attr("height", 20)
      .attr("fill", (d) => d.builderColor)
      .call(drag); // Enable dragging

    // Add job details as text labels
    svg
      .selectAll(".job-details")
      .data(jobs)
      .enter()
      .append("text")
      .attr("x", 10)
      .attr("y", (d, i) => i * 60 + 20)
      .text((d) => `${d.jobNumber} - ${d.jobName} - (${d.roomName})`)
      .attr("fill", "#000")
      .attr("font-size", "12px");

    // Add job numbers to the left of bars
    // svg
    //   .selectAll(".job-number")
    //   .data(jobs)
    //   .enter()
    //   .append("text")
    //   .attr("x", 10)
    //   .attr("y", (d, i) => i * 60 + 20)
    //   .text((d) => `Job ${d.jobNumber}`)
    //   .attr("fill", "#000")
    //   .attr("font-size", "12px");

    // Add job names to the left of bars
    // svg
    //   .selectAll(".job-name")
    //   .data(jobs)
    //   .enter()
    //   .append("text")
    //   .attr("x", 10)
    //   .attr("y", (d, i) => i * 60 + 35)
    //   .text((d) => d.jobName)
    //   .attr("fill", "#000")
    //   .attr("font-size", "12px");

    // Add room names to the left of bars
    // svg
    //   .selectAll(".room-name")
    //   .data(jobs)
    //   .enter()
    //   .append("text")
    //   .attr("x", 10)
    //   .attr("y", (d, i) => i * 60 + 50)
    //   .text((d) => d.roomName)
    //   .attr("fill", "#000")
    //   .attr("font-size", "12px");

  }, [jobs, dispatch]);

  return <svg ref={svgRef}></svg>;
};

export default GanttChart;
