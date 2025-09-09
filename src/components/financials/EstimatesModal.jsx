import PropTypes from "prop-types";
import { useState } from "react";
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
  const services = useSelector((state) => state.services?.allServices || []);

  // Keep track of string values during editing
  const [inputValues, setInputValues] = useState({});

  // Handle input changes - store as strings
  const handleEstimateChange = (
    sectionId,
    value,
    serviceId = null,
    fieldName = "estimate"
  ) => {
    // Store the input value as a string
    const key = serviceId
      ? `${sectionId}-${serviceId}-${fieldName}`
      : `${sectionId}-${fieldName}`;

    setInputValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Convert string values to numbers on blur
  const handleBlur = (
    sectionId,
    value,
    serviceId = null,
    fieldName = "estimate"
  ) => {
    // Convert to number or null if empty
    let numValue = null;
    if (value !== "") {
      const parsed = parseFloat(value);
      numValue = !isNaN(parsed) ? parsed : null;
    }

    // Clear the input value from state since we've processed it
    const key = serviceId
      ? `${sectionId}-${serviceId}-${fieldName}`
      : `${sectionId}-${fieldName}`;

    setInputValues((prev) => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });

    // Update the actual data with the numeric value
    setLocalSections((prevSections) => {
      const newSections = prevSections.map((section) => {
        if (section.id === sectionId) {
          if (section.id === "hours" && serviceId) {
            // Update specific service estimate in hours section
            const updatedData = section.data.map((serviceData) => {
              if (serviceData.service_id === serviceId) {
                return {
                  ...serviceData,
                  [fieldName]: numValue,
                };
              }
              return serviceData;
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

  // Get the display value for an input
  const getDisplayValue = (
    sectionId,
    serviceId = null,
    fieldName = "estimate"
  ) => {
    const key = serviceId
      ? `${sectionId}-${serviceId}-${fieldName}`
      : `${sectionId}-${fieldName}`;

    // If there's an active input value, use that
    if (key in inputValues) {
      return inputValues[key];
    }

    // Otherwise get the value from the data
    let value = null;
    if (serviceId && sectionId === "hours") {
      const serviceData = localSections
        .find((s) => s.id === "hours")
        ?.data?.find((d) => d.service_id === serviceId);
      value = serviceData?.[fieldName];
    } else {
      value = localSections.find((s) => s.id === sectionId)?.estimate;
    }

    // Format the value for display
    if (value === null || value === undefined || value === 0) return "";
    return value.toString();
  };

  // Format currency for display
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "0.00";
    return parseFloat(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  if (!isOpen) return null;

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
                <div className="flex flex-row flex-wrap gap-x-12 gap-y-4 pt-4">
                  {priceSections.map((section) => (
                    <div key={section.id} className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-start">
                          <label className="text-sm text-gray-800">
                            {section.sectionName}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={getDisplayValue(section.id)}
                            onChange={(e) =>
                              handleEstimateChange(section.id, e.target.value)
                            }
                            onBlur={(e) =>
                              handleBlur(section.id, e.target.value)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                            placeholder="0"
                            pattern="^[0-9]*\.?[0-9]*$"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="">
                <h4 className="text-base font-semibold text-gray-800 border-b pb-2">
                  Hours
                </h4>
                <div className="space-y-3 pt-4">
                  {services?.map((service) => {
                    return (
                      <div
                        key={service.service_id}
                        className="flex items-center justify-end gap-4"
                      >
                        <h3 className="text-sm font-medium text-gray-700 capitalize w-16 text-right">
                          {service.service_name}
                        </h3>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <label className="text-xs text-gray-500">
                              Hours
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getDisplayValue(
                                "hours",
                                service.service_id,
                                "estimate"
                              )}
                              onChange={(e) =>
                                handleEstimateChange(
                                  "hours",
                                  e.target.value,
                                  service.service_id,
                                  "estimate"
                                )
                              }
                              onBlur={(e) =>
                                handleBlur(
                                  "hours",
                                  e.target.value,
                                  service.service_id,
                                  "estimate"
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                              placeholder="0"
                              pattern="^[0-9]*\.?[0-9]*$"
                            />
                          </div>
                          <div className="flex flex-col items-end">
                            <label className="text-xs text-gray-500">
                              Fixed Amount
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getDisplayValue(
                                "hours",
                                service.service_id,
                                "fixedAmount"
                              )}
                              onChange={(e) =>
                                handleEstimateChange(
                                  "hours",
                                  e.target.value,
                                  service.service_id,
                                  "fixedAmount"
                                )
                              }
                              onBlur={(e) =>
                                handleBlur(
                                  "hours",
                                  e.target.value,
                                  service.service_id,
                                  "fixedAmount"
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                              placeholder="0"
                              pattern="^[0-9]*\.?[0-9]*$"
                            />
                          </div>
                          <div className="flex flex-col items-end">
                            <label className="text-xs text-gray-500">
                              Rate Override
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getDisplayValue(
                                "hours",
                                service.service_id,
                                "rateOverride"
                              )}
                              onChange={(e) =>
                                handleEstimateChange(
                                  "hours",
                                  e.target.value,
                                  service.service_id,
                                  "rateOverride"
                                )
                              }
                              onBlur={(e) =>
                                handleBlur(
                                  "hours",
                                  e.target.value,
                                  service.service_id,
                                  "rateOverride"
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                              placeholder="Rate"
                              pattern="^[0-9]*\.?[0-9]*$"
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
                    ${formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-base font-semibold text-gray-800">
                    Total:
                  </span>
                  <span className="text-base font-semibold">
                    ${formatCurrency(total)}
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

EstimatesModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  localSections: PropTypes.array,
  setLocalSections: PropTypes.func,
  adjustments: PropTypes.object,
  onAdjustmentChange: PropTypes.func,
  subtotal: PropTypes.number,
  total: PropTypes.number,
};

export default EstimatesModal;
