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

  console.log('Financial Sections:', financialSections); // Debug log

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [localSections, setLocalSections] = useState([]);

  useEffect(() => {
    if (!financialSections) return;

    const sectionTypes = [
      { id: 'hours', label: 'Hours' },
      { id: 'cabinets', label: 'Cabinets' },
      { id: 'doors', label: 'Doors' },
      { id: 'drawers', label: 'Drawers' },
      { id: 'other', label: 'Other' },
    ];

    const initialSections = sectionTypes.map(({ id, label }) => ({
      id,
      sectionName: label,
      estimate: financialSections[id]?.estimate ?? 0,
      actual_cost: financialSections[id]?.actual_cost ?? 0,
      inputRows: [...(financialSections[id]?.data ?? [])].map(row => ({...row})),
    }));

    setLocalSections(initialSections);
  }, [financialSections]);

  const handleSectionUpdate = (sectionId, updates) => {
    setLocalSections(prevSections => 
      prevSections.map(section => 
        section.id === sectionId 
          ? { ...section, ...updates }
          : section
      )
    );
  };

  const totals = useMemo(() => {
    return localSections.reduce((acc, section) => {
      acc.estimate += section.estimate;
      // Calculate actual from input rows for each section
      const sectionActual = section.inputRows.reduce((sum, row) => {
        return sum + (section.id === 'hours' ? (row.hours || 0) : (row.cost || 0));
      }, 0);
      acc.actual += sectionActual;
      return acc;
    }, { estimate: 0, actual: 0 });
  }, [localSections]);

  const handleOnFileLoad = () => {};

  const handleSave = () => {};

  if (!isOpen) return null;

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalContainerClass} flex flex-col`}>
        {isSaving && (
          <div className="loading-overlay absolute inset-0 bg-gray-200 bg-opacity-80 flex flex-col justify-center items-center z-[120]">
            <GridLoader color="maroon" size={15} />
            <p>Saving Data...</p>
          </div>
        )}
        <div className="flex justify-between items-center mb-4 relative">
          <div className="absolute left-5">
            <CSVReader onUploadAccepted={handleOnFileLoad}>
              {({ getRootProps, acceptedFile }) => (
                <div className="csv-import-container">
                  <button
                    type="button"
                    {...getRootProps()}
                    className={`${buttonClass} bg-blue-500`}
                  >
                    Import CSV
                  </button>
                </div>
              )}
            </CSVReader>
          </div>
          <h2 className="text-lg font-bold w-full text-center">{selectedTask}</h2>
        </div>

        <div className="flex justify-end items-center mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">Estimate:</span>
              <span className="font-bold">${totals.estimate.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">Actual:</span>
              <span className="font-bold">${totals.actual.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">Profit:</span>
              <span className={`font-bold ${totals.estimate - totals.actual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

        <div className="modal-actions flex-shrink-0 flex justify-between mt-2">
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
  );
};

export default FinancialsInputModal;
