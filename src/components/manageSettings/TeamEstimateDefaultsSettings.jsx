import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchTeamCabinetStyles } from "../../redux/actions/cabinetStyles.js";
import { fetchCabinetTypes } from "../../redux/actions/cabinetTypes.js";
import { fetchFinishes } from "../../redux/actions/finishes.js";
import { fetchHinges, fetchPulls, fetchSlides } from "../../redux/actions/hardware.js";
import { fetchDrawerBoxMaterials, fetchSheetGoods } from "../../redux/actions/materials.js";
import { fetchTeamDefaults } from "../../redux/actions/teamEstimateDefaults";
import DefaultEstimateNotesForm from "../estimates/DefaultEstimateNotesForm.jsx";
import EstimateSectionForm from "../estimates/EstimateSectionForm.jsx";

const TeamEstimateDefaultsSettings = (props) => {
  const dispatch = useDispatch();
  const { teamDefaults, loading, error } = useSelector(
    (state) => state.teamEstimateDefaults
  );

  useEffect(() => {
    dispatch(fetchTeamDefaults());
    dispatch(fetchSheetGoods());
    dispatch(fetchDrawerBoxMaterials());
    dispatch(fetchHinges());
    dispatch(fetchPulls());
    dispatch(fetchSlides());
    dispatch(fetchCabinetTypes());
    dispatch(fetchTeamCabinetStyles());
    dispatch(fetchFinishes());
  }, [dispatch]);

  const handleSave = () => {
    // The EstimateSectionForm already calls updateTeamDefaults internally
    // No additional action needed here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading team defaults...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!teamDefaults) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">No team defaults found</div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${props.maxWidthClass} mx-auto`}>
      <EstimateSectionForm
        editType="team"
        teamData={teamDefaults}
        onCancel={() => {
          // Do nothing or navigate back
        }}
        onSave={handleSave}
      />
      <DefaultEstimateNotesForm teamDefaults={teamDefaults} />
    </div>
  );
};

export default TeamEstimateDefaultsSettings;
