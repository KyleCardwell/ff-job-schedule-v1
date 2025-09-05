import PropTypes from 'prop-types';
import { FiTrash2 } from 'react-icons/fi';
import { IoMdUndo } from "react-icons/io";

const CabinetTypeCard = ({ type, onInputChange, onRemove, errors = {} }) => {
  const errorClass = 'border-red-500';
  const baseClass = 'w-full bg-slate-600 text-white p-1 rounded border border-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none';
  const deletionClass = type.markedForDeletion ? 'bg-red-900/50 opacity-60' : 'bg-slate-700';
  const inputDeletionClass = type.markedForDeletion ? 'line-through' : '';

  return (
    <div className={`grid grid-cols-6 gap-4 items-center p-2 rounded-md transition-colors ${deletionClass}`}>
      <div className="col-span-2">
        <input
          type="text"
          value={type.name}
          onChange={(e) => onInputChange(type.id, 'name', e.target.value)}
          placeholder="Cabinet Type Name"
          className={`${baseClass} ${errors.name ? errorClass : ''} ${inputDeletionClass}`}
          disabled={type.markedForDeletion}
        />
      </div>
      <div>
        <input
          type="number"
          value={type.default_width}
          onChange={(e) => onInputChange(type.id, 'default_width', e.target.value === "" ? "" : parseFloat(e.target.value))}
          className={`${baseClass} ${errors.default_width ? errorClass : ''} ${inputDeletionClass}`}
          disabled={type.markedForDeletion}
        />
      </div>
      <div>
        <input
          type="number"
          value={type.default_height}
          onChange={(e) => onInputChange(type.id, 'default_height', e.target.value === "" ? "" : parseFloat(e.target.value))}
          className={`${baseClass} ${errors.default_height ? errorClass : ''} ${inputDeletionClass}`}
          disabled={type.markedForDeletion}
        />
      </div>
      <div>
        <input
          type="number"
          value={type.default_depth}
          onChange={(e) => onInputChange(type.id, 'default_depth', e.target.value === "" ? "" : parseFloat(e.target.value))}
          className={`${baseClass} ${errors.default_depth ? errorClass : ''} ${inputDeletionClass}`}
          disabled={type.markedForDeletion}
        />
      </div>
      <div className="flex justify-end">
        {/* <button onClick={() => onRemove(type.id)} className="p-2 text-slate-400 hover:text-white">
          {type.markedForDeletion ? <IoMdUndo className="text-yellow-400"/> : <FiTrash2 className="hover:text-red-500"/>}
        </button> */}
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