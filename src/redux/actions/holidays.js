import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";


export const addHoliday = (name) => ({
  type: Actions.holidays.ADD_HOLIDAY,
  payload: { name },
});

export const removeHoliday = (name) => ({
  type: Actions.holidays.REMOVE_HOLIDAY,
  payload: name,
});

export const fetchHolidays = () => async (dispatch) => {
  dispatch({ type: Actions.holidays.FETCH_HOLIDAYS_START });
  try {
    const { data: chartConfig, error: chartError } = await supabase
      .from("chart_config")
      .select("standard_holidays, custom_holidays")
      .single();

    if (chartError) throw chartError;

    dispatch({
      type: Actions.holidays.FETCH_HOLIDAYS_SUCCESS,
      payload: {
        standardHolidays: chartConfig.standard_holidays || [],
        customHolidays: chartConfig.custom_holidays || [],
      },
    });

    return chartConfig;
  } catch (error) {
    dispatch({
      type: Actions.holidays.FETCH_HOLIDAYS_ERROR,
      payload: error.message,
    });
    throw error;
  }
};

export const saveHolidays =
  (standardHolidays, customHolidays) => async (dispatch, getState) => {
    const state = getState();
    const chartConfigId = state.chartConfig.chart_config_id;

    try {
      const { data, error } = await supabase
        .from("chart_config")
        .update({
          standard_holidays: standardHolidays,
          custom_holidays: customHolidays,
        })
        .eq("chart_config_id", chartConfigId)
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.holidays.FETCH_HOLIDAYS_SUCCESS,
        payload: {
          standardHolidays: data.standard_holidays || [],
          customHolidays: data.custom_holidays || [],
        },
      });

      return data;
    } catch (error) {
      dispatch({
        type: Actions.holidays.FETCH_HOLIDAYS_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
