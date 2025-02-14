import React, { useState, useEffect, useMemo, useRef } from "react";
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
import FinancialsInputSection from "./FinancialsInputSection";
import FinancialsAccordion from "./FinancialsAccordion";

const FinancialsInputModal = ({ isOpen, onClose, onSave, setIsLoading }) => {
  const dispatch = useDispatch();

  const { CSVReader } = useCSVReader();

  const { employees } = useSelector((state) => state.builders);

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const sections = [
    {
      id: "cabinets",
      sectionName: "Cabinets",
      estimate: 0,
      actual_cost: 0,
      inputRows: [],
    },
    {
      id: "hours",
      sectionName: "Hours",
      estimate: 0,
      actual_cost: 0,
      inputRows: [],
    },
    // Add more sections as needed
  ];

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
        <div className="flex justify-center mb-4">
          <CSVReader onUploadAccepted={handleOnFileLoad}>
            {({ getRootProps, acceptedFile }) => (
              <div className="csv-import-container absolute left-5">
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
          <h2 className="text-lg font-bold">Job Costing</h2>
        </div>
        <div className="flex gap-8 items-center mb-5">Title</div>

        {/* <div className="flex column">
        <FinancialsInputSection 
        sectionName="Cabinets"
        inputRows={[]}
        /> */}

        <FinancialsAccordion sections={sections} />

        {errors.rooms && <div className="error">{errors.rooms}</div>}

        <div className="modal-actions flex-shrink-0 flex justify-between">
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
