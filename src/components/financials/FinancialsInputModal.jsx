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
      if (id === 'hours') {
        return {
          id,
          sectionName: label,
          estimate: financialSections[id]?.estimate ?? 0,
          actual_cost: financialSections[id]?.actual_cost ?? 0,
          // Store employee type IDs and their data
          data: chartConfig.employee_type?.map(type => ({
            type_id: type.id,
            type_name: type.name, // Store name for reference, but use id as source of truth
            hours: (financialSections[id]?.data || [])
              .filter(row => row.type_id === type.id)
              .reduce((sum, row) => sum + (row.hours || 0), 0)
          })) || []
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

  const handleSectionUpdate = (sectionId, updates) => {
    setLocalSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  };

  const totals = useMemo(() => {
    return localSections.reduce(
      (acc, section) => {
        acc.estimate += section.estimate;
        // Calculate actual from input rows for each section
        const sectionActual = section.id === "hours" ? 
          section.data.reduce((sum, row) => sum + row.hours, 0) : 
          section.inputRows.reduce((sum, row) => sum + (row.hours || 0), 0);
        acc.actual += sectionActual;
        return acc;
      },
      { estimate: 0, actual: 0 }
    );
  }, [localSections]);

  const handleOnFileLoad = () => {};

  const handleSave = () => {};

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
                  {selectedTask}
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
                      ${totals.estimate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Actual:</span>
                    <span className="font-bold">
                      ${totals.actual.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Profit:</span>
                    <span
                      className={`font-bold ${
                        totals.estimate - totals.actual >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ${(totals.estimate - totals.actual).toLocaleString()}
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
