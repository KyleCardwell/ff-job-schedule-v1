import React from "react";
import { useSelector } from "react-redux";
import CompletedProjectCard from "./CompletedProjectCard";
import "./CompletedProjectsContainer.css";
import ChartActionButtons from "./ChartActionButtons";

const CompletedProjectsContainer = () => {
	const completedProjects = useSelector(
		(state) => state.completedProjects.completedProjects
	);

	return (
		<div className="completed-jobs-page">
			<h1>Completed Jobs</h1>
			<ChartActionButtons />
			<div className="completed-jobs-container">
				{completedProjects.map((project) => (
					<CompletedProjectCard key={project.project_id} project={project} />
				))}
			</div>
		</div>
	);
};

export default CompletedProjectsContainer;
