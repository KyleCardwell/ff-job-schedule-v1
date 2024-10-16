export const Actions = {
	jobs: {
		SAVE_JOBS: "SAVE_JOBS",
		UPDATE_JOB_START_DATE: "UPDATE_JOB_START_DATE",
		UPDATE_JOB_AND_ROOMS: "UPDATE_JOB_AND_ROOMS",
		UPDATE_JOBS_AFTER_BUILDER_CHANGES: "UPDATE_JOBS_AFTER_BUILDER_CHANGES",
		INCREMENT_JOB_NUMBER: "INCREMENT_JOB_NUMBER",
		UPDATE_NEXT_JOB_NUMBER: "UPDATE_NEXT_JOB_NUMBER",
		UPDATE_WORK_PERIOD: "UPDATE_WORK_PERIOD",
		UPDATE_WORK_PERIODS_BY_BUILDER: "UPDATE_WORK_PERIODS_BY_BUILDER",
	},
	builders: {
		ADD_BUILDER: "ADD_BUILDER",
		DELETE_BUILDER: "DELETE_BUILDER",
		UPDATE_BUILDER: "UPDATE_BUILDER",
	},
	holidays: {
    ADD_HOLIDAY: "ADD_HOLIDAY",
    REMOVE_HOLIDAY: "REMOVE_HOLIDAY",
  },
	chartData: {
		UPDATE_CHART_DATA: "UPDATE_CHART_DATA",
		UPDATE_EARLIEST_START_DATE: "UPDATE_EARLIEST_START_DATE",
		UPDATE_LATEST_START_DATE: "UPDATE_LATEST_START_DATE",
		UPDATE_ONE_BUILDER_CHART_DATA: "UPDATE_ONE_BUILDER_CHART_DATA",
	},
	taskData: {
		UPDATE_TASK_GROUPS_DATA: "UPDATE_TASK_GROUPS_DATA",
		UPDATE_TASKS_BY_ONE_BUILDER: "UPDATE_TASKS_BY_ONE_BUILDER",
	},
};

