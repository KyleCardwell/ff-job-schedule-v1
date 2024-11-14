import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
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
import { saveProject } from "../redux/actions/projects";
import { isEqual, omit } from "lodash";

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
	onDatabaseError,
}) => {
	const dispatch = useDispatch();
	const builders = useSelector((state) => state.builders.builders);
	const { employees } = useSelector((state) => state.builders);
	const { chart_config_id: chartConfigId, next_task_number: jobNumberNext } =
		useSelector((state) => state.chartConfig);
	const unchangedTasks = useSelector((state) => state.taskData.tasks);

	const [jobName, setJobName] = useState("");
	const [localRooms, setLocalRooms] = useState([]);
	const [errors, setErrors] = useState({});
	const [localJobsByBuilder, setLocalJobsByBuilder] = useState({});
	const [changedTaskIds, setChangedTaskIds] = useState({});
	const [changedBuilderIds, setChangedBuilderIds] = useState(new Set());
	const [removedWorkPeriods, setRemovedWorkPeriods] = useState([]);
	const [showCompleteConfirmation, setShowCompleteConfirmation] =
		useState(false);
	const [completedJobData, setCompletedJobData] = useState(null);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState(null);

	const [selectedEmployeeInput, setSelectedEmployeeInput] = useState({
		workPeriodId: null,
		previousValue: null,
	});

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

		// Sort builder jobs by start_date
		const sortedBuilderJobs = builderJobs.sort((a, b) =>
			a.start_date.localeCompare(b.start_date)
		);

		let lastJobEndDate = normalizeDate(new Date());
		if (sortedBuilderJobs.length > 0) {
			const lastJob = sortedBuilderJobs[sortedBuilderJobs.length - 1];
			const lastJobDuration =
				totalJobHours(
					lastJob.start_date,
					lastJob.duration,
					workdayHours,
					holidayChecker,
					holidays,
					employee_id,
					timeOffByBuilder
				) / workdayHours;

			lastJobEndDate = normalizeDate(
				addDays(lastJob.start_date, lastJobDuration)
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
			subtask_id: uuidv4(),
			project_id: localRooms[0]?.project_id,
			task_id: uuidv4(),
			temp_task_id: uuidv4(),
			temp_subtask_id: uuidv4(),
			project_name: jobName,
			employee_id: defaultBuilderId,
			start_date: normalizeDate(newStartDate),
			duration: workdayHours,
			subtask_width: dayWidth,
			task_number: nextJobNumber.toString(),
			task_name: "",
			task_active: true,
			taskIsNew: true,
			subTaskIsNew: true,
			task_created_at: createdAt,
			subtask_created_at: createdAt,
			project_created_at:
				localRooms[0]?.workPeriods[0]?.project_created_at ||
				newProjectCreatedAt,
			heightAdjust: 1,
		};

		const newTask = {
			task_id: newWorkPeriod.task_id,
			temp_task_id: newWorkPeriod.temp_task_id,
			project_id: newWorkPeriod.project_id,
			project_name: newWorkPeriod.project_name,
			task_number: newWorkPeriod.task_number,
			task_name: newWorkPeriod.task_name,
			task_active: newWorkPeriod.task_active,
			taskIsNew: newWorkPeriod.taskIsNew,
			subTaskIsNew: newWorkPeriod.subTaskIsNew,
			task_created_at: newWorkPeriod.task_created_at,
			workPeriods: [newWorkPeriod],
		};

		setLocalRooms((prevRooms) => [...prevRooms, newTask]);
		setLocalJobsByBuilder((prev) => ({
			...prev,
			[defaultBuilderId]: [...(prev[defaultBuilderId] || []), newWorkPeriod],
		}));
		setNextJobNumber((prevNumber) => prevNumber + 1);
		setChangedTaskIds((prev) => new Set(prev).add(newWorkPeriod.subtask_id));

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
				setChangedTaskIds((prev) => new Set(prev).add(wp.subtask_id));
				setChangedBuilderIds((prev) => new Set([...prev, wp.employee_id]));
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
						].filter((job) => job.subtask_id !== wp.subtask_id);
					}
				});

				return updatedJobsByBuilder;
			});

			// Remove all work periods from changedTaskIds
			setChangedTaskIds((prev) => {
				const newSet = new Set(prev);
				roomToRemove.workPeriods.forEach((wp) => {
					newSet.delete(wp.subtask_id);
				});
				return newSet;
			});

			// Remove all work periods from removedWorkPeriods
			setRemovedWorkPeriods((prev) =>
				prev.filter(
					(id) => !roomToRemove.workPeriods.some((wp) => wp.subtask_id === id)
				)
			);
		}
	};

	const handleAddWorkPeriod = (task_id, prevBuilderId = defaultBuilderId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) => {
				if (room.task_id === task_id) {
					const newStartDate = normalizeDate(
						calculateNextAvailableDate(prevBuilderId)
					);
					const newWorkPeriod = {
						subtask_id: uuidv4(),
						project_id: room.project_id,
						project_name: room.project_name,
						task_number: room.task_number,
						task_name: room.task_name,
						task_id: room.task_id,
						temp_task_id: room.temp_task_id,
						temp_subtask_id: uuidv4(),
						employee_id: prevBuilderId,
						start_date: normalizeDate(newStartDate),
						duration: workdayHours,
						task_active: true,
						subTaskIsNew: true,
						taskIsnew: room.taskIsNew,
						task_created_at: room.task_created_at,
						project_created_at:
							localRooms[0]?.workPeriods[0]?.project_created_at ||
							newProjectCreatedAt,
						subtask_created_at: new Date().toISOString(),
						subtask_width: dayWidth,
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
						newSet.add(newWorkPeriod.subtask_id);
						newSet.add(room.workPeriods[0].subtask_id); // Add first work period
						return newSet;
					});

					setChangedBuilderIds((prev) => new Set([...prev, prevBuilderId]));

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
						.filter((wp) => {
							if (wp.subtask_id === workPeriodId) {
								// Track the builder who lost the work period
								setChangedBuilderIds(
									(prev) => new Set([...prev, wp.employee_id])
								);
								return false;
							}
							return true;
						})
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

					setRemovedWorkPeriods((prev) => [
						...new Set([...prev, workPeriodId]),
					]);

					setChangedTaskIds((prev) => {
						const newSet = new Set(prev);
						newSet.add(workPeriodId);
						newSet.add(room.workPeriods[0].subtask_id); // Add first work period
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

	const handleWorkPeriodChange = (
		task_id,
		workPeriodId,
		changes,
		oldBuilderId
	) => {
		setLocalRooms((prevRooms) => {
			return prevRooms.map((room) => {
				if (room.task_id === task_id) {
					const updatedWorkPeriods = room.workPeriods.map((wp) => {
						if (wp.subtask_id === workPeriodId) {
							const updatedWp = { ...wp, ...changes };
							setChangedBuilderIds(
								(prev) => new Set([...prev, wp.employee_id])
							);

							// If employee_id is changed, update the start_date
							if (
								changes.employee_id &&
								changes.employee_id !== wp.employee_id
							) {
								const newStartDate = normalizeDate(
									calculateNextAvailableDate(changes.employee_id)
								);
								updatedWp.start_date = normalizeDate(newStartDate);
							}

							// Handle start_date change
							if (changes.start_date) {
								updatedWp.start_date = normalizeDate(changes.start_date);
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

					// If task_number, name, or start_date is changed for the first work period, update all work periods in the room
					if (
						(changes.task_number !== undefined ||
							changes.task_name !== undefined) &&
						workPeriodId === room.workPeriods[0].subtask_id
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
							setChangedTaskIds((prev) => new Set(prev).add(wp.subtask_id));
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
			if (changes.start_date !== undefined) {
				delete updatedErrors[`${task_id}-${workPeriodId}-start_date`];
			}

			return updatedErrors;
		});

		if (changes.employee_id && oldBuilderId) {
			setChangedBuilderIds(
				(prev) => new Set([...prev, oldBuilderId, changes.employee_id])
			);
			setLocalJobsByBuilder((prev) => {
				const workPeriod = prev[oldBuilderId].find(
					(wp) => wp.subtask_id === workPeriodId
				);
				const newBuilderId = changes.employee_id;
				const newStartDate = normalizeDate(
					calculateNextAvailableDate(newBuilderId)
				);

				const updatedWorkPeriod = {
					...workPeriod,
					employee_id: newBuilderId,
					start_date: newStartDate,
				};

				// Sort and adjust both builders' tasks
				const oldBuilderTasks = sortAndAdjustDates(
					prev[oldBuilderId].filter((wp) => wp.subtask_id !== workPeriodId),
					workdayHours,
					holidayChecker,
					holidays,
					oldBuilderId,
					timeOffByBuilder
				);

				const newBuilderTasks = sortAndAdjustDates(
					[...(prev[newBuilderId] || []), updatedWorkPeriod],
					workdayHours,
					holidayChecker,
					holidays,
					newBuilderId,
					timeOffByBuilder
				);

				return {
					...prev,
					[oldBuilderId]: oldBuilderTasks,
					[newBuilderId]: newBuilderTasks,
				};
			});
		}
	};

	const handleRestoreRoom = (task_id) => {
		setLocalRooms((prevRooms) => {
			const roomToRestore = prevRooms.find((room) => room.task_id === task_id);
			if (!roomToRestore) return prevRooms;

			// Just update the room's status and sort
			const updatedRooms = prevRooms
				.map((room) =>
					room.task_id === task_id
						? {
								...room,
								task_active: true,
								workPeriods: room.workPeriods.map((wp) => {
									setChangedTaskIds((prev) => new Set(prev).add(wp.subtask_id));
									setChangedBuilderIds(
										(prev) => new Set([...prev, wp.employee_id])
									);
									return {
										...wp,
										task_active: true,
									};
								}),
						  }
						: room
				)
				.sort((a, b) => a.task_created_at.localeCompare(b.task_created_at));

			return updatedRooms;
		});

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
			(task) => !removedWorkPeriods.includes(task.subtask_id)
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
					(task) => task.subtask_id === sortedTask.subtask_id
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
				subtask_created_at: task.subtask_created_at,
			})),
		};
		setShowCompleteConfirmation(true);
		setCompletedJobData(formattedCompletedJob);
	};

	const confirmCompleteJob = async () => {
		setSaveError(null);
		setShowCompleteConfirmation(false);

		try {
			setIsLoading(true);
			setIsSaving(true);

			// Get all tasks for the completed job
			const completedProjectTasks = localRooms.flatMap(
				(room) => room.workPeriods
			);

			// Get unique builders involved in this job
			const buildersInvolvedInJob = new Set(
				completedProjectTasks.map((task) => task.employee_id)
			);

			const removedSubTasks = completedProjectTasks.map(
				(task) => task.subtask_id
			);

			// Get all tasks (including those not in this job)
			const allTasks = Object.values(localJobsByBuilder).flat();

			// Remove completed job tasks
			const remainingTasks = allTasks.filter(
				(task) => task.project_id !== completedJobData.project_id
			);

			// Sort and adjust dates for affected builders
			const { updatedTasks } = sortAndAdjustBuilderTasks(
				remainingTasks,
				buildersInvolvedInJob,
				removedSubTasks
			);

			const result = await dispatch(
				saveProject({
					jobName: jobData[0].project_name,
					projectId: jobData[0].project_id,
					newProjectCreatedAt: jobData[0].project_created_at,
					updatedTasks,
					removedWorkPeriods: removedSubTasks,
					nextJobNumber,
					chartConfigId,
					projectCompletedAt: new Date().toISOString(),
				})
			);

			// Check if the result has an error property
			if (result.error) {
				throw new Error(result.error?.message || "Failed to complete project");
			}

			onClose();
		} catch (error) {
			console.error("Error completing project:", error);
			onDatabaseError("Failed to complete project. Please try again.");
			setSaveError("Failed to complete project. Please try again.");
		} finally {
			setIsLoading(false);
			setIsSaving(false);
		}
	};

	const cancelCompleteJob = () => {
		setShowCompleteConfirmation(false);
	};

	const handleSave = async () => {
		setSaveError(null);
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
				changedTaskIds.has(wp.subtask_id)
			);
			const isNewRoom = !originalTasksMap.has(room.workPeriods[0].subtask_id);

			if (isRoomChanged || isNewRoom) {
				room.workPeriods.forEach((workPeriod, index) => {
					if (index === 0) {
						// Validate job number (only for the first work period in each room)
						if (!room.task_number || room.task_number.trim() === "") {
							newErrors[
								`${room.task_id}-${workPeriod.subtask_id}-task_number`
							] = "Job number is required";
						}

						// Validate room name (only for the first work period in each room)
						if (!room.task_name || room.task_name.trim() === "") {
							newErrors[`${room.task_id}-${workPeriod.subtask_id}-name`] =
								"Room name is required";
						}
					}

					if (changedTaskIds.has(workPeriod.subtask_id) || isNewRoom) {
						// Validate duration for changed or new work periods
						if (
							workPeriod.duration === "" ||
							workPeriod.duration === undefined ||
							isNaN(workPeriod.duration)
						) {
							newErrors[`${room.task_id}-${workPeriod.subtask_id}-duration`] =
								"Valid duration is required";
						} else if (Number(workPeriod.duration) <= 0) {
							newErrors[`${room.task_id}-${workPeriod.subtask_id}-duration`] =
								"Duration must be greater than 0";
						}

						// Validate employee_id for changed or new work periods
						if (!workPeriod.employee_id) {
							newErrors[
								`${room.task_id}-${workPeriod.subtask_id}-employee_id`
							] = "Builder is required";
						}

						// Validate start_date for changed or new work periods
						if (!workPeriod.start_date) {
							newErrors[`${room.task_id}-${workPeriod.subtask_id}-start_date`] =
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

		try {
			setIsLoading(true);
			setIsSaving(true);

			const updatedTasks = localRooms.flatMap((room) =>
				room.workPeriods.map((wp) => ({
					...wp,
					task_active: room.task_active,
					project_name: jobName,
				}))
			);

			const changedTaskIdsSet = new Set(changedTaskIds);
			// const buildersWithChanges = new Set();
			const updatedBuilderArrays = {};

			changedBuilderIds.forEach((builderId) => {
				updatedBuilderArrays[builderId] = localJobsByBuilder[builderId];
			});

			// Apply sortAndAdjustDates for builders with changes
			changedBuilderIds.forEach((employee_id) => {
				// Combine updated tasks with existing tasks from localJobsByBuilder
				const existingBuilderTasks = localJobsByBuilder[employee_id] || [];
				const updatedBuilderTasks = updatedTasks.filter(
					(task) => task.employee_id === employee_id
				);

				// Create a set of updated task IDs for efficient lookup
				const updatedTaskIds = new Set(
					updatedBuilderTasks.map((task) => task.subtask_id)
				);

				// Combine tasks, replacing existing tasks with updated ones, and filter out removed work periods
				const combinedBuilderTasks = [
					...existingBuilderTasks.filter(
						(task) =>
							!updatedTaskIds.has(task.subtask_id) &&
							!removedWorkPeriods.includes(task.subtask_id)
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
						return task?.subtask_id === sortedTask.subtask_id;
					});
					if (index !== -1) {
						updatedTasks[index] = sortedTask;
					} else {
						updatedTasks.push(sortedTask);
					}
				});
			});

			// Filter out unchanged tasks
			const tasksToUpdate = updatedTasks.filter((task) => {
				const originalTask = unchangedTasks.find(
					(t) => t.subtask_id === task.subtask_id
				);
				if (!originalTask) {
					return true; // Keep new tasks
				}

				// Debug the comparison
				const cleanTask = omit(task, ["xPosition"]);
				const cleanOriginal = omit(originalTask, ["xPosition"]);

				const isTaskEqual = isEqual(cleanTask, cleanOriginal);

				if (!isTaskEqual) {
					return true;
				}
				return false;
			});

			const result = await dispatch(
				saveProject({
					jobName,
					projectId: jobData ? jobData[0].project_id : undefined,
					newProjectCreatedAt: jobData
						? jobData[0].project_created_at
						: newProjectCreatedAt,
					updatedTasks: tasksToUpdate,
					removedWorkPeriods,
					nextJobNumber,
					chartConfigId,
				})
			);

			// Check if the result has an error property
			if (result.error) {
				throw new Error(result.error?.message || "Failed to save project");
			}

			// If we get here, the save was successful
			onSave();
			onClose();
		} catch (error) {
			console.error("Error saving project:", error);
			onDatabaseError("Failed to save project. Please try again.");
			setSaveError("Failed to save project. Please try again.");
		} finally {
			setIsLoading(false);
			setIsSaving(false);
		}
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
									key={workPeriod.subtask_id || subTaskIndex}
									className="roomGroup"
								>
									{subTaskIndex === 0 ? (
										<input
											id={`${room.task_id}-${workPeriod.subtask_id}-task_number`}
											type="text"
											value={room.task_number || ""}
											onChange={(e) =>
												handleWorkPeriodChange(
													room.task_id,
													workPeriod.subtask_id,
													{
														task_number: e.target.value,
													}
												)
											}
											placeholder="Job Number"
											className={`job-number-input ${
												errors[
													`${room.task_id}-${workPeriod.subtask_id}-task_number`
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
											id={`${room.task_id}-${workPeriod.subtask_id}-name`}
											type="text"
											value={room.task_name}
											onChange={(e) =>
												handleWorkPeriodChange(
													room.task_id,
													workPeriod.subtask_id,
													{
														task_name: e.target.value,
													}
												)
											}
											placeholder="Room Name"
											className={`room-name-input ${
												errors[`${room.task_id}-${workPeriod.subtask_id}-name`]
													? "error"
													: ""
											}`}
											ref={
												clickedTask?.subtask_id === workPeriod.subtask_id
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
										id={`${room.task_id}-${workPeriod.subtask_id}-duration`}
										type="number"
										step="0.01"
										min="0.01"
										value={workPeriod.duration || ""}
										onChange={(e) => {
											handleWorkPeriodChange(
												room.task_id,
												workPeriod.subtask_id,
												{
													duration: parseFloat(e.target.value).toFixed(2),
												}
											);
										}}
										placeholder="Hours"
										className={`duration-input ${
											errors[
												`${room.task_id}-${workPeriod.subtask_id}-duration`
											]
												? "error"
												: ""
										}`}
									/>
									<select
										id={`${room.task_id}-${workPeriod.subtask_id}-employee_id`}
										value={workPeriod.employee_id}
										onFocus={() => {
											setSelectedEmployeeInput({
												workPeriodId: workPeriod.subtask_id,
												previousValue: workPeriod.employee_id,
											});
										}}
										onChange={(e) => {
											handleWorkPeriodChange(
												room.task_id,
												workPeriod.subtask_id,
												{
													employee_id: Number(e.target.value),
												},
												selectedEmployeeInput.previousValue
											);
										}}
										className={`builder-select ${
											errors[
												`${room.task_id}-${workPeriod.subtask_id}-employee_id`
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
										id={`${room.task_id}-${workPeriod.subtask_id}-start_date`}
										type="date"
										value={formatDateForInput(workPeriod.start_date)}
										onChange={(e) =>
											handleWorkPeriodChange(
												room.task_id,
												workPeriod.subtask_id,
												{
													start_date: e.target.value,
												}
											)
										}
										className={`date-input ${
											errors[
												`${room.task_id}-${workPeriod.subtask_id}-start_date`
											]
												? "error"
												: ""
										}`}
									/>

									{subTaskIndex === 0 ? (
										<div className="room-buttons">
											{!room.taskIsNew && (
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
											{room.taskIsNew ? (
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
														workPeriod.subtask_id
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
						<button
							className="modal-action-button save"
							onClick={handleSave}
							disabled={isSaving}
						>
							{isSaving ? "Saving..." : "Save"}
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
					{saveError && (
						<div className="error-messages">
							<div className="error general-error">{saveError}</div>
						</div>
					)}
				</div>
			) : (
				<div className="complete-job-popup">
					<h3>
						Are you sure you want to complete the {jobData[0].project_name} job?
					</h3>
					<p>If yes, it will be removed from the schedule.</p>
					<div className="complete-job-actions">
						<button
							className="modal-action-button cancel"
							onClick={cancelCompleteJob}
						>
							Cancel
						</button>
						<button
							className="modal-action-button save"
							onClick={confirmCompleteJob}
						>
							Yes, Complete Job
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default JobModal;
