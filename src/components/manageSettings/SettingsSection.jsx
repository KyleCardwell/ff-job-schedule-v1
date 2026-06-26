import PropTypes from "prop-types";

const SettingsSection = ({ title, children, error, maxWidthClass, headerActions }) => {
  return (
    <div className={`mb-8 ${maxWidthClass} relative`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-md font-semibold text-slate-200 text-left">{title}</h3>
        {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
      </div>
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
  maxWidthClass: PropTypes.string,
  headerActions: PropTypes.node,
};

export default SettingsSection;