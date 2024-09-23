import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import {
	incrementJobNumber,
	updateJobAndRooms,
} from "../redux/actions/ganttActions";
import { format } from "date-fns";
import { normalizeDate } from "../utils/dateUtils";

const JobModal = ({ isOpen, onClose, onSave, jobData }) => {
	const dispatch = useDispatch();
	const [jobName, setJobName] = useState("");
	const [rooms, setRooms] = useState([]);
	const [errors, setErrors] = useState({});
	const builders = useSelector((state) => state.builders.builders);
	const nextJobNumber = useSelector((state) => state.jobs.nextJobNumber);
	const newRoomNameRef = useRef(null);

	const formatDateForInput = (date) => {
		if (!date) return "";
		return format(new Date(date), "yyyy-MM-dd");
	};

	useEffect(() => {
		if (isOpen) {
			if (jobData) {
				setJobName(jobData.name || "");
				setRooms(jobData.rooms || []);
			} else {
				// Reset state for a new job
				setJobName("");
				setRooms([]);
			}
			setErrors({});
		}
	}, [jobData, isOpen]);

	const handleRoomChange = (roomId, changes) => {
		setRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.id === roomId
					? {
							...room,
							...changes,
							startDate:
								"startDate" in changes
									? normalizeDate(changes.startDate)
									: room.startDate,
					  }
					: room
			)
		);

		// Clear errors for the changed fields
		setErrors((prevErrors) => {
			const updatedErrors = { ...prevErrors };
			Object.keys(changes).forEach((key) => {
				delete updatedErrors[
					`${roomId}${key.charAt(0).toUpperCase() + key.slice(1)}`
				];
			});
			return updatedErrors;
		});
	};

	const handleAddRoom = () => {
		const newRoom = {
			id: uuidv4(),
			name: "",
			startDate: normalizeDate(new Date()),
			duration: undefined,
			builderId: "1",
			jobNumber: nextJobNumber.toString(),
			active: true,
			isNew: true,
		};
		setRooms((prevRooms) => [...prevRooms, newRoom]);
		dispatch(incrementJobNumber());

		setErrors((prevErrors) => ({ ...prevErrors, rooms: undefined }));

		// Focus on the new room name input
		setTimeout(() => {
			if (newRoomNameRef.current) {
				newRoomNameRef.current.focus();
			}
		}, 0);
	};

	const handleRemoveRoom = (roomId) => {
		setRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.id === roomId ? { ...room, active: false } : room
			)
		);
	};

	const handleCancelNewRoom = (roomId) => {
		setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
	};

	const handleRestoreRoom = (roomId) => {
		setRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.id === roomId ? { ...room, active: true } : room
			)
		);
	};

	const handleSave = () => {
		const newErrors = {};
		if (!jobName.trim()) newErrors.jobName = true;

		const activeRooms = rooms.filter((room) => room.active);

		if (activeRooms.length === 0) {
			newErrors.rooms = "At least one active room is required";
		}

		activeRooms.forEach((room) => {
			if (!room.name.trim()) newErrors[`${room.id}Name`] = true;
			if (!room.startDate) newErrors[`${room.id}StartDate`] = true;
			if (room.duration == null || room.duration <= 0)
				newErrors[`${room.id}Duration`] = true;
			if (!room.builderId) newErrors[`${room.id}BuilderId`] = true;
		});

		setErrors(newErrors);

		if (Object.keys(newErrors).length > 0) {
			return; // Exit early if there are errors
		}

		const updatedJob = {
			id: jobData ? jobData.id : uuidv4(),
			name: jobName,
			rooms: rooms.map((room) => ({
				...room,
				id: room.id || uuidv4(),
				builderId: room.builderId || "1",
				isNew: undefined, // Remove the isNew property
			})),
		};

		// Dispatch action to update the job in the Redux store
		dispatch(updateJobAndRooms(updatedJob));

		// Call the onSave prop with the updated job
		onSave(updatedJob);

		// Close the modal
		onClose();
	};

	if (!isOpen) return null;

	const activeRooms = rooms.filter((room) => room.active);
	const inactiveRooms = rooms.filter((room) => !room.active);

	return (
		<div className="modal-overlay">
			<div className="modal-content">
				<h2>{jobData ? "Edit Job" : "Add New Job"}</h2>
				<input
					type="text"
					value={jobName}
					onChange={(e) => setJobName(e.target.value)}
					placeholder="Job Name"
					className={errors.jobName ? "error" : ""}
				/>

				<h3>Active Rooms</h3>
				<div className="roomGroup header">
					<span>Job #</span>
					<span>Room Name</span>
					<span>Start Date</span>
					<span>Hours</span>
					<span>Builder</span>
					<span>Actions</span>
				</div>
				{activeRooms.map((room, index) => (
					<div
						key={room.id}
						className={`roomGroup ${index % 2 === 0 ? "even" : "odd"}`}
					>
						<input
							type="text"
							value={room.jobNumber}
							readOnly
							className="jobNumber"
						/>
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
							type="date"
							value={formatDateForInput(room.startDate)}
							onChange={(e) =>
								handleRoomChange(room.id, { startDate: e.target.value })
							}
							className={errors[`${room.id}StartDate`] ? "error" : ""}
						/>
						<input
							type="number"
							value={room.duration}
							onChange={(e) =>
								handleRoomChange(room.id, {
									duration: parseInt(e.target.value),
								})
							}
							placeholder="Hours"
							className={`duration ${
								errors[`${room.id}Duration`] ? "error" : ""
							}`}
						/>
						<select
							value={room.builderId}
							onChange={(e) =>
								handleRoomChange(room.id, { builderId: e.target.value })
							}
							className={errors[`${room.id}BuilderId`] ? "error" : ""}
						>
							{builders.map((builder) => (
								<option key={builder.id} value={builder.id}>
									{builder.name}
								</option>
							))}
						</select>
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
