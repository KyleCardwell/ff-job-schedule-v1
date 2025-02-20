import React from 'react';
import { useSelector } from 'react-redux';
import { modalContainerClass, modalOverlayClass } from '../../assets/tailwindConstants';

const EstimatesModal = ({ isOpen, onClose, localSections, setLocalSections }) => {
  const chartConfig = useSelector((state) => state.chartConfig);

  const handleEstimateChange = (sectionId, value, typeId = null) => {
    setLocalSections(prevSections => 
      prevSections.map(section => {
        if (section.id === sectionId) {
          if (typeId) {
            // Update specific employee type estimate in hours section
            const updatedEstimates = section.estimates || {};
            return {
              ...section,
              estimates: {
                ...updatedEstimates,
                [typeId]: parseFloat(value) || 0
              }
            };
          } else {
            // Update single estimate value (for non-hours sections)
            return {
              ...section,
              estimate: parseFloat(value) || 0
            };
          }
        }
        return section;
      })
    );
  };

  if (!isOpen) return null;

  const hoursSection = localSections.find(section => section.id === 'hours');
  const priceSections = localSections.filter(section => section.id !== 'hours');

  return (
    <div className={modalOverlayClass}>
      <div className={modalContainerClass}>
        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
            Estimates
          </h3>
          
          <div className="space-y-8">
            {/* Hours Section */}
            <div className="space-y-4">
              <h4 className="text-base font-medium text-gray-800 border-b pb-2">Hours</h4>
              <div className="space-y-3 pl-4">
                {chartConfig.employee_type?.map(type => (
                  <div key={type.id} className="flex items-center gap-4">
                    <h3 className="text-sm font-medium text-gray-700 w-32">{type.name}</h3>
                    <input
                      type="number"
                      value={hoursSection?.estimates?.[type.id] || ''}
                      onChange={(e) => handleEstimateChange('hours', e.target.value, type.id)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      step="0.1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Prices Section */}
            <div className="space-y-4">
              <h4 className="text-base font-medium text-gray-800 border-b pb-2">Prices</h4>
              <div className="space-y-3 pl-4">
                {priceSections.map(section => (
                  <div key={section.id} className="flex items-center gap-4">
                    <h3 className="text-sm font-medium text-gray-700 w-32">{section.sectionName}</h3>
                    <input
                      type="number"
                      value={section.estimate || ''}
                      onChange={(e) => handleEstimateChange(section.id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      step="0.01"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstimatesModal;