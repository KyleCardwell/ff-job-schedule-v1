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
	const jobNumberNext = useSelector((state) => state.jobs.nextJobNumber);

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

	useEffect(() => {
		if (isOpen && jobNameInputRef.current) {
			jobNameInputRef.current.focus();
		}
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			if (jobData) {
				setJobName(jobData.name || "");
				setLocalRooms(jobData.rooms || []);
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

	const handleBuilderChange = (roomId, newBuilderId) => {
		setLocalRooms((prevRooms) => {
			const updatedRooms = prevRooms.map((room) => {
				if (room.id === roomId) {
					const newStartDate = normalizeDate(
						calculateNextAvailableDate(newBuilderId)
					);

					// Remove room from previous builder's jobs
					if (room.builderId !== "1") {
						setLocalJobsByBuilder((prev) => ({
							...prev,
							[room.builderId]: prev[room.builderId].filter(
								(job) => job.id !== room.id
							),
						}));
					}

					// Add room to new builder's jobs
					setLocalJobsByBuilder((prev) => ({
						...prev,
						[newBuilderId]: [
							...(prev[newBuilderId] || []),
							{
								...room,
								startDate: normalizeDate(newStartDate),
								builderId: newBuilderId,
							},
						],
					}));

					return {
						...room,
						builderId: newBuilderId,
						startDate: normalizeDate(newStartDate),
					};
				}
				return room;
			});
			return updatedRooms;
		});
	};

	const handleRoomChange = (roomId, changes) => {
		setLocalRooms((prevRooms) => {
			const updatedRooms = prevRooms.map((room) => {
				if (room.id === roomId) {
					let updatedRoom = { ...room, ...changes };

					if ("startDate" in changes) {
						updatedRoom.startDate = normalizeDate(changes.startDate);
					}

					if ("duration" in changes) {
						// Convert empty string to undefined
						updatedRoom.duration =
							changes.duration === "" ? undefined : Number(changes.duration);
					}

					if ("jobNumber" in changes) {
						updatedRoom.jobNumber = changes.jobNumber;
					}

					// Update the job in localJobsByBuilder
					setLocalJobsByBuilder((prev) => {
						const builderJobs = [...(prev[room.builderId] || [])];
						const jobIndex = builderJobs.findIndex((job) => job.id === roomId);

						if (jobIndex !== -1) {
							builderJobs[jobIndex] = {
								...builderJobs[jobIndex],
								...updatedRoom,
							};

							// If startDate changed, re-sort the builder's jobs
							if ("startDate" in changes) {
								builderJobs.sort(
									(a, b) => new Date(a.startDate) - new Date(b.startDate)
								);
							}
						}

						return {
							...prev,
							[room.builderId]: builderJobs,
						};
					});

					// Validate duration
					if ("duration" in changes) {
						if (
							changes.duration !== "" &&
							changes.duration !== undefined &&
							!isNaN(changes.duration)
						) {
							setErrors((prev) => {
								const newErrors = { ...prev };
								delete newErrors[`${roomId}Duration`];
								return newErrors;
							});
						}
					}

					// Validate room name
					if ("name" in changes) {
						if (changes.name.trim() !== "") {
							setErrors((prev) => {
								const newErrors = { ...prev };
								delete newErrors[`${roomId}Name`];
								return newErrors;
							});
						}
					}

					return updatedRoom;
				}
				return room;
			});
			return updatedRooms;
		});
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

	const handleCancelNewRoom = (roomId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.filter((room) => room.id !== roomId)
		);
	};

	const handleRestoreRoom = (roomId) => {
		setLocalRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.id === roomId ? { ...room, active: true } : room
			)
		);
	};

	const handleSave = () => {
		// Initialize a new errors object
		let newErrors = {};

		// Check for blank job name
		if (jobName.trim() === "") {
			newErrors.jobName = "Job name is required";
		}

		// Check for all potential errors in rooms
		localRooms.forEach((room) => {
			if (room.name.trim() === "") {
				newErrors[`${room.id}Name`] = "Room name is required";
			}
			if (
				room.duration === "" ||
				room.duration === undefined ||
				isNaN(room.duration)
			) {
				newErrors[`${room.id}Duration`] = "Valid duration is required";
			} else if (Number(room.duration) <= 0) {
				newErrors[`${room.id}Duration`] = "Duration must be greater than 0";
			}
			if (!room.builderId) {
				newErrors[`${room.id}BuilderId`] = "Builder is required";
			}
			if (!room.startDate) {
				newErrors[`${room.id}StartDate`] = "Start date is required";
			}
			if (!room.jobNumber || room.jobNumber.trim() === "") {
				newErrors[`${room.id}JobNumber`] = "Job number is required";
			}
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
				duration: Number(room.duration), // Ensure duration is a number
				startDate: normalizeDate(room.startDate), // Ensure date is normalized
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
					<span>Job #</span>
					<span>Room Name</span>
					<span>Hours</span>
					<span>Builder</span>
					<span>Start Date</span>
					<span>Actions</span>
				</div>
				{activeRooms.map((room, index) => (
					<div
						key={room.id}
						className={`roomGroup ${index % 2 === 0 ? "even" : "odd"}`}
					>
						<input
							type="text"
							value={room.jobNumber || ""}
							onChange={(e) =>
								handleRoomChange(room.id, { jobNumber: e.target.value })
							}
							placeholder="Job Number"
							className={errors[`${room.id}JobNumber`] ? "error" : ""}
						/>
						{errors[`${room.id}JobNumber`] && (
							<span className="error-message">
								{errors[`${room.id}JobNumber`]}
							</span>
						)}
						<input
							type="text"
							value={room.name}
							onChange={(e) =>
								handleRoomChange(room.id, { name: e.target.value })
							}
							placeholder="Room Name"
							ref={index === activeRooms.length - 1 ? newRoomNameRef : null}
							className={errors[`${room.id}Name`] ? "error" : ""}
						/>
						<input
							type="number"
							step="0.01"
							min="0.01"
							value={room.duration === undefined ? "" : room.duration}
							onChange={(e) =>
								handleRoomChange(room.id, {
									duration: e.target.value,
								})
							}
							onBlur={(e) =>
								handleRoomChange(room.id, {
									duration: parseFloat(parseFloat(e.target.value).toFixed(2)),
								})
							}
							placeholder="Hours"
							className={`duration ${
								errors[`${room.id}Duration`] ? "error" : ""
							}`}
						/>
						<select
							value={room.builderId}
							onChange={(e) => {
								handleBuilderChange(room.id, e.target.value);
							}}
							className={errors[`${room.id}BuilderId`] ? "error" : ""}
						>
							{builders.map((builder) => (
								<option key={builder.id} value={builder.id}>
									{builder.name}
								</option>
							))}
						</select>
						<input
							type="date"
							value={formatDateForInput(room.startDate)}
							onChange={(e) =>
								handleRoomChange(room.id, { startDate: e.target.value })
							}
							className={errors[`${room.id}StartDate`] ? "error" : ""}
						/>
						{room.isNew ? (
							<button onClick={() => handleCancelNewRoom(room.id)}>
								Cancel
							</button>
						) : (
							<button onClick={() => handleRemoveRoom(room.id)}>Remove</button>
						)}
					</div>
				))}
				<button onClick={handleAddRoom} className="add-room-button">
					Add Room
				</button>

				{inactiveRooms.length > 0 && (
					<>
						<h3>Inactive Rooms</h3>
						{inactiveRooms.map((room) => (
							<div key={room.id} className="roomGroup inactive">
								<span>{room.jobNumber}</span>
								<span>{room.name}</span>
								<button onClick={() => handleRestoreRoom(room.id)}>
									Restore
								</button>
							</div>
						))}
					</>
				)}

				{errors.rooms && <div className="error">{errors.rooms}</div>}

				<div className="modal-actions">
					<button onClick={onClose}>Cancel</button>
					<button onClick={handleSave}>Save</button>
				</div>
			</div>
		</div>
	);
};

export default JobModal;
