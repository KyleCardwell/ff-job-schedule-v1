import isEqual from "lodash/isEqual";
import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchTeamCabinetStyles, saveTeamCabinetStyles } from "../../redux/actions/cabinetStyles";

import CabinetStyleCard from "./CabinetStyleCard.jsx";
import SettingsSection from "./SettingsSection.jsx";

const CabinetStyleSettings = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const { styles: groupedStyles, loading } = useSelector((state) => state.cabinetStyles);
  const { teamId } = useSelector((state) => state.auth);

  const [localStyles, setLocalStyles] = useState({});
  const [originalStyles, setOriginalStyles] = useState({});

  useEffect(() => {
    if (teamId) {
      dispatch(fetchTeamCabinetStyles());
    }
  }, [dispatch, teamId]);

  useEffect(() => {
    if (groupedStyles) {
      setLocalStyles(groupedStyles);
      setOriginalStyles(groupedStyles);
    }
  }, [groupedStyles]);

  const handleStyleChange = (team_cabinet_style_id, field, value) => {
    setLocalStyles(prevGroupedStyles => {
      const newGroupedStyles = JSON.parse(JSON.stringify(prevGroupedStyles));
      
      // Find which group the style belongs to
      const groupKey = Object.keys(newGroupedStyles).find(key => 
        newGroupedStyles[key].types.some(t => t.team_cabinet_style_id === team_cabinet_style_id)
      );

      if (groupKey) {
        const styleGroup = newGroupedStyles[groupKey];
        // Map over the types array of only that specific group
        styleGroup.types = styleGroup.types.map(style => {
          if (style.team_cabinet_style_id === team_cabinet_style_id) {
            const newStyle = { ...style };
            if (field.startsWith("config.")) {
              const configField = field.split('.')[1];
              newStyle.config = { ...newStyle.config, [configField]: value };
            } else {
              newStyle[field] = value;
            }
            return newStyle;
          }
          return style;
        });
      }

      return newGroupedStyles;
    });
  };

  const handleSaveChanges = () => {
    const flattenedLocalStyles = Object.values(localStyles).flatMap(group => group.types);
    const flattenedOriginalStyles = Object.values(originalStyles).flatMap(group => group.types);
    
    // Find styles that have been changed by comparing with original styles
    const changedStyles = flattenedLocalStyles.filter(localStyle => {
      const originalStyle = flattenedOriginalStyles.find(
        origStyle => origStyle.team_cabinet_style_id === localStyle.team_cabinet_style_id
      );
      
      if (!originalStyle) return true; // New style
      
      // Only compare the config and is_active fields
      return !isEqual(localStyle.config, originalStyle.config) || 
             localStyle.is_active !== originalStyle.is_active;
    });
    
    if (changedStyles.length === 0) {
      return; // No changes to save
    }
    
    // Only include necessary fields for the update
    const changesToSave = changedStyles.map(style => ({
      team_cabinet_style_id: style.team_cabinet_style_id,
      config: style.config,
      is_active: style.is_active,
      team_id: teamId,
    }));
    
    dispatch(saveTeamCabinetStyles(changesToSave));
  };

  useImperativeHandle(ref, () => ({
    handleSave: handleSaveChanges,
    isChanged: !isEqual(localStyles, originalStyles),
  }));

  return (
    <div className="flex flex-col gap-4 mt-4">
      {Object.values(localStyles).map((group) => (
        <SettingsSection key={group.cabinet_style_id} title={group.cabinet_style_name} loading={loading}>
          <CabinetStyleCard
            styleGroup={group}
            onChange={handleStyleChange}
          />
        </SettingsSection>
      ))}
    </div>
  );
});

CabinetStyleSettings.displayName = "CabinetStyleSettings";

export default CabinetStyleSettings;
