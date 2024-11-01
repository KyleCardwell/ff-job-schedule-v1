import { v4 as uuidv4 } from "uuid";
import { Actions } from "../actions";

const ffBuilders = [
	{
		id: 12,
		employee_name: "Unassigned",
		employee_color: "#FFC0CC",
		timeOff: [],
	},
	{
		id: 13,
		employee_name: "Frosty",
		employee_color: "#86CEEB",
		timeOff: [
			{
				start: "2024-10-01T06:00:00.000Z",
				end: "2024-10-08T06:00:00.000Z",
			},
		],
	},
	{ id: 14, employee_name: "Nick", employee_color: "#A32ACF", timeOff: [] },
	{
		id: 15,
		employee_name: "Patrick",
		employee_color: "#4CAF51",
		timeOff: [
			{
				start: "2024-10-04T06:00:00.000Z",
				end: "2024-10-10T06:00:00.000Z",
			},
		],
	},
	{ id: 16, employee_name: "Dawayne", employee_color: "#FF2E54", timeOff: [] },
];

const initialState = {
	builders: [], // Array to store builder objects with id, name, and color
	employees: ffBuilders,
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

		case Actions.employees.SET_EMPLOYEES:
			return {
				...state,
				employees: [...action.payload],
			};

		default:
			return state;
	}
};
