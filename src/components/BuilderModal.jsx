import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	updateBuilder,
	deleteBuilder,
	addBuilder,
	addEmployees,
	updateEmployees,
	deleteEmployees,
} from "../redux/actions/builders";
import { format } from "date-fns";
import { formatDateForInput, normalizeDate } from "../utils/dateUtils";
import { addDays, parseISO } from "date-fns";
import { updateTasksAfterBuilderChanges } from "../redux/actions/taskData";
import {
	buttonClass,
	modalContainerClass,
	modalOverlayClass,
} from "../assets/tailwindConstants";

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
	const holidays = useSelector((state) => state.holidays);

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
			time_off: [],
			markedForDeletion: false,
		};

		const employeesToUse =
			employees?.length > 0 ? employees : [defaultEmployee];

		setLocalEmployees(
			employeesToUse.map((employee) => ({
				...employee,
				markedForDeletion: false,
			}))
		);
		setTimeOffVisibility({});
	}, [employees, visible]);

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
				? {
						...builder,
						time_off: [
							...builder.time_off,
							{
								start: normalizeDate(
									new Date(
										Date.UTC(
											new Date().getUTCFullYear(),
											new Date().getUTCMonth(),
											new Date().getUTCDate()
										)
									)
								),
								end: normalizeDate(
									new Date(
										Date.UTC(
											new Date().getUTCFullYear(),
											new Date().getUTCMonth(),
											new Date().getUTCDate()
										)
									)
								),
							},
						],
				  }
				: builder
		);
		setLocalEmployees(updatedBuilders);
	};

	const handleTimeOffChange = (builderIndex, timeOffIndex, field, value) => {
		const updatedBuilders = localEmployees.map((builder, i) => {
			if (i === builderIndex) {
				const updatedTimeOff = builder.time_off.map((period, j) =>
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
				return { ...builder, time_off: updatedTimeOff };
			}
			return builder;
		});
		setLocalEmployees(updatedBuilders);
	};

	const handleRemoveTimeOff = (builderIndex, timeOffIndex) => {
		const updatedBuilders = localEmployees.map((builder, i) => {
			if (i === builderIndex) {
				const updatedTimeOff = builder.time_off.filter(
					(_, j) => j !== timeOffIndex
				);
				return { ...builder, time_off: updatedTimeOff };
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
		const newBuilder = {
			employee_name: "",
			employee_color: "#000000",
			time_off: [],
			markedForDeletion: false,
		};

		setLocalEmployees((prev) => [...prev, newBuilder]);

		// Focus on the new builder's name input after render
		setTimeout(() => {
			const inputs = document.querySelectorAll(
				'.builder-info input[type="text"]'
			);
			const lastInput = inputs[inputs.length - 1];
			if (lastInput) {
				lastInput.focus();
			}
		}, 0);
	};

	const validateInputs = () => {
		const newErrors = {};
		localEmployees.forEach((builder, index) => {
			if (builder.employee_name.trim() === "") {
				newErrors[`name-${index}`] = "Name is required";
			}
			builder.time_off?.forEach((period, timeOffIndex) => {
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

	// Helper function to compare time_off arrays
	const areTimeOffsEqual = (timeOff1, timeOff2) => {
		if (timeOff1?.length !== timeOff2?.length) return false;
		return timeOff1?.every((period1, index) => {
			const period2 = timeOff2[index];
			// Compare normalized dates
			const start1 = normalizeDate(
				new Date(
					Date.UTC(
						new Date(period1.start).getUTCFullYear(),
						new Date(period1.start).getUTCMonth(),
						new Date(period1.start).getUTCDate()
					)
				)
			);
			const start2 = normalizeDate(
				new Date(
					Date.UTC(
						new Date(period2.start).getUTCFullYear(),
						new Date(period2.start).getUTCMonth(),
						new Date(period2.start).getUTCDate()
					)
				)
			);
			const end1 = normalizeDate(
				new Date(
					Date.UTC(
						new Date(period1.end).getUTCFullYear(),
						new Date(period1.end).getUTCMonth(),
						new Date(period1.end).getUTCDate()
					)
				)
			);
			const end2 = normalizeDate(
				new Date(
					Date.UTC(
						new Date(period2.end).getUTCFullYear(),
						new Date(period2.end).getUTCMonth(),
						new Date(period2.end).getUTCDate()
					)
				)
			);
			return start1 === start2 && end1 === end2;
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
							time_off: localBuilder.time_off,
						});
					} else {
						// Check if the builder has any changes
						const hasChanges =
							existingBuilder.employee_name !== localBuilder.employee_name ||
							existingBuilder.employee_color !== localBuilder.employee_color ||
							!areTimeOffsEqual(
								existingBuilder.time_off,
								localBuilder.time_off
							);

						if (hasChanges) {
							buildersToUpdate.push(localBuilder);
						}
					}
				});

				// Handle updates
				if (buildersToUpdate.length > 0) {
					const updateResult = await dispatch(
						updateEmployees(buildersToUpdate)
					);
					if (!updateResult.success) {
						throw new Error(updateResult.error || "Failed to update employees");
					}
				}

				// Handle additions
				if (buildersToAdd.length > 0) {
					const addResult = await dispatch(addEmployees(buildersToAdd));
					if (!addResult) {
						throw new Error("Failed to add new employees");
					}
				}

				// Deleted builders will be updated inside the updateTasksAfterBuilderChanges action

				// Update tasks after all builder changes
				await dispatch(
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
				setSaveError("Failed to save Employees. Please try again.");
			} finally {
				setIsSaving(false);
			}
		}
	};

	if (!visible) return null;

	return (
		<div className={modalOverlayClass}>
			<div className={modalContainerClass}>
				<h2 className="text-lg font-bold mb-5">Manage Employees</h2>
				<form>
					{localEmployees.map((builder, index) => (
						<div
							className="flex flex-col gap-2 p-4 mb-2 rounded relative"
							key={builder.employee_id || index}
							style={{
								backgroundColor: builder.employee_color,
							}}
						>
							{index === 0 && (
								<div className="absolute top-0 right-0 bottom-0 bg-black bg-opacity-20 text-white p-2 rounded-r z-10 flex items-center justify-center text-center">
									This default employee cannot be deleted. <br />
									You may change the name and color.
								</div>
							)}
							<div className="flex flex-col gap-2">
								<div
									className={`flex items-center gap-2 ${
										builder.markedForDeletion ? "opacity-50" : ""
									}`}
								>
									<div className="flex gap-2 flex-grow">
										<input
											type="text"
											value={builder.employee_name}
											onChange={(e) => handleNameChange(index, e.target.value)}
											placeholder="Builder Name"
											className={`p-2 h-8 text-sm border ${
												errors[`name-${index}`]
													? "border-red-500"
													: "border-gray-300"
											} rounded`}
											disabled={builder.markedForDeletion}
										/>
										<input
											type="color"
											value={builder.employee_color}
											onChange={(e) => handleColorChange(index, e.target.value)}
											disabled={builder.markedForDeletion}
											className="min-w-[60px] h-8"
										/>
									</div>
									<div className="flex gap-2 justify-between">
										<button
											className={`${buttonClass} bg-blue-500`}
											style={
												index === 0
													? {
															visibility: "hidden",
													  }
													: {}
											}
											type="button"
											onClick={() =>
												toggleTimeOffVisibility(builder.employee_id)
											}
											disabled={builder.markedForDeletion}
										>
											{timeOffVisibility[builder.employee_id]
												? "Hide Time Off"
												: "Edit Time Off"}
										</button>
										<button
											className="text-white bg-red-500 rounded-md px-2 py-1"
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
											{builder.markedForDeletion ? "Undo Delete" : "Delete"}
										</button>
									</div>
								</div>

								{timeOffVisibility[builder.employee_id] && (
									<div className="flex flex-col gap-2 items-center">
										{builder.time_off.map((period, timeOffIndex) => (
											<div
												className="flex gap-6 p-2 border border-white rounded"
												key={timeOffIndex}
											>
												<div className="flex-grow gap-2">
													<label
														htmlFor={`start-${builder.employee_id}-${timeOffIndex}`}
														className="text-sm"
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
														className={`p-2 h-8 text-sm border ${
															errors[`start-${index}-${timeOffIndex}`]
																? "border-red-500"
																: "border-gray-300"
														} rounded`}
														disabled={builder.markedForDeletion}
													/>
												</div>
												<div className="flex-grow gap-2">
													<label
														htmlFor={`end-${builder.employee_id}-${timeOffIndex}`}
														className="text-sm"
													>
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
														className={`p-2 h-8 text-sm border ${
															errors[`end-${index}-${timeOffIndex}`]
																? "border-red-500"
																: "border-gray-300"
														} rounded`}
														disabled={builder.markedForDeletion}
													/>
												</div>
												<button
													className="text-white bg-red-500 rounded-md px-2 py-1"
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
											className="text-white bg-green-500 rounded-md px-2 py-1 w-fit"
										>
											Add Time Off Period
										</button>
									</div>
								)}
							</div>
						</div>
					))}
					<button
						className="text-white bg-green-500 rounded-md px-2 py-1"
						type="button"
						onClick={handleAddBuilder}
						style={{
							display: "block",
							margin: "20px auto",
							width: "auto",
							padding: "8px 16px",
						}}
					>
						Add Employee
					</button>
				</form>
				<div className="flex justify-between">
					<button
						className="text-white bg-red-500 rounded-md px-2 py-1"
						onClick={() => {
							onCancel();
							setErrors({});
						}}
					>
						Cancel
					</button>
					{saveError && <div className="text-red-500">{saveError}</div>}
					<button
						className="text-white bg-blue-500 rounded-md px-2 py-1"
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
