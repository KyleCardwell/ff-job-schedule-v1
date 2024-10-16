import { v4 as uuidv4 } from "uuid";
import { Actions } from "../actions";

const initialState = {
	builders: [
		{ id: "1", name: "No one", color: "#FFC0CC", timeOff: [] },
		{
			id: "2",
			name: "Frosty",
			color: "#86CEEB",
			timeOff: [
				{
					start: "2024-10-01T06:00:00.000Z",
					end: "2024-10-08T06:00:00.000Z",
				},
			],
		},
		{
			id: "3",
			name: "Patrick",
			color: "#4CAF51",
			timeOff: [
				{
					start: "2024-10-04T06:00:00.000Z",
					end: "2024-10-10T06:00:00.000Z",
				},
			],
		},
		{ id: "4", name: "Nick", color: "#A32ACF", timeOff: [] },
		{ id: "5", name: "Dawayne", color: "#FFBD2E", timeOff: [] },
	], // Array to store builder objects with id, name, and color
};

export const builders = (state = initialState, action) => {
	switch (action.type) {
		case Actions.builders.ADD_BUILDER:
			return {
				...state,
				builders: [
					...state.builders,
					{
						id: uuidv4(),
						name: action.payload.name,
						color: action.payload.color,
						timeOff: action.payload.timeOff,
					},
				], // Add new builder to the array
			};

		case Actions.builders.DELETE_BUILDER:
			return {
				...state,
				builders: state.builders.filter(
					(builder) => builder.id !== action.payload
				), // Remove builder by id
			};

		case Actions.builders.UPDATE_BUILDER:
			return {
				...state,
				builders: state.builders.map((builder) =>
					builder.id === action.payload.id
						? { ...builder, ...action.payload } // Update the builder data
						: builder
				),
			};

		default:
			return state;
	}
};
