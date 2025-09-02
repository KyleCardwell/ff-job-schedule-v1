import PropTypes from "prop-types";

const SettingsSection = ({ title, children, error }) => {
  return (
    <div className="mb-8 w-[720px] relative">
      <h3 className="text-md font-semibold mb-3 text-slate-200 text-left">{title}</h3>
      <div className="bg-slate-700 p-4 shadow-sm w-full">
      {error && <div className="text-sm bg-red-500 text-white mb-2 w-full">{error}</div>}
        {children}
      </div>
    </div>
  );
};

SettingsSection.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
  error: PropTypes.string,
};

export default SettingsSection;