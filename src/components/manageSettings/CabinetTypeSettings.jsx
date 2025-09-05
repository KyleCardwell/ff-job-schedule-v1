import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import { fetchCabinetTypes, addCabinetType, updateCabinetType } from '../../redux/actions/cabinetTypes';

import CabinetTypeCard from './CabinetTypeCard.jsx';
import SettingsSection from './SettingsSection.jsx';

const CabinetTypeSettings = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const { types, loading, error } = useSelector((state) => state.cabinetTypes);
  const [localTypes, setLocalTypes] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    dispatch(fetchCabinetTypes());
  }, [dispatch]);

  useEffect(() => {
    setLocalTypes(types || []);
  }, [types]);

  const handleInputChange = (id, field, value) => {
    setLocalTypes(prev =>
      prev.map(type => (type.id === id ? { ...type, [field]: value } : type))
    );
  };

  const toggleActiveState = (id) => {
    setLocalTypes(prev =>
      prev.map(type =>
        type.id === id ? { ...type, is_active: !type.is_active } : type
      )
    );
  };

  const handleAddNew = () => {
    const newType = {
      id: uuidv4(),
      name: '',
      default_width: 0,
      default_height: 0,
      default_depth: 0,
      isNew: true,
      is_active: true,
    };
    setLocalTypes(prev => [...prev, newType]);
  };

  const handleSave = () => {
    const newErrors = {};
    let hasErrors = false;

    localTypes.forEach(type => {
      const errors = {};
      if (!type.name) errors.name = true;
      if (type.default_width == null || type.default_width === '') errors.default_width = true;
      if (type.default_height == null || type.default_height === '') errors.default_height = true;
      if (type.default_depth == null || type.default_depth === '') errors.default_depth = true;

      if (Object.keys(errors).length > 0) {
        newErrors[type.id] = errors;
        hasErrors = true;
      }
    });

    setValidationErrors(newErrors);

    if (hasErrors) {
      return; // Stop the save process if there are validation errors
    }

    const typesToUpdate = [];
    const typesToAdd = localTypes.filter(t => t.isNew);

    localTypes.forEach(localType => {
      if (!localType.isNew) {
        const originalType = types.find(t => t.id === localType.id);
        if (JSON.stringify(originalType) !== JSON.stringify(localType)) {
          typesToUpdate.push(localType);
        }
      }
    });

    typesToUpdate.forEach(type => {
      const { id, ...data } = type;
      dispatch(updateCabinetType(id, data));
    });

    typesToAdd.forEach(type => {
      const { id, isNew, ...data } = type;
      dispatch(addCabinetType({ ...data, is_active: true }));
    });
  };

  const handleCancel = () => {
    setLocalTypes(types || []);
    setValidationErrors({});
  };

  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-slate-800 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200">Manage Cabinet Types</h2>
          <button
            onClick={handleAddNew}
            className="flex items-center px-2 py-2 text-sm bg-slate-600 text-slate-200 hover:bg-slate-500"
          >
            <FiPlus className="h-5 w-5 mr-2" />
            Add Type
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-150px)]">
        {loading && <div className="p-4 text-white">Loading...</div>}
        {error && <div className="p-4 text-red-500">Error: {error}</div>}
        {Object.keys(validationErrors).length > 0 && (
          <div className="p-2 my-2 text-red-400 bg-red-900/50 border border-red-700 rounded-md">
            Please fill out all required fields.
          </div>
        )}
        {!loading && !error && (
          <>
            <SettingsSection title={localTypes.some(t => !t.is_active) ? "Active Cabinet Types" : ""}>
              <div className="space-y-2 p-1">
                {/* Header */}
                <div className="grid grid-cols-6 gap-4 px-4 font-bold text-slate-400 items-end">
                  <div className="col-span-2">Name</div>
                  <div className="col-span-3 flex flex-col">
                    <div className="text-center">Default Dimensions</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>Width</div>
                      <div>Height</div>
                      <div>Depth</div>
                    </div>
                  </div>
                  <div className="text-right">Actions</div>
                </div>

                {localTypes.filter(t => t.is_active).map(type => (
                  <CabinetTypeCard
                    key={type.id}
                    type={type}
                    onInputChange={handleInputChange}
                    onRemove={() => toggleActiveState(type.id)}
                    errors={validationErrors[type.id]}
                  />
                ))}
              </div>
            </SettingsSection>

            {localTypes.some(t => !t.is_active) && (
              <SettingsSection title="Inactive Cabinet Types">
                <div className="space-y-2 p-1">
                <div className="grid grid-cols-6 gap-4 px-4 font-bold text-slate-400 items-end">
                    <div className="col-span-2">Name</div>
                    <div>Width</div>
                    <div>Height</div>
                    <div>Depth</div>
                    <div className="text-right">Actions</div>
                  </div>
                  
                  {localTypes.filter(t => !t.is_active).map(type => (
                    <div key={type.id} className="grid grid-cols-6 gap-4 items-center bg-slate-800 p-2 rounded-md text-slate-500">
                      <div className="col-span-2">{type.name}</div>
                      <div className="">{type.default_width}</div>
                      <div className="">{type.default_height}</div>
                      <div className="">{type.default_depth}</div>
                      <div className="flex justify-end">
                        <button onClick={() => toggleActiveState(type.id)} className="p-2 text-slate-400 hover:text-white">
                          Reactivate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsSection>
            )}
          </>
        )}
      </div>
    </div>
  );
});

CabinetTypeSettings.displayName = 'CabinetTypeSettings';

export default CabinetTypeSettings;
