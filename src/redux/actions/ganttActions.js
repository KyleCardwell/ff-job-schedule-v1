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
