import PropTypes from 'prop-types';
import { FiTrash2 } from 'react-icons/fi';

const CabinetTypeCard = ({ type, onInputChange, onRemove, errors = {} }) => {
  const errorClass = 'border-red-500';
  const baseClass = 'w-full bg-slate-600 text-white p-1 rounded border border-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none';

  return (
    <div className={`grid grid-cols-6 gap-4 items-center p-2 rounded-md transition-colors bg-slate-700`}>
      <div className="col-span-2">
        <input
          type="text"
          value={type.name}
          onChange={(e) => onInputChange(type.id, 'name', e.target.value)}
          placeholder="Cabinet Type Name"
          className={`${baseClass} ${errors.name ? errorClass : ''}`}
        />
      </div>
      <div>
        <input
          type="number"
          value={type.default_width}
          onChange={(e) => onInputChange(type.id, 'default_width', e.target.value === "" ? "" : parseFloat(e.target.value))}
          className={`${baseClass} ${errors.default_width ? errorClass : ''}`}
        />
      </div>
      <div>
        <input
          type="number"
          value={type.default_height}
          onChange={(e) => onInputChange(type.id, 'default_height', e.target.value === "" ? "" : parseFloat(e.target.value))}
          className={`${baseClass} ${errors.default_height ? errorClass : ''}`}
        />
      </div>
      <div>
        <input
          type="number"
          value={type.default_depth}
          onChange={(e) => onInputChange(type.id, 'default_depth', e.target.value === "" ? "" : parseFloat(e.target.value))}
          className={`${baseClass} ${errors.default_depth ? errorClass : ''}`}
        />
      </div>
      <div className="flex justify-end">
        <button onClick={() => onRemove(type.id)} className="p-2 text-slate-400 hover:text-red-500">
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
};

export default CabinetTypeCard;

CabinetTypeCard.propTypes = {
  type: PropTypes.object.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  errors: PropTypes.object,
};