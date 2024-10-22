import React from "react";
import "./CompletedProjectCard.css";

const categories = ["Busybusy", "Alpha", "Probox", "Doors", "Other"];

const CompletedProjectCard = ({ rooms }) => {
	const jobName = rooms[0].jobName;
	const completedDate = new Date(
		Math.max(...rooms.map((r) => new Date(r.completedDate)))
	).toLocaleDateString();

	return (
		<div className="completed-job-card">
			<div className="card-header">
				<h2>{jobName}</h2>
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
				{rooms.map((room, index) => (
					<div
						key={room.id}
						className={`grid-row room-row ${index % 2 === 0 ? "even" : "odd"}`}
					>
						<span>{room.jobNumber}</span>
						<span>{room.taskName}</span>
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
