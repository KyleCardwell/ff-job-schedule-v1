import React from "react";
import { Link, useLocation } from "react-router-dom";

const ChartActionButtons = ({
	scrollToMonday,
	setIsJobModalOpen,
	setIsBuilderModalOpen,
	setIsHolidayModalOpen,
}) => {
	const location = useLocation();

	return (
		<div className="action-buttons">
			{location.pathname === "/" && (
				<>
					<button
						className="action-button scroll-to-today-button"
						onClick={() => scrollToMonday(new Date())}
					>
						Today
					</button>
					<button
						className="action-button add-job-button"
						onClick={() => setIsJobModalOpen(true)}
					>
						Add Job
					</button>
					<button
						className="action-button manage-builders-button"
						onClick={() => setIsBuilderModalOpen(true)}
					>
						Builders
					</button>
					<button
						className="action-button manage-holidays-button"
						onClick={() => {
							setIsHolidayModalOpen(true);
						}}
					>
						Holidays
					</button>
				</>
			)}
			<Link to={`${location.pathname === "/" ? "/completed" : "/"}`}>
				<button className="action-button completed-jobs-button">
					{`${location.pathname === "/" ? "Completed Jobs" : "Job Schedule"}`}
				</button>
			</Link>
		</div>
	);
};

export default ChartActionButtons;
