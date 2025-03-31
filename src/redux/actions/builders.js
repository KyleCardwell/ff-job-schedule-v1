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
			.select("employee_id, employee_name, employee_color, time_off, employee_type, employee_rate, scheduling_conflicts")
			.order("employee_id", { ascending: true });

		if (error) throw error;

		dispatch(setEmployees(data));
	} catch (error) {
		console.error("Error fetching employees:", error);
	}
};

export const addEmployees = (employees) => async (dispatch, getState) => {
	try {
		const state = getState();
		const { chartConfig } = state;

		// Check if chart_config_id is missing
		if (!chartConfig.chart_config_id) {
			// Create a new chart_config entry
			const { data: newChartConfig, error: configError } = await supabase
				.from("chart_config")
				.insert({
					next_task_number: 101, // Default starting number
					team_id: state.auth.teamId
					// Add any other default fields here
				})
				.select()
				.single();

			if (configError) throw configError;

			// Dispatch action to update chartConfig in Redux
			dispatch({
				type: Actions.chartConfig.FETCH_CONFIG_SUCCESS,
				payload: newChartConfig,
			});
		}

		// Insert multiple builders into Supabase
		const { data, error } = await supabase
			.from("employees")
			.insert(
				employees.map((employee) => ({
					employee_name: employee.employee_name,
					employee_color: employee.employee_color,
					time_off: employee.time_off,
					employee_type: employee.employee_type,
					employee_rate: employee.employee_rate,
					team_id: state.auth.teamId
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
		const updatePromises = employees.map(async (employee) => {
			const { data, error } = await supabase
				.from("employees")
				.update({
					employee_name: employee.employee_name,
					employee_color: employee.employee_color,
					time_off: employee.time_off,
					employee_type: employee.employee_type,
					employee_rate: employee.employee_rate,
				})
				.eq("employee_id", employee.employee_id)
				.select();

			if (error) throw error;

			dispatch({
				type: Actions.employees.UPDATE_EMPLOYEE,
				payload: data[0],
			});

			return data[0];
		});

		const results = await Promise.all(updatePromises);
		return results;
	} catch (error) {
		console.error("Error updating employees:", error);
		throw error;
	}
};

export const deleteEmployees = (employeeIds) => async (dispatch) => {
	try {
		const { error } = await supabase
			.from("employees")
			.delete()
			.in("employee_id", employeeIds);

		if (error) throw error;

		// Update Redux store for each deleted employee
		employeeIds.forEach((id) => {
			dispatch({
				type: Actions.employees.DELETE_EMPLOYEE,
				payload: id,
			});
		});

		return { success: true };
	} catch (error) {
		console.error("Error deleting employees:", error);
		return { success: false, error: error.message };
	}
};

// Action to update scheduling conflicts for an employee
export const updateEmployeeSchedulingConflicts = (employeeId, conflicts = []) => async (dispatch) => {
  try {
    const { error } = await supabase
      .from("employees")
      .update({ scheduling_conflicts: conflicts })
      .eq("employee_id", employeeId);

    if (error) throw error;

    dispatch({
      type: Actions.builders.UPDATE_EMPLOYEE_SCHEDULING_CONFLICTS,
      payload: { employeeId, conflicts }
    });
  } catch (error) {
    console.error("Error updating employee scheduling conflicts:", error);
  }
};
