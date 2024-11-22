import React from "react";
import "./CompletedProjectCard.css";

const categories = ["Busybusy", "Alpha", "Probox", "Doors", "Other"];

const CompletedProjectCard = ({ project }) => {
	const jobName = project.project_name;
	const completedDate = new Date(project.project_completed_at).toLocaleDateString();

	return (
		<div className="completed-job-card">
			<div className="card-header">
				<h2 className="text-lg font-bold">{jobName}</h2>
				<span className="completed-date">{completedDate}</span>
			</div>
			<div className="room-grid">
				<div className="grid-row grid-header">
					<span>Job Number</span>
					<span>Room Name</span>
					{categories.map((category) => (
						<span key={category}>{category}</span>
					))}
				</div>
				{project.tasks.map((task, index) => (
					<div
						key={task.task_id}
						className={`grid-row room-row ${index % 2 === 0 ? "even" : "odd"}`}
					>
						<span>{task.task_number}</span>
						<span>{task.task_name}</span>
						{categories.map((category) => (
							<span key={category}>
								<input type="checkbox" />
							</span>
						))}
					</div>
				))}
			</div>
		</div>
	);
};

export default CompletedProjectCard;
