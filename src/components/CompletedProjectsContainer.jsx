import React from 'react';
import { useSelector } from 'react-redux';
import CompletedProjectCard from './CompletedProjectCard';
import './CompletedProjectsContainer.css';
import ChartActionButtons from './ChartActionButtons';

const CompletedProjectsContainer = () => {
  const tasks = useSelector((state) => state.taskData.tasks);
  const completedJobs = tasks.filter(task => task.active === false);

  // Group tasks by jobId
  const groupedJobs = completedJobs.reduce((acc, task) => {
    if (!acc[task.jobId]) {
      acc[task.jobId] = [];
    }
    acc[task.jobId].push(task);
    return acc;
  }, {});

  return (
    <div className="completed-jobs-page">
      <h1>Completed Jobs</h1>
      <ChartActionButtons />
      <div className="completed-jobs-container">
        {Object.values(groupedJobs).map((jobTasks) => (
          <CompletedProjectCard key={jobTasks[0].jobId} rooms={jobTasks} />
        ))}
      </div>
    </div>
  );
};

export default CompletedProjectsContainer;