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

  console.log("Financial Sections:", financialSections); // Debug log

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
        return {
          id,
          sectionName: label,
          estimate: financialSections[id]?.estimate ?? 0,
          actual_cost: financialSections[id]?.actual_cost ?? 0,
          // Store employee type IDs and their data
          data:
            chartConfig.employee_type?.map((type) => ({
              type_id: type.id,
              type_name: type.name, // Store name for reference, but use id as source of truth
              hours: (financialSections[id]?.data || [])
                .filter((row) => row.type_id === type.id)
                .reduce((sum, row) => sum + (row.hours || 0), 0),
            })) || [],
        };
      }

      // For non-hours sections, keep the existing structure
      return {
        id,
        sectionName: label,
        estimate: financialSections[id]?.estimate ?? 0,
        actual_cost: financialSections[id]?.actual_cost ?? 0,
        inputRows: [...(financialSections[id]?.data ?? [])].map((row) => ({
          ...row,
          id: row.id || uuidv4(),
        })),
      };
    });

    setLocalSections(initialSections);
  }, [financialSections]);

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
                (sum, row) => sum + (parseFloat(row.hours) || 0),
                0
              )
            : 0;
          console.log("Hours section actual:", sectionActual); // Debug log
          acc.actual += sectionActual;
        } else {
          // For non-hours sections, use inputRows array
          const sectionActual = Array.isArray(section.inputRows)
            ? section.inputRows.reduce(
                (sum, row) => sum + (parseFloat(row.cost) || 0),
                0
              )
            : 0;
          console.log(`${section.id} section actual:`, sectionActual); // Debug log
          acc.actual += sectionActual;
        }

        return acc;
      },
      { estimate: 0, actual: 0 }
    );
    console.log("New totals:", newTotals); // Debug log
    setModalTotals(newTotals);
  }, [localSections]);

  const handleSectionUpdate = (sectionId, newData) => {
    console.log("Section Update:", sectionId, newData); // Debug log
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
                    hours: parseFloat(row.hours) || 0,
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
