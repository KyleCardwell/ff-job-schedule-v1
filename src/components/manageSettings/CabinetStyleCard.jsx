import { Switch } from "@headlessui/react";
import PropTypes from "prop-types";

import CabinetTypeStyleRow from "./CabinetTypeStyleRow.jsx";

const CabinetStyleCard = ({ styleGroup, onChange }) => {
  const handleGroupIsActiveChange = (isActive) => {
    onChange(styleGroup.cabinet_style_id, "is_active", isActive);
  };

  return (
    <div className={`relative`}>
        <div className="flex items-center gap-2 absolute right-4 top-[-52px]">
          <label className="block text-sm font-bold text-slate-200">Active</label>
          <Switch
            checked={styleGroup.is_active}
            onChange={handleGroupIsActiveChange}
            className={`${styleGroup.is_active ? "bg-blue-600" : "bg-gray-200"}
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${styleGroup.is_active ? "translate-x-6" : "translate-x-1"}
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>
        <div className="text-md font-bold text-slate-200">Default Reveal Dimensions</div>
      
      <div>
        {styleGroup.types.map((typeStyle) => (
          <CabinetTypeStyleRow 
            key={typeStyle.team_cabinet_style_id} 
            typeStyle={typeStyle} 
            onChange={onChange}
            isGroupActive={styleGroup.is_active}
          />
        ))}
      </div>
    </div>
  );
};

CabinetStyleCard.propTypes = {
  styleGroup: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default CabinetStyleCard;
