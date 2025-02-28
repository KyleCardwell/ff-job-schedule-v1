import React from 'react';
import { useSelector } from 'react-redux';
import { modalContainerClass, modalOverlayClass } from '../../assets/tailwindConstants';

const EstimatesModal = ({ isOpen, onClose, localSections, setLocalSections }) => {
  const chartConfig = useSelector((state) => state.chartConfig);

  console.log('local sections', localSections)

  const handleEstimateChange = (sectionId, value, typeId = null) => {
    setLocalSections(prevSections => {
      const newSections = prevSections.map(section => {
        if (section.id === sectionId) {
          if (section.id === 'hours' && typeId) {
            // Update specific employee type estimate in hours section
            const updatedData = section.data.map(typeData => {
              if (typeData.type_id === typeId) {
                return {
                  ...typeData,
                  estimate: parseFloat(value) || 0,
                  data: typeData.data || [] // Preserve data array
                };
              }
              return typeData;
            });

            // Calculate total estimate from all employee types
            const totalEstimate = updatedData.reduce((sum, type) => sum + (type.estimate || 0), 0);

            return {
              ...section,
              estimate: totalEstimate,
              data: updatedData
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
      });

      return newSections;
    });
  };

  if (!isOpen) return null;

  // Find hours section and other sections
  const hoursSection = localSections.find(section => section.id === 'hours');
  console.log('Hours section:', hoursSection); // Debug log

  const priceSections = localSections.filter(section => section.id !== 'hours');

  return (
    <div className={modalOverlayClass}>
      <div className={modalContainerClass}>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-medium text-gray-800 border-b pb-2">Hours</h4>
              <div className="space-y-3 pl-4">
                {chartConfig.employee_type?.map((type) => {
                  const typeData = hoursSection?.data?.find(t => t.type_id === type.id);
                  console.log('Type data for', type.id, ':', typeData); // Debug log
                  return (
                    <div key={type.id} className="flex items-center gap-4">
                      <h3 className="text-sm font-medium text-gray-700 w-32">{type.name}</h3>
                      <input
                        type="number"
                        value={typeData?.estimate || ''}
                        onChange={(e) => handleEstimateChange('hours', e.target.value, type.id)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
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

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatesModal;