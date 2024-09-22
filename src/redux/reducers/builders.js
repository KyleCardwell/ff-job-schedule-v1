import { Actions } from "../actions";

const initialState = {
	builders: [
		{ id: 4, name: "No one", color: "#FFC0CC" },
		{ id: 1, name: "Frosty", color: "#86CEEB" },
		{ id: 2, name: "Patrick", color: "#4CAF51" },
		{ id: 3, name: "Nick", color: "#800080" },
	], // Array to store builder objects with id, name, and color
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const builders = (state = initialState, action) => {
	switch (action.type) {
		case Actions.builders.ADD_BUILDER:
			return {
				...state,
				builders: [
					...state.builders,
					{
						id: generateId(),
						name: action.payload.name,
						color: action.payload.color,
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
