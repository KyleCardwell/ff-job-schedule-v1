// redux/ganttReducer.js

import { jobs } from "../../mocks/jobs";
import { Actions } from "../actions";

const initialState = JSON.parse(localStorage.getItem("ganttJobs")) || {
	jobs: jobs,
};

// Reducer
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
						job.id === action.payload.id
							? { ...job, startDate: action.payload.newStartDate }
							: job
					),
				};
		default:
			return state;
	}
};
