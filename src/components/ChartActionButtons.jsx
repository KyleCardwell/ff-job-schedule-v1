import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearSession } from "../redux/authSlice";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";


const ChartActionButtons = ({
	scrollToMonday,
	setIsJobModalOpen,
	setIsBuilderModalOpen,
	setIsHolidayModalOpen,
}) => {
	const location = useLocation();
	const dispatch = useDispatch();

	const employees = useSelector((state) => state.builders.employees);

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut();
		if (!error) {
			dispatch(clearSession());
		}
	};

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
					{employees.length > 0 && (
						<button
							className="action-button add-job-button"
							onClick={() => setIsJobModalOpen(true)}
						>
							Add Job
						</button>
					)}
					<button
						className="action-button manage-builders-button"
						onClick={() => setIsBuilderModalOpen(true)}
					>
						Employees
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
			<button className="action-button logout-button" onClick={handleLogout}>
				Logout
			</button>
		</div>
	);
};

export default ChartActionButtons;
