import PropTypes from "prop-types";

const SettingsItem = ({ type, label, value, onChange, name, min, max }) => {
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
            className="bg-slate-600 text-slate-200 px-2 py-1 ml-4 w-48"
          />
        </div>
      );
    case 'number':
      return (
        <div className="flex items-center justify-between mb-2">
          <label className="text-slate-200 text-sm">{label}</label>
          <input
            type="number"
            value={value}
            onChange={onChange}
            name={name}
            min={min}
            max={max}
            className="bg-slate-600 text-slate-200 px-2 py-1 ml-4 w-48"
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
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-4 w-48"
          />
        </div>
      );
    default:
      return null;
  }
};

SettingsItem.propTypes = {
  type: PropTypes.oneOf(['text', 'checkbox', 'number']),
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool, PropTypes.number]),
  onChange: PropTypes.func,
  name: PropTypes.string,
  min: PropTypes.string,
  max: PropTypes.string,
};

export default SettingsItem;
