// redux/ganttReducer.js

import { newJobs } from "../../mocks/jobs";
import { Actions } from "../actions";

const initialState = JSON.parse(localStorage.getItem("ganttJobs")) || {
	jobs: newJobs,
};

// Reducer
// export const ganttReducer = (state = initialState, action) => {
// 	switch (action.type) {
// 		case Actions.jobs.SAVE_JOBS:
// 			return {
// 				...state,
// 				jobs: action.payload,
// 			};
// 			case Actions.jobs.UPDATE_JOB_START_DATE:
// 				return {
// 					...state,
// 					jobs: state.jobs.map((job) =>
// 						job.id === action.payload.id
// 							? { ...job, startDate: action.payload.newStartDate }
// 							: job
// 					),
// 				};
// 		default:
// 			return state;
// 	}
// };

export const ganttReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.jobs.SAVE_JOBS:
			return {
				...state,
				jobs: action.payload,
			};
		case Actions.jobs.UPDATE_JOB_START_DATE:
			return {
				...state,
				jobs: state.jobs.map((job) => 
					job.id === action.payload.jobId
						? {
							...job,
							rooms: job.rooms.map((room) =>
								room.id === action.payload.roomId
									? { ...room, startDate: action.payload.newStartDate }
									: room
							),
						}
						: job
				),
			};
		default:
			return state;
	}
};

