import PropTypes from 'prop-types';
import { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

const FaceAccessories = ({ 
  faceNode, 
  accessories, 
  onAccessoriesChange 
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [newAccessory, setNewAccessory] = useState({
    accessory_id: '',
    quantity: 1,
  });

  // Filter accessories that apply to this face type
  const availableAccessories = accessories.catalog.filter(accessory => 
    accessory.applies_to.includes(faceNode.type)
  );

  // Get current face accessories (stored in the face node)
  const faceAccessories = faceNode.accessories || [];

  const handleAddClick = () => {
    setIsAdding(true);
    setNewAccessory({
      accessory_id: availableAccessories[0]?.id || '',
      quantity: 1,
    });
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewAccessory({ accessory_id: '', quantity: 1 });
  };

  const handleSaveNew = () => {
    if (!newAccessory.accessory_id || newAccessory.quantity <= 0) {
      return;
    }

    const accessoryData = accessories.catalog.find(
      a => a.id === parseInt(newAccessory.accessory_id)
    );

    if (!accessoryData) return;

    const newAccessoryItem = {
      id: `temp_${Date.now()}`, // Temporary ID for UI purposes
      accessory_id: newAccessory.accessory_id,
      quantity: newAccessory.quantity,
      width: faceNode.width,
      height: faceNode.height,
      depth: faceNode.depth || null,
      name: accessoryData.name,
      type: accessoryData.type,
      calculation_type: accessoryData.calculation_type,
    };

    const updatedAccessories = [...faceAccessories, newAccessoryItem];
    onAccessoriesChange(updatedAccessories);

    setIsAdding(false);
    setNewAccessory({ accessory_id: '', quantity: 1 });
  };

  const handleEditClick = (accessoryItem) => {
    setEditingId(accessoryItem.id);
    setEditValues({
      accessory_id: accessoryItem.accessory_id,
      quantity: accessoryItem.quantity,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSaveEdit = (accessoryItem) => {
    if (!editValues.accessory_id || editValues.quantity <= 0) {
      return;
    }

    const accessoryData = accessories.catalog.find(
      a => a.id === parseInt(editValues.accessory_id)
    );

    if (!accessoryData) return;

    const updatedAccessories = faceAccessories.map(item => {
      if (item.id === accessoryItem.id) {
        return {
          ...item,
          accessory_id: editValues.accessory_id,
          quantity: editValues.quantity,
          width: faceNode.width,
          height: faceNode.height,
          depth: faceNode.depth || null,
          name: accessoryData.name,
          type: accessoryData.type,
          calculation_type: accessoryData.calculation_type,
        };
      }
      return item;
    });

    onAccessoriesChange(updatedAccessories);
    setEditingId(null);
    setEditValues({});
  };

  const handleDelete = (accessoryItem) => {
    const updatedAccessories = faceAccessories.filter(
      item => item.id !== accessoryItem.id
    );
    onAccessoriesChange(updatedAccessories);
  };

  if (availableAccessories.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic">
        No accessories available for this face type
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-700">Accessories</div>
        <button
          onClick={handleAddClick}
          disabled={isAdding}
          className="px-2 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiPlus className="mr-1" size={10} />
          Add
        </button>
      </div>

      {/* List of existing accessories */}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {faceAccessories.map((item) => {
          const isEditing = editingId === item.id;
          const accessoryData = accessories.catalog.find(
            a => a.id === parseInt(item.accessory_id)
          );

          if (isEditing) {
            return (
              <div key={item.id} className="border border-slate-300 rounded p-2 bg-slate-50">
                <div className="space-y-1">
                  <select
                    value={editValues.accessory_id}
                    onChange={(e) => setEditValues({ ...editValues, accessory_id: e.target.value })}
                    className="w-full px-1 py-0.5 text-xs border border-slate-300 rounded"
                  >
                    {availableAccessories.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center space-x-1">
                    <label className="text-xs text-slate-600">Qty:</label>
                    <input
                      type="number"
                      value={editValues.quantity}
                      onChange={(e) => setEditValues({ ...editValues, quantity: parseFloat(e.target.value) || 1 })}
                      className="flex-1 px-1 py-0.5 text-xs border border-slate-300 rounded"
                      min="1"
                      step="1"
                    />
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleSaveEdit(item)}
                      className="flex-1 px-2 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded flex items-center justify-center"
                    >
                      <FiCheck size={10} className="mr-1" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-2 py-0.5 text-xs bg-slate-300 hover:bg-slate-400 text-slate-700 rounded flex items-center justify-center"
                    >
                      <FiX size={10} className="mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={item.id} className="flex items-center justify-between border border-slate-200 rounded p-1 bg-white">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-700 truncate">
                  {accessoryData?.name || 'Unknown'}
                </div>
                <div className="text-xs text-slate-500">
                  Qty: {item.quantity}
                </div>
              </div>
              <div className="flex space-x-1 ml-2">
                <button
                  onClick={() => handleEditClick(item)}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <FiEdit2 size={12} />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add new accessory form */}
      {isAdding && (
        <div className="border border-slate-300 rounded p-2 bg-slate-50">
          <div className="space-y-1">
            <select
              value={newAccessory.accessory_id}
              onChange={(e) => setNewAccessory({ ...newAccessory, accessory_id: e.target.value })}
              className="w-full px-1 py-0.5 text-xs border border-slate-300 rounded"
            >
              {availableAccessories.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <div className="flex items-center space-x-1">
              <label className="text-xs text-slate-600">Qty:</label>
              <input
                type="number"
                value={newAccessory.quantity}
                onChange={(e) => setNewAccessory({ ...newAccessory, quantity: parseFloat(e.target.value) || 1 })}
                className="flex-1 px-1 py-0.5 text-xs border border-slate-300 rounded"
                min="1"
                step="1"
              />
            </div>
            <div className="flex space-x-1">
              <button
                onClick={handleSaveNew}
                className="flex-1 px-2 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded flex items-center justify-center"
              >
                <FiCheck size={10} className="mr-1" />
                Add
              </button>
              <button
                onClick={handleCancelAdd}
                className="flex-1 px-2 py-0.5 text-xs bg-slate-300 hover:bg-slate-400 text-slate-700 rounded flex items-center justify-center"
              >
                <FiX size={10} className="mr-1" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {faceAccessories.length === 0 && !isAdding && (
        <div className="text-xs text-slate-500 italic text-center py-2">
          No accessories added
        </div>
      )}
    </div>
  );
};

FaceAccessories.propTypes = {
  faceNode: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    depth: PropTypes.number,
    accessories: PropTypes.array,
  }).isRequired,
  accessories: PropTypes.shape({
    catalog: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        applies_to: PropTypes.arrayOf(PropTypes.string).isRequired,
        calculation_type: PropTypes.string,
      })
    ).isRequired,
  }).isRequired,
  onAccessoriesChange: PropTypes.func.isRequired,
};

export default FaceAccessories;
