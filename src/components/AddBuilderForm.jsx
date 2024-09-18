import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { addBuilder } from "../redux/actions/builders";

const AddBuilderForm = () => {
	const dispatch = useDispatch();

	// Local state to manage form input
	const [builderName, setBuilderName] = useState("");
	const [builderColor, setBuilderColor] = useState("");

	const handleSubmit = (e) => {
		e.preventDefault();

		// Dispatch the addBuilder action with the form data
		dispatch(addBuilder(builderName, builderColor));

		// Clear the form after submission
		setBuilderName("");
		setBuilderColor("");
	};

	return (
		<form onSubmit={handleSubmit}>
			<div>
				<label htmlFor="builderName">Builder Name:</label>
				<input
					type="text"
					id="builderName"
					value={builderName}
					onChange={(e) => setBuilderName(e.target.value)}
					required
				/>
			</div>
			<div>
				<label htmlFor="builderColor">Builder Color:</label>
				<input
					type="color"
					id="builderColor"
					value={builderColor}
					onChange={(e) => setBuilderColor(e.target.value)}
					required
				/>
			</div>
			<button type="submit">Add Builder</button>
		</form>
	);
};

export default AddBuilderForm;
