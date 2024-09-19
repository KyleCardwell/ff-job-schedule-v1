// redux/ganttReducer.js

import { newJobs } from "../../mocks/jobs";
import { Actions } from "../actions";
import { addDays } from "date-fns";
import { v4 as uuidv4 } from "uuid";

const initialState = JSON.parse(localStorage.getItem("ganttJobs")) || {
	jobs: newJobs,
	nextJobNumber: 101,
};

const workdayHours = 8;

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
		// case Actions.jobs.UPDATE_JOB_START_DATE:
		// 	return {
		// 		...state,
		// 		jobs: state.jobs.map((job) => {
		// 			// Check if this is the job we're updating
		// 			if (job.id === action.payload.jobId) {
		// 				// Find the modified room
		// 				const modifiedRoom = job.rooms.find(
		// 					(room) => room.id === action.payload.roomId
		// 				);

		// 				// Calculate the days to shift other rooms
		// 				const daysToShift = Math.ceil(modifiedRoom.duration / workdayHours);

		// 				return {
		// 					...job,
		// 					rooms: job.rooms.map((room) => {
		// 						// Check if it's the room being modified
		// 						if (room.id === action.payload.roomId) {
		// 							return { ...room, startDate: action.payload.newStartDate };
		// 						}

		// 						// Shift rooms with the same builder and startDate on or after the modified room
		// 						if (
		// 							room.builderId === modifiedRoom.builderId &&
		// 							new Date(room.startDate) >=
		// 								new Date(action.payload.newStartDate)
		// 						) {
		// 							return {
		// 								...room,
		// 								startDate: addDays(new Date(room.startDate), daysToShift),
		// 							};
		// 						}

		// 						// If no change is needed, return the room as is
		// 						return room;
		// 					}),
		// 				};
		// 			}

		// 			// Return the job unchanged if it's not the one being updated
		// 			return job;
		// 		}),
		// 	};
		// case Actions.jobs.UPDATE_JOB_AND_ROOMS:
		// 	return {
		// 		...state,
		// 		jobs: state.jobs.map((job) =>
		// 			job.id === action.payload.id
		// 				? { ...job, ...action.payload } // Update job with new data
		// 				: job
		// 		),
		// 	};
		case Actions.jobs.UPDATE_JOB_AND_ROOMS:
	return {
		...state,
		jobs: state.jobs.some(job => job.id === action.payload.id)
			? state.jobs.map((job) =>
				job.id === action.payload.id
					? { ...job, ...action.payload } // Update job with new data
					: job
			)
			: [...state.jobs, {id: uuidv4(), ...action.payload}], // Append new job if it doesn't exist
	};
		case Actions.jobs.INCREMENT_JOB_NUMBER:
			return {
				...state,
				nextJobNumber:
					state.nextJobNumber === 999 ? 101 : state.nextJobNumber + 1,
			};
		default:
			return state;
	}
};
