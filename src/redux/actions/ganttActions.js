import { sortAndAdjustDates } from "../../utils/helpers";
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

export const updateWorkPeriod = (workPeriod) => ({
	type: Actions.jobs.UPDATE_WORK_PERIOD,
	payload: workPeriod,
});

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
			workPeriod.subtask_id === singlePeriod.subtask_id ? singlePeriod : workPeriod
		);

		const sortedBuilderWorkPeriods = sortAndAdjustDates(
			updatedBuilderWorkPeriods,
			workdayHours,
			holidayChecker,
			holidays,
			timeOffByBuilder
		);

		// Dispatch the original action
		dispatch({
			type: Actions.jobs.UPDATE_WORK_PERIODS_BY_BUILDER,
			payload: {
				builderId: singlePeriod.employee_id,
				workPeriods: sortedBuilderWorkPeriods,
			},
		});

		// Dispatch the updateJob action
		sortedBuilderWorkPeriods.forEach((wp) => {
			dispatch(updateWorkPeriod(wp));
		});
	};
};

