import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { updateNextJobNumber } from "../redux/actions/ganttActions";
import { addDays, format } from "date-fns";
import { normalizeDate } from "../utils/dateUtils";
import {
	getNextWorkday,
	sortAndAdjustDates,
	totalJobHours,
} from "../utils/helpers";
import {
	jobModalUpdateChartData,
	removeCompletedJobFromChart,
} from "../redux/actions/chartData";
import {
	jobModalUpdateTaskData,
	removeCompletedJobFromTasks,
} from "../redux/actions/taskData";
import { markProjectAsCompleted } from "../redux/actions/completedProjects";

const JobModal = ({
	isOpen,
	onClose,
	onSave,
	jobData,
	tasksByBuilder,
	timeOffByBuilder,
	holidayChecker,
	holidays,
	workdayHours,
	chartStartDate,
	dayWidth,
	lastJobsIndex,
	clickedTask,
	setIsLoading,
}) => {
	const dispatch = useDispatch();
	const builders = useSelector((state) => state.builders.builders);
	const employees = useSelector((state) => state.builders.employees);
	const jobNumberNext = useSelector((state) => state.chartData.nextJobNumber);

	const [jobName, setJobName] = useState("");
	const [localRooms, setLocalRooms] = useState([]);
	const [errors, setErrors] = useState({});
	const [localJobsByBuilder, setLocalJobsByBuilder] = useState({});
	const [changedTaskIds, setChangedTaskIds] = useState({});
	const [removedWorkPeriods, setRemovedWorkPeriods] = useState([]);
	const [showCompleteConfirmation, setShowCompleteConfirmation] =
		useState(false);
	const [completedJobData, setCompletedJobData] = useState(null);

	const [nextJobNumber, setNextJobNumber] = useState(null);

	const clickedTaskRef = useRef(null);
	const newTaskNameRef = useRef(null);
	const jobNameInputRef = useRef(null);

	const newProjectCreatedAt = useMemo(() => new Date().toISOString(), []);

	const formatDateForInput = (date) => {
		if (!date) return "";
		return format(new Date(date), "yyyy-MM-dd");
	};

	useEffect(() => {
		if (isOpen) {
			if (jobData && jobData.length > 0) {
				// Assuming all work periods have the same jobName
				setJobName(jobData[0].jobName || "");

				// Group work periods by roomId
				const roomMap = {};
				jobData.forEach((wp) => {
					if (!roomMap[wp.roomId]) {
						roomMap[wp.roomId] = {
							id: wp.roomId,
							taskName: wp.taskName,
							jobNumber: wp.jobNumber,
							jobId: wp.jobId,
							jobName: wp.jobName,
							roomCreatedAt: wp.roomCreatedAt,
							workPeriods: [],
							active: wp.active,
						};
					}

					roomMap[wp.roomId].workPeriods.push(wp);
				});

				// Convert the room map to an array of projects
				const projects = Object.values(roomMap);

				setLocalRooms(projects);
			} else {
				// Reset state for a new job
				setJobName("");
				setLocalRooms([]);
			}

			setLocalJobsByBuilder(tasksByBuilder);
			setNextJobNumber(jobNumberNext);
			setErrors({});
		}
		setChangedTaskIds(new Set());
		if (jobNameInputRef.current) {
			jobNameInputRef.current.focus();
		}
	}, [jobData, isOpen, tasksByBuilder, jobNumberNext]);

	useEffect(() => {
		if (isOpen && clickedTask) {
			// Delay focus to ensure ref is set
			setTimeout(() => {
				clickedTaskRef.current?.focus();
			}, 0);
		} else if (isOpen && jobNameInputRef.current) {
			jobNameInputRef.current.focus();
		}
	}, [isOpen, clickedTask]);

	const calculateNextAvailableDate = (builderId) => {
		const builderJobs = localJobsByBuilder[builderId] || [];

		let lastJobEndDate = normalizeDate(new Date());
		if (builderJobs.length > 0) {
			const lastJob = builderJobs[builderJobs.length - 1];
			const lastJobDuration =
				totalJobHours(
					lastJob.startDate,
					lastJob.duration,
					workdayHours,
					holidayChecker,
					holidays,
					builderId,
					timeOffByBuilder
				) / workdayHours;

			lastJobEndDate = normalizeDate(
				addDays(lastJob.startDate, lastJobDuration)
			);
		}

		return getNextWorkday(
			lastJobEndDate,
			holidayChecker,
			holidays,
			builderId,
			timeOffByBuilder
		);
	};

	const handleAddRoom = () => {
		const defaultBuilderId = employees[0].id;
		const newStartDate = normalizeDate(
			calculateNextAvailableDate(defaultBuilderId)
		);
		const createdAt = new Date().toISOString();

		const newWorkPeriod = {
			id: uuidv4(),
			jobId: localRooms[0]?.jobId || uuidv4(),
			roomId: uuidv4(),
			jobName: jobName,
			builderId: defaultBuilderId,
			startDate: normalizeDate(newStartDate),
			duration: workdayHours,
			workPeriodDuration: dayWidth,
			jobNumber: nextJobNumber.toString(),
			taskName: "",
			active: true,
			isNew: true,
			roomCreatedAt: createdAt,
			subTaskCreatedAt: createdAt,
			projectCreatedAt:
				localRooms[0]?.workPeriods[0].projectCreatedAt || newProjectCreatedAt,
			heightAdjust: 1,
			// workPeriodIndex: 0,
			// jobsIndex: jobData?.length > 0 ? jobData[0].jobsIndex : lastJobsIndex + 1,
		};

		const newTask = {
			id: newWorkPeriod.roomId,
			jobId: newWorkPeriod.jobId,
			jobName: newWorkPeriod.jobName,
			jobNumber: newWorkPeriod.jobNumber,
			taskName: newWorkPeriod.taskName,
			active: newWorkPeriod.active,
			isNew: newWorkPeriod.isNew,
			roomCreatedAt: newWorkPeriod.roomCreatedAt,
			workPeriods: [newWorkPeriod],
		};

		setLocalRooms((prevRooms) => [...prevRooms, newTask]);
		setLocalJobsByBuilder((prev) => ({
			...prev,
			[defaultBuilderId]: [...(prev[defaultBuilderId] || []), newWorkPeriod],
		}));
		setNextJobNumber((prevNumber) => prevNumber + 1);
		setChangedTaskIds((prev) => new Set(prev).add(newWorkPeriod.id));

		setErrors((prevErrors) => ({ ...prevErrors, general: undefined }));

		setTimeout(() => {
			if (newTaskNameRef.current) {
				newTaskNameRef.current.focus();
			}
		}, 0);
	};

	const handleInactiveRoom = (roomId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.id === roomId
					? {
							...room,
							active: false,
							workPeriods: room.workPeriods.map((wp) => ({
								...wp,
								active: false,
							})),
					  }
					: room
			)
		);

		// Find the room and mark all its work periods as changed
		const room = localRooms.find((r) => r.id === roomId);
		if (room) {
			room.workPeriods.forEach((wp) => {
				setChangedTaskIds((prev) => new Set(prev).add(wp.id));
				setRemovedWorkPeriods((prev) => [...prev, wp.id]);
			});
		}

		// Update localJobsByBuilder
		setLocalJobsByBuilder((prev) => {
			const updatedJobsByBuilder = { ...prev };
			Object.keys(updatedJobsByBuilder).forEach((builderId) => {
				updatedJobsByBuilder[builderId] = updatedJobsByBuilder[builderId].map(
					(job) =>
						job.id === roomId
							? {
									...job,
									active: false,
									workPeriods: job.workPeriods.map((wp) => ({
										...wp,
										active: false,
									})),
							  }
							: job
				);
			});
			return updatedJobsByBuilder;
		});
	};

	const handleCancelNewRoom = (roomId) => {
		// Find the room first to get all its work periods
		const roomToRemove = localRooms.find((room) => room.id === roomId);

		if (roomToRemove) {
			// If this was the latest job number, decrement the nextJobNumber
			if (roomToRemove.jobNumber === (nextJobNumber - 1).toString()) {
				setNextJobNumber((prev) => prev - 1);
			}

			// Remove the room from localRooms
			setLocalRooms((prevRooms) =>
				prevRooms.filter((room) => room.id !== roomId)
			);

			// Remove all work periods from localJobsByBuilder
			setLocalJobsByBuilder((prev) => {
				const updatedJobsByBuilder = { ...prev };

				// For each work period in the room
				roomToRemove.workPeriods.forEach((wp) => {
					const builderId = wp.builderId;
					if (updatedJobsByBuilder[builderId]) {
						updatedJobsByBuilder[builderId] = updatedJobsByBuilder[
							builderId
						].filter((job) => job.id !== wp.id);
					}
				});

				return updatedJobsByBuilder;
			});

			// Remove all work periods from changedTaskIds
			setChangedTaskIds((prev) => {
				const newSet = new Set(prev);
				roomToRemove.workPeriods.forEach((wp) => {
					newSet.delete(wp.id);
				});
				return newSet;
			});

			// Remove all work periods from removedWorkPeriods
			setRemovedWorkPeriods((prev) =>
				prev.filter(
					(id) => !roomToRemove.workPeriods.some((wp) => wp.id === id)
				)
			);
		}
	};

	const handleAddWorkPeriod = (roomId, prevBuilderId = "1") => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) => {
				if (room.id === roomId) {
					const newStartDate = normalizeDate(
						calculateNextAvailableDate(prevBuilderId)
					);
					const newWorkPeriod = {
						id: uuidv4(),
						jobId: room.jobId,
						jobName: room.jobName,
						jobNumber: room.jobNumber,
						taskName: room.taskName,
						roomId: room.id,
						builderId: prevBuilderId,
						startDate: normalizeDate(newStartDate),
						duration: workdayHours,
						active: true,
						isNew: true,
						roomCreatedAt: room.roomCreatedAt,
						projectCreatedAt:
							localRooms[0]?.workPeriods[0].projectCreatedAt ||
							newProjectCreatedAt,
						subTaskCreatedAt: new Date().toISOString(),
						workPeriodDuration: dayWidth,
						heightAdjust: 0,
					};

					const updatedWorkPeriods = [
						...room.workPeriods.map((wp, index) => ({
							...wp,
							heightAdjust: index === 0 ? room.workPeriods.length + 1 : 0,
						})),
						newWorkPeriod,
					];

					// Update localJobsByBuilder
					setLocalJobsByBuilder((prev) => ({
						...prev,
						[prevBuilderId]: (prev[prevBuilderId] || []).map((job) =>
							job.id === roomId
								? { ...job, workPeriods: updatedWorkPeriods }
								: job
						),
					}));

					setChangedTaskIds((prev) => new Set(prev).add(newWorkPeriod.id));

					return {
						...room,
						workPeriods: updatedWorkPeriods,
					};
				}
				return room;
			})
		);
	};

	const handleRemoveWorkPeriod = (roomId, workPeriodId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) => {
				if (room.id === roomId) {
					const updatedWorkPeriods = room.workPeriods
						.filter((wp) => wp.id !== workPeriodId)
						.map((wp, index) => ({
							...wp,
							heightAdjust: index === 0 ? room.workPeriods.length - 1 : 0,
						}));

					// Update localJobsByBuilder
					setLocalJobsByBuilder((prev) => ({
						...prev,
						[room.builderId]: (prev[room.builderId] || []).map((job) =>
							job.id === roomId
								? { ...job, workPeriods: updatedWorkPeriods }
								: job
						),
					}));

					setRemovedWorkPeriods((prev) => [...prev, workPeriodId]);

					setChangedTaskIds((prev) => new Set(prev).add(workPeriodId));

					return {
						...room,
						workPeriods: updatedWorkPeriods,
					};
				}
				return room;
			})
		);
	};

	const handleWorkPeriodChange = (roomId, workPeriodId, changes) => {
		setLocalRooms((prevRooms) => {
			return prevRooms.map((room) => {
				if (room.id === roomId) {
					const updatedWorkPeriods = room.workPeriods.map((wp) => {
						if (wp.id === workPeriodId) {
							const updatedWp = { ...wp, ...changes };

							// If builderId is changed, update the startDate
							if (changes.builderId && changes.builderId !== wp.builderId) {
								const newStartDate = normalizeDate(
									calculateNextAvailableDate(changes.builderId)
								);
								updatedWp.startDate = normalizeDate(newStartDate);
							}

							// Handle startDate change
							if (changes.startDate) {
								updatedWp.startDate = normalizeDate(changes.startDate);
							}

							// Handle duration change
							if (changes.duration) {
								updatedWp.duration = parseFloat(changes.duration);
							}

							// Handle taskName change
							if (changes.taskName !== undefined) {
								updatedWp.taskName = changes.taskName.trim();
							}

							setChangedTaskIds((prev) => new Set(prev).add(workPeriodId));
							return updatedWp;
						}
						return wp;
					});

					// If jobNumber, name, or startDate is changed for the first work period, update all work periods in the room
					if (
						(changes.jobNumber !== undefined ||
							changes.taskName !== undefined ||
							changes.startDate) &&
						workPeriodId === room.workPeriods[0].id
					) {
						updatedWorkPeriods.forEach((wp) => {
							wp.jobNumber =
								changes.jobNumber !== undefined
									? changes.jobNumber
									: wp.jobNumber;
							wp.taskName =
								changes.taskName !== undefined ? changes.taskName : wp.taskName;
							setChangedTaskIds((prev) => new Set(prev).add(wp.id));
						});

						// Also update the room's jobNumber and name
						room.jobNumber =
							changes.jobNumber !== undefined
								? changes.jobNumber
								: room.jobNumber;
						room.taskName =
							changes.taskName !== undefined ? changes.taskName : room.taskName;
					}

					return { ...room, workPeriods: updatedWorkPeriods };
				}
				return room;
			});
		});

		// Clear errors for the changed fields
		setErrors((prevErrors) => {
			const updatedErrors = { ...prevErrors };
			Object.keys(changes).forEach((key) => {
				// Clear errors for all work periods in the room for shared fields
				if (key === "jobNumber" || key === "taskName") {
					Object.keys(updatedErrors).forEach((errorKey) => {
						if (
							errorKey.startsWith(`${roomId}-`) &&
							errorKey.endsWith(`-${key}`)
						) {
							delete updatedErrors[errorKey];
						}
					});
				} else {
					// Clear error for the specific work period
					delete updatedErrors[`${roomId}-${workPeriodId}-${key}`];
				}
			});

			// Check if the changed field is now valid and remove the error if it is
			if (changes.taskName !== undefined && changes.taskName.trim() !== "") {
				delete updatedErrors[`${roomId}-${workPeriodId}-name`];
			}
			if (changes.jobNumber !== undefined && changes.jobNumber.trim() !== "") {
				delete updatedErrors[`${roomId}-${workPeriodId}-jobNumber`];
			}
			if (
				changes.duration !== undefined &&
				!isNaN(changes.duration) &&
				Number(changes.duration) > 0
			) {
				delete updatedErrors[`${roomId}-${workPeriodId}-duration`];
			}
			if (changes.builderId !== undefined) {
				delete updatedErrors[`${roomId}-${workPeriodId}-builderId`];
			}
			if (changes.startDate !== undefined) {
				delete updatedErrors[`${roomId}-${workPeriodId}-startDate`];
			}

			return updatedErrors;
		});

		// If builderId is changed, update localJobsByBuilder
		if (changes.builderId) {
			setLocalJobsByBuilder((prev) => {
				const workPeriod = localRooms
					.flatMap((r) => r.workPeriods)
					.find((wp) => wp.id === workPeriodId);
				if (!workPeriod) return prev;

				const oldBuilderId = workPeriod.builderId;
				const newBuilderId = changes.builderId;

				const newStartDate = normalizeDate(
					calculateNextAvailableDate(newBuilderId)
				);

				const updatedWorkPeriod = {
					...workPeriod,
					builderId: newBuilderId,
					startDate: normalizeDate(newStartDate),
					...changes,
				};

				return {
					...prev,
					[oldBuilderId]: prev[oldBuilderId].filter(
						(wp) => wp.id !== workPeriodId
					),
					[newBuilderId]: [...(prev[newBuilderId] || []), updatedWorkPeriod],
				};
			});
		}
	};

	const handleRestoreRoom = (roomId) => {
		setLocalRooms((prevRooms) => {
			const roomToRestore = prevRooms.find((room) => room.id === roomId);
			if (!roomToRestore) return prevRooms;

			const updatedRooms = prevRooms.filter((room) => room.id !== roomId);
			const restoredRoom = {
				...roomToRestore,
				active: true,
				workPeriods: roomToRestore.workPeriods.map((wp) => ({
					...wp,
					active: true,
				})),
			};

			// Find the correct index to insert the restored room
			const insertIndex = updatedRooms.findIndex(
				(room) =>
					new Date(room.roomCreatedAt) > new Date(restoredRoom.roomCreatedAt)
			);

			if (insertIndex === -1) {
				// If no room with a later creation date is found, add to the end
				updatedRooms.push(restoredRoom);
			} else {
				// Insert the restored room at the correct position
				updatedRooms.splice(insertIndex, 0, restoredRoom);
			}

			return updatedRooms;
		});

		// Find the room and mark all its work periods as changed
		const room = localRooms.find((r) => r.id === roomId);
		if (room) {
			room.workPeriods.forEach((wp) => {
				setChangedTaskIds((prev) => new Set(prev).add(wp.id));
				setRemovedWorkPeriods((prev) => prev.filter((id) => id !== wp.id));
			});
		}

		// Update localJobsByBuilder
		setLocalJobsByBuilder((prev) => {
			const updatedJobsByBuilder = { ...prev };
			Object.keys(updatedJobsByBuilder).forEach((builderId) => {
				updatedJobsByBuilder[builderId] = updatedJobsByBuilder[builderId].map(
					(job) =>
						job.id === roomId
							? {
									...job,
									active: true,
									workPeriods: job.workPeriods.map((wp) => ({
										...wp,
										active: true,
									})),
							  }
							: job
				);
			});
			return updatedJobsByBuilder;
		});

		setErrors((prevErrors) => ({ ...prevErrors, general: undefined }));
	};

	const sortAndAdjustBuilderTasks = (tasks, buildersToUpdate) => {
		const updatedBuilderArrays = {};
		const updatedTasks = [...tasks];

		buildersToUpdate.forEach((builderId) => {
			const builderTasks = tasks.filter(
				(task) => task.builderId === builderId && task.active
			);

			const sortedBuilderTasks = sortAndAdjustDates(
				builderTasks,
				workdayHours,
				holidayChecker,
				holidays,
				null,
				null,
				timeOffByBuilder,
				dayWidth,
				chartStartDate
			);

			updatedBuilderArrays[builderId] = sortedBuilderTasks;

			sortedBuilderTasks.forEach((sortedTask) => {
				const index = updatedTasks.findIndex(
					(task) => task.id === sortedTask.id
				);
				if (index !== -1) {
					updatedTasks[index] = sortedTask;
				} else {
					updatedTasks.push(sortedTask);
				}
			});
		});

		return { updatedTasks, updatedBuilderArrays };
	};

	const handleCompleteJob = () => {
		const formattedCompletedJob = {
			id: localRooms[0].jobId, // Assuming all rooms in a job have the same jobId
			name: jobName,
			completedOn: new Date().toISOString(), // Current date as completion date
			rooms: localRooms.map((task) => ({
				id: task.id,
				jobNumber: task.jobNumber,
				taskName: task.taskName,
				active: task.active,
				roomCreatedAt: task.roomCreatedAt,
				projectCreatedAt: task.projectCreatedAt,
				subTaskCreatedAt: task.subTaskCreatedAt,
			})),
		};
		setShowCompleteConfirmation(true);
		setCompletedJobData(formattedCompletedJob);
	};

	const confirmCompleteJob = () => {
		dispatch(markProjectAsCompleted(completedJobData));

		// Get all tasks for the completed job
		const completedProjectTasks = localRooms.flatMap(
			(room) => room.workPeriods
		);

		// Get unique builders involved in this job
		const buildersInvolvedInJob = new Set(
			completedProjectTasks.map((task) => task.builderId)
		);

		// Get all tasks (including those not in this job)
		const allTasks = Object.values(localJobsByBuilder).flat();

		// Remove completed job tasks
		const remainingTasks = allTasks.filter(
			(task) => task.jobId !== completedJobData.id
		);

		// Sort and adjust dates for affected builders
		const { updatedTasks, updatedBuilderArrays } = sortAndAdjustBuilderTasks(
			remainingTasks,
			buildersInvolvedInJob
		);

		// Update chart and task data
		dispatch(
			jobModalUpdateChartData(
				updatedTasks,
				completedProjectTasks.map((task) => task.id)
			)
		);
		dispatch(
			jobModalUpdateTaskData(
				updatedTasks,
				updatedBuilderArrays,
				completedProjectTasks.map((task) => task.id)
			)
		);

		setShowCompleteConfirmation(false);
		onClose();
	};

	const cancelCompleteJob = () => {
		setShowCompleteConfirmation(false);
	};

	const handleSave = () => {
		let newErrors = {};

		// Create a map of original tasks for quick lookup, including their original index
		const originalTasksMap = new Map(
			jobData?.map((task, index) => [
				task.id,
				{ ...task, originalIndex: index },
			])
		);

		// Check for blank job name
		if (jobName.trim() === "") {
			newErrors.jobName = "Job name is required";
		}

		// Check if at least one room is active
		const activeRoomsExist = localRooms.some((room) => room.active);
		if (!activeRoomsExist) {
			newErrors.general = "At least one active room is required";
		}

		// Check for all potential errors in rooms and work periods
		localRooms.forEach((room) => {
			const isRoomChanged = room.workPeriods.some((wp) =>
				changedTaskIds.has(wp.id)
			);
			const isNewRoom = !originalTasksMap.has(room.workPeriods[0].id);

			if (isRoomChanged || isNewRoom) {
				room.workPeriods.forEach((workPeriod, index) => {
					if (index === 0) {
						// Validate job number (only for the first work period in each room)
						if (!room.jobNumber || room.jobNumber.trim() === "") {
							newErrors[`${room.id}-${workPeriod.id}-jobNumber`] =
								"Job number is required";
						}

						// Validate room name (only for the first work period in each room)
						if (!room.taskName || room.taskName.trim() === "") {
							newErrors[`${room.id}-${workPeriod.id}-name`] =
								"Room name is required";
						}
					}

					if (changedTaskIds.has(workPeriod.id) || isNewRoom) {
						// Validate duration for changed or new work periods
						if (
							workPeriod.duration === "" ||
							workPeriod.duration === undefined ||
							isNaN(workPeriod.duration)
						) {
							newErrors[`${room.id}-${workPeriod.id}-duration`] =
								"Valid duration is required";
						} else if (Number(workPeriod.duration) <= 0) {
							newErrors[`${room.id}-${workPeriod.id}-duration`] =
								"Duration must be greater than 0";
						}

						// Validate builderId for changed or new work periods
						if (!workPeriod.builderId) {
							newErrors[`${room.id}-${workPeriod.id}-builderId`] =
								"Builder is required";
						}

						// Validate startDate for changed or new work periods
						if (!workPeriod.startDate) {
							newErrors[`${room.id}-${workPeriod.id}-startDate`] =
								"Start date is required";
						}
					}
				});
			}
		});

		// If there are any errors, set them and don't save
		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);

			// Find the first error
			const firstErrorId = Object.keys(newErrors)[0];

			// Use setTimeout to ensure the DOM has updated before we try to focus
			setTimeout(() => {
				const firstErrorElement = document.getElementById(firstErrorId);
				if (firstErrorElement) {
					firstErrorElement.focus();
				}
			}, 0);
			return;
		}

		setIsLoading(true);

		const updatedTasks = localRooms.flatMap((room) =>
			room.workPeriods.map((wp) => ({
				...wp,
				active: room.active,
				jobName: jobName,
			}))
		);

		const changedTaskIdsSet = new Set(changedTaskIds);
		const buildersWithChanges = new Set();
		const updatedBuilderArrays = {};

		updatedTasks?.forEach((task) => {
			if (changedTaskIdsSet.has(task.id)) {
				buildersWithChanges.add(task.builderId);

				// Check if the builder has changed
				const originalTask = originalTasksMap.get(task.id);
				if (originalTask && originalTask.builderId !== task.builderId) {
					// Add both the previous and new builders to buildersWithChanges
					buildersWithChanges.add(originalTask.builderId);
					buildersWithChanges.add(task.builderId);
				}
			}
		});

		removedWorkPeriods.forEach((removedId) => {
			const originalTask = originalTasksMap.get(removedId);
			if (originalTask) {
				buildersWithChanges.add(originalTask.builderId);
			}
		});
		// Apply sortAndAdjustDates for builders with changes
		buildersWithChanges.forEach((builderId) => {
			// Combine updated tasks with existing tasks from localJobsByBuilder
			const existingBuilderTasks = localJobsByBuilder[builderId] || [];
			const updatedBuilderTasks = updatedTasks.filter(
				(task) => task.builderId === builderId
			);

			// Create a set of updated task IDs for efficient lookup
			const updatedTaskIds = new Set(
				updatedBuilderTasks.map((task) => task.id)
			);

			// Combine tasks, replacing existing tasks with updated ones, and filter out removed work periods
			const combinedBuilderTasks = [
				...existingBuilderTasks.filter(
					(task) =>
						!updatedTaskIds.has(task.id) &&
						!removedWorkPeriods.includes(task.id)
				),
				...updatedBuilderTasks,
			];

			const sortedBuilderTasks = sortAndAdjustDates(
				combinedBuilderTasks.filter((task) => task.active),
				workdayHours,
				holidayChecker,
				holidays,
				null,
				null,
				timeOffByBuilder,
				dayWidth,
				chartStartDate
			);

			// Store the updated builder array
			updatedBuilderArrays[builderId] = sortedBuilderTasks;

			// Update the tasks in updatedTasks with the sorted and adjusted data
			sortedBuilderTasks.forEach((sortedTask) => {
				const index = updatedTasks.findIndex((task) => {
					return task?.id === sortedTask.id;
				});
				if (index !== -1) {
					updatedTasks[index] = sortedTask;
				} else {
					updatedTasks.push(sortedTask);
				}
			});
		});

		dispatch(jobModalUpdateChartData(updatedTasks, removedWorkPeriods));
		dispatch(
			jobModalUpdateTaskData(
				updatedTasks,
				updatedBuilderArrays,
				removedWorkPeriods
			)
		);
		dispatch(updateNextJobNumber(nextJobNumber));
		onSave();
		onClose();
	};

	if (!isOpen) return null;

	const activeRooms = localRooms.filter((room) => room.active);
	const inactiveRooms = localRooms.filter((room) => !room.active);

	return (
		<div className="modal-overlay">
			<div className="modal-content">
				{jobData && (
					<button
						className="modal-action-button complete-job"
						onClick={handleCompleteJob}
					>
						Complete Job
					</button>
				)}
				<div className="modal-header">
					<h2>{jobData ? "Edit Job" : "Add New Job"}</h2>
				</div>
				<input
					id={"jobName"}
					type="text"
					value={jobName}
					onChange={(e) => {
						setErrors((prevErrors) => ({ ...prevErrors, jobName: undefined }));
						setJobName(e.target.value);
					}}
					placeholder="Job Name"
					className={errors.jobName ? "error" : ""}
					ref={jobNameInputRef}
				/>

				<h3>Active Rooms</h3>
				<div className="roomGroup header">
					<span>Job</span>
					<span>Room Name</span>
					<span>Hours</span>
					<span>Builder</span>
					<span>Start Date</span>
					<span>Actions</span>
				</div>

				{activeRooms.map((room, index) => (
					<div
						key={room.id}
						className={`roomContainer ${index % 2 === 0 ? "even" : "odd"}`}
					>
						{room.workPeriods.map((workPeriod, index) => (
							<div key={workPeriod.id} className="roomGroup">
								{index === 0 ? (
									<input
										id={`${room.id}-${workPeriod.id}-jobNumber`}
										type="text"
										value={room.jobNumber || ""}
										onChange={(e) =>
											handleWorkPeriodChange(room.id, workPeriod.id, {
												jobNumber: e.target.value,
											})
										}
										placeholder="Job Number"
										className={`job-number-input ${
											errors[`${room.id}-${workPeriod.id}-jobNumber`]
												? "error"
												: ""
										}`}
									/>
								) : (
									<span className="job-number-input">
										{index === 0 ? room.jobNumber : `${room.jobNumber}`}
									</span>
								)}
								{index === 0 ? (
									<input
										id={`${room.id}-${workPeriod.id}-name`}
										type="text"
										value={room.taskName}
										onChange={(e) =>
											handleWorkPeriodChange(room.id, workPeriod.id, {
												taskName: e.target.value,
											})
										}
										placeholder="Room Name"
										className={`room-name-input ${
											errors[`${room.id}-${workPeriod.id}-name`] ? "error" : ""
										}`}
										ref={
											clickedTask?.id === workPeriod.id
												? clickedTaskRef
												: index === 0
												? newTaskNameRef
												: null
										}
									/>
								) : (
									<span className="room-name-input">{room.taskName}</span>
								)}
								<input
									id={`${room.id}-${workPeriod.id}-duration`}
									type="number"
									step="0.01"
									min="0.01"
									value={workPeriod.duration || ""}
									onChange={(e) => {
										handleWorkPeriodChange(room.id, workPeriod.id, {
											duration: parseFloat(e.target.value).toFixed(2),
										});
									}}
									placeholder="Hours"
									className={`duration-input ${
										errors[`${room.id}-${workPeriod.id}-duration`]
											? "error"
											: ""
									}`}
								/>
								<select
									id={`${room.id}-${workPeriod.id}-builderId`}
									value={workPeriod.builderId}
									onChange={(e) => {
										handleWorkPeriodChange(room.id, workPeriod.id, {
											builderId: e.target.value,
										});
									}}
									className={`builder-select ${
										errors[`${room.id}-${workPeriod.id}-builderId`]
											? "error"
											: ""
									}`}
								>
									{employees.map((builder) => (
										<option key={builder.id} value={builder.id}>
											{builder.employee_name}
										</option>
									))}
								</select>
								<input
									id={`${room.id}-${workPeriod.id}-startDate`}
									type="date"
									value={formatDateForInput(workPeriod.startDate)}
									onChange={(e) =>
										handleWorkPeriodChange(room.id, workPeriod.id, {
											startDate: e.target.value,
										})
									}
									className={`date-input ${
										errors[`${room.id}-${workPeriod.id}-startDate`]
											? "error"
											: ""
									}`}
								/>

								{index === 0 ? (
									<div className="room-buttons">
										<button
											onClick={() =>
												handleAddWorkPeriod(
													room.id,
													room.workPeriods[0]?.builderId
												)
											}
											className="modal-action-button add add-button"
										>
											+ Slot
										</button>
										{room.isNew ? (
											<button
												className="modal-action-button cancel"
												onClick={() => handleCancelNewRoom(room.id)}
											>
												Cancel
											</button>
										) : (
											<button
												className="modal-action-button remove"
												onClick={() => handleInactiveRoom(room.id)}
											>
												- Room
											</button>
										)}
									</div>
								) : (
									<div className="room-buttons">
										<button
											onClick={() =>
												handleRemoveWorkPeriod(room.id, workPeriod.id)
											}
											className="modal-action-button remove remove-button"
										>
											- Slot
										</button>
									</div>
								)}
							</div>
						))}
					</div>
				))}
				<button
					onClick={handleAddRoom}
					className="modal-action-button add add-room-button"
				>
					Add Room
				</button>

				{inactiveRooms.length > 0 && (
					<>
						<h3>Inactive Rooms</h3>
						{inactiveRooms.map((room) => (
							<div key={room.id} className="roomGroup inactive">
								<span>{room.jobNumber}</span>
								<span>{room.taskName}</span>
								<button
									className="modal-action-button save restore-room-button"
									onClick={() => handleRestoreRoom(room.id)}
								>
									Restore
								</button>
							</div>
						))}
					</>
				)}

				{errors.rooms && <div className="error">{errors.rooms}</div>}

				<div className="modal-actions">
					<button className="modal-action-button cancel" onClick={onClose}>
						Cancel
					</button>
					<button className="modal-action-button save" onClick={handleSave}>
						Save
					</button>
				</div>
				{errors.general && (
					<div className="error general-error">{errors.general}</div>
				)}

				{showCompleteConfirmation && (
					<div className="confirmation-overlay">
						<div className="confirmation-popup">
							<h3>Are you sure you want to complete this job?</h3>
							<p>If yes, it will be removed from the schedule.</p>
							<div className="confirmation-actions">
								<button onClick={confirmCompleteJob}>Yes, Complete Job</button>
								<button onClick={cancelCompleteJob}>Cancel</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default JobModal;
