import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	addBuilder,
	updateBuilder,
	deleteBuilder,
} from "../redux/actions/builders";
import { updateJobsAfterBuilderChanges } from "../redux/actions/ganttActions";

const BuilderModal = ({ isOpen, onClose }) => {
	const dispatch = useDispatch();
	const builders = useSelector((state) => state.builders.builders);

	const [localBuilders, setLocalBuilders] = useState([]);
	const [name, setName] = useState("");
	const [color, setColor] = useState("#000000");
	const [editingBuilderId, setEditingBuilderId] = useState(null);
	const [errors, setErrors] = useState({});

	useEffect(() => {
		if (isOpen) {
			setLocalBuilders(
				builders.map((builder) => ({ ...builder, markedForDeletion: false }))
			);
			resetForm();
		}
	}, [isOpen, builders]);

	const resetForm = () => {
		setName("");
		setColor("#000000");
		setEditingBuilderId(null);
		setErrors({});
	};

	const validateForm = () => {
		const newErrors = {};
		if (!name.trim()) newErrors.name = "Builder name is required";
		if (!color) newErrors.color = "Color is required";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleAddOrUpdateBuilder = () => {
		if (!validateForm()) return;

		setLocalBuilders((prevBuilders) => {
			if (editingBuilderId) {
				return prevBuilders.map((b) =>
					b.id === editingBuilderId
						? { ...b, name, color, markedForDeletion: false }
						: b
				);
			} else {
				return [
					...prevBuilders,
					{ id: Date.now().toString(), name, color, markedForDeletion: false },
				];
			}
		});

		resetForm();
	};

	const handleEditBuilder = (builder) => {
		setName(builder.name);
		setColor(builder.color);
		setEditingBuilderId(builder.id);
	};

	const handleToggleDeleteBuilder = (id) => {
		setLocalBuilders((prevBuilders) =>
			prevBuilders.map((b) =>
				b.id === id ? { ...b, markedForDeletion: !b.markedForDeletion } : b
			)
		);
	};

	const handleSave = () => {
		const buildersToDelete = localBuilders
			.filter((b) => b.markedForDeletion)
			.map((b) => b.id);
		const buildersToKeep = localBuilders.filter((b) => !b.markedForDeletion);

		// Update or add builders
		buildersToKeep.forEach((builder) => {
			const existingBuilder = builders.find((b) => b.id === builder.id);
			if (!existingBuilder) {
				dispatch(addBuilder(builder.name, builder.color));
			} else if (
				existingBuilder.name !== builder.name ||
				existingBuilder.color !== builder.color
			) {
				dispatch(updateBuilder(builder));
			}
		});

		// Delete builders
		buildersToDelete.forEach((id) => {
			dispatch(deleteBuilder(id));
		});

		// Update jobs if any builders were deleted
		if (buildersToDelete.length > 0) {
			dispatch(updateJobsAfterBuilderChanges(buildersToDelete));
		}

		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="modal-overlay">
			<div className="modal-content">
				<h2>Manage Builders</h2>
				<div>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Builder Name"
					/>
					{errors.name && <p className="error">{errors.name}</p>}
					<input
						type="color"
						value={color}
						onChange={(e) => setColor(e.target.value)}
					/>
					{errors.color && <p className="error">{errors.color}</p>}
					<button onClick={handleAddOrUpdateBuilder}>
						{editingBuilderId ? "Update" : "Add"} Builder
					</button>
				</div>
				<ul className="builder-list">
					{localBuilders.map((builder) => (
						<li
							key={builder.id}
							style={{
								backgroundColor: builder.color,
								border: builder.markedForDeletion ? "2px solid red" : "none",
							}}
						>
							<button
								onClick={() => handleEditBuilder(builder)}
								className="edit-button"
							>
								Edit
							</button>
							<span className="builder-name">{builder.name}</span>
							{builder.id !== "1" && (
								<button
									onClick={() => handleToggleDeleteBuilder(builder.id)}
									className="delete-button"
								>
									{builder.markedForDeletion ? "Undo Delete" : "Delete"}
								</button>
							)}
						</li>
					))}
				</ul>
				<div className="modal-actions">
					<button onClick={onClose}>Cancel</button>
					<button onClick={handleSave}>Save Changes</button>
				</div>
			</div>
		</div>
	);
};

export default BuilderModal;
