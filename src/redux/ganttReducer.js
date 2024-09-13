// redux/ganttReducer.js

const initialState = {
  jobs: [
    {
      id: 1,
      jobName: "Job 1",
      builderId: 1,
      startDate: 1,  // Use day indices for simplicity
      duration: 3,   // Duration in hours
      builderColor: "blue",
      jobNumber: '234',
      roomName: 'Kitchen',
    },
    {
      id: 2,
      jobName: "Job 2",
      builderId: 2,
      startDate: 2,
      duration: 16,
      builderColor: "green"
      ,
      jobNumber: '408',
      roomName: 'Kitchen',
    },
    {
      id: 3,
      jobName: "Job 3",
      builderId: 2,
      startDate: 7,
      duration: 16,
      builderColor: "green",
      jobNumber: '409',
      roomName: 'Bathroom',
    },
  ]
};


// Action types
const SAVE_JOBS = "SAVE_JOBS";

// Reducer
export const ganttReducer = (state = initialState, action) => {
  switch (action.type) {
    case SAVE_JOBS:
      return {
        ...state,
        jobs: action.payload
      };
    default:
      return state;
  }
};

// Action creator for saving jobs
export const saveJobs = (jobs) => ({
  type: SAVE_JOBS,
  payload: jobs
});

