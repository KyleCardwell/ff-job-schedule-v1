import React from "react";
import PropTypes from "prop-types";

const SettingsSection = ({ title, children, error }) => {
  return (
    <div className="mb-6 w-[720px]">
      <h3 className="text-md font-semibold mb-3 text-slate-200 text-left">{title}</h3>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      <div className="bg-slate-700 p-4 shadow-sm w-full">
        {children}
      </div>
    </div>
  );
};

SettingsSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  error: PropTypes.string,
};

export default SettingsSection;