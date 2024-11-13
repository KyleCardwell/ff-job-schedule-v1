import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import CompletedProjectCard from "./CompletedProjectCard";
import "./CompletedProjectsContainer.css";
import ChartActionButtons from "./ChartActionButtons";
import { fetchCompletedProjects } from "../redux/actions/projects";

const CompletedProjectsContainer = () => {
	const dispatch = useDispatch();
	const { completedProjects, loading, error } = useSelector(
		(state) => state.completedProjects
	);

	useEffect(() => {
		dispatch(fetchCompletedProjects());
	}, [dispatch]);

	if (loading) {
		return <div className="loading">Loading completed projects...</div>;
	}

	if (error) {
		return <div className="error">Error: {error}</div>;
	}

	return (
		<div className="completed-jobs-page">
			<h1>Completed Jobs</h1>
			<ChartActionButtons />
			<div className="completed-jobs-container">
				{completedProjects?.map((project) => (
					<CompletedProjectCard key={project.project_id} project={project} />
				))}
			</div>
		</div>
	);
};

export default CompletedProjectsContainer;
