import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";

export const fetchServices = (teamId) => async (dispatch) => {
  dispatch({ type: Actions.services.FETCH_SERVICES_START });
  try {
    const { data, error } = await supabase
      .from("team_services_view")
      .select("*")
      .eq("team_id", teamId);
    if (error) throw error;
    dispatch({ type: Actions.services.FETCH_SERVICES_SUCCESS, payload: data });
  } catch (error) {
    dispatch({ type: Actions.services.FETCH_SERVICES_ERROR, payload: error.message });
  }
};

export const createService = (serviceData) => async (dispatch) => {
  dispatch({ type: Actions.services.CREATE_SERVICE_REQUEST });
  try {
    const { data: newService, error: serviceError } = await supabase
      .from("services")
      .insert(serviceData)
      .select()
      .single();
    if (serviceError) throw serviceError;

    dispatch({ type: Actions.services.CREATE_SERVICE_SUCCESS, payload: newService });
  } catch (error) {
    dispatch({ type: Actions.services.CREATE_SERVICE_FAILURE, payload: error.message });
  }
};

export const saveTeamServices = (teamServices) => async (dispatch) => {
  dispatch({ type: Actions.services.SAVE_TEAM_SERVICES_START });
  try {
    const updates = teamServices
      .filter((s) => s.team_service_id)
      .map((s) => ({
        id: s.team_service_id,
        is_active: s.is_active,
        hourly_rate: s.hourly_rate,
      }));

    const inserts = teamServices
      .filter((s) => !s.team_service_id)
      .map(({ team_service_id, ...rest }) => rest);

    const promises = [];
    if (updates.length > 0) {
      // Here we explicitly update only the desired fields.
      for (const update of updates) {
        const { id, ...updateData } = update;
        promises.push(
          supabase.from("team_services").update(updateData).eq("id", id).select()
        );
      }
    }
    if (inserts.length > 0) {
      promises.push(supabase.from("team_services").insert(inserts).select());
    }

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result.error) throw result.error;
    }

    const combinedData = results.flatMap((r) => r.data);
    dispatch({ type: Actions.services.SAVE_TEAM_SERVICES_SUCCESS, payload: combinedData });
  } catch (error) {
    dispatch({ type: Actions.services.SAVE_TEAM_SERVICES_ERROR, payload: error.message });
  }
};