import React from "react";
import PropTypes from "prop-types";

const SettingItem = ({ type, label, value, onChange, name }) => {
  switch (type) {
    case 'text':
      return (
        <div className="flex items-center justify-between mb-2">
          <label className="text-slate-200 text-sm">{label}</label>
          <input
            type="text"
            value={value}
            onChange={onChange}
            name={name}
            className="bg-slate-600 text-slate-200 px-2 py-1 ml-4"
          />
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex items-center justify-between mb-2">
          <label className="text-slate-200 text-sm">{label}</label>
          <input
            type="checkbox"
            checked={value}
            onChange={onChange}
            name={name}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-4"
          />
        </div>
      );
    default:
      return null;
  }
};

SettingItem.propTypes = {
  type: PropTypes.oneOf(['text', 'checkbox']).isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]).isRequired,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
};

export default SettingItem;
