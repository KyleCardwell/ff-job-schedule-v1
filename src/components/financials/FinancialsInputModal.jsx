import { Field, Label, Switch } from "@headlessui/react";
import { isEqual, omit } from "lodash";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useCSVReader } from "react-papaparse";
import { useDispatch, useSelector } from "react-redux";
import { GridLoader } from "react-spinners";
import { v4 as uuidv4 } from "uuid";

import {
  buttonClass,
  modalContainerClass,
  modalOverlayClass,
} from "../../assets/tailwindConstants";
import { usePermissions } from "../../hooks/usePermissions";
import { saveProjectFinancials } from "../../redux/actions/financialsData";
import { calculateFinancialTotals } from "../../utils/helpers";

import EstimatesModal from "./EstimatesModal.jsx";
import FinancialsAccordion from "./FinancialsAccordion.jsx";

const FinancialsInputModal = ({
  isOpen,
  onClose,
  selectedTask,
}) => {
  const dispatch = useDispatch();

  const { CSVReader } = useCSVReader();

  const { employees } = useSelector((state) => state.builders);
  const financialSections = useSelector(
    (state) => state?.financialsData?.taskFinancials ?? {}
  );
  const chartConfig = useSelector((state) => state.chartConfig);

  const { canViewProfitLoss } = usePermissions();

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [localSections, setLocalSections] = useState([]);
  const [modalTotals, setModalTotals] = useState({ estimate: 0, actual: 0 });
  const [isEstimatesOpen, setIsEstimatesOpen] = useState(false);
  const [adjustments, setAdjustments] = useState({
    profit: 20,
    commission: 10,
    discount: 0,
    quantity: 1,
  });

  useEffect(() => {
    if (!financialSections) return;

    // Load adjustments from financialSections if they exist
    if (financialSections.adjustments) {
      setAdjustments({
        profit: financialSections.adjustments.profit || 20,
        commission: financialSections.adjustments.commission || 10,
        discount: financialSections.adjustments.discount || 0,
        quantity: financialSections.adjustments.quantity || 1,
      });
    }

    const sectionTypes = [
      { id: "hours", name: "hours" },
      ...chartConfig.estimate_sections,
    ] || [
      { id: "hours", name: "Hours" },
      { id: "cabinets", name: "Cabinets" },
      { id: "doors", name: "Doors" },
      { id: "drawers", name: "Drawers" },
      { id: "other", name: "Other" },
    ];

    const financialData = financialSections.financial_data || {};

    const initialSections = sectionTypes.map(({ id, name }) => {
      // For hours section, we'll store employee type data instead of generic input rows
      if (id === "hours") {
        const hoursData = financialData["hours"] || {};

        // Create employee type structure
        const employeeTypeData =
          chartConfig.employee_type?.map((type) => {
            // Find the type data in the array
            const typeData = hoursData.data?.find(
              (t) => t.type_id === type.id
            ) || {
              type_id: type.id,
              type_name: type.name,
              estimate: 0,
              fixedAmount: 0,
              actual_cost: 0,
              inputRows: [],
            };

            return {
              type_id: type.id,
              type_name: type.name,
              estimate: typeData.estimate || 0,
              fixedAmount: typeData.fixedAmount || 0,
              actual_cost: typeData.actual_cost || 0,
              inputRows: typeData.inputRows || [],
            };
          }) || [];

        // Calculate total estimate from employee type estimates and fixed amounts
        const totalEstimate = employeeTypeData.reduce((sum, type) => {
          const employeeType = chartConfig.employee_type.find(
            (et) => et.id === type.type_id
          );
          const hourlyEstimate = (type.estimate || 0) * (employeeType?.rate || 0);
          const fixedAmount = type.fixedAmount || 0;
          return sum + hourlyEstimate + fixedAmount;
        }, 0);

        return {
          id,
          sectionName: name.charAt(0).toUpperCase() + name.slice(1),
          estimate: totalEstimate,
          actual_cost: hoursData.actual_cost || 0,
          data: employeeTypeData,
        };
      }

      // For other sections, find the matching section in financial_data by name
      const sectionKey = Object.keys(financialData).find(
        key => financialData[key].name.toLowerCase() === name.toLowerCase()
      );
      const sectionData = sectionKey ? financialData[sectionKey] : {};

      return {
        id: sectionKey || id, // Use the key from financial_data if found, otherwise use the default id
        sectionName: name.charAt(0).toUpperCase() + name.slice(1),
        estimate: sectionData.estimate || 0,
        actual_cost: sectionData.actual_cost || 0,
        inputRows: (sectionData.data || []).map((row) => ({
          ...row,
          id: row.id || uuidv4(),
        })),
      };
    });

    setLocalSections(initialSections);
  }, [financialSections, chartConfig.employee_type]);

  const calculateTotals = useMemo(() => {
    return calculateFinancialTotals(localSections, chartConfig, adjustments);
  }, [localSections, chartConfig, adjustments]);

  useEffect(() => {
    setModalTotals({
      estimate: calculateTotals.total,
      actual: calculateTotals.actual,
    });
  }, [calculateTotals]);

  const handleAdjustmentChange = (field, value) => {
    setAdjustments((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleSectionUpdate = (sectionId, newData) => {
    setLocalSections((prevSections) =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          if (section.id === "hours") {
            // For hours section, keep the data array structure
            return {
              ...section,
              data: newData,
            };
          } else {
            // For non-hours sections, update with new data and calculate actual_cost
            return {
              ...section,
              ...newData,
              actual_cost:
                newData.inputRows?.reduce(
                  (sum, row) => sum + (parseFloat(row.cost) || 0),
                  0
                ) || 0,
            };
          }
        }
        return section;
      })
    );
  };

  const handleOnFileLoad = () => {};

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const result = await dispatch(
        saveProjectFinancials(
          financialSections.financials_id,
          localSections,
          adjustments
        )
      );

      if (result.success) {
        onClose();
      } else {
        setSaveError(result.error || "Failed to save financials");
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      setSaveError(error.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value) => {
    return (value || 0).toFixed(2);
  };

  if (!isOpen) return null;

  return (
    <div className="relative">
      {isOpen && (
        <div className={modalOverlayClass}>
          <div className={`${modalContainerClass} max-h-[90vh] flex flex-col`}>
            {isSaving && (
              <div className="loading-overlay absolute inset-0 bg-gray-200 bg-opacity-80 flex flex-col justify-center items-center z-[120]">
                <GridLoader color="maroon" size={15} />
                <p>Saving...</p>
              </div>
            )}

            {/* Fixed Header */}
            <div className="flex-none bg-white px-4 pt-5">
              <div className="flex justify-between mb-4">
                <CSVReader onUploadAccepted={handleOnFileLoad}>
                  {({ getRootProps, acceptedFile }) => (
                    <button
                      {...getRootProps()}
                      className={`${buttonClass} bg-blue-500 hover:bg-blue-700`}
                    >
                      Upload CSV
                    </button>
                  )}
                </CSVReader>
                <h2 className="text-lg font-bold w-full text-center">
                  {`${selectedTask.project_name} - ${selectedTask.task_number} - ${selectedTask.task_name}`}
                </h2>
                <button
                  onClick={() => setIsEstimatesOpen(true)}
                  className={`${buttonClass} bg-green-800`}
                >
                  Estimates
                </button>
              </div>

              <div className="flex justify-end items-center mb-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Estimate:</span>
                    <span className="font-bold">
                      ${formatCurrency(modalTotals.estimate)}
                    </span>
                  </div>
                  {canViewProfitLoss && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-600">Actual:</span>
                      <span className="font-bold">
                        ${formatCurrency(modalTotals.actual)}
                      </span>
                    </div>
                  )}
                  {canViewProfitLoss && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-600">Profit:</span>
                      <span
                        className={`font-bold ${
                          modalTotals.estimate - modalTotals.actual >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        $
                        {formatCurrency(
                          modalTotals.estimate - modalTotals.actual
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4">
              <FinancialsAccordion
                sections={localSections}
                employees={employees}
                onSectionUpdate={handleSectionUpdate}
              />
            </div>

            {/* Fixed Footer */}
            <div className="modal-actions flex-shrink-0 flex justify-between mt-4">
              <button className={`${buttonClass} bg-red-500`} onClick={onClose}>
                Cancel
              </button>
              <button
                className={`${buttonClass} bg-blue-500`}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
            {errors.messages && errors.messages.length > 0 && (
              <div className="error-messages">
                {errors.messages.map((message, index) => (
                  <div key={index} className="error general-error">
                    {message}
                  </div>
                ))}
              </div>
            )}
            {saveError && (
              <div className="error-messages">
                <div className="error general-error">{saveError}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {isEstimatesOpen && (
        <EstimatesModal
          isOpen={isEstimatesOpen}
          onClose={() => setIsEstimatesOpen(false)}
          localSections={localSections}
          setLocalSections={setLocalSections}
          adjustments={adjustments}
          onAdjustmentChange={handleAdjustmentChange}
          subtotal={calculateTotals.subtotal}
          total={calculateTotals.total}
        />
      )}
    </div>
  );
};

export default FinancialsInputModal;
