import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useSelector, useDispatch } from "react-redux";
import "./GanttChart.css";
import { saveJobs } from "../redux/actions/ganttActions";
import {
	addDays,
	differenceInCalendarDays,
	startOfWeek,
	isWithinInterval,
	eachDayOfInterval,
} from "date-fns";
import JobModal from "./JobModal";
import { normalizeDate } from "../utils/dateUtils";
import BuilderModal from "./BuilderModal";
import BuilderLegend from "./BuilderLegend";
import HolidayModal from "./HolidayModal";
import Holidays from "date-holidays";
import {
	getNextWorkday,
	isHoliday,
	sortAndAdjustDates,
	totalJobHours,
} from "../utils/helpers";
import { GridLoader } from "react-spinners";

const GanttChart = () => {
	const jobs = useSelector((state) => state.jobs.jobs);
	const builders = useSelector((state) => state.builders.builders);
	const holidays = useSelector((state) => state.holidays.holidays);

	const dispatch = useDispatch();

	const chartRef = useRef(null);
	const headerRef = useRef(null); // For the fixed header
	const leftColumnRef = useRef(null); // For the fixed left column
	const leftColumnHeaderRef = useRef(null); // For the fixed left column
	const scrollableRef = useRef(null);
	const leftScrollableRef = useRef(null);
	const timeOffSvgRef = useRef(null);

	const [holidayChecker, setHolidayChecker] = useState(null);
	const [selectedJob, setSelectedJob] = useState(null);
	const [isJobModalOpen, setIsJobModalOpen] = useState(false);
	const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
	const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const daysBeforeStart = 30;
	const daysAfterEnd = 60;
	const dayWidth = 30;
	const workdayHours = 8;
	const rowHeight = 25;
	const barMargin = 3;
	const headerTextGap = 5;
	const leftColumnWidth = 270;

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

	// Calculate roomsData and flattenedJobs
	const { roomsData, flattenedJobs, jobsByBuilder } = useMemo(() => {
		let positionCounter = 0;
		const roomsData = jobs
			.flatMap((job, i) =>
				job.rooms
					.filter((room) => room.active)
					.map((room) => {
						const roomPosition = positionCounter++;

						// Sort workPeriods by startDate
						const sortedWorkPeriods = [...room.workPeriods].sort(
							(a, b) => new Date(a.startDate) - new Date(b.startDate)
						);

						// Calculate end dates and intervals for all work periods
						const workPeriodsWithIntervals = sortedWorkPeriods.map((wp) => {
							const startDate = new Date(wp.startDate);
							const endDate = addDays(
								startDate,
								Math.ceil(
									totalJobHours(
										wp.startDate,
										wp.duration,
										workdayHours,
										holidayChecker,
										holidays,
										wp.builderId,
										timeOffByBuilder
									) / workdayHours - 1
								)
							);
							return {
								...wp,
								interval: { start: startDate, end: endDate },
							};
						});

						// Process workPeriods to handle overlaps
						const processedWorkPeriods = workPeriodsWithIntervals.map(
							(wp, index) => {
								// Find overlapping work periods
								const overlaps = workPeriodsWithIntervals.filter(
									(otherWp, otherIndex) =>
										otherIndex !== index && // Check all other work periods
										(isWithinInterval(wp.interval.start, otherWp.interval) ||
											isWithinInterval(wp.interval.end, otherWp.interval) ||
											isWithinInterval(otherWp.interval.start, wp.interval))
								);

								const overlapCount = overlaps.length + 1;
								const heightFactor =
									overlapCount > 1 ? 1 / Math.min(overlapCount, 3) : 1;
								const yOffsetFactor =
									overlaps.filter((o) => o.interval.start < wp.interval.start)
										.length / Math.min(overlapCount, 3);

								return {
									...wp,
									roomId: room.id,
									name: room.name,
									jobsIndex: i,
									jobId: job.id,
									jobName: job.name,
									jobNumber: room.jobNumber,
									position: roomPosition,
									active: room.active,
									addRow: index === 0,
									roomCreatedAt: room.roomCreatedAt,
									heightFactor,
									yOffsetFactor,
									showText: index === workPeriodsWithIntervals.length - 1 || heightFactor === 1, // Show text for the earliest workPeriod
								};
							}
						);

						return processedWorkPeriods;
					})
			)
			.flat();

		const jobsByBuilder = roomsData.reduce((acc, job) => {
			if (!acc[job.builderId]) {
				acc[job.builderId] = [];
			}
			acc[job.builderId].push({
				...job,
				position: job.position,
			});
			return acc;
		}, {});

		// Sort and adjust dates for each builder's jobs
		Object.keys(jobsByBuilder).forEach((builderId) => {
			jobsByBuilder[builderId] = sortAndAdjustDates(
				jobsByBuilder[builderId],
				workdayHours,
				holidayChecker,
				holidays,
				undefined,
				undefined,
				timeOffByBuilder
			);
		});

		const flattenedJobs = Object.values(jobsByBuilder).flat();

		return { roomsData, flattenedJobs, jobsByBuilder };
	}, [jobs, holidayChecker, holidays, timeOffByBuilder]);

	// Calculate start and end dates
	const { earliestStartDate, latestStartDate } = useMemo(() => {
		return roomsData.reduce(
			(acc, job) => {
				const normalizedDate = normalizeDate(new Date(job.startDate));
				return {
					earliestStartDate: acc.earliestStartDate
						? acc.earliestStartDate < normalizedDate
							? acc.earliestStartDate
							: normalizedDate
						: normalizedDate,
					latestStartDate: acc.latestStartDate
						? acc.latestStartDate > normalizedDate
							? acc.latestStartDate
							: normalizedDate
						: normalizedDate,
				};
			},
			{ earliestStartDate: null, latestStartDate: null }
		);
	}, [roomsData]);

	const chartStartDate = useMemo(() => {
		return addDays(earliestStartDate, -daysBeforeStart);
	}, [earliestStartDate, daysBeforeStart]);

	const numDays = useMemo(() => {
		return (
			differenceInCalendarDays(latestStartDate, earliestStartDate) +
			daysBeforeStart +
			daysAfterEnd
		);
	}, [earliestStartDate, latestStartDate, daysBeforeStart, daysAfterEnd]);

	// Calculate timeOffData
	const timeOffData = useMemo(() => {
		const xPositions = new Map();
		return builders.flatMap((builder) =>
			builder.timeOff.flatMap((period) => {
				const periodStart = normalizeDate(new Date(period.start));
				const periodEnd = normalizeDate(new Date(period.end));
				const chartEndDate = addDays(normalizeDate(chartStartDate), numDays - 1);

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

	const handleRowDoubleClick = (job) => {
		setSelectedJob(job);
		setIsJobModalOpen(true);
	};

	const saveJob = () => {
		setIsJobModalOpen(false);
		setSelectedJob(null);
	};

	const countAllRooms = (jobs) => {
		return jobs.reduce((count, job) => count + job.rooms.length, 0);
	};

	const totalRooms = countAllRooms(jobs);

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

	const scrollToMonday = (date) => {
		const normalizedDate = normalizeDate(date);
		const mondayOfThisWeek = startOfWeek(new Date(normalizedDate), {
			weekStartsOn: 1,
		}); // 1 represents Monday
		const diffDays = differenceInCalendarDays(mondayOfThisWeek, chartStartDate);
		const scrollPosition = diffDays * dayWidth;
		const ganttRightBody = document.querySelector(".gantt-right-body");

		setTimeout(() => {
			if (ganttRightBody) {
				ganttRightBody.scrollTo({
					left: scrollPosition,
					behavior: "smooth",
				});
			}
		}, 50);
	};

	const calculateJobWidth = (
		jobStartDate,
		jobDuration,
		dayWidth,
		builderId
	) => {
		// Calculate the number of days (each workday is 8 hours)
		const totalDays =
			totalJobHours(
				jobStartDate,
				jobDuration,
				workdayHours,
				holidayChecker,
				holidays,
				builderId,
				timeOffByBuilder
			) / workdayHours;

		// Return the width based on the total number of days
		return totalDays * dayWidth;
	};

	const calculateXPosition = (jobStartDate, chartStartDate, dayWidth) => {
		const normalizedJobStartDate = normalizeDate(jobStartDate);
		const normalizedChartStartDate = normalizeDate(chartStartDate);
		const diffInDays = differenceInCalendarDays(
			normalizedJobStartDate,
			normalizedChartStartDate
		);
		return diffInDays * dayWidth;
	};

	useEffect(() => {
		const hd = new Holidays();
		hd.init("US"); // Initialize with US holidays. Change as needed.
		setHolidayChecker(hd);
	}, []);

	useEffect(() => {
		const chartSvg = d3.select(chartRef.current);
		chartSvg.selectAll("*").remove(); // Clear previous SVG content

		const leftColumnSvg = d3.select(leftColumnRef.current);
		leftColumnSvg.selectAll("*").remove();

		const leftHeaderSvg = d3.select(leftColumnHeaderRef.current);
		leftHeaderSvg.selectAll("*").remove();

		const headerSvg = d3.select(headerRef.current);
		headerSvg.selectAll("*").remove();

		const timeOffSvg = d3.select(timeOffSvgRef.current);
		timeOffSvg.selectAll("*").remove();

		const weekendColor = "#c1c1c1"; // Darker color for weekends
		const alternateRowColors = ["#f9f9f9", "#e0e0e0"]; // Alternating colors for rows
		const strokeColor = "#bebebe"; // stroke color

		const width = numDays * dayWidth;
		// const rowHeight = 30;

		const countActiveRooms = (jobs) => {
			return jobs.reduce(
				(total, job) => total + job.rooms.filter((room) => room.active).length,
				0
			);
		};

		const height = countActiveRooms(jobs) * rowHeight;

		// Create an array of dates for the column headers
		const dates = Array.from({ length: numDays }, (_, i) => {
			return addDays(chartStartDate, i);
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

		leftHeaderSvg.attr("width", leftColumnWidth).attr("height", 40);

		// Add the left column header with titles
		leftHeaderSvg.append("g").each(function () {
			const leftHeaderGroup = d3.select(this);

			// Job Number header
			leftHeaderGroup
				.append("text")
				.attr("x", 10) // Adjust x for alignment
				.attr("y", rowHeight / 2 + 6)
				.text("#")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");

			// Job Name header
			leftHeaderGroup
				.append("text")
				.attr("x", 50) // Adjust x for alignment
				.attr("y", rowHeight / 2 + 6)
				.text("Job")
				.attr("fill", "#000")
				.attr("font-weight", "bold")
				.attr("dominant-baseline", "middle");

			// Room Name header
			leftHeaderGroup
				.append("text")
				.attr("x", 130) // Adjust x for alignment
				.attr("y", rowHeight / 2 + 6)
				.text("Room")
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
			.style("cursor", "pointer")
			.each(function (d, i) {
				// Group for each header
				const group = d3.select(this);

				const isWeekend = d.getDay() === 0 || d.getDay() === 6;
				const isHolidayDate = isHoliday(d, holidayChecker, holidays);

				// Append a rectangle for weekends
				if (isWeekend || isHolidayDate) {
					group
						.append("rect")
						.attr("x", i * dayWidth)
						.attr("y", 0)
						.attr("width", dayWidth)
						.attr("height", 40) // Adjust to cover the header
						.attr("fill", isHolidayDate ? "lightblue" : "#e0e0e0"); // Light blue for holidays, grey for weekends
				}
				group
					.append("text")
					.attr("x", i * dayWidth + headerTextGap)
					.attr("y", 10)
					.text(d3.timeFormat("%b")(d))
					.attr("fill", "#000")
					.attr("font-size", "11px")
					.attr("font-weight", "bold")
					.attr("text-anchor", "left");
				group
					.append("text")
					.attr("x", i * dayWidth + headerTextGap)
					.attr("y", 25)
					.text(d3.timeFormat("%d")(d))
					.attr("fill", "#000")
					.attr("font-size", "11px")
					.attr("font-weight", "bold")
					.attr("text-anchor", "left");

				group
					.append("text")
					.attr("x", i * dayWidth + headerTextGap)
					.attr("y", 37) // Adjust vertical position for day of the week
					.text(d3.timeFormat("%a")(d))
					.attr("fill", "#000")
					.attr("font-size", "9px")
					.attr("font-weight", "bold")
					.attr("text-anchor", "left");

				// Add double-click event to the group
				group.on("dblclick", () => {
					scrollToMonday(d);
				});
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

		const activeRoomsData = roomsData.filter(
			(room) => room.active && room.addRow
		);

		leftColumnSvg.attr("width", leftColumnWidth).attr("height", height);

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
			.attr("width", leftColumnWidth)
			.attr("height", rowHeight)
			.attr("fill", (d) =>
				d.jobsIndex % 2 === 0 ? alternateRowColors[0] : alternateRowColors[1]
			); // Alternate colors

		const textGroups = leftColumnSvg
			.selectAll(".job-text-group")
			.data(activeRoomsData)
			.enter()
			.append("g")
			.attr("class", "job-text-group")
			.attr("transform", (d, i) => `translate(0, ${i * rowHeight})`)
			.attr("font-size", "12px")
			.attr("cursor", "pointer");

		textGroups.each(function (d) {
			const group = d3.select(this);

			const jobNumberText = group
				.append("text")
				.attr("class", "job-number")
				.attr("x", 10)
				.attr("y", rowHeight / 2)
				.text(d.jobNumber)
				.attr("fill", "#000")
				.attr("dominant-baseline", "middle");

			const jobNameText = group
				.append("text")
				.attr("class", "job-name")
				.attr("x", 50)
				.attr("y", rowHeight / 2)
				.text(d.jobName)
				.attr("fill", "#000")
				.attr("dominant-baseline", "middle");

			const roomNameText = group
				.append("text")
				.attr("class", "room-name")
				.attr("x", 130)
				.attr("y", rowHeight / 2)
				.text(d.name)
				.attr("fill", "#000")
				.attr("dominant-baseline", "middle");

			// Add double-click event for job number and job name
			jobNumberText.on("dblclick", (event) => {
				event.stopPropagation();
				const job = jobs.find((job) => job.id === d.jobId);
				setSelectedJob(job);
				setIsJobModalOpen(true);
			});

			jobNameText.on("dblclick", (event) => {
				event.stopPropagation();
				const job = jobs.find((job) => job.id === d.jobId);
				setSelectedJob(job);
				setIsJobModalOpen(true);
			});

			// Add double-click event for room name
			roomNameText.on("dblclick", (event) => {
				event.stopPropagation();
				scrollToMonday(new Date(d.startDate));
			});
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

		// Add holiday backgrounds
		chartSvg
			.selectAll(".holiday-background")
			.data(dates)
			.enter()
			.append("rect")
			.attr("class", "holiday-background")
			.attr("x", (d, i) => i * dayWidth)
			.attr("y", 0)
			.attr("width", dayWidth)
			.attr("height", activeRoomsData.length * rowHeight)
			.attr("fill", (d) =>
				isHoliday(d, holidayChecker, holidays) ? "lightblue" : "none"
			)
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

		const timeOffGroup = chartSvg.append("g").attr("class", "time-off-group");

		timeOffGroup
			.selectAll(".time-off-line")
			.data(timeOffData)
			.enter()
			.append("line")
			.attr("class", "time-off-line")
			.attr("x1", (d) => d.x + 3)
			.attr("y1", 0)
			.attr("x2", (d) => d.x + 3)
			.attr("y2", height)
			.attr("stroke", (d) => d.color)
			.attr("stroke-width", 6)
			.attr("opacity", 0.7);

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
	}, [
		jobs,
		dispatch,
		builders,
		totalRooms,
		chartStartDate,
		dayWidth,
		holidayChecker,
		holidays,
		numDays,
		roomsData,
		timeOffData,
	]);

	useEffect(() => {
		if (!chartRef.current) return;

		console.log("roomsData", roomsData);

		const chartSvg = d3.select(chartRef.current);

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

				// Update the dragged job
				const updatedDraggedJob = { ...d, startDate: newStartDate };

				// Get the current builder's jobs and update the dragged job
				const builderJobs = flattenedJobs.filter(
					(job) => job.builderId === d.builderId
				);
				const updatedBuilderJobs = builderJobs.map((job) =>
					job.id === d.id ? updatedDraggedJob : job
				);

				// Sort and adjust dates for the builder's jobs
				const sortedBuilderJobs = sortAndAdjustDates(
					updatedBuilderJobs,
					workdayHours,
					holidayChecker,
					holidays,
					d.id,
					newStartDate,
					timeOffByBuilder
				);

				console.log("sortedBuilderJobs", sortedBuilderJobs);

				// Transition all jobs in the builder group
				const jobGroups = chartSvg
					.selectAll(".job-group")
					.filter((job) => job.builderId === d.builderId)
					.data(sortedBuilderJobs, (job) => job.id);

				jobGroups
					.transition()
					.duration(300)
					.attr(
						"transform",
						(job) => `translate(0, ${job.position * rowHeight})`
					)
					.call((transition) => {
						transition
							.select("rect")
							.attr("x", (job) =>
								calculateXPosition(job.startDate, chartStartDate, dayWidth)
							)
							.attr("width", (job) =>
								calculateJobWidth(
									job.startDate,
									job.duration,
									dayWidth,
									job.builderId
								)
							);

						transition
							.select(".bar-text")
							.attr(
								"x",
								(job) =>
									calculateXPosition(job.startDate, chartStartDate, dayWidth) + 5
							);
					})
					.end()
					.then(() => {
						// Create a map to hold jobs by their index
						const jobMap = new Map();

						// Update jobs and populate jobMap
						flattenedJobs.forEach((workPeriod) => {
							const updatedWorkPeriod =
								sortedBuilderJobs.find((sj) => sj.id === workPeriod.id) ||
								workPeriod;

							if (!jobMap.has(updatedWorkPeriod.jobsIndex)) {
								jobMap.set(updatedWorkPeriod.jobsIndex, {
									id: updatedWorkPeriod.jobId,
									name: updatedWorkPeriod.jobName,
									rooms: [],
								});
							}

							let room = jobMap
								.get(updatedWorkPeriod.jobsIndex)
								.rooms.find((r) => r.id === updatedWorkPeriod.roomId);
							if (!room) {
								room = {
									id: updatedWorkPeriod.roomId,
									name: updatedWorkPeriod.name,
									jobNumber: updatedWorkPeriod.jobNumber,
									active: updatedWorkPeriod.active,
									roomCreatedAt: updatedWorkPeriod.roomCreatedAt,
									workPeriods: [],
								};
								jobMap.get(updatedWorkPeriod.jobsIndex).rooms.push(room);
							}

							room.workPeriods.push({
								id: updatedWorkPeriod.id,
								builderId: updatedWorkPeriod.builderId,
								startDate: normalizeDate(updatedWorkPeriod.startDate),
								duration: updatedWorkPeriod.duration,
							});
						});

						// Convert jobMap to array, sort by index, and sort rooms within each job by jobNumber
						const sortedFormattedJobs = Array.from(jobMap.entries())
							.sort(([indexA], [indexB]) => indexA - indexB)
							.map(([_, job]) => ({
								...job,
								rooms: job.rooms.sort((a, b) => {
									return new Date(a.roomCreatedAt) - new Date(b.roomCreatedAt);
								}),
							}));

						// Dispatch saveJobs action
						dispatch(saveJobs(sortedFormattedJobs));
					});

				d3.select(this).classed("dragging", false);

				delete d.dragStartX;
				delete d.dragStartEventX;
			});

		// Create or select the main job group
		let jobsGroup = chartSvg.select(".jobs-group");
		if (jobsGroup.empty()) {
			jobsGroup = chartSvg
				.append("g")
				.attr("class", "jobs-group")
				.style("cursor", "ew-resize");
		}

		// Bind data to job groups using localJobs
		const jobGroups = jobsGroup
			.selectAll(".job-group")
			.data(flattenedJobs, (d) => d.id);

		// Enter new elements
		const enterGroups = jobGroups
			.enter()
			.append("g")
			.attr("class", "job-group")
			.attr("transform", (d) => `translate(0, ${d.position * rowHeight})`)
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
			(d) => `translate(0, ${d.position * rowHeight})`
		);

		allGroups
			.select("rect")
			.attr("x", (d) => calculateXPosition(d.startDate, chartStartDate, dayWidth))
			.attr(
				"y",
				(d) => barMargin + (rowHeight - 2 * barMargin) * d.yOffsetFactor
			)
			.attr("width", (d) =>
				calculateJobWidth(d.startDate, d.duration, dayWidth, d.builderId)
			)
			.attr("height", (d) => (rowHeight - 2 * barMargin) * d.heightFactor)
			.attr(
				"fill",
				(d) => builders.find((builder) => builder.id === d.builderId).color
			);

		allGroups
			.select("text")
			.attr("class", "bar-text")
			.attr(
				"x",
				(d) => calculateXPosition(d.startDate, chartStartDate, dayWidth) + 5
			)
			.attr("y", rowHeight / 2)
			.text((d) => (d.showText ? `${d.name}` : ""))
			.attr("fill", "#ffffff")
			.style("text-shadow", "1px 1px 2px rgba(0, 0, 0, 0.5)")
			.style("display", (d) => (d.showText ? "block" : "none"));

		// Remove old elements
		jobGroups.exit().remove();

		// Apply drag behavior
		allGroups.select("rect").call(drag);

		// Event listeners
		allGroups
			.on("mouseover", function (event, d) {
				d3.select(this)
					.select(".bar-text")
					.text(`${d.name} - ${d.duration} hours`);
				// .style("text-shadow", "1px 1px 2px rgba(0, 0, 0, 0.6)");
			})
			.on("mouseout", function (event, d) {
				d3.select(this).select(".bar-text").text(d.name);
				// .style("text-shadow", "none");
			});
		setIsLoading(false);
	}, [
		flattenedJobs,
		builders,
		dayWidth,
		rowHeight,
		chartStartDate,
		dispatch,
		holidayChecker,
		workdayHours,
		holidays,
		timeOffByBuilder,
	]);

	useEffect(() => {
		scrollToMonday(new Date());
	}, []);

	useEffect(() => {
		let scrollLeft = 0;
		let scrollTop = 0;

		const handleBeforePrint = () => {
			const ganttRightBody = document.querySelector(".gantt-right-body");
			if (ganttRightBody) {
				scrollLeft = ganttRightBody.scrollLeft;
				scrollTop = ganttRightBody.scrollTop;
				document.documentElement.style.setProperty(
					"--print-translate-x",
					`-${scrollLeft}px`
				);
				document.documentElement.style.setProperty(
					"--print-translate-y",
					`-${scrollTop}px`
				);
			}
		};

		const handleAfterPrint = () => {
			const ganttRightBody = document.querySelector(".gantt-right-body");
			if (ganttRightBody) {
				ganttRightBody.scrollLeft = scrollLeft;
				ganttRightBody.scrollTop = scrollTop;
			}
		};

		window.addEventListener("beforeprint", handleBeforePrint);
		window.addEventListener("afterprint", handleAfterPrint);

		return () => {
			window.removeEventListener("beforeprint", handleBeforePrint);
			window.removeEventListener("afterprint", handleAfterPrint);
		};
	}, []);

	return (
		<div className="gantt-chart-container">
			<h1>Forever Furniture Job Schedule</h1>
			<div className="action-buttons">
				<button
					className="action-button scroll-to-today-button"
					onClick={() => scrollToMonday(new Date())}
				>
					Today
				</button>
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
					Builders
				</button>
				<button
					className="action-button manage-holidays-button"
					onClick={() => {
						setIsHolidayModalOpen(true);
					}}
				>
					Holidays
				</button>
			</div>
			<div className="gantt-container">
				<div className="gantt-content">
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
				<div className="gantt-footer">
					<BuilderLegend />
				</div>
			</div>

			{isLoading && (
				<div className="loading-overlay">
					<GridLoader color="maroon" size={15} />
					<p>Loading Job Schedule...</p>
				</div>
			)}

			<JobModal
				key={isJobModalOpen ? "open" : "closed"}
				isOpen={isJobModalOpen}
				onClose={() => {
					setSelectedJob(null);
					setIsJobModalOpen(false);
				}}
				onSave={saveJob}
				jobData={selectedJob}
				jobsByBuilder={jobsByBuilder}
				timeOffByBuilder={timeOffByBuilder}
				holidayChecker={holidayChecker}
				holidays={holidays}
				workdayHours={workdayHours}
			/>
			<BuilderModal
				visible={isBuilderModalOpen}
				onCancel={() => setIsBuilderModalOpen(false)}
			/>
			<HolidayModal
				isOpen={isHolidayModalOpen}
				onClose={() => setIsHolidayModalOpen(false)}
			/>
		</div>
	);
};

export default GanttChart;
