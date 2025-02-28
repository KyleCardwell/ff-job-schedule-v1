import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { Field, Label, Switch } from "@headlessui/react";
import { isEqual, omit } from "lodash";
import { useCSVReader } from "react-papaparse";
import { GridLoader } from "react-spinners";
import {
  buttonClass,
  modalContainerClass,
  modalOverlayClass,
} from "../../assets/tailwindConstants";
import FinancialsAccordion from "./FinancialsAccordion";
import EstimatesModal from "./EstimatesModal";
import { saveProjectFinancials } from "../../redux/actions/financialsData";

const FinancialsInputModal = ({
  isOpen,
  onClose,
  onSave,
  setIsLoading,
  selectedTask,
}) => {
  const dispatch = useDispatch();

  const { CSVReader } = useCSVReader();

  const { employees } = useSelector((state) => state.builders);
  const financialSections = useSelector(
    (state) => state?.financialsData?.financials ?? {}
  );
  const chartConfig = useSelector((state) => state.chartConfig);

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [localSections, setLocalSections] = useState([]);
  const [modalTotals, setModalTotals] = useState({ estimate: 0, actual: 0 });

  const [isEstimatesOpen, setIsEstimatesOpen] = useState(false);

  useEffect(() => {
    if (!financialSections) return;

    const sectionTypes = [
      { id: "hours", label: "Hours" },
      { id: "cabinets", label: "Cabinets" },
      { id: "doors", label: "Doors" },
      { id: "drawers", label: "Drawers" },
      { id: "other", label: "Other" },
    ];

    const initialSections = sectionTypes.map(({ id, label }) => {
      // For hours section, we'll store employee type data instead of generic input rows
      if (id === "hours") {
        const hoursData = financialSections[id] || {};
        console.log('Hours data from DB:', hoursData);

        // Create employee type structure
        const employeeTypeData = chartConfig.employee_type?.map(type => {
          // Find the type data in the array
          const typeData = hoursData.data?.find(t => t.type_id === type.id) || {
            type_id: type.id,
            type_name: type.name,
            estimate: 0,
            actual_cost: 0,
            inputRows: []
          };

          return {
            type_id: type.id,
            type_name: type.name,
            estimate: typeData.estimate || 0,
            actual_cost: typeData.actual_cost || 0,
            inputRows: typeData.inputRows || []
          };
        }) || [];

        // Calculate total estimate from employee type estimates
        const totalEstimate = employeeTypeData.reduce((sum, type) => sum + (type.estimate || 0), 0);

        return {
          id,
          sectionName: label,
          estimate: totalEstimate,
          actual_cost: hoursData.actual_cost || 0,
          data: employeeTypeData
        };
      }

      // For non-hours sections
      const sectionData = financialSections[id] || {};

      return {
        id,
        sectionName: label,
        estimate: sectionData.estimate || 0,
        actual_cost: sectionData.actual_cost || 0,
        inputRows: (sectionData.data || []).map((row) => ({
          ...row,
          id: row.id || uuidv4(),
        })),
      };
    });

    
    setLocalSections(initialSections);
    console.log('local sections', localSections)
  }, [financialSections, chartConfig.employee_type]);

  useEffect(() => {
    // Update totals whenever localSections changes
    const newTotals = localSections.reduce(
      (acc, section) => {
        // Add estimate
        acc.estimate += section.estimate || 0;

        // Calculate actual based on section type
        if (section.id === "hours") {
          // For hours section, use data array if it exists
          const sectionActual = Array.isArray(section.data)
            ? section.data.reduce(
                (sum, row) => sum + (parseFloat(row.actual_cost) || 0),
                0
              )
            : 0;
          acc.actual += sectionActual;
        } else {
          // For non-hours sections, use inputRows array
          const sectionActual = Array.isArray(section.inputRows)
            ? section.inputRows.reduce(
                (sum, row) => sum + (parseFloat(row.cost) || 0),
                0
              )
            : 0;
          acc.actual += sectionActual;
        }

        return acc;
      },
      { estimate: 0, actual: 0 }
    );
    setModalTotals(newTotals);
  }, [localSections]);

  const handleSectionUpdate = (sectionId, newData) => {
    setLocalSections((prevSections) =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          if (sectionId === "hours") {
            // For hours, maintain the array structure with type_id and hours
            return {
              ...section,
              data: Array.isArray(newData)
                ? newData.map((row) => ({
                    ...row,
                    type_id: row.type_id,
                    estimate: parseFloat(row.estimate) || 0,
                    actual_cost: parseFloat(row.actual_cost) || 0,
                    data: row.data || []
                  }))
                : [],
            };
          } else {
            // For non-hours sections, maintain the array of cost entries
            return {
              ...section,
              inputRows: Array.isArray(newData)
                ? newData.map((row) => ({
                    ...row,
                    cost: parseFloat(row.cost) || 0,
                  }))
                : [],
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
        saveProjectFinancials(financialSections.financials_id, localSections)
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

  if (!isOpen) return null;

  return (
    <>
      {isOpen && (
        <div className={modalOverlayClass}>
          <div className={modalContainerClass}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex justify-between mb-4">
                <CSVReader onUploadAccepted={handleOnFileLoad}>
                  {({ getRootProps, acceptedFile }) => (
                    <div className="csv-import-container">
                      <button
                        type="button"
                        {...getRootProps()}
                        className={`${buttonClass} bg-blue-500 truncate`}
                      >
                        Import CSV
                      </button>
                    </div>
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

              <div className="flex justify-end items-center mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Estimate:</span>
                    <span className="font-bold">
                      ${modalTotals.estimate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Actual:</span>
                    <span className="font-bold">
                      ${modalTotals.actual.toLocaleString()}
                    </span>
                  </div>
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
                      {(
                        modalTotals.estimate - modalTotals.actual
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <FinancialsAccordion
                sections={localSections}
                employees={employees}
                onSectionUpdate={handleSectionUpdate}
              />

              {errors.rooms && <div className="error">{errors.rooms}</div>}

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
        </div>
      )}

      <EstimatesModal
        isOpen={isEstimatesOpen}
        onClose={() => setIsEstimatesOpen(false)}
        localSections={localSections}
        setLocalSections={setLocalSections}
      />
    </>
  );
};

export default FinancialsInputModal;
