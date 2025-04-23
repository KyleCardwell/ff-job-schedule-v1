import React from "react";
import { useSelector } from "react-redux";
import {
  modalContainerClass,
  modalOverlayClass,
} from "../../assets/tailwindConstants";

const EstimatesModal = ({
  isOpen,
  onClose,
  localSections,
  setLocalSections,
  adjustments,
  onAdjustmentChange,
  subtotal,
  total,
}) => {
  const chartConfig = useSelector((state) => state.chartConfig);

  const handleEstimateChange = (sectionId, value, typeId = null, isHardNumber = false) => {
    // Convert empty string to null instead of 0
    const numValue = value === '' ? null : parseFloat(value);
    
    setLocalSections((prevSections) => {
      const newSections = prevSections.map((section) => {
        if (section.id === sectionId) {
          if (section.id === "hours" && typeId) {
            // Update specific employee type estimate in hours section
            const updatedData = section.data.map((typeData) => {
              if (typeData.type_id === typeId) {
                return {
                  ...typeData,
                  [isHardNumber ? 'hardNumber' : 'estimate']: numValue,
                };
              }
              return typeData;
            });

            return {
              ...section,
              data: updatedData,
            };
          } else {
            // Update single estimate value (for non-hours sections)
            return {
              ...section,
              estimate: numValue,
            };
          }
        }
        return section;
      });

      return newSections;
    });
  };

  const formatEstimate = (value) => {
    if (value === null || value === undefined || value === '') return '';
    return value === 0 ? '' : value.toString();
  };

  if (!isOpen) return null;

  const hoursSection = localSections.find((section) => section.id === "hours");
  const priceSections = localSections.filter(
    (section) => section.id !== "hours"
  );

  return (
    <div className={modalOverlayClass}>
      <div className={modalContainerClass}>
        <div className="p-6">
          <div className="flex gap-8">
            <div className="flex flex-col justify-between gap-16 flex-1">
              <div>
                <h4 className="text-base font-semibold text-gray-800 border-b pb-2">
                  Prices
                </h4>
                <div className="space-y-3 pl-4 pt-4">
                  {priceSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-end gap-4 px-6"
                    >
                      <h3 className="text-sm font-medium text-gray-700">
                        {section.sectionName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <label className="text-xs text-gray-500">Rate</label>
                          <input
                            type="number"
                            value={formatEstimate(section.estimate)}
                            onChange={(e) =>
                              handleEstimateChange(section.id, e.target.value)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                            placeholder="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-800 border-b pb-2">
                  Hours
                </h4>
                <div className="space-y-3 pl-4 pt-4">
                  {chartConfig.employee_type?.map((type) => {
                    const typeData = hoursSection?.data?.find(
                      (t) => t.type_id === type.id
                    );
                    return (
                      <div
                        key={type.id}
                        className="flex items-center justify-end gap-4 px-6"
                      >
                        <h3 className="text-sm font-medium text-gray-700">
                          {type.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end">
                            <label className="text-xs text-gray-500">Hours</label>
                            <input
                              type="number"
                              value={formatEstimate(typeData?.estimate)}
                              onChange={(e) =>
                                handleEstimateChange(
                                  "hours",
                                  e.target.value,
                                  type.id
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                              placeholder="0"
                              step="0.01"
                            />
                          </div>
                          <div className="flex flex-col items-end">
                            <label className="text-xs text-gray-500">Fixed Amount</label>
                            <input
                              type="number"
                              value={formatEstimate(typeData?.hardNumber)}
                              onChange={(e) =>
                                handleEstimateChange(
                                  "hours",
                                  e.target.value,
                                  type.id,
                                  true
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                              placeholder="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between flex-1">
              <div>
                <h4 className="text-base font-semibold text-gray-800 border-b pb-2">
                  Adjustments
                </h4>
                <div className="space-y-3 pt-4 px-6">
                  <div className="flex gap-4 justify-end items-center">
                    <h3 className="text-sm font-medium text-gray-700">
                      Profit (%)
                    </h3>
                    <input
                      type="number"
                      value={adjustments.profit}
                      onChange={(e) =>
                        onAdjustmentChange("profit", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                      placeholder="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex gap-4 justify-end items-center">
                    <h3 className="text-sm font-medium text-gray-700">
                      Commission (%)
                    </h3>
                    <input
                      type="number"
                      value={adjustments.commission}
                      onChange={(e) =>
                        onAdjustmentChange("commission", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                      placeholder="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex gap-4 justify-end items-center">
                    <h3 className="text-sm font-medium text-gray-700">
                      Discount (%)
                    </h3>
                    <input
                      type="number"
                      value={adjustments.discount}
                      onChange={(e) =>
                        onAdjustmentChange("discount", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                      placeholder="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex gap-4 justify-end items-center">
                    <h3 className="text-sm font-medium text-gray-700">
                      Quantity
                    </h3>
                    <input
                      type="number"
                      value={adjustments.quantity}
                      onChange={(e) =>
                        onAdjustmentChange("quantity", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                      placeholder="1"
                      min="1"
                      step="1"
                    />
                  </div>
                </div>
              </div>
              <div className="border py-3 px-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Subtotal:
                  </span>
                  <span className="text-sm font-medium">
                    ${formatEstimate(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-base font-semibold text-gray-800">
                    Total:
                  </span>
                  <span className="text-base font-semibold">
                    ${formatEstimate(total)}
                  </span>
                </div>
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
