import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";

export const addBuilder = (name, color, timeOff) => {
	return {
		type: Actions.builders.ADD_BUILDER,
		payload: { name, color, timeOff },
	};
};

export const deleteBuilder = (id) => ({
	type: Actions.builders.DELETE_BUILDER,
	payload: id,
});

export const updateBuilder = (builder) => ({
	type: Actions.builders.UPDATE_BUILDER,
	payload: builder,
});

// Add new action type for setting builders from Supabase
export const setEmployees = (employees) => ({
	type: Actions.employees.SET_EMPLOYEES,
	payload: employees,
});

// Add fetch function to be called when your app initializes
export const fetchEmployees = () => async (dispatch) => {
	try {
		const { data, error } = await supabase
			.from("employees")
			.select("*, timeOff:employeeTimeOff(*) ")
			.order("employee_id", { ascending: true });

		if (error) throw error;

		dispatch(setEmployees(data));
	} catch (error) {
		console.error("Error fetching employees:", error);
	}
};

export const addEmployees = (employees) => async (dispatch) => {
	try {
		// Insert multiple builders into Supabase
		const { data, error } = await supabase
			.from("employees")
			.insert(
				employees.map((employee) => ({
					employee_name: employee.employee_name,
					employee_color: employee.employee_color,
				}))
			)
			.select()
			.order("employee_id", { ascending: true });

		if (error) throw error;

		// Dispatch to Redux store after successful DB insert
		data.forEach((employee) => {
			dispatch({
				type: Actions.employees.ADD_EMPLOYEE,
				payload: employee,
			});
		});

		return data; // Return the inserted data with IDs
	} catch (error) {
		console.error("Error adding employees:", error);
		throw error;
	}
};

export const updateEmployees = (employees) => async (dispatch) => {
	try {
		// Process updates in parallel using Promise.all
		await Promise.all(
			employees.map(async (employee) => {
				const { error } = await supabase
					.from("employees")
					.update({
						employee_name: employee.employee_name,
						employee_color: employee.employee_color,
					})
					.eq("employee_id", employee.employee_id);

				if (error) throw error;

				dispatch({
					type: Actions.employees.UPDATE_EMPLOYEE,
					payload: employee,
				});
			})
		);
	} catch (error) {
		console.error("Error updating employees:", error);
		throw error;
	}
};
