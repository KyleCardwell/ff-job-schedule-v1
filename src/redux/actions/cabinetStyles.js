import { supabase } from "../../utils/supabase";
import { cabinetStyles } from "../actionTypes";

export const fetchTeamCabinetStyles = () => async (dispatch) => {
  try {
    dispatch({ type: cabinetStyles.FETCH_TEAM_CABINET_STYLES_START });
    const { data, error } = await supabase.rpc("get_team_cabinet_styles");
    if (error) throw error;

    dispatch({
      type: cabinetStyles.FETCH_TEAM_CABINET_STYLES_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: cabinetStyles.FETCH_TEAM_CABINET_STYLES_ERROR,
      payload: error.message,
    });
  }
};

export const saveTeamCabinetStyles =
  (teamCabinetStyles) => async (dispatch) => {
    dispatch({ type: cabinetStyles.UPDATE_TEAM_CABINET_STYLES_START });
    try {
      const updates = teamCabinetStyles
        .filter((s) => s.team_cabinet_style_id)
        .map((s) => ({
          id: s.team_cabinet_style_id,
          is_active: s.is_active,
          config: s.config,
        }));

      const inserts = teamCabinetStyles
        .filter((s) => !s.team_cabinet_style_id)
        .map(({ team_cabinet_style_id, ...rest }) => rest);

      const promises = [];
      if (updates.length > 0) {
        // Here we explicitly update only the desired fields.
        for (const update of updates) {
          const { id, ...updateData } = update;
          promises.push(
            supabase
              .from("team_cabinet_styles")
              .update(updateData)
              .eq("id", id)
              .select()
          );
        }
      }
      if (inserts.length > 0) {
        promises.push(
          supabase.from("team_cabinet_styles").insert(inserts).select()
        );
      }

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.error) throw result.error;
      }

      const combinedData = results.flatMap((r) => r.data);
      dispatch({
        type: cabinetStyles.UPDATE_TEAM_CABINET_STYLES_SUCCESS,
        payload: combinedData,
      });
    } catch (error) {
      dispatch({
        type: cabinetStyles.UPDATE_TEAM_CABINET_STYLES_ERROR,
        payload: error.message,
      });
    }
  };
