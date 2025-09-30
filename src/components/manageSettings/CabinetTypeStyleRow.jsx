import PropTypes from "prop-types";

const CabinetTypeStyleRow = ({ typeStyle, onChange, isGroupActive = false }) => {
  const defaultConfig = {
    top: '',
    bottom: '',
    left: '',
    right: '',
    reveal: '',
  };

  // This is the definitive fix: ensure config is an object before spreading
  const config = { ...defaultConfig, ...(typeStyle.config || {}) };

  const handleRevealChange = (field, value) => {
    const numericValue = value === "" ? "" : parseFloat(value);
    if (!isNaN(numericValue) || value === "") {
      onChange(typeStyle.team_cabinet_style_id, `config.${field}`, numericValue);
    }
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-semibold text-slate-200">{typeStyle.cabinet_type_name}</h4>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label htmlFor={`top-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Top</label>
          <input
            type="number"
            id={`top-${typeStyle.team_cabinet_style_id}`}
            value={config.top}
            onChange={(e) => handleRevealChange("top", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`bottom-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Bottom</label>
          <input
            type="number"
            id={`bottom-${typeStyle.team_cabinet_style_id}`}
            value={config.bottom}
            onChange={(e) => handleRevealChange("bottom", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`left-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Left</label>
          <input
            type="number"
            id={`left-${typeStyle.team_cabinet_style_id}`}
            value={config.left}
            onChange={(e) => handleRevealChange("left", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`right-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Right</label>
          <input
            type="number"
            id={`right-${typeStyle.team_cabinet_style_id}`}
            value={config.right}
            onChange={(e) => handleRevealChange("right", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`reveal-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Mid</label>
          <input
            type="number"
            id={`reveal-${typeStyle.team_cabinet_style_id}`}
            value={config.reveal}
            onChange={(e) => handleRevealChange("reveal", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
};

CabinetTypeStyleRow.propTypes = {
  typeStyle: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  isGroupActive: PropTypes.bool,
};

export default CabinetTypeStyleRow;
