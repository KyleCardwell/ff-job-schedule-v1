import { Actions } from "../actions";

export const saveJobs = (jobs) => ({
	type: Actions.jobs.SAVE_JOBS,
	payload: jobs,
});

export const updateJobStartDate = (id, newStartDate) => ({
  type: Actions.jobs.UPDATE_JOB_START_DATE,
  payload: { id, newStartDate },
});
