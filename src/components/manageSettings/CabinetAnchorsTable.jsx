import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit, FiSave, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';

import { fetchCabinetAnchors, createCabinetAnchor, updateCabinetAnchor, deleteCabinetAnchor } from '../../redux/actions/cabinetAnchors';

const AnchorRow = ({ anchor, services, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(anchor);

  useEffect(() => {
    setEditedData(anchor);
  }, [anchor]);

  const handleInputChange = (e, serviceId) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : parseFloat(value);

    if (serviceId) {
      setEditedData(prev => ({
        ...prev,
        services: prev.services.map(s => s.team_service_id === serviceId ? { ...s, hours: numValue } : s)
      }));
    } else {
      setEditedData(prev => ({ ...prev, [name]: numValue }));
    }
  };

  const handleSave = () => {
    onSave(editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(anchor);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <tr className="bg-slate-700/50">
        <td className="p-2"><input type="number" name="width" value={editedData.width} onChange={handleInputChange} className="bg-slate-900 w-full p-1" /></td>
        <td className="p-2"><input type="number" name="height" value={editedData.height} onChange={handleInputChange} className="bg-slate-900 w-full p-1" /></td>
        <td className="p-2"><input type="number" name="depth" value={editedData.depth} onChange={handleInputChange} className="bg-slate-900 w-full p-1" /></td>
        {services.map(s => (
          <td key={s.id} className="p-2">
            <input
              type="number"
              value={editedData.services.find(ans => ans.team_service_id === s.id)?.hours || ''}
              onChange={(e) => handleInputChange(e, s.id)}
              className="bg-slate-900 w-full p-1"
            />
          </td>
        ))}
        <td className="p-2 text-right">
          <button onClick={handleSave} className="p-2 text-green-400"><FiSave /></button>
          <button onClick={handleCancel} className="p-2 text-red-400"><FiX /></button>
        </td>
      </tr>
    );
  }

  return (
    <tr className='bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50'>
      <td className="px-4 py-2">{anchor.width}</td>
      <td className="px-4 py-2">{anchor.height}</td>
      <td className="px-4 py-2">{anchor.depth}</td>
      {services.map(s => (
        <td key={s.id} className="px-4 py-2">
          {anchor.services.find(ans => ans.team_service_id === s.id)?.hours || 0}
        </td>
      ))}
      <td className="px-4 py-2 text-right">
        <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-white"><FiEdit /></button>
        <button onClick={() => onDelete(anchor.id)} className="p-2 text-slate-400 hover:text-red-400"><FiTrash2 /></button>
      </td>
    </tr>
  );
};

const CabinetAnchorsTable = ({ cabinetTypeId }) => {
  const dispatch = useDispatch();
  const { items: anchors, loading } = useSelector((state) => state.cabinetAnchors);
  const services = useSelector((state) => state.services.allServices);
  const teamId = useSelector((state) => state.auth.teamId);

  const [localAnchors, setLocalAnchors] = useState([]);
  const [newAnchor, setNewAnchor] = useState(null);

  useEffect(() => {
    if (teamId) {
      dispatch(fetchCabinetAnchors(teamId));
    }
  }, [dispatch, teamId]);

  useEffect(() => {
    const filtered = anchors
      .filter(a => a.cabinet_type_id === cabinetTypeId)
      .sort((a, b) => a.volume - b.volume); // Sort by volume
    setLocalAnchors(filtered);
  }, [anchors, cabinetTypeId]);

  const handleAddNew = () => {
    const initialServices = services.map(s => ({ team_service_id: s.id, hours: 0 }));
    setNewAnchor({ width: '', height: '', depth: '', services: initialServices });
  };

  const handleCancelNew = () => {
    setNewAnchor(null);
  };

  const handleSaveNew = () => {
    const payload = {
      team_id: teamId,
      cabinet_type_id: cabinetTypeId,
      width: parseFloat(newAnchor.width),
      height: parseFloat(newAnchor.height),
      depth: parseFloat(newAnchor.depth),
      services: newAnchor.services.map(s => ({...s, hours: parseFloat(s.hours)}))
    };
    dispatch(createCabinetAnchor(payload));
    setNewAnchor(null);
  };

  const handleUpdate = (updatedAnchor) => {
    const { id, width, height, depth, services: anchorServices } = updatedAnchor;
    const payload = {
        anchorId: id,
        updates: { width, height, depth },
        services: anchorServices
    };
    dispatch(updateCabinetAnchor(payload));
  };

  const handleDelete = (anchorId) => {
    if (window.confirm('Are you sure you want to delete this anchor?')) {
        dispatch(deleteCabinetAnchor(anchorId));
    }
  };

  const handleNewAnchorInputChange = (e, serviceId) => {
    const { name, value } = e.target;
    const numValue = value; // Keep as string for input control

    if (serviceId) {
      setNewAnchor(prev => ({
        ...prev,
        services: prev.services.map(s => s.team_service_id === serviceId ? { ...s, hours: numValue } : s)
      }));
    } else {
      setNewAnchor(prev => ({ ...prev, [name]: numValue }));
    }
  };

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg mt-4 border border-slate-700">
      <h3 className="text-md font-bold text-slate-300 mb-2">Labor Hour Anchors</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-400 uppercase bg-slate-700">
            <tr>
              <th scope="col" className="px-4 py-2">Width</th>
              <th scope="col" className="px-4 py-2">Height</th>
              <th scope="col" className="px-4 py-2">Depth</th>
              {services.map(s => <th key={s.id} scope="col" className="px-4 py-2 whitespace-nowrap">{s.name} Hrs</th>)}
              <th scope="col" className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localAnchors.map(anchor => (
                <AnchorRow 
                    key={anchor.id}
                    anchor={anchor}
                    services={services}
                    onSave={handleUpdate}
                    onDelete={handleDelete}
                />
            ))}

            {/* New Anchor Input Row */}
            {newAnchor && (
              <tr className="bg-slate-700/50">
                <td className="p-2"><input type="number" name="width" value={newAnchor.width} onChange={handleNewAnchorInputChange} className="bg-slate-900 w-full p-1" /></td>
                <td className="p-2"><input type="number" name="height" value={newAnchor.height} onChange={handleNewAnchorInputChange} className="bg-slate-900 w-full p-1" /></td>
                <td className="p-2"><input type="number" name="depth" value={newAnchor.depth} onChange={handleNewAnchorInputChange} className="bg-slate-900 w-full p-1" /></td>
                {services.map(s => (
                  <td key={s.id} className="p-2">
                    <input 
                      type="number" 
                      value={newAnchor.services.find(ans => ans.team_service_id === s.id)?.hours || ''}
                      onChange={(e) => handleNewAnchorInputChange(e, s.id)}
                      className="bg-slate-900 w-full p-1"
                    />
                  </td>
                ))}
                <td className="p-2 text-right">
                  <button onClick={handleSaveNew} className="p-2 text-green-400 hover:text-green-300"><FiSave /></button>
                  <button onClick={handleCancelNew} className="p-2 text-red-400 hover:text-red-300"><FiX /></button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!newAnchor && (
        <button onClick={handleAddNew} className="mt-2 flex items-center px-2 py-1 text-sm bg-slate-600 text-slate-200 rounded-md hover:bg-slate-500">
          <FiPlus className="mr-2" /> Add Anchor
        </button>
      )}
    </div>
  );
};

export default CabinetAnchorsTable;
