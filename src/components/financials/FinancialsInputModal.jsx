import PropTypes from "prop-types";
import { useState, useEffect, useMemo } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { useCSVReader } from "react-papaparse";
import { useDispatch, useSelector } from "react-redux";
import { GridLoader } from "react-spinners";
import { v4 as uuidv4 } from "uuid";

import {
  buttonClass,
  modalContainerClass,
  modalContainerWidth,
  modalOverlayClass,
} from "../../assets/tailwindConstants";
import { usePermissions } from "../../hooks/usePermissions";
import { saveProjectFinancials } from "../../redux/actions/financialsData";
import { DEFAULT_FINANCIAL_SECTIONS } from "../../utils/constants.js";
import { calculateFinancialTotals } from "../../utils/helpers";

import EstimatesModal from "./EstimatesModal.jsx";
import FinancialsAccordion from "./FinancialsAccordion.jsx";

const DEFAULT_ADJUSTMENTS = {
  profit: 20,
  commission: 10,
  discount: 0,
  quantity: 1,
  addToSubtotal: 0,
  addToTotal: 0,
};

const normalizeSectionName = (value) =>
  value?.toLowerCase?.().trim?.() || "";

const FinancialsInputModal = ({ isOpen, onClose, selectedTask }) => {
  const dispatch = useDispatch();

  const { CSVReader } = useCSVReader();

  const { employees } = useSelector((state) => state.builders);
  const { taskFinancials:financialSections = {}, loading, errors } = useSelector(
    (state) => state.financialsData
  );
  const chartConfig = useSelector((state) => state.chartConfig);
  const services = useSelector((state) => state.services?.allServices);

  const { canViewProfitLoss } = usePermissions();

  const [errorsState, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [localSections, setLocalSections] = useState([]);
  const [modalTotals, setModalTotals] = useState({ estimate: 0, actual: 0 });
  const [isEstimatesOpen, setIsEstimatesOpen] = useState(false);
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);
  const [isTaskCostingComplete, setIsTaskCostingComplete] = useState(false);

  useEffect(() => {
    if (!financialSections) {
      setAdjustments(DEFAULT_ADJUSTMENTS);
      return;
    }

    setAdjustments({
      ...DEFAULT_ADJUSTMENTS,
      ...(financialSections.adjustments ?? {}),
    });

    const chartSections = Array.isArray(chartConfig?.estimate_sections)
      ? chartConfig.estimate_sections
      : [];
    const defaultIds = new Set(DEFAULT_FINANCIAL_SECTIONS.map((s) => s.id));
    const defaultNames = new Set(
      DEFAULT_FINANCIAL_SECTIONS.map((s) => normalizeSectionName(s.name)),
    );
    const extraSections = chartSections.filter(({ id, name }) => {
      const normalizedName = normalizeSectionName(name);
      return !defaultIds.has(id) && !defaultNames.has(normalizedName);
    });
    const sectionTypes = [
      { id: "hours", name: "hours" },
      ...DEFAULT_FINANCIAL_SECTIONS,
      ...extraSections,
    ];

    const financialData = financialSections.financial_data || {};

    const initialSections = sectionTypes.map(({ id, name }) => {
      // For hours section, we'll store employee type data instead of generic input rows
      if (id === "hours") {
        const hoursData = financialData["hours"] || {};

        // Create employee type structure
        const servicesData =
          services?.map((service) => {
            // Find the type data in the array
            const serviceData = hoursData.data?.find(
              (t) => t.team_service_id === service.team_service_id
            ) || {
              service_id: service.service_id,
              service_name: service.service_name,
              team_service_id: service.team_service_id,
              estimate: 0,
              fixedAmount: 0,
              rateOverride: null, // Initialize with null
              actual_cost: 0,
              inputRows: [],
            };

            return {
              service_id: service.service_id,
              service_name: service.service_name,
              team_service_id: service.team_service_id,
              estimate: serviceData.estimate || 0,
              fixedAmount: serviceData.fixedAmount || 0,
              rateOverride: serviceData.rateOverride || null, // Load the override value
              actual_cost: serviceData.actual_cost || 0,
              inputRows: serviceData.inputRows || [],
            };
          }) || [];

        // Calculate total estimate from employee type estimates and fixed amounts
        const totalEstimate = servicesData.reduce((sum, type) => {
          const service = services.find(
            (et) => et.team_service_id === type.team_service_id
          );
          // Use override rate if it exists, otherwise use the default rate
          const rate = type.rateOverride ?? service?.hourly_rate ?? 0;
          const hourlyEstimate = (type.estimate || 0) * rate;
          const fixedAmount = type.fixedAmount || 0;

          return sum + hourlyEstimate + fixedAmount;
        }, 0);

        return {
          id,
          sectionName: name.charAt(0).toUpperCase() + name.slice(1),
          estimate: totalEstimate,
          actual_cost: hoursData.actual_cost || 0,
          data: servicesData,
          completedAt: hoursData.completedAt || null,
        };
      }

      // For other sections, find the matching section in financial_data by name
      const sectionKey = Object.keys(financialData).find(
        (key) => financialData[key].name.toLowerCase() === name.toLowerCase()
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
        completedAt: sectionData.completedAt || null,
      };
    });

    setLocalSections(initialSections);
  }, [financialSections, chartConfig, services]);

  useEffect(() => {
    const allSectionsComplete = localSections.every((section) => {
      return section.completedAt;
    });
    setIsTaskCostingComplete(allSectionsComplete);
  }, [localSections]);

  const handleSelectAll = (isChecked) => {
    const newTimestamp = isChecked ? new Date().toISOString() : null;
    setLocalSections((prevSections) =>
      prevSections.map((section) => ({ ...section, completedAt: newTimestamp }))
    );
  };

  const handleCompletionChange = (sectionId, isChecked) => {
    setLocalSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              completedAt: isChecked ? new Date().toISOString() : null,
            }
          : section
      )
    );
  };

  const calculateTotals = useMemo(() => {
    return calculateFinancialTotals(localSections, services, adjustments);
  }, [localSections, services, adjustments]);

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

  const handleEstimatesClose = () => {
    const newSections = localSections.map((section) => {
      if (section.id === "hours") {
        // Recalculate the total estimate for the entire hours section
        const newTotalEstimate = section.data.reduce((total, serviceData) => {
          const service = services.find(
            (s) => s.team_service_id === serviceData.team_service_id
          );
          const rate = serviceData.rateOverride ?? service?.hourly_rate ?? 0;

          // The estimate is based on the estimated hours, not actuals
          const hourlyEstimate = (serviceData.estimate || 0) * rate;
          const fixedAmount = serviceData.fixedAmount || 0;

          return total + hourlyEstimate + fixedAmount;
        }, 0);

        return { ...section, estimate: newTotalEstimate };
      }
      return section;
    });

    setLocalSections(newSections);
    setIsEstimatesOpen(false);
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
          adjustments,
          isTaskCostingComplete
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
          <div className={`${modalContainerWidth} ${modalContainerClass} max-h-[90vh] flex flex-col`}>
            {loading ? (
              <div className="flex justify-center items-center h-[744px]">
                <GridLoader color="maroon" size={15} />
              </div>
            ) : (
              <>
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
                          className={`${buttonClass} bg-blue-500 hover:bg-blue-700 opacity-50 cursor-not-allowed`}
                          disabled
                          onClick={(e) => e.preventDefault()}
                        >
                          Upload CSV
                        </button>
                      )}
                    </CSVReader>
                    <h2 className="text-lg font-bold w-full text-center flex items-center justify-center gap-2">
                      {`${selectedTask.project_name} - ${selectedTask.task_number} - ${selectedTask.task_name}`}
                      {isTaskCostingComplete ? (
                        <FiCheck className="text-green-500" size={24} />
                      ) : (
                        <FiX className="text-red-500" size={24} />
                      )}
                    </h2>
                    <button
                      onClick={() => setIsEstimatesOpen(true)}
                      className={`${buttonClass} bg-green-800`}
                    >
                      Estimates
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 flex justify-end items-center mb-4 bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-600">
                            Estimate:
                          </span>
                          <span className="font-bold">
                            ${formatCurrency(modalTotals.estimate)}
                          </span>
                        </div>
                        {canViewProfitLoss && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-600">
                              Actual:
                            </span>
                            <span className="font-bold">
                              ${formatCurrency(modalTotals.actual)}
                            </span>
                          </div>
                        )}
                        {canViewProfitLoss && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-600">
                              Profit:
                            </span>
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
                    <div className="flex flex-col items-center w-10">
                      <div>Done</div>
                      <input
                        type="checkbox"
                        checked={isTaskCostingComplete}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-6 w-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto min-h-0 px-4">
                  <FinancialsAccordion
                    sections={localSections}
                    employees={employees}
                    services={services}
                    onSectionUpdate={handleSectionUpdate}
                    onCompletionChange={handleCompletionChange}
                  />
                </div>

                {/* Fixed Footer */}
                <div className="modal-actions flex-shrink-0 flex justify-between mt-4">
                  <button
                    className={`${buttonClass} bg-red-500`}
                    onClick={onClose}
                  >
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
                {errorsState.messages && errorsState.messages.length > 0 && (
                  <div className="error-messages">
                    {errorsState.messages.map((message, index) => (
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
              </>
            )}
          </div>
        </div>
      )}

      {isEstimatesOpen && (
        <EstimatesModal
          isOpen={isEstimatesOpen}
          onClose={handleEstimatesClose}
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

FinancialsInputModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  selectedTask: PropTypes.object,
};

export default FinancialsInputModal;
