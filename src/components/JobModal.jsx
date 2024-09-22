import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	incrementJobNumber,
	updateJobAndRooms,
} from "../redux/actions/ganttActions";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { normalizeDate } from "../utils/dateUtils";

const JobModal = ({ isOpen, onClose, onSave, jobData }) => {
	const dispatch = useDispatch();
	const [jobName, setJobName] = useState("");
	const [rooms, setRooms] = useState([]);
	const [errors, setErrors] = useState({});
	const builders = useSelector(
		(state) => state.builders.builders,
		(prev, next) => JSON.stringify(prev) === JSON.stringify(next)
	);
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
		}
	}, [jobData, isOpen, builders]);

	const handleRoomChange = (index, changes) => {
		const updatedRooms = [...rooms];
		if ("startDate" in changes) {
			// Normalize the date when it's changed
			changes.startDate = normalizeDate(changes.startDate);
		}
		updatedRooms[index] = { ...updatedRooms[index], ...changes };
		setRooms(updatedRooms);

		// Clear errors for the changed fields
		const updatedErrors = { ...errors };
		Object.keys(changes).forEach((key) => {
			delete updatedErrors[
				`room${index}${key.charAt(0).toUpperCase() + key.slice(1)}`
			];
		});
		setErrors(updatedErrors);
	};

	const handleAddRoom = () => {
		setRooms([
			...rooms,
			{
				id: uuidv4(),
				jobNumber: nextJobNumber.toString(),
				name: "",
				startDate: formatDateForInput(new Date()),
				duration: undefined,
				builderId: "1",
			},
		]);
		dispatch(incrementJobNumber());

		// Focus on the new room name input
		setTimeout(() => {
			if (newRoomNameRef.current) {
				newRoomNameRef.current.focus();
			}
		}, 0);
	};

	const handleSave = () => {
		const newErrors = {};
		if (!jobName) newErrors.jobName = "Job Name is required.";
		rooms.forEach((room, index) => {
			if (!room.name) newErrors[`room${index}Name`] = "Room Name is required.";
			if (!room.startDate)
				newErrors[`room${index}StartDate`] = "Start Date is required.";
			if (room.duration == null)
				newErrors[`room${index}Duration`] = "Duration is required.";
			if (!room.builderId)
				newErrors[`room${index}BuilderId`] = "Builder is required.";
		});

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return; // Exit early if there are errors
		}

		const updatedJob = {
			id: jobData ? jobData.id : uuidv4(),
			name: jobName,
			rooms: rooms.map(room => ({
				...room,
				id: room.id || uuidv4(),
				builderId: room.builderId || "1",
			})),
		};
		onSave(updatedJob);
		dispatch(updateJobAndRooms(updatedJob));
		setErrors({}); // Reset errors on successful save
	};

	if (!isOpen) return null;

	return (
		<div className="modal-overlay">
			<div className="modal-content">
				<h2>{jobData ? "Edit Job" : "Add New Job"}</h2>

				<label>
					Job Name
					<input
						required
						type="text"
						value={jobName}
						onChange={(e) => setJobName(e.target.value)}
						onFocus={() =>
							setErrors((prev) => ({ ...prev, jobName: undefined }))
						} // Clear error on focus
						style={{ borderColor: errors.jobName ? "red" : "" }}
					/>
				</label>

				<h3>Rooms</h3>
				{rooms.map((room, index) => (
					<div
						className="roomGroup"
						key={index}
						style={{ backgroundColor: index % 2 ? "#e0e0e0" : "" }}
					>
						<label>
							Job #
							<input
								required
								className="jobNumber"
								type="number"
								value={room.jobNumber || nextJobNumber}
								onChange={(e) =>
									handleRoomChange(index, { jobNumber: e.target.value })
								}
							/>
						</label>

						<label>
							Room Name
							<input
								required
								ref={index === rooms.length - 1 ? newRoomNameRef : null}
								type="text"
								value={room.name}
								onChange={(e) =>
									handleRoomChange(index, { name: e.target.value })
								}
								onFocus={() =>
									setErrors((prev) => ({
										...prev,
										[`room${index}Name`]: undefined,
									}))
								} // Clear error on focus
								style={{ borderColor: errors[`room${index}Name`] ? "red" : "" }}
							/>
						</label>

						<label>
							Start Date
							<input
								required
								type="date"
								value={formatDateForInput(room.startDate)}
								onChange={(e) =>
									handleRoomChange(index, { startDate: e.target.value })
								}
								onFocus={() =>
									setErrors((prev) => ({
										...prev,
										[`room${index}StartDate`]: undefined,
									}))
								} // Clear error on focus
								style={{
									borderColor: errors[`room${index}StartDate`] ? "red" : "",
								}}
							/>
						</label>

						<label>
							Hours
							<input
								required
								className="duration"
								type="number"
								value={room.duration}
								onChange={(e) =>
									handleRoomChange(index, { duration: Number(e.target.value) })
								}
								onFocus={() =>
									setErrors((prev) => ({
										...prev,
										[`room${index}Duration`]: undefined,
									}))
								} // Clear error on focus
								style={{
									borderColor: errors[`room${index}Duration`] ? "red" : "",
								}}
							/>
						</label>

						<label>
							Builder
							<select
								value={room.builderId || ""}
								onChange={(e) =>
									handleRoomChange(index, { builderId: e.target.value })
								}
								onFocus={() =>
									setErrors((prev) => ({
										...prev,
										[`room${index}BuilderId`]: undefined,
									}))
								} // Clear error on focus
								style={{
									borderColor: errors[`room${index}BuilderId`] ? "red" : "",
								}}
							>
								{builders.map((builder) => (
									<option key={builder.id} value={builder.id}>
										{builder.name}
									</option>
								))}
							</select>
						</label>
					</div>
				))}

				<button className="add-room-button" onClick={handleAddRoom}>
					Add Room
				</button>

				<div className="modal-actions">
					<button onClick={onClose}>Cancel</button>
					<button onClick={handleSave}>Save</button>
				</div>
			</div>
		</div>
	);
};

export default JobModal;
