import { Actions } from "../actions";

const initialState = {
  allServices: [],
  teamServices: [],
  loading: false,
  error: null,
};

const servicesReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.services.FETCH_SERVICES_START:
    case Actions.services.FETCH_TEAM_SERVICES_START:
    case Actions.services.SAVE_TEAM_SERVICES_START:
    case Actions.services.CREATE_SERVICE_REQUEST:
      return { ...state, loading: true, error: null };

    case Actions.services.FETCH_SERVICES_SUCCESS:
      return { ...state, loading: false, allServices: [...action.payload].sort((a, b) => a.service_id - b.service_id) };

    case Actions.services.FETCH_TEAM_SERVICES_SUCCESS:
      return { ...state, loading: false, teamServices: action.payload };

    case Actions.services.SAVE_TEAM_SERVICES_SUCCESS: {
      const updatedServices = action.payload;
      const updatedServicesMap = updatedServices.reduce((acc, service) => {
        acc[service.id] = service;
        return acc;
      }, {});

      const newAllServices = state.allServices.map((service) => {
        const updated = updatedServicesMap[service.team_service_id];
        if (updated) {
          return {
            ...service,
            is_active: updated.is_active,
            hourly_rate: updated.hourly_rate,
          };
        }
        return service;
      });
      return { ...state, loading: false, allServices: newAllServices.sort((a, b) => a.service_id - b.service_id) };
    }

    case Actions.services.CREATE_SERVICE_SUCCESS:
      return {
        ...state,
        loading: false,
        allServices: [...state.allServices, action.payload].sort((a, b) => a.service_id - b.service_id),
      };

    case Actions.services.FETCH_SERVICES_ERROR:
    case Actions.services.FETCH_TEAM_SERVICES_ERROR:
    case Actions.services.SAVE_TEAM_SERVICES_ERROR:
    case Actions.services.CREATE_SERVICE_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default servicesReducer;
