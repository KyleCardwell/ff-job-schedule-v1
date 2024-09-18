import { Actions } from "../actions";

export const saveJobs = (jobs) => ({
	type: Actions.jobs.SAVE_JOBS,
	payload: jobs,
});

export const updateJobStartDate = (jobId, roomId, newStartDate) => ({
  type: Actions.jobs.UPDATE_JOB_START_DATE,
  payload: { jobId, roomId, newStartDate },
});
