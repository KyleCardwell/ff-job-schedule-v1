import { Actions } from "../actions";

const initialState = {
  chart_config_id: null,
  next_task_number: null,
  min_task_number: null,
  max_task_number: null,
  company_name: null,
  workday_hours: null,
  estimate_sections: [],
  employee_type: [],
  loading: false,
  error: null,
};

export const chartConfigReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.chartConfig.FETCH_CONFIG_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.chartConfig.FETCH_CONFIG_SUCCESS:
      return {
        ...state,
        loading: false,
        chart_config_id: action.payload.chart_config_id,
        next_task_number: action.payload.next_task_number,
        min_task_number: action.payload.min_task_number,
        max_task_number: action.payload.max_task_number,
        company_name: action.payload.company_name,
        workday_hours: action.payload.workday_hours,
        employee_type: action.payload.employee_type || [],
        estimate_sections: action.payload.estimate_sections || [],
        error: null,
      };

    case Actions.chartConfig.FETCH_CONFIG_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.chartConfig.UPDATE_NEXT_TASK_NUMBER:
      return {
        ...state,
        next_task_number: action.payload,
      };

    default:
      return state;
  }
};
