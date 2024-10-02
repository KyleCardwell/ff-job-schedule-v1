// redux/ganttReducer.js

// import { newJobs } from "../../mocks/jobs";
import { newJobs } from "../../mocks/jobsRealData";
// import { newJobs } from "../../mocks/oneBuilder";
import { Actions } from "../actions";
import { v4 as uuidv4 } from "uuid";

const initialState = JSON.parse(localStorage.getItem("ganttJobs")) || {
	jobs: newJobs,
	nextJobNumber: 101,
};

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
		case Actions.jobs.UPDATE_JOB_AND_ROOMS:
			return {
				...state,
				jobs: state.jobs.some((job) => job.id === action.payload.id)
					? state.jobs.map((job) =>
							job.id === action.payload.id
								? { ...job, ...action.payload } // Update job with new data
								: job
					  )
					: [...state.jobs, { id: uuidv4(), ...action.payload }], // Append new job if it doesn't exist
			};
		case Actions.jobs.INCREMENT_JOB_NUMBER:
			return {
				...state,
				nextJobNumber:
					state.nextJobNumber === 999 ? 101 : state.nextJobNumber + 1,
			};
		case Actions.jobs.UPDATE_JOBS_AFTER_BUILDER_CHANGES:
			return {
				...state,
				jobs: state.jobs.map((job) => ({
					...job,
					rooms: job.rooms.map((room) =>
						action.payload.includes(room.builderId)
							? { ...room, builderId: "1" }
							: room
					),
				})),
			};
		default:
			return state;
	}
};
