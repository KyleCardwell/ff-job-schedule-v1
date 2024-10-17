import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import {
	updateJobAndRooms,
	updateNextJobNumber,
} from "../redux/actions/ganttActions";
import { addDays, format } from "date-fns";
import { normalizeDate } from "../utils/dateUtils";
import { getNextWorkday, totalJobHours } from "../utils/helpers";

const JobModal = ({
	isOpen,
	onClose,
	onSave,
	jobData,
	jobsByBuilder,
	timeOffByBuilder,
	holidayChecker,
	holidays,
	workdayHours,
}) => {
	const dispatch = useDispatch();
	const builders = useSelector((state) => state.builders.builders);
	const jobNumberNext = useSelector((state) => state.chartData.nextJobNumber);

	const [jobName, setJobName] = useState("");
	const [localRooms, setLocalRooms] = useState([]);
	const [errors, setErrors] = useState({});
	const [localJobsByBuilder, setLocalJobsByBuilder] = useState({});

	const [nextJobNumber, setNextJobNumber] = useState(null);

	const newRoomNameRef = useRef(null);
	const jobNameInputRef = useRef(null);

	const formatDateForInput = (date) => {
		if (!date) return "";
		return format(new Date(date), "yyyy-MM-dd");
	};

	// useEffect(() => {
	// 	if (isOpen && jobNameInputRef.current) {
	// 		jobNameInputRef.current.focus();
	// 	}
	// }, [isOpen]);

	// useEffect(() => {
	// 	if (isOpen) {
	// 		if (jobData) {
	// 			setJobName(jobData[0].jobName || "");
	// 			setLocalRooms(
	// 				() =>
	// 					jobData.map((project) => ({
	// 						...project,
	// 						workPeriods: project.workPeriods.map((wp) => ({
	// 							...wp,
	// 							roomId: project.id,
	// 							name: project.name,
	// 							jobId: jobData.id,
	// 							jobName: jobData.name,
	// 							jobNumber: project.jobNumber,
	// 							roomCreatedAt: project.roomCreatedAt,
	// 						})),
	// 					})) || []
	// 			);
	// 		} else {
	// 			// Reset state for a new job
	// 			setJobName("");
	// 			setLocalRooms([]);
	// 		}

	// 		setLocalJobsByBuilder(jobsByBuilder);
	// 		setNextJobNumber(jobNumberNext);
	// 		setErrors({});
	// 	}
	// }, [jobData, isOpen, jobsByBuilder, jobNumberNext]);

	useEffect(() => {
		if (isOpen) {
			if (jobData && jobData.length > 0) {
				// Assuming all work periods have the same jobName
				setJobName(jobData[0].jobName || "");
				
				// Group work periods by roomId
				const roomMap = {};
				jobData.forEach(wp => {
					if (!roomMap[wp.roomId]) {
						roomMap[wp.roomId] = {
							id: wp.roomId,
							name: wp.roomName,
							jobNumber: wp.jobNumber,
							builderId: wp.builderId,
							jobId: wp.jobId,
							jobName: wp.jobName,
							roomCreatedAt: wp.roomCreatedAt,
							workPeriods: [],
							active: wp.active,
						};
					}
					roomMap[wp.roomId].workPeriods.push({
						...wp,
						roomId: wp.roomId,
						name: wp.roomName,
						jobId: wp.jobId,
						jobName: wp.jobName,
						jobNumber: wp.jobNumber,
						roomCreatedAt: wp.roomCreatedAt,
						active: wp.active,
					});
				});
	
				// Convert the room map to an array of projects
				const projects = Object.values(roomMap);
	
				setLocalRooms(projects);
			} else {
				// Reset state for a new job
				setJobName("");
				setLocalRooms([]);
			}
	
			setLocalJobsByBuilder(jobsByBuilder);
			setNextJobNumber(jobNumberNext);
			setErrors({});
		}
	}, [jobData, isOpen, jobsByBuilder, jobNumberNext]);

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
		const defaultBuilderId = "1";
		const newStartDate = normalizeDate(
			calculateNextAvailableDate(defaultBuilderId)
		);

		const newRoom = {
			id: uuidv4(),
			builderId: defaultBuilderId,
			startDate: normalizeDate(newStartDate),
			duration: 8,
			jobNumber: nextJobNumber.toString(),
			name: "",
			active: true,
			isNew: true,
			roomCreatedAt: new Date().toISOString(), // Add this line
			workPeriods: [
				{
					id: uuidv4(),
					builderId: defaultBuilderId,
					startDate: normalizeDate(newStartDate),
					duration: 8,
				},
			],
		};

		setLocalRooms((prevRooms) => [...prevRooms, newRoom]);
		setLocalJobsByBuilder((prev) => ({
			...prev,
			[defaultBuilderId]: [...(prev[defaultBuilderId] || []), newRoom],
		}));
		setNextJobNumber((prevNumber) => prevNumber + 1);

		// Focus on the new room name input
		setTimeout(() => {
			if (newRoomNameRef.current) {
				newRoomNameRef.current.focus();
			}
		}, 0);
	};

	const handleRemoveRoom = (roomId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.id === roomId ? { ...room, active: false } : room
			)
		);
	};

	const handleCancelNewRoom = (roomId, builderId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.filter((room) => room.id !== roomId)
		);

		// Remove the room from localJobsByBuilder
		setLocalJobsByBuilder((prev) => {
			const updatedBuilderJobs = prev[builderId].filter(
				(room) => room.id !== roomId
			);
			return {
				...prev,
				[builderId]: updatedBuilderJobs,
			};
		});
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
						builderId: prevBuilderId,
						startDate: normalizeDate(newStartDate),
						duration: 8,
					};
					const updatedWorkPeriods = [
						...(room.workPeriods || []),
						newWorkPeriod,
					];

					// Update localJobsByBuilder
					setLocalJobsByBuilder((prev) => {
						const updatedJobs = prev[room.builderId]?.map((job) =>
							job.id === roomId
								? { ...job, workPeriods: updatedWorkPeriods }
								: job
						);

						return {
							...prev,
							[room.builderId]: updatedJobs,
						};
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

	const handleRemoveWorkPeriod = (roomId, workPeriodId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) => {
				if (room.id === roomId) {
					const updatedWorkPeriods = room.workPeriods.filter(
						(wp) => wp.id !== workPeriodId
					);
					// Update localJobsByBuilder
					setLocalJobsByBuilder((prev) => {
						const updatedJobs = Array.isArray(prev[room.builderId])
							? prev[room.builderId].map((job) =>
									job.id === roomId
										? { ...job, workPeriods: updatedWorkPeriods }
										: job
							  )
							: []; // Default to an empty array if prev[room.builderId] is not an array

						return {
							...prev,
							[room.builderId]: updatedJobs,
						};
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

							return updatedWp;
						}
						return wp;
					});

					// If jobNumber, name, or startDate is changed for the first work period, update all work periods in the room
					if (
						(changes.jobNumber !== undefined ||
							changes.name !== undefined ||
							changes.startDate) &&
						workPeriodId === room.workPeriods[0].id
					) {
						updatedWorkPeriods.forEach((wp) => {
							wp.jobNumber =
								changes.jobNumber !== undefined
									? changes.jobNumber
									: wp.jobNumber;
							wp.name = changes.name !== undefined ? changes.name : wp.name;
							// ... other logic ...
						});

						// Also update the room's jobNumber and name
						room.jobNumber =
							changes.jobNumber !== undefined
								? changes.jobNumber
								: room.jobNumber;
						room.name = changes.name !== undefined ? changes.name : room.name;
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
				delete updatedErrors[`${roomId}-${workPeriodId}-${key}`];
			});
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
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.id === roomId ? { ...room, active: true } : room
			)
		);
	};

	const handleSave = () => {
		let newErrors = {};

		// Check for blank job name
		if (jobName.trim() === "") {
			newErrors.jobName = "Job name is required";
		}

		// Check for all potential errors in rooms and work periods
		localRooms.forEach((room) => {
			room.workPeriods.forEach((workPeriod, index) => {
				if (index === 0) {
					// Validate job number (only for the first work period in each room)
					if (!workPeriod.jobNumber || workPeriod.jobNumber.trim() === "") {
						newErrors[`${room.id}-${workPeriod.id}-jobNumber`] =
							"Job number is required";
					}

					// Validate room name (only for the first work period in each room)
					if (!workPeriod.name || workPeriod.name.trim() === "") {
						newErrors[`${room.id}-${workPeriod.id}-name`] =
							"Room name is required";
					}
				}

				// Validate duration for all work periods
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

				// Validate builderId for all work periods
				if (!workPeriod.builderId) {
					newErrors[`${room.id}-${workPeriod.id}-builderId`] =
						"Builder is required";
				}

				// Validate startDate for all work periods
				if (!workPeriod.startDate) {
					newErrors[`${room.id}-${workPeriod.id}-startDate`] =
						"Start date is required";
				}
			});
		});

		// If there are any errors, set them and don't save
		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		// If we've made it here, there are no errors, so we can save
		const updatedJob = {
			...jobData,
			name: jobName,
			rooms: localRooms.map((room) => ({
				...room,
				workPeriods: room.workPeriods.map((wp) => ({
					...wp,
					duration: Number(wp.duration), // Ensure duration is a number
					startDate: normalizeDate(wp.startDate), // Ensure date is normalized
				})),
				isNew: undefined,
			})),
		};

		dispatch(updateNextJobNumber(nextJobNumber));
		dispatch(updateJobAndRooms(updatedJob));
		onSave(updatedJob);
		onClose();
	};

	if (!isOpen) return null;

	const activeRooms = localRooms.filter((room) => room.active);
	const inactiveRooms = localRooms.filter((room) => !room.active);

	return (
		<div className="modal-overlay">
			<div className="modal-content">
				<h2>{jobData ? "Edit Job" : "Add New Job"}</h2>
				<input
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
										// ref={jobNumberInputRefs[workPeriod.id]}
									/>
								) : (
									<span className="job-number-input">
										{index === 0 ? room.jobNumber : `${room.jobNumber}`}
									</span>
								)}
								{index === 0 ? (
									<input
										type="text"
										value={room.name}
										onChange={(e) =>
											handleWorkPeriodChange(room.id, workPeriod.id, {
												name: e.target.value,
											})
										}
										placeholder="Room Name"
										className={`room-name-input ${
											errors[`${room.id}-${workPeriod.id}-name`] ? "error" : ""
										}`}
									/>
								) : (
									<span className="room-name-input">{room.name}</span>
								)}
								<input
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
									{builders.map((builder) => (
										<option key={builder.id} value={builder.id}>
											{builder.name}
										</option>
									))}
								</select>
								<input
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
												onClick={() =>
													handleCancelNewRoom(room.id, room.builderId)
												}
											>
												Cancel
											</button>
										) : (
											<button
												className="modal-action-button remove"
												onClick={() => handleRemoveRoom(room.id)}
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
								<span>{room.name}</span>
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
			</div>
		</div>
	);
};

export default JobModal;
