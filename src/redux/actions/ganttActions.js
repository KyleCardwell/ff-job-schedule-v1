import {
	calculateOverlapsAndAdjust,
	sortAndAdjustDates,
} from "../../utils/helpers";
import { Actions } from "../actions";

export const saveJobs = (jobs) => ({
	type: Actions.jobs.SAVE_JOBS,
	payload: jobs,
});

export const updateJobStartDate = (jobId, roomId, newStartDate) => ({
	type: Actions.jobs.UPDATE_JOB_START_DATE,
	payload: { jobId, roomId, newStartDate },
});

export const updateJobAndRooms = (updatedJob) => ({
	type: Actions.jobs.UPDATE_JOB_AND_ROOMS,
	payload: updatedJob,
});

export const updateJobsAfterBuilderChanges = (builderId) => ({
	type: Actions.jobs.UPDATE_JOBS_AFTER_BUILDER_CHANGES,
	payload: builderId,
});

export const incrementJobNumber = () => ({
	type: Actions.jobs.INCREMENT_JOB_NUMBER,
});

export const updateNextJobNumber = (nextNumber) => {
	if (nextNumber > 999) {
		nextNumber = 101;
	}
	return {
		type: Actions.jobs.UPDATE_NEXT_JOB_NUMBER,
		payload: nextNumber,
	};
};

export const updateJob = (workPeriod) => ({
	type: Actions.jobs.UPDATE_JOB,
	payload: workPeriod,
});

export const updateAllJobs = (jobs) => ({
	type: Actions.jobs.UPDATE_ALL_JOBS,
	payload: jobs,
});

// export const updateWorkPeriodsByBuilder =
// 	(
// 		singlePeriod,
// 		workPeriods,
// 		workdayHours,
// 		holidayChecker,
// 		holidays,
// 		newStartDate,
// 		timeOffByBuilder
// 	) =>
// 	(dispatch) => {
// 		// const updatedBuilderJobs = builderJobs.map((job) =>
// 		// 	job.id === d.id ? updatedDraggedJob : job
// 		// );

// 		const updatedBuilderWorkPeriods = workPeriods.map((workPeriod) =>
// 			workPeriod.id === singlePeriod.id ? singlePeriod : workPeriod
// 		);

// 		console.log("builders workPeriods", updatedBuilderWorkPeriods);

// 		// Sort and adjust dates for the builder's jobs
// 		const sortedBuilderWorkPeriods = sortAndAdjustDates(
// 			updatedBuilderWorkPeriods,
// 			workdayHours,
// 			holidayChecker,
// 			holidays,
// 			singlePeriod.builderId,
// 			newStartDate,
// 			timeOffByBuilder
// 		);

// 		sortedBuilderWorkPeriods.forEach((wp) => {
// 			dispatch(updateJob(wp));
// 		});

// 		return {
// 			type: Actions.jobs.UPDATE_WORK_PERIODS_BY_BUILDER,
// 			payload: {
// 				builderId: singlePeriod.builderId,
// 				workPeriods: sortedBuilderWorkPeriods,
// 			},
// 		};
// 	};

export const updateWorkPeriodsByBuilder = (
	singlePeriod,
	workPeriods,
	workdayHours,
	holidayChecker,
	holidays,
	newStartDate,
	timeOffByBuilder
) => {
	return (dispatch) => {
		// This function now returns another function
		const updatedBuilderWorkPeriods = workPeriods.map((workPeriod) =>
			workPeriod.id === singlePeriod.id ? singlePeriod : workPeriod
		);

		console.log("builders workPeriods", updatedBuilderWorkPeriods);

		const sortedBuilderWorkPeriods = sortAndAdjustDates(
			updatedBuilderWorkPeriods,
			workdayHours,
			holidayChecker,
			holidays,
			singlePeriod.builderId,
			newStartDate,
			timeOffByBuilder
		);

		// Dispatch the original action
		dispatch({
			type: Actions.jobs.UPDATE_WORK_PERIODS_BY_BUILDER,
			payload: {
				builderId: singlePeriod.builderId,
				workPeriods: sortedBuilderWorkPeriods,
			},
		});

		// Dispatch the updateJob action
		sortedBuilderWorkPeriods.forEach((wp) => {
			dispatch(updateJob(wp));
		});
	};
};
