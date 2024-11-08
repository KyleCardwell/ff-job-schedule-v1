import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	updateBuilder,
	deleteBuilder,
	addBuilder,
	addEmployees,
	updateEmployees,
} from "../redux/actions/builders";
import { format } from "date-fns";
import { normalizeDate } from "../utils/dateUtils";
import { addDays } from "date-fns";
import { updateTasksAfterBuilderChanges } from "../redux/actions/taskData";
// import "./BuilderModal.css";

const BuilderModal = ({
	visible,
	onCancel,
	workdayHours,
	holidayChecker,
	dayWidth,
	chartStartDate,
}) => {
	const dispatch = useDispatch();
	const builders = useSelector((state) => state.builders.builders);
	const employees = useSelector((state) => state.builders.employees);
	const holidays = useSelector((state) => state.holidays.holidays);

	const [localEmployees, setLocalEmployees] = useState(builders);
	const [newBuilder, setNewBuilder] = useState({ name: "", color: "#000000" });
	const [errors, setErrors] = useState({});
	const [timeOffVisibility, setTimeOffVisibility] = useState({});

	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState(null);

	useEffect(() => {
		   // If builders is empty or undefined, create default builder
			 const defaultEmployee = {
        employee_name: "Unassigned",
        employee_color: "#FFC0CC",
        timeOff: [],
        markedForDeletion: false
    };

    const employeesToUse = employees?.length > 0 
        ? employees 
        : [defaultEmployee];

		setLocalEmployees(
			employeesToUse.map((employee) => ({ ...employee, markedForDeletion: false }))
		);
		setTimeOffVisibility({});
	}, [employees, visible]);

	const formatDateForInput = (date) => {
		if (!date) return "";
		return format(new Date(date), "yyyy-MM-dd");
	};

	const handleNameChange = (index, value) => {
		const updatedBuilders = localEmployees.map((builder, i) =>
			i === index ? { ...builder, employee_name: value } : builder
		);
		setLocalEmployees(updatedBuilders);
	};

	const handleColorChange = (index, value) => {
		const updatedBuilders = localEmployees.map((builder, i) =>
			i === index ? { ...builder, employee_color: value } : builder
		);
		setLocalEmployees(updatedBuilders);
	};

	const handleAddTimeOff = (index) => {
		const updatedBuilders = localEmployees.map((builder, i) =>
			i === index
				? { ...builder, timeOff: [...builder.timeOff, { start: "", end: "" }] }
				: builder
		);
		setLocalEmployees(updatedBuilders);
	};

	const handleTimeOffChange = (builderIndex, timeOffIndex, field, value) => {
		const updatedBuilders = localEmployees.map((builder, i) => {
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
		setLocalEmployees(updatedBuilders);
	};

	const handleRemoveTimeOff = (builderIndex, timeOffIndex) => {
		const updatedBuilders = localEmployees.map((builder, i) => {
			if (i === builderIndex) {
				const updatedTimeOff = builder.timeOff.filter(
					(_, j) => j !== timeOffIndex
				);
				return { ...builder, timeOff: updatedTimeOff };
			}
			return builder;
		});
		setLocalEmployees(updatedBuilders);
	};

	const handleMarkForDeletion = (builderId) => {
		const updatedBuilders = localEmployees.map((builder) =>
			builder.employee_id === builderId
				? { ...builder, markedForDeletion: !builder.markedForDeletion }
				: builder
		);
		setLocalEmployees(updatedBuilders);
	};

	const handleAddBuilder = () => {
		if (newBuilder.employee_name.trim() === "") {
			setErrors({ newBuilderName: "Name is required" });
			return;
		}
		setLocalEmployees([
			...localEmployees,
			{ ...newBuilder, employee_id: Date.now(), timeOff: [], markedForDeletion: false },
		]);
		setNewBuilder({ employee_name: "", employee_color: "#000000" });
		setErrors({});
	};

	const validateInputs = () => {
		const newErrors = {};
		localEmployees.forEach((builder, index) => {
			if (builder.employee_name.trim() === "") {
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

	// Helper function to compare timeOff arrays
	const areTimeOffsEqual = (timeOff1, timeOff2) => {
		if (timeOff1?.length !== timeOff2?.length) return false;
		return timeOff1?.every((period1, index) => {
			const period2 = timeOff2[index];
			return period1.start === period2.start && period1.end === period2.end;
		});
	};

	const handleSave = async () => {
		if (validateInputs()) {
			try {
				setIsSaving(true);
				setSaveError(null);

				const buildersToDelete = localEmployees
					.filter((b) => b.markedForDeletion)
					.map((b) => b.employee_id);
				const buildersToKeep = localEmployees.filter(
					(b) => !b.markedForDeletion
				);

				// Separate builders into updates and additions
				const buildersToUpdate = [];
				const buildersToAdd = [];

				buildersToKeep.forEach((localBuilder) => {
					const existingBuilder = employees.find(
						(emp) => emp.employee_id === localBuilder.employee_id
					);
					if (!existingBuilder) {
						// This is a new builder
						buildersToAdd.push({
							employee_name: localBuilder.employee_name,
							employee_color: localBuilder.employee_color,
							timeOff: localBuilder.timeOff,
						});
					} else {
						// Check if the builder has any changes
						const hasChanges =
							existingBuilder.employee_name !== localBuilder.employee_name ||
							existingBuilder.employee_color !== localBuilder.employee_color ||
							!areTimeOffsEqual(existingBuilder.timeOff, localBuilder.timeOff);

						if (hasChanges) {
							buildersToUpdate.push(localBuilder);
						}
					}
				});

				// Handle updates and additions in Supabase
				if (buildersToUpdate.length > 0) {
					await dispatch(updateEmployees(buildersToUpdate));
				}

				if (buildersToAdd.length > 0) {
					await dispatch(addEmployees(buildersToAdd));
				}

				// // Delete builders from Supabase
				// if (buildersToDelete.length > 0) {
				// 	await dispatch(deleteBuilders(buildersToDelete));
				// }

				// Update tasks after all builder changes
				dispatch(
					updateTasksAfterBuilderChanges(
						buildersToKeep,
						buildersToDelete,
						workdayHours,
						holidayChecker,
						holidays,
						dayWidth,
						chartStartDate,
						localEmployees[0].employee_id
					)
				);

				setTimeOffVisibility({});
				onCancel();
			} catch (error) {
				console.error("Error saving builders:", error);
				setSaveError("Failed to save changes. Please try again.");
			} finally {
				setIsSaving(false);
			}
		}
	};

	if (!visible) return null;

	return (
		<div className="modal-overlay">
			<div className="modal-content builder-modal">
				<h2>Manage Builders</h2>
				<form>
					<div
						className="builder-item-container"
						style={{ border: "1px solid #383838" }}
					>
						<div className="builder-item">
							<div className="builder-info">
								<input
									type="text"
									value={newBuilder.employee_name}
									onChange={(e) =>
										setNewBuilder({ ...newBuilder, employee_name: e.target.value })
									}
									placeholder="Builder Name"
									className={errors.newBuilderName ? "error" : ""}
								/>
								<input
									type="color"
									value={newBuilder.employee_color}
									onChange={(e) =>
										setNewBuilder({
											...newBuilder,
											employee_color: e.target.value,
										})
									}
								/>
							</div>

							<button
								className="modal-action-button add add-builder-button"
								type="button"
								onClick={handleAddBuilder}
							>
								Add Builder
							</button>
						</div>
					</div>
					{localEmployees.map((builder, index) => (
						<div
							className="builder-item-container"
							key={builder.employee_id || index}
							style={{
								backgroundColor: builder.employee_color,
								position: "relative",
							}}
						>
							{index === 0 && (
								<div className="default-builder-overlay">
									This default employee cannot be deleted. <br />
									You may change the name and color.
								</div>
							)}
							<div className="builder-item-controls">
								<div
									className={`builder-item ${
										builder.markedForDeletion ? "marked-for-deletion" : ""
									}`}
								>
									<div className="builder-info">
										<input
											type="text"
											value={builder.employee_name}
											onChange={(e) => handleNameChange(index, e.target.value)}
											placeholder="Builder Name"
											className={errors[`name-${index}`] ? "error" : ""}
											disabled={builder.markedForDeletion}
										/>
										<input
											type="color"
											value={builder.employee_color}
											onChange={(e) => handleColorChange(index, e.target.value)}
											disabled={builder.markedForDeletion}
											style={{
												minWidth: "50px",
											}}
										/>
									</div>
									<div className="builder-actions">
										<button
											className="modal-action-button add"
											style={
												index === 0
													? {
															visibility: "hidden",
													  }
													: {}
											}
											type="button"
											onClick={() => toggleTimeOffVisibility(builder.employee_id)}
											disabled={builder.markedForDeletion}
										>
											{timeOffVisibility[builder.employee_id]
												? "Hide Time Off"
												: "Add/Edit Time Off"}
										</button>
										<button
											className="modal-action-button remove"
											style={
												index === 0
													? {
															visibility: "hidden",
													  }
													: {}
											}
											type="button"
											onClick={() => handleMarkForDeletion(builder.employee_id)}
										>
											{builder.markedForDeletion
												? "Undo Delete"
												: "Delete Builder"}
										</button>
									</div>
								</div>

								{timeOffVisibility[builder.employee_id] && (
									<div className="time-off-container">
										{builder.timeOff.map((period, timeOffIndex) => (
											<div className="time-off-period" key={timeOffIndex}>
												<div className="date-input-group">
													<label
														htmlFor={`start-${builder.employee_id}-${timeOffIndex}`}
													>
														Start:
													</label>
													<input
														id={`start-${builder.employee_id}-${timeOffIndex}`}
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
													<label htmlFor={`end-${builder.employee_id}-${timeOffIndex}`}>
														End:
													</label>
													<input
														id={`end-${builder.employee_id}-${timeOffIndex}`}
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
													className="modal-action-button remove"
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
											className="modal-action-button add add-time-off-button"
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
					<button
						className="modal-action-button cancel"
						onClick={() => {
							onCancel();
							setErrors({});
						}}
					>
						Cancel
					</button>
					{saveError && <div className="error-message">{saveError}</div>}
					<button
						className="modal-action-button save"
						onClick={handleSave}
						disabled={isSaving}
					>
						{isSaving ? "Saving..." : "Save"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default BuilderModal;
