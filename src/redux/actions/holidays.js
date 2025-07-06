import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";
import Holidays from "date-holidays";
import { format } from "date-fns";
import { normalizeDate } from "../../utils/dateUtils";

const hd = new Holidays("US");

export const addHoliday = (name) => ({
  type: Actions.holidays.ADD_HOLIDAY,
  payload: { name },
});

export const removeHoliday = (name) => ({
  type: Actions.holidays.REMOVE_HOLIDAY,
  payload: name,
});

export const defineHolidays = (
  startDate,
  endDate,
  standardHolidays,
  customHolidays
) => {
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);
  
  const years = [];
  const holidayMap = {};

  const startYear = new Date(normalizedStart).getFullYear();
  const endYear = new Date(normalizedEnd).getFullYear();
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }

  const allHolidays = years.flatMap((y) => hd.getHolidays(y));

  allHolidays
    .filter((holiday) => {
      const normalizedHolidayDate = normalizeDate(holiday.date);
      
      return (
        normalizedHolidayDate >= normalizedStart &&
        normalizedHolidayDate <= normalizedEnd &&
        standardHolidays.some((sh) => sh.name === holiday.name)
      );
    })
    .forEach((holiday) => {
      const dateKey = normalizeDate(holiday.date);
      holidayMap[dateKey] = true;
    });

  customHolidays.forEach((holiday) => {
    const normalizedHolidayDate = normalizeDate(holiday.name);
    
    if (normalizedHolidayDate >= normalizedStart && normalizedHolidayDate <= normalizedEnd) {
      holidayMap[normalizedHolidayDate] = true;
    }
  });

  return holidayMap;
};

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
    const { chartStartDate, chartEndDate } = state.chartData;

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

      const newHolidayMap = defineHolidays(
        chartStartDate,
        chartEndDate,
        data.standard_holidays,
        data.custom_holidays
      );

      dispatch({
        type: Actions.holidays.SET_HOLIDAY_MAP,
        payload: newHolidayMap
      });

      // Return both the data and the new holiday map
      return { data, holidayMap: newHolidayMap };
    } catch (error) {
      dispatch({
        type: Actions.holidays.FETCH_HOLIDAYS_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
