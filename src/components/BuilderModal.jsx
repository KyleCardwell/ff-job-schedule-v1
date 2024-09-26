import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	updateBuilder,
	deleteBuilder,
	addBuilder,
} from "../redux/actions/builders";
import { updateJobsAfterBuilderChanges } from "../redux/actions/ganttActions";
import { format } from "date-fns";
import { normalizeDate } from "../utils/dateUtils";
// import "./BuilderModal.css";

const BuilderModal = ({ visible, onCancel }) => {
	const dispatch = useDispatch();
	const builders = useSelector((state) => state.builders.builders);

	const [localBuilders, setLocalBuilders] = useState(builders);
	const [newBuilder, setNewBuilder] = useState({ name: "", color: "#000000" });
	const [errors, setErrors] = useState({});
	const [timeOffVisibility, setTimeOffVisibility] = useState({});

	useEffect(() => {
		setLocalBuilders(
			builders.map((builder) => ({ ...builder, markedForDeletion: false }))
		);
		setTimeOffVisibility({});
	}, [builders, visible]);

	const formatDateForInput = (date) => {
		if (!date) return "";
		return format(new Date(date), "yyyy-MM-dd");
	};

	const handleNameChange = (index, value) => {
		const updatedBuilders = localBuilders.map((builder, i) =>
			i === index ? { ...builder, name: value } : builder
		);
		setLocalBuilders(updatedBuilders);
	};

	const handleColorChange = (index, value) => {
		const updatedBuilders = localBuilders.map((builder, i) =>
			i === index ? { ...builder, color: value } : builder
		);
		setLocalBuilders(updatedBuilders);
	};

	const handleAddTimeOff = (index) => {
		const updatedBuilders = localBuilders.map((builder, i) =>
			i === index
				? { ...builder, timeOff: [...builder.timeOff, { start: "", end: "" }] }
				: builder
		);
		setLocalBuilders(updatedBuilders);
	};

	const handleTimeOffChange = (builderIndex, timeOffIndex, field, value) => {
		const updatedBuilders = localBuilders.map((builder, i) => {
			if (i === builderIndex) {
				const updatedTimeOff = builder.timeOff.map((period, j) =>
					j === timeOffIndex
						? {
								...period,
								[field]:
									field === "start" || field === "end"
										? normalizeDate(value)
										: value,
						  }
						: period
				);
				return { ...builder, timeOff: updatedTimeOff };
			}
			return builder;
		});
		setLocalBuilders(updatedBuilders);
	};

	const handleRemoveTimeOff = (builderIndex, timeOffIndex) => {
		const updatedBuilders = localBuilders.map((builder, i) => {
			if (i === builderIndex) {
				const updatedTimeOff = builder.timeOff.filter(
					(_, j) => j !== timeOffIndex
				);
				return { ...builder, timeOff: updatedTimeOff };
			}
			return builder;
		});
		setLocalBuilders(updatedBuilders);
	};

	const handleMarkForDeletion = (builderId) => {
		const updatedBuilders = localBuilders.map((builder) =>
			builder.id === builderId
				? { ...builder, markedForDeletion: !builder.markedForDeletion }
				: builder
		);
		setLocalBuilders(updatedBuilders);
	};

	const handleAddBuilder = () => {
		if (newBuilder.name.trim() === "") {
			setErrors({ newBuilderName: "Name is required" });
			return;
		}
		setLocalBuilders([
			...localBuilders,
			{ ...newBuilder, id: Date.now(), timeOff: [], markedForDeletion: false },
		]);
		setNewBuilder({ name: "", color: "#000000" });
		setErrors({});
	};

	const validateInputs = () => {
		const newErrors = {};
		localBuilders.forEach((builder, index) => {
			if (builder.name.trim() === "") {
				newErrors[`name-${index}`] = "Name is required";
			}
			builder.timeOff?.forEach((period, timeOffIndex) => {
				if (!period.start) {
					newErrors[`start-${index}-${timeOffIndex}`] =
						"Start date is required";
				}
				if (!period.end) {
					newErrors[`end-${index}-${timeOffIndex}`] = "End date is required";
				}
			});
		});
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const toggleTimeOffVisibility = (builderId) => {
		setTimeOffVisibility((prev) => ({
			...prev,
			[builderId]: !prev[builderId],
		}));
	};

	const handleSave = () => {
		if (validateInputs()) {
			const buildersToDelete = localBuilders
				.filter((b) => b.markedForDeletion)
				.map((b) => b.id);
			const buildersToKeep = localBuilders.filter((b) => !b.markedForDeletion);

			// Update or add builders
			buildersToKeep.forEach((builder) => {
				const existingBuilder = builders.find((b) => b.id === builder.id);
				if (!existingBuilder) {
					dispatch(addBuilder(builder.name, builder.color, builder.timeOff));
				} else {
					dispatch(updateBuilder(builder));
				}
			});

			// Delete builders
			buildersToDelete.forEach((id) => {
				dispatch(deleteBuilder(id));
			});

			// Update all jobs if any builders were deleted
			if (buildersToDelete.length > 0) {
				dispatch(updateJobsAfterBuilderChanges(buildersToDelete));
			}

			setTimeOffVisibility({});
			onCancel();
		}
	};

	if (!visible) return null;

	return (
		<div className="modal-overlay">
			<div className="modal-content builder-modal">
				<h2>Manage Builders</h2>
				<form>
					<div className="builder-item-container" style={{border: "1px solid #383838"}}>
						<div className="builder-item">
							<div className="builder-info">
								<input
									type="text"
									value={newBuilder.name}
									onChange={(e) =>
										setNewBuilder({ ...newBuilder, name: e.target.value })
									}
									placeholder="Builder Name"
									className={errors.newBuilderName ? "error" : ""}
								/>
								<input
									type="color"
									value={newBuilder.color}
									onChange={(e) =>
										setNewBuilder({ ...newBuilder, color: e.target.value })
									}
								/>
							</div>

							<button className="add-builder-button" type="button" onClick={handleAddBuilder}>
								Add Builder
							</button>
						</div>
					</div>
					{localBuilders.map((builder, index) => (
						<div
							className="builder-item-container"
							key={builder.id}
							style={{
								backgroundColor: builder.color,
							}}
						>
							<div className="builder-item-controls">
								<div
									className={`builder-item ${
										builder.markedForDeletion ? "marked-for-deletion" : ""
									}`}
								>
									<div className="builder-info">
										<input
											type="text"
											value={builder.name}
											onChange={(e) => handleNameChange(index, e.target.value)}
											placeholder="Builder Name"
											className={errors[`name-${index}`] ? "error" : ""}
											disabled={builder.markedForDeletion}
										/>
										<input
											type="color"
											value={builder.color}
											onChange={(e) => handleColorChange(index, e.target.value)}
											disabled={builder.markedForDeletion}
											style={{
												minWidth: "50px",
											}}
										/>
									</div>
									<div className="builder-actions">
										{builder.id !== "1" && (
											<button
												type="button"
												onClick={() => toggleTimeOffVisibility(builder.id)}
												disabled={builder.markedForDeletion}
											>
												{timeOffVisibility[builder.id]
													? "Hide Time Off"
													: "Add/Edit Time Off"}
											</button>
										)}
										{builder.id !== "1" && (
											<button
												type="button"
												onClick={() => handleMarkForDeletion(builder.id)}
											>
												{builder.markedForDeletion
													? "Undo Delete"
													: "Delete Builder"}
											</button>
										)}
									</div>
								</div>

								{timeOffVisibility[builder.id] && (
									<div className="time-off-container">
										{builder.timeOff.map((period, timeOffIndex) => (
											<div className="time-off-period" key={timeOffIndex}>
												<div className="date-input-group">
													<label
														htmlFor={`start-${builder.id}-${timeOffIndex}`}
													>
														Start:
													</label>
													<input
														id={`start-${builder.id}-${timeOffIndex}`}
														type="date"
														value={formatDateForInput(period.start)}
														onChange={(e) =>
															handleTimeOffChange(
																index,
																timeOffIndex,
																"start",
																e.target.value
															)
														}
														className={
															errors[`start-${index}-${timeOffIndex}`]
																? "error"
																: ""
														}
														disabled={builder.markedForDeletion}
													/>
												</div>
												<div className="date-input-group">
													<label htmlFor={`end-${builder.id}-${timeOffIndex}`}>
														End:
													</label>
													<input
														id={`end-${builder.id}-${timeOffIndex}`}
														type="date"
														value={formatDateForInput(period.end)}
														onChange={(e) =>
															handleTimeOffChange(
																index,
																timeOffIndex,
																"end",
																e.target.value
															)
														}
														className={
															errors[`end-${index}-${timeOffIndex}`]
																? "error"
																: ""
														}
														disabled={builder.markedForDeletion}
													/>
												</div>
												<button
													type="button"
													onClick={() =>
														handleRemoveTimeOff(index, timeOffIndex)
													}
													disabled={builder.markedForDeletion}
												>
													Remove
												</button>
											</div>
										))}
										<button
											type="button"
											onClick={() => handleAddTimeOff(index)}
											disabled={builder.markedForDeletion}
											className="add-time-off-button"
										>
											Add Time Off Period
										</button>
									</div>
								)}
							</div>
						</div>
					))}
				</form>
				<div className="modal-actions">
					<button onClick={onCancel}>Cancel</button>
					<button onClick={handleSave}>Save</button>
				</div>
			</div>
		</div>
	);
};

export default BuilderModal;
