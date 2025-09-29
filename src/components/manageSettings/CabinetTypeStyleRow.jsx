import PropTypes from "prop-types";

const CabinetTypeStyleRow = ({ typeStyle, onChange, isGroupActive = false }) => {
  const defaultConfig = {
    reveal_top: '',
    reveal_bottom: '',
    reveal_left: '',
    reveal_right: '',
    reveal_mid: '',
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
          <label htmlFor={`reveal_top-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Top</label>
          <input
            type="number"
            id={`reveal_top-${typeStyle.team_cabinet_style_id}`}
            value={config.reveal_top}
            onChange={(e) => handleRevealChange("reveal_top", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`reveal_bottom-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Bottom</label>
          <input
            type="number"
            id={`reveal_bottom-${typeStyle.team_cabinet_style_id}`}
            value={config.reveal_bottom}
            onChange={(e) => handleRevealChange("reveal_bottom", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`reveal_left-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Left</label>
          <input
            type="number"
            id={`reveal_left-${typeStyle.team_cabinet_style_id}`}
            value={config.reveal_left}
            onChange={(e) => handleRevealChange("reveal_left", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`reveal_right-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Right</label>
          <input
            type="number"
            id={`reveal_right-${typeStyle.team_cabinet_style_id}`}
            value={config.reveal_right}
            onChange={(e) => handleRevealChange("reveal_right", e.target.value)}
            disabled={!isGroupActive}
            step="0.0625"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`reveal_mid-${typeStyle.team_cabinet_style_id}`} className="block text-sm font-bold text-slate-200">Mid</label>
          <input
            type="number"
            id={`reveal_mid-${typeStyle.team_cabinet_style_id}`}
            value={config.reveal_mid}
            onChange={(e) => handleRevealChange("reveal_mid", e.target.value)}
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
