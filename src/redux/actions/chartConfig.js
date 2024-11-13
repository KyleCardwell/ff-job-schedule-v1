import { Actions } from "../actions";
import { supabase } from "../../utils/supabase";

export const fetchChartConfig = () => async (dispatch) => {
	dispatch({ type: Actions.chartConfig.FETCH_CONFIG_START });
	try {
		const { data, error } = await supabase
			.from("chart_config")
			.select("*")
			.single();

		if (error && error.code === "PGRST116") {
			// No rows returned
			// Create new config row with default values
			const { data: newData, error: insertError } = await supabase
				.from("chart_config")
				.insert({
					next_task_number: 101, // Default starting number
					// Add any other default fields here
				})
				.select()
				.single();

			if (insertError) throw insertError;

			dispatch({
				type: Actions.chartConfig.FETCH_CONFIG_SUCCESS,
				payload: newData,
			});

			return newData;
		}

		if (error) throw error;

		dispatch({
			type: Actions.chartConfig.FETCH_CONFIG_SUCCESS,
			payload: data,
		});

		return data;
	} catch (error) {
		dispatch({
			type: Actions.chartConfig.FETCH_CONFIG_ERROR,
			payload: error.message,
		});
		throw error;
	}
};

export const updateNextTaskNumber =
	(nextNumber, chartConfigId) => async (dispatch) => {
		try {
			let newNextNumber = nextNumber;
			if (newNextNumber > 999) {
				newNextNumber = 101;
			}

			const { data, error } = await supabase
				.from("chart_config")
				.upsert({
					chart_config_id: chartConfigId,
					next_task_number: newNextNumber,
				})
				.select()
				.single();

			if (error) throw error;

			dispatch({
				type: Actions.chartConfig.UPDATE_NEXT_TASK_NUMBER,
				payload: data.next_task_number,
			});

			return data;
		} catch (error) {
			console.error("Error updating next task number:", error);
			throw error;
		}
	};
