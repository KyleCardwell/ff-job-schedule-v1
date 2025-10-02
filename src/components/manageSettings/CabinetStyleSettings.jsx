import isEqual from "lodash/isEqual";
import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchTeamCabinetStyles,
  saveTeamCabinetStyles,
} from "../../redux/actions/cabinetStyles";

import CabinetStyleCard from "./CabinetStyleCard.jsx";
import SettingsSection from "./SettingsSection.jsx";

const CabinetStyleSettings = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const { styles: groupedStyles, loading } = useSelector(
    (state) => state.cabinetStyles
  );
  const { teamId } = useSelector((state) => state.auth);

  const [localStyles, setLocalStyles] = useState([]);
  const [originalStyles, setOriginalStyles] = useState([]);

  useEffect(() => {
    if (teamId) {
      dispatch(fetchTeamCabinetStyles());
    }
  }, [dispatch, teamId]);

  useEffect(() => {
    if (groupedStyles && groupedStyles.length > 0) {
      // Deep copy to prevent local edits from affecting original state reference
      const deepCopiedStyles = JSON.parse(JSON.stringify(groupedStyles));
      setLocalStyles(deepCopiedStyles);
      setOriginalStyles(deepCopiedStyles);
    }
  }, [groupedStyles]);

  const handleStyleChange = (id, field, value) => {
    setLocalStyles((prevStyles) => {
      // Create a deep copy to avoid mutation
      const newStyles = JSON.parse(JSON.stringify(prevStyles));

      // Handle group-level changes like is_active
      if (field === "is_active") {
        const groupIndex = newStyles.findIndex(
          (g) => g.cabinet_style_id === id
        );
        if (groupIndex !== -1) {
          newStyles[groupIndex].is_active = value;
          return newStyles;
        }
      }

      // Handle type-level changes (config fields)
      for (const group of newStyles) {
        const typeIndex = group.types.findIndex(
          (t) => t.team_cabinet_style_id === id
        );
        if (typeIndex !== -1) {
          if (field.startsWith("config.")) {
            const configField = field.split(".")[1];
            group.types[typeIndex].config = {
              ...group.types[typeIndex].config,
              [configField]: value,
            };
          } else {
            group.types[typeIndex][field] = value;
          }
          break;
        }
      }

      return newStyles;
    });
  };

  const handleSaveChanges = () => {
    const changesToSave = [];

    // Compare each group and its types to find changes
    localStyles.forEach((localGroup) => {
      const originalGroup = originalStyles.find(
        (og) => og.cabinet_style_id === localGroup.cabinet_style_id
      );

      if (!originalGroup) return; // Skip if no matching original group (shouldn't happen)

      // Check if group's is_active changed
      const activeChanged = localGroup.is_active !== originalGroup.is_active;

      // If active status changed, we need to update ALL types in this group
      if (activeChanged) {
        localGroup.types.forEach((localType) => {
          changesToSave.push({
            team_cabinet_style_id: localType.team_cabinet_style_id,
            config: localType.config,
            is_active: localGroup.is_active, // Use group-level is_active
            team_id: teamId,
          });
        });
      } else {
        // If active status didn't change, only check for config changes
        localGroup.types.forEach((localType) => {
          const originalType = originalGroup.types.find(
            (ot) => ot.cabinet_type_id === localType.cabinet_type_id
          );

          if (!originalType) return; // Skip if no matching original type

          const configChanged = !isEqual(localType.config, originalType.config);

          if (configChanged) {
            changesToSave.push({
              team_cabinet_style_id: localType.team_cabinet_style_id,
              config: localType.config,
              is_active: localGroup.is_active, // Use group-level is_active
              team_id: teamId,
            });
          }
        });
      }
    });

    if (changesToSave.length > 0) {
      dispatch(saveTeamCabinetStyles(changesToSave));
    }
  };

  useImperativeHandle(ref, () => ({
    handleSave: handleSaveChanges,
    isChanged: !isEqual(localStyles, originalStyles),
  }));

  return (
    <div className="flex flex-col gap-4 mt-4">
      {localStyles.map((group) => (
        <SettingsSection
          key={group.cabinet_style_id}
          title={group.cabinet_style_name}
          loading={loading}
        >
          <CabinetStyleCard styleGroup={group} onChange={handleStyleChange} />
        </SettingsSection>
      ))}
    </div>
  );
});

CabinetStyleSettings.displayName = "CabinetStyleSettings";

export default CabinetStyleSettings;
