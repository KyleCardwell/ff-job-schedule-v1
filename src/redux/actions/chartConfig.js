import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";

export const fetchChartConfig = () => async (dispatch) => {
  dispatch({ type: Actions.chartConfig.FETCH_CONFIG_START });
  try {
    // Get user's team_id
    const { data: { user } } = await supabase.auth.getUser();
    const { data: teamData } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (!teamData?.team_id) {
      throw new Error('No team found for user');
    }

    const { data, error } = await supabase
      .from("chart_config")
      .select("*")
      .eq('team_id', teamData.team_id)
      .single();

    if (error) throw error;

    dispatch({
      type: Actions.chartConfig.FETCH_CONFIG_SUCCESS,
      payload: data,
    });

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
      type: Actions.chartConfig.FETCH_CONFIG_ERROR,
      payload: error.message,
    });
    throw error;
  }
};

export const updateNextTaskNumber = (nextNumber, chartConfigId) => async (dispatch, getState) => {
  const state = getState();
  try {
    let newNextNumber = nextNumber;
    if (newNextNumber > state.chartConfig.max_task_number) {
      newNextNumber = state.chartConfig.min_task_number;
    }

    // Get user's team_id
    const { data: { user } } = await supabase.auth.getUser();
    const { data: teamData } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (!teamData?.team_id) {
      throw new Error('No team found for user');
    }

    const { data, error } = await supabase
      .from("chart_config")
      .update({
        next_task_number: newNextNumber,
      })
      .eq("chart_config_id", chartConfigId)
      .eq('team_id', teamData.team_id)  // Add team_id check
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
    // Get user's team_id
    const { data: { user } } = await supabase.auth.getUser();
    const { data: teamData } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (!teamData?.team_id) {
      throw new Error('No team found for user');
    }

    const { data, error } = await supabase
      .from("chart_config")
      .update({
        next_task_number: settings.nextTaskNumber,
        min_task_number: settings.minTaskNumber,
        max_task_number: settings.maxTaskNumber,
        workday_hours: settings.workdayHours,
        employee_type: settings.employee_type,
        estimate_sections: settings.estimate_sections,
        company_name: settings.company_name,
      })
      .eq("chart_config_id", state.chartConfig.chart_config_id)
      .eq('team_id', teamData.team_id)  // Add team_id check
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
