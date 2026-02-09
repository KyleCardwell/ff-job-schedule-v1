import PropTypes from "prop-types";
import { useState } from "react";
import { useSelector } from "react-redux";

import {
  modalContainerClass,
  modalOverlayClass,
} from "../../assets/tailwindConstants";
import { safeEvaluate, formatNumberValue } from "../../utils/mathUtils";

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
    fieldName = "estimate",
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
    fieldName = "estimate",
  ) => {
    // Convert to number or null if empty
    let numValue = null;
    if (value !== "") {
      // First try to evaluate as a math expression
      const evaluatedValue = safeEvaluate(value);

      if (evaluatedValue !== null) {
        numValue = formatNumberValue(evaluatedValue);
      } else {
        // Fall back to regular parsing if evaluation fails
        const parsed = parseFloat(value);
        numValue = !isNaN(parsed) ? formatNumberValue(parsed) : null;
      }
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
    fieldName = "estimate",
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

  // Handle add amount fields blur with math expression support
  const handleAddAmountBlur = (value, fieldName) => {
    // Convert to number or null if empty
    let numValue = 0;
    if (value !== "") {
      // First try to evaluate as a math expression
      const evaluatedValue = safeEvaluate(value);

      if (evaluatedValue !== null) {
        numValue = formatNumberValue(evaluatedValue);
      } else {
        // Fall back to regular parsing if evaluation fails
        const parsed = parseFloat(value);
        numValue = !isNaN(parsed) ? formatNumberValue(parsed) : 0;
      }
    }

    // Clear the input value from state since we've processed it
    setInputValues((prev) => {
      const newValues = { ...prev };
      delete newValues[fieldName];
      return newValues;
    });

    // Update the actual data with the numeric value
    onAdjustmentChange(fieldName, numValue);
  };

  if (!isOpen) return null;

  const priceSections = localSections.filter(
    (section) => section.id !== "hours",
  );

  const comissionAmount = subtotal * (adjustments.commission / 100);
  const profitAmount = subtotal * (adjustments.profit / 100);
  const discountAmount =
    (subtotal + profitAmount + comissionAmount) * (adjustments.discount / 100);

  const adjustmentRows = [
    {
      key: "profit",
      label: "Profit (%)",
      type: "number",
      placeholder: "0",
      step: "1",
      value: adjustments.profit || "",
      onChange: (e) => onAdjustmentChange("profit", e.target.value),
      displayValue: `$${formatCurrency((subtotal || 0) * ((adjustments.profit || 0) / 100))}`,
    },
    {
      key: "commission",
      label: "Commission (%)",
      type: "number",
      placeholder: "0",
      step: "1",
      value: adjustments.commission || "",
      onChange: (e) => onAdjustmentChange("commission", e.target.value),
      displayValue: `$${formatCurrency((subtotal || 0) * ((adjustments.commission || 0) / 100))}`,
    },
    {
      key: "discount",
      label: "Discount (%)",
      type: "number",
      placeholder: "0",
      step: "1",
      value: adjustments.discount || "",
      onChange: (e) => onAdjustmentChange("discount", e.target.value),
      displayValue: `$${formatCurrency(discountAmount)}`,
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      placeholder: "1",
      step: "1",
      min: "1",
      value: adjustments.quantity || "",
      onChange: (e) => onAdjustmentChange("quantity", e.target.value),
      displayValue: "",
    },
    {
      key: "addToSubtotal",
      label: "Add to Subtotal ($)",
      type: "text",
      inputMode: "decimal",
      placeholder: "0",
      value:
        inputValues.addToSubtotal !== undefined
          ? inputValues.addToSubtotal
          : adjustments.addToSubtotal || "",
      onChange: (e) =>
        setInputValues((prev) => ({
          ...prev,
          addToSubtotal: e.target.value,
        })),
      onBlur: (e) => handleAddAmountBlur(e.target.value, "addToSubtotal"),
      displayValue: `$${formatCurrency(adjustments.addToSubtotal || 0)}`,
    },
    {
      key: "addToTotal",
      label: "Add to Total ($)",
      type: "text",
      inputMode: "decimal",
      placeholder: "0",
      value:
        inputValues.addToTotal !== undefined
          ? inputValues.addToTotal
          : adjustments.addToTotal || "",
      onChange: (e) =>
        setInputValues((prev) => ({
          ...prev,
          addToTotal: e.target.value,
        })),
      onBlur: (e) => handleAddAmountBlur(e.target.value, "addToTotal"),
      displayValue: `$${formatCurrency(adjustments.addToTotal || 0)}`,
    },
  ];

  return (
    <div className={modalOverlayClass}>
      <div className={`max-w-7xl ${modalContainerClass}`}>
        <div className="p-6">
          <div className="">
            <div className="flex flex-col justify-between gap-8 flex-1 grid grid-cols-[3fr,4fr,3fr]">
              <div name="prices">
                <h4 className="text-base font-semibold text-gray-800 border-b border-gray-500 pb-2">
                  Prices
                </h4>
                <div className="mt-4 px-6 grid grid-cols-2 gap-x-10 gap-y-4 items-center">
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
                            className="max-w-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                            placeholder="0"
                            pattern="^[0-9]*\.?[0-9]*$"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div name="hours">
                <h4 className="text-base font-semibold text-gray-800 border-b border-gray-500 pb-2">
                  Hours
                </h4>
                <div className="space-y-3 pt-4 flex flex-col items-center">
                  {services?.map((service) => {
                    return (
                      <div
                        key={service.service_id}
                        className="grid grid-cols-[.75fr,1fr,1fr,1fr] gap-4 items-center"
                      >
                        <h3 className="text-sm font-medium text-gray-700 capitalize w-16 text-right items-center">
                          {service.service_name}
                        </h3>
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
                              "estimate",
                            )}
                            onChange={(e) =>
                              handleEstimateChange(
                                "hours",
                                e.target.value,
                                service.service_id,
                                "estimate",
                              )
                            }
                            onBlur={(e) =>
                              handleBlur(
                                "hours",
                                e.target.value,
                                service.service_id,
                                "estimate",
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
                              "fixedAmount",
                            )}
                            onChange={(e) =>
                              handleEstimateChange(
                                "hours",
                                e.target.value,
                                service.service_id,
                                "fixedAmount",
                              )
                            }
                            onBlur={(e) =>
                              handleBlur(
                                "hours",
                                e.target.value,
                                service.service_id,
                                "fixedAmount",
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
                              "rateOverride",
                            )}
                            onChange={(e) =>
                              handleEstimateChange(
                                "hours",
                                e.target.value,
                                service.service_id,
                                "rateOverride",
                              )
                            }
                            onBlur={(e) =>
                              handleBlur(
                                "hours",
                                e.target.value,
                                service.service_id,
                                "rateOverride",
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                            placeholder="Rate"
                            pattern="^[0-9]*\.?[0-9]*$"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div
                className="flex flex-col justify-between flex-1"
                name="adjustments"
              >
                <div>
                  <h4 className="text-base font-semibold text-gray-800 border-b border-gray-500 pb-2">
                    Adjustments
                  </h4>
                  <div className="pt-4 px-3 space-y-3">
                    {adjustmentRows.map((row) => (
                      <div
                        key={row.key}
                        className="grid grid-cols-[130px,96px,1fr] gap-2 items-center"
                      >
                        <h3 className="text-sm font-medium text-gray-700">
                          {row.label}
                        </h3>
                        <input
                          type={row.type}
                          inputMode={row.inputMode}
                          value={row.value}
                          onChange={row.onChange}
                          onBlur={row.onBlur}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={row.placeholder}
                          step={row.step}
                          min={row.min}
                        />
                        <span className="text-sm text-gray-500 text-right ml-4">
                          {row.displayValue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            <div className="border border-gray-500 py-3 px-6 mt-6 w-1/4">
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
