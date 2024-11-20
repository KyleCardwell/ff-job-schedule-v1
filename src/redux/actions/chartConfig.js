import { Actions } from "../actions";
import { supabase } from "../../utils/supabase";

export const fetchChartConfig = () => async (dispatch) => {
  dispatch({ type: Actions.chartConfig.FETCH_CONFIG_START });
  try {
    const { data, error } = await supabase
      .from("chart_config")
      .select("*")
      .single();

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
  (nextNumber, chartConfigId) => async (dispatch, getState) => {
    const state = getState();
    try {
      let newNextNumber = nextNumber;
      if (newNextNumber > state.chartConfig.max_task_number) {
        newNextNumber = state.chartConfig.min_task_number;
      }

      const { data, error } = await supabase
        .from("chart_config")
        .update({
          next_task_number: newNextNumber,
        })
        .eq("chart_config_id", chartConfigId)
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

export const saveSettings = (settings) => async (dispatch, getState) => {
  const state = getState();
  try {
    const { data, error } = await supabase
      .from("chart_config")
      .update({
        next_task_number: settings.nextTaskNumber,
        min_task_number: settings.minTaskNumber,
        max_task_number: settings.maxTaskNumber,
      })
      .eq("chart_config_id", state.chartConfig.chart_config_id)
      .select()
      .single();

    if (error) throw error;

    dispatch({
      type: Actions.chartConfig.FETCH_CONFIG_SUCCESS,
      payload: data,
    });

    return data;
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
};
