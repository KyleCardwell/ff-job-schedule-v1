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
import { saveProject } from "../redux/actions/projects";

const JobModal = ({
	isOpen,
	onClose,
	onSave,
	jobData,
	subTasksByEmployee,
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
				// Assuming all work periods have the same project_name
				setJobName(jobData[0].project_name || "");

				// Group work periods by task_id
				const roomMap = {};
				jobData.forEach((wp) => {
					if (!roomMap[wp.task_id]) {
						roomMap[wp.task_id] = {
							task_id: wp.task_id,
							task_name: wp.task_name,
							task_number: wp.task_number,
							project_id: wp.project_id,
							project_name: wp.project_name,
							task_created_at: wp.task_created_at,
							workPeriods: [],
							task_active: wp.task_active,
						};
					}

					roomMap[wp.task_id].workPeriods.push(wp);
				});

				// Convert the room map to an array of projects
				const localProjects = Object.values(roomMap);
				setLocalRooms(localProjects);
			} else {
				// Reset state for a new job
				setJobName("");
				setLocalRooms([]);
			}

			setLocalJobsByBuilder(subTasksByEmployee);
			setNextJobNumber(jobNumberNext);
			setErrors({});
		}
		setChangedTaskIds(new Set());
		if (jobNameInputRef.current) {
			jobNameInputRef.current.focus();
		}
	}, [jobData, isOpen, subTasksByEmployee, jobNumberNext]);

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

	const calculateNextAvailableDate = (employee_id) => {
		const builderJobs = localJobsByBuilder[employee_id] || [];

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
					employee_id,
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
			employee_id,
			timeOffByBuilder
		);
	};

	const handleAddRoom = () => {
		const defaultBuilderId = employees[0].employee_id;
		const newStartDate = normalizeDate(
			calculateNextAvailableDate(defaultBuilderId)
		);
		const createdAt = new Date().toISOString();

		const newWorkPeriod = {
			subTask_id: uuidv4(),
			project_id: localRooms[0]?.project_id,
			task_id: uuidv4(),
			project_name: jobName,
			employee_id: defaultBuilderId,
			startDate: normalizeDate(newStartDate),
			duration: workdayHours,
			subTask_width: dayWidth,
			task_number: nextJobNumber.toString(),
			task_name: "",
			task_active: true,
			isNew: true,
			task_created_at: createdAt,
			subTask_created_at: createdAt,
			project_created_at:
				localRooms[0]?.workPeriods[0]?.project_created_at || newProjectCreatedAt,
			heightAdjust: 1,
		};

		const newTask = {
			task_id: newWorkPeriod.task_id,
			project_id: newWorkPeriod.project_id,
			project_name: newWorkPeriod.project_name,
			task_number: newWorkPeriod.task_number,
			task_name: newWorkPeriod.task_name,
			task_active: newWorkPeriod.task_active,
			isNew: newWorkPeriod.isNew,
			task_created_at: newWorkPeriod.task_created_at,
			workPeriods: [newWorkPeriod],
		};

		console.log("New local rooms", [...localRooms, newTask]);
		setLocalRooms((prevRooms) => [...prevRooms, newTask]);
		setLocalJobsByBuilder((prev) => ({
			...prev,
			[defaultBuilderId]: [...(prev[defaultBuilderId] || []), newWorkPeriod],
		}));
		setNextJobNumber((prevNumber) => prevNumber + 1);
		setChangedTaskIds((prev) => new Set(prev).add(newWorkPeriod.subTask_id));

		setErrors((prevErrors) => ({ ...prevErrors, general: undefined }));

		setTimeout(() => {
			if (newTaskNameRef.current) {
				newTaskNameRef.current.focus();
			}
		}, 0);
	};

	const handleInactiveRoom = (task_id) => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.task_id === task_id
					? {
							...room,
							task_active: false,
							workPeriods: room.workPeriods.map((wp) => ({
								...wp,
								task_active: false,
							})),
					  }
					: room
			)
		);

		// Find the room and mark all its work periods as changed
		const room = localRooms.find((r) => r.task_id === task_id);
		if (room) {
			room.workPeriods.forEach((wp) => {
				setChangedTaskIds((prev) => new Set(prev).add(wp.subTask_id));
			});
		}

		// Update localJobsByBuilder
		setLocalJobsByBuilder((prev) => {
			const updatedJobsByBuilder = { ...prev };
			Object.keys(updatedJobsByBuilder).forEach((employee_id) => {
				updatedJobsByBuilder[employee_id] = updatedJobsByBuilder[
					employee_id
				].map((job) =>
					job.task_id === task_id
						? {
								...job,
								task_active: false,
						  }
						: job
				);
			});
			return updatedJobsByBuilder;
		});
	};

	const handleCancelNewRoom = (task_id) => {
		// Find the room first to get all its work periods
		const roomToRemove = localRooms.find((room) => room.task_id === task_id);

		if (roomToRemove) {
			// If this was the latest job number, decrement the nextJobNumber
			if (roomToRemove.task_number === (nextJobNumber - 1).toString()) {
				setNextJobNumber((prev) => prev - 1);
			}

			// Remove the room from localRooms
			setLocalRooms((prevRooms) =>
				prevRooms.filter((room) => room.task_id !== task_id)
			);

			// Remove all work periods from localJobsByBuilder
			setLocalJobsByBuilder((prev) => {
				const updatedJobsByBuilder = { ...prev };

				// For each work period in the room
				roomToRemove.workPeriods.forEach((wp) => {
					const employee_id = wp.employee_id;
					if (updatedJobsByBuilder[employee_id]) {
						updatedJobsByBuilder[employee_id] = updatedJobsByBuilder[
							employee_id
						].filter((job) => job.subTask_id !== wp.subTask_id);
					}
				});

				return updatedJobsByBuilder;
			});

			// Remove all work periods from changedTaskIds
			setChangedTaskIds((prev) => {
				const newSet = new Set(prev);
				roomToRemove.workPeriods.forEach((wp) => {
					newSet.delete(wp.subTask_id);
				});
				return newSet;
			});

			// Remove all work periods from removedWorkPeriods
			setRemovedWorkPeriods((prev) =>
				prev.filter(
					(id) => !roomToRemove.workPeriods.some((wp) => wp.subTask_id === id)
				)
			);
		}
	};

	const handleAddWorkPeriod = (task_id, prevBuilderId = "1") => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) => {
				if (room.task_id === task_id) {
					const newStartDate = normalizeDate(
						calculateNextAvailableDate(prevBuilderId)
					);
					const newWorkPeriod = {
						subTask_id: uuidv4(),
						project_id: room.project_id,
						project_name: room.project_name,
						task_number: room.task_number,
						task_name: room.task_name,
						task_id: room.task_id,
						employee_id: prevBuilderId,
						startDate: normalizeDate(newStartDate),
						duration: workdayHours,
						task_active: true,
						isNew: true,
						task_created_at: room.task_created_at,
						project_created_at:
							localRooms[0]?.workPeriods[0]?.project_created_at ||
							newProjectCreatedAt,
						subTask_created_at: new Date().toISOString(),
						subTask_width: dayWidth,
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
							job.task_id === task_id
								? { ...job, workPeriods: updatedWorkPeriods }
								: job
						),
					}));

					setChangedTaskIds((prev) => {
						const newSet = new Set(prev);
						newSet.add(newWorkPeriod.subTask_id);
						newSet.add(room.workPeriods[0].subTask_id); // Add first work period
						return newSet;
					});

					return {
						...room,
						workPeriods: updatedWorkPeriods,
					};
				}
				return room;
			})
		);
	};

	const handleRemoveWorkPeriod = (task_id, workPeriodId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) => {
				if (room.task_id === task_id) {
					const updatedWorkPeriods = room.workPeriods
						.filter((wp) => wp.subTask_id !== workPeriodId)
						.map((wp, index) => ({
							...wp,
							heightAdjust: index === 0 ? room.workPeriods.length - 1 : 0,
						}));

					// Update localJobsByBuilder
					setLocalJobsByBuilder((prev) => ({
						...prev,
						[room.employee_id]: (prev[room.employee_id] || []).map((job) =>
							job.task_id === task_id
								? { ...job, workPeriods: updatedWorkPeriods }
								: job
						),
					}));

					setRemovedWorkPeriods((prev) => [...prev, workPeriodId]);

					setChangedTaskIds((prev) => {
						const newSet = new Set(prev);
						newSet.add(workPeriodId);
						newSet.add(room.workPeriods[0].subTask_id); // Add first work period
						return newSet;
					});

					return {
						...room,
						workPeriods: updatedWorkPeriods,
					};
				}
				return room;
			})
		);
	};

	const handleWorkPeriodChange = (task_id, workPeriodId, changes) => {
		setLocalRooms((prevRooms) => {
			return prevRooms.map((room) => {
				if (room.task_id === task_id) {
					const updatedWorkPeriods = room.workPeriods.map((wp) => {
						if (wp.subTask_id === workPeriodId) {
							const updatedWp = { ...wp, ...changes };

							// If employee_id is changed, update the startDate
							if (
								changes.employee_id &&
								changes.employee_id !== wp.employee_id
							) {
								const newStartDate = normalizeDate(
									calculateNextAvailableDate(changes.employee_id)
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

							// Handle task_name change
							if (changes.task_name !== undefined) {
								updatedWp.task_name = changes.task_name.trim();
							}

							setChangedTaskIds((prev) => new Set(prev).add(workPeriodId));
							return updatedWp;
						}
						return wp;
					});

					// If task_number, name, or startDate is changed for the first work period, update all work periods in the room
					if (
						(changes.task_number !== undefined ||
							changes.task_name !== undefined) &&
						workPeriodId === room.workPeriods[0].subTask_id
					) {
						updatedWorkPeriods.forEach((wp) => {
							wp.task_number =
								changes.task_number !== undefined
									? changes.task_number
									: wp.task_number;
							wp.task_name =
								changes.task_name !== undefined
									? changes.task_name
									: wp.task_name;
							setChangedTaskIds((prev) => new Set(prev).add(wp.subTask_id));
						});

						// Also update the room's task_number and name
						room.task_number =
							changes.task_number !== undefined
								? changes.task_number
								: room.task_number;
						room.task_name =
							changes.task_name !== undefined
								? changes.task_name
								: room.task_name;
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
				if (key === "task_number" || key === "task_name") {
					Object.keys(updatedErrors).forEach((errorKey) => {
						if (
							errorKey.startsWith(`${task_id}-`) &&
							errorKey.endsWith(`-${key}`)
						) {
							delete updatedErrors[errorKey];
						}
					});
				} else {
					// Clear error for the specific work period
					delete updatedErrors[`${task_id}-${workPeriodId}-${key}`];
				}
			});

			// Check if the changed field is now valid and remove the error if it is
			if (changes.task_name !== undefined && changes.task_name.trim() !== "") {
				delete updatedErrors[`${task_id}-${workPeriodId}-name`];
			}
			if (
				changes.task_number !== undefined &&
				changes.task_number.trim() !== ""
			) {
				delete updatedErrors[`${task_id}-${workPeriodId}-task_number`];
			}
			if (
				changes.duration !== undefined &&
				!isNaN(changes.duration) &&
				Number(changes.duration) > 0
			) {
				delete updatedErrors[`${task_id}-${workPeriodId}-duration`];
			}
			if (changes.employee_id !== undefined) {
				delete updatedErrors[`${task_id}-${workPeriodId}-employee_id`];
			}
			if (changes.startDate !== undefined) {
				delete updatedErrors[`${task_id}-${workPeriodId}-startDate`];
			}

			return updatedErrors;
		});

		// If employee_id is changed, update localJobsByBuilder
		if (changes.employee_id) {
			setLocalJobsByBuilder((prev) => {
				const workPeriod = localRooms
					.flatMap((r) => r.workPeriods)
					.find((wp) => wp.subTask_id === workPeriodId);
				if (!workPeriod) return prev;

				const oldBuilderId = workPeriod.employee_id;
				const newBuilderId = changes.employee_id;

				const newStartDate = normalizeDate(
					calculateNextAvailableDate(newBuilderId)
				);

				const updatedWorkPeriod = {
					...workPeriod,
					employee_id: newBuilderId,
					startDate: normalizeDate(newStartDate),
					...changes,
				};

				return {
					...prev,
					[oldBuilderId]: prev[oldBuilderId].filter(
						(wp) => wp.subTask_id !== workPeriodId
					),
					[newBuilderId]: [...(prev[newBuilderId] || []), updatedWorkPeriod],
				};
			});
		}
	};

	const handleRestoreRoom = (task_id) => {
		setLocalRooms((prevRooms) => {
			const roomToRestore = prevRooms.find((room) => room.task_id === task_id);
			if (!roomToRestore) return prevRooms;

			const updatedRooms = prevRooms.filter((room) => room.task_id !== task_id);
			const restoredRoom = {
				...roomToRestore,
				task_active: true,
				workPeriods: roomToRestore.workPeriods.map((wp) => ({
					...wp,
					task_active: true,
				})),
			};

			// Find the correct index to insert the restored room
			const insertIndex = updatedRooms.findIndex(
				(room) =>
					new Date(room.task_created_at) >
					new Date(restoredRoom.task_created_at)
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
		const room = localRooms.find((r) => r.task_id === task_id);
		if (room) {
			room.workPeriods.forEach((wp) => {
				setChangedTaskIds((prev) => new Set(prev).add(wp.subTask_id));
				setRemovedWorkPeriods((prev) =>
					prev.filter((id) => id !== wp.subTask_id)
				);
			});
		}

		// Update localJobsByBuilder
		setLocalJobsByBuilder((prev) => {
			const updatedJobsByBuilder = { ...prev };
			Object.keys(updatedJobsByBuilder).forEach((employee_id) => {
				updatedJobsByBuilder[employee_id] = updatedJobsByBuilder[
					employee_id
				].map((job) =>
					job.task_id === task_id
						? {
								...job,
								task_active: true,
						  }
						: job
				);
			});
			return updatedJobsByBuilder;
		});

		setErrors((prevErrors) => ({ ...prevErrors, general: undefined }));
	};

	const sortAndAdjustBuilderTasks = (
		tasks,
		buildersToUpdate,
		removedWorkPeriods
	) => {
		const updatedBuilderArrays = {};

		// Filter out removed work periods first
		const filteredTasks = tasks.filter(
			(task) => !removedWorkPeriods.includes(task.subTask_id)
		);

		const updatedTasks = [...filteredTasks];

		buildersToUpdate.forEach((employee_id) => {
			const builderTasks = filteredTasks.filter(
				(task) => task.employee_id === employee_id && task.task_active
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

			updatedBuilderArrays[employee_id] = sortedBuilderTasks;

			sortedBuilderTasks.forEach((sortedTask) => {
				const index = updatedTasks.findIndex(
					(task) => task.task_id === sortedTask.task_id
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
			project_id: localRooms[0].project_id, // Assuming all rooms in a job have the same project_id
			project_name: jobName,
			project_completed_at: new Date().toISOString(), // Current date as completion date
			rooms: localRooms.map((task) => ({
				task_id: task.task_id,
				task_number: task.task_number,
				task_name: task.task_name,
				task_active: task.task_active,
				task_created_at: task.task_created_at,
				project_created_at: task.project_created_at,
				subTask_created_at: task.subTask_created_at,
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
			completedProjectTasks.map((task) => task.employee_id)
		);

		const removedSubTasks = completedProjectTasks.map(
			(task) => task.subTask_id
		);

		// Get all tasks (including those not in this job)
		const allTasks = Object.values(localJobsByBuilder).flat();

		// Remove completed job tasks
		const remainingTasks = allTasks.filter(
			(task) => task.subTask_id !== completedJobData.subTask_id
		);

		// Sort and adjust dates for affected builders
		const { updatedTasks, updatedBuilderArrays } = sortAndAdjustBuilderTasks(
			remainingTasks,
			buildersInvolvedInJob,
			removedSubTasks
		);

		// Update chart and task data
		dispatch(jobModalUpdateChartData(updatedTasks, removedSubTasks));
		dispatch(
			jobModalUpdateTaskData(
				updatedTasks,
				updatedBuilderArrays,
				removedSubTasks
			)
		);

		setShowCompleteConfirmation(false);
		onClose();
	};

	const cancelCompleteJob = () => {
		setShowCompleteConfirmation(false);
	};

	const handleSave = () => {
		let newErrors = {
			messages: [],
		};

		// Create a map of original tasks for quick lookup, including their original index
		const originalTasksMap = new Map(
			jobData?.map((task, index) => [
				task.task_id,
				{ ...task, originalIndex: index },
			])
		);

		// Check for blank job name
		if (!jobName || jobName.trim().length < 1) {
			newErrors.project_name = "Project name is required";
			newErrors.messages.push("Project name is required");
		}

		// Check if at least one room is active
		const activeRoomsExist = localRooms.some((room) => room.task_active);
		if (!activeRoomsExist) {
			newErrors.messages.push("At least one active room is required");
		}

		// Check for all potential errors in rooms and work periods
		localRooms.forEach((room) => {
			const isRoomChanged = room.workPeriods.some((wp) =>
				changedTaskIds.has(wp.subTask_id)
			);
			const isNewRoom = !originalTasksMap.has(room.workPeriods[0].subTask_id);

			if (isRoomChanged || isNewRoom) {
				room.workPeriods.forEach((workPeriod, index) => {
					if (index === 0) {
						// Validate job number (only for the first work period in each room)
						if (!room.task_number || room.task_number.trim() === "") {
							newErrors[
								`${room.task_id}-${workPeriod.subTask_id}-task_number`
							] = "Job number is required";
						}

						// Validate room name (only for the first work period in each room)
						if (!room.task_name || room.task_name.trim() === "") {
							newErrors[`${room.task_id}-${workPeriod.subTask_id}-name`] =
								"Room name is required";
						}
					}

					if (changedTaskIds.has(workPeriod.subTask_id) || isNewRoom) {
						// Validate duration for changed or new work periods
						if (
							workPeriod.duration === "" ||
							workPeriod.duration === undefined ||
							isNaN(workPeriod.duration)
						) {
							newErrors[`${room.task_id}-${workPeriod.subTask_id}-duration`] =
								"Valid duration is required";
						} else if (Number(workPeriod.duration) <= 0) {
							newErrors[`${room.task_id}-${workPeriod.subTask_id}-duration`] =
								"Duration must be greater than 0";
						}

						// Validate employee_id for changed or new work periods
						if (!workPeriod.employee_id) {
							newErrors[
								`${room.task_id}-${workPeriod.subTask_id}-employee_id`
							] = "Builder is required";
						}

						// Validate startDate for changed or new work periods
						if (!workPeriod.startDate) {
							newErrors[`${room.task_id}-${workPeriod.subTask_id}-startDate`] =
								"Start date is required";
						}
					}
				});
			}
		});

		// If there are any errors, set them and don't save
		if (Object.keys(newErrors).length > 1 || newErrors.messages.length > 0) {
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
				task_active: room.task_active,
				project_name: jobName,
			}))
		);

		console.log("updatedTasks", updatedTasks);

		const changedTaskIdsSet = new Set(changedTaskIds);
		const buildersWithChanges = new Set();
		const updatedBuilderArrays = {};

		updatedTasks?.forEach((task) => {
			if (changedTaskIdsSet.has(task.subTask_id)) {
				buildersWithChanges.add(task.employee_id);

				// Check if the builder has changed
				const originalTask = originalTasksMap.get(task.subTask_id);
				if (originalTask && originalTask.employee_id !== task.employee_id) {
					// Add both the previous and new builders to buildersWithChanges
					buildersWithChanges.add(originalTask.employee_id);
					buildersWithChanges.add(task.employee_id);
				}
			}
		});

		removedWorkPeriods.forEach((removedId) => {
			const originalTask = originalTasksMap.get(removedId);
			if (originalTask) {
				buildersWithChanges.add(originalTask.employee_id);
			}
		});
		// Apply sortAndAdjustDates for builders with changes
		buildersWithChanges.forEach((employee_id) => {
			// Combine updated tasks with existing tasks from localJobsByBuilder
			const existingBuilderTasks = localJobsByBuilder[employee_id] || [];
			const updatedBuilderTasks = updatedTasks.filter(
				(task) => task.employee_id === employee_id
			);

			// Create a set of updated task IDs for efficient lookup
			const updatedTaskIds = new Set(
				updatedBuilderTasks.map((task) => task.subTask_id)
			);

			// Combine tasks, replacing existing tasks with updated ones, and filter out removed work periods
			const combinedBuilderTasks = [
				...existingBuilderTasks.filter(
					(task) =>
						!updatedTaskIds.has(task.subTask_id) &&
						!removedWorkPeriods.includes(task.subTask_id)
				),
				...updatedBuilderTasks,
			];

			const sortedBuilderTasks = sortAndAdjustDates(
				combinedBuilderTasks.filter((task) => task.task_active),
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
			updatedBuilderArrays[employee_id] = sortedBuilderTasks;

			// Update the tasks in updatedTasks with the sorted and adjusted data
			sortedBuilderTasks.forEach((sortedTask) => {
				const index = updatedTasks.findIndex((task) => {
					return task?.subTask_id === sortedTask.subTask_id;
				});
				if (index !== -1) {
					updatedTasks[index] = sortedTask;
				} else {
					updatedTasks.push(sortedTask);
				}
			});
		});

		console.log("updatedTasks", updatedTasks);

		// dispatch(
		// 	saveProject({
		// 		jobName,
		// 		projectId: jobData[0]?.project_id || null,
		// 		newProjectCreatedAt:
		// 			jobData[0]?.project_created_at || newProjectCreatedAt,
		// 		updatedTasks,
		// 		removedWorkPeriods,
		// 		updatedBuilderArrays,
		// 		nextJobNumber,
		// 	})
		// );
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

	const activeRooms = localRooms.filter((room) => room.task_active);
	const inactiveRooms = localRooms.filter((room) => !room.task_active);

	return (
		<div className="modal-overlay">
			{!showCompleteConfirmation ? (
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
							setErrors((prevErrors) => ({
								...prevErrors,
								jobName: undefined,
							}));
							setJobName(e.target.value);
						}}
						placeholder="Job Name"
						className={errors.jobName ? "error" : ""}
						ref={jobNameInputRef}
					/>
					<div></div>

					<h3>Active Rooms</h3>
					<div className="roomGroup header">
						<span>Job</span>
						<span>Room Name</span>
						<span>Hours</span>
						<span>Builder</span>
						<span>Start Date</span>
						<span>Actions</span>
					</div>

					{activeRooms.map((room, taskIndex) => (
						<div
							key={room.task_id || taskIndex}
							className={`roomContainer ${
								taskIndex % 2 === 0 ? "even" : "odd"
							}`}
						>
							{room.workPeriods.map((workPeriod, subTaskIndex) => (
								<div
									key={workPeriod.subTask_id || subTaskIndex}
									className="roomGroup"
								>
									{subTaskIndex === 0 ? (
										<input
											id={`${room.task_id}-${workPeriod.subTask_id}-task_number`}
											type="text"
											value={room.task_number || ""}
											onChange={(e) =>
												handleWorkPeriodChange(
													room.task_id,
													workPeriod.subTask_id,
													{
														task_number: e.target.value,
													}
												)
											}
											placeholder="Job Number"
											className={`job-number-input ${
												errors[
													`${room.task_id}-${workPeriod.subTask_id}-task_number`
												]
													? "error"
													: ""
											}`}
										/>
									) : (
										<span className="job-number-input">
											{taskIndex === 0
												? room.task_number
												: `${room.task_number}`}
										</span>
									)}
									{subTaskIndex === 0 ? (
										<input
											id={`${room.task_id}-${workPeriod.subTask_id}-name`}
											type="text"
											value={room.task_name}
											onChange={(e) =>
												handleWorkPeriodChange(
													room.task_id,
													workPeriod.subTask_id,
													{
														task_name: e.target.value,
													}
												)
											}
											placeholder="Room Name"
											className={`room-name-input ${
												errors[`${room.task_id}-${workPeriod.subTask_id}-name`]
													? "error"
													: ""
											}`}
											ref={
												clickedTask?.subTask_id === workPeriod.subTask_id
													? clickedTaskRef
													: subTaskIndex === 0
													? newTaskNameRef
													: null
											}
										/>
									) : (
										<span className="room-name-input">{room.task_name}</span>
									)}
									<input
										id={`${room.task_id}-${workPeriod.subTask_id}-duration`}
										type="number"
										step="0.01"
										min="0.01"
										value={workPeriod.duration || ""}
										onChange={(e) => {
											handleWorkPeriodChange(
												room.task_id,
												workPeriod.subTask_id,
												{
													duration: parseFloat(e.target.value).toFixed(2),
												}
											);
										}}
										placeholder="Hours"
										className={`duration-input ${
											errors[
												`${room.task_id}-${workPeriod.subTask_id}-duration`
											]
												? "error"
												: ""
										}`}
									/>
									<select
										id={`${room.task_id}-${workPeriod.subTask_id}-employee_id`}
										value={workPeriod.employee_id}
										onChange={(e) => {
											handleWorkPeriodChange(
												room.task_id,
												workPeriod.subTask_id,
												{
													employee_id: Number(e.target.value),
												}
											);
										}}
										className={`builder-select ${
											errors[
												`${room.task_id}-${workPeriod.subTask_id}-employee_id`
											]
												? "error"
												: ""
										}`}
									>
										{employees.map((builder) => (
											<option
												key={builder.employee_id}
												value={builder.employee_id}
											>
												{builder.employee_name}
											</option>
										))}
									</select>
									<input
										id={`${room.task_id}-${workPeriod.subTask_id}-startDate`}
										type="date"
										value={formatDateForInput(workPeriod.startDate)}
										onChange={(e) =>
											handleWorkPeriodChange(
												room.task_id,
												workPeriod.subTask_id,
												{
													startDate: e.target.value,
												}
											)
										}
										className={`date-input ${
											errors[
												`${room.task_id}-${workPeriod.subTask_id}-startDate`
											]
												? "error"
												: ""
										}`}
									/>

									{subTaskIndex === 0 ? (
										<div className="room-buttons">
											{jobData && (
												<button
													onClick={() =>
														handleAddWorkPeriod(
															room.task_id,
															room.workPeriods[0]?.employee_id
														)
													}
													className="modal-action-button add add-button"
												>
													+ Slot
												</button>
											)}
											{room.isNew ? (
												<button
													className="modal-action-button cancel"
													onClick={() => handleCancelNewRoom(room.task_id)}
												>
													Cancel
												</button>
											) : (
												<button
													className="modal-action-button remove"
													onClick={() => handleInactiveRoom(room.task_id)}
												>
													- Room
												</button>
											)}
										</div>
									) : (
										<div className="room-buttons">
											<button
												onClick={() =>
													handleRemoveWorkPeriod(
														room.task_id,
														workPeriod.subTask_id
													)
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
							{inactiveRooms.map((room, inactiveTaskIndex) => (
								<div
									key={room.task_id || inactiveTaskIndex}
									className="roomGroup inactive"
								>
									<span>{room.task_number}</span>
									<span>{room.task_name}</span>
									<button
										className="modal-action-button save restore-room-button"
										onClick={() => handleRestoreRoom(room.task_id)}
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
					{errors.messages && errors.messages.length > 0 && (
						<div className="error-messages">
							{errors.messages.map((message, index) => (
								<div key={index} className="error general-error">
									{message}
								</div>
							))}
						</div>
					)}
				</div>
			) : (
				<div className="complete-job-popup">
					<h3>Are you sure you want to complete this job?</h3>
					<p>If yes, it will be removed from the schedule.</p>
					<div className="complete-job-actions">
						<button
							className="complete-job-confirm"
							onClick={confirmCompleteJob}
						>
							Yes, Complete Job
						</button>
						<button className="complete-job-cancel" onClick={cancelCompleteJob}>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default JobModal;
