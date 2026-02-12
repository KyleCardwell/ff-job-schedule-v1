import { useState, useCallback } from "react";

import {
  safeEvaluate,
  formatNumberValue,
  decimalToFraction,
  fractionToDecimal,
} from "../utils/mathUtils";

/**
 * Custom hook that enables math expression evaluation in number inputs.
 * Users can type expressions like "2+3", "10*5", "24/2" and they will be
 * evaluated to their numeric result on blur.
 *
 * @param {Object} initialValues - Object with field names as keys and initial values
 * @param {Function} onCommit - Callback called with (fieldName, numericValue) when a value is committed
 * @param {Object} options - Optional config
 * @param {string[]} options.fractionalFields - Field names that should display as fractions (nearest 1/16")
 * @returns {Object} { inputValues, handleChange, handleBlur, setInputValue, resetInputValues }
 */
const useMathInput = (initialValues = {}, onCommit, options = {}) => {
  const { fractionalFields = [] } = options;

  const [inputValues, setInputValues] = useState(() => {
    const values = {};
    for (const [key, val] of Object.entries(initialValues)) {
      if (val !== null && val !== undefined && val !== "") {
        values[key] = fractionalFields.includes(key)
          ? decimalToFraction(val)
          : String(val);
      } else {
        values[key] = "";
      }
    }
    return values;
  });

  // Handle input change - store raw string to allow math expressions and fractions
  const handleChange = useCallback((fieldName, value) => {
    setInputValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  // Resolve a string input to a numeric value, supporting fractions, math, and plain numbers
  const resolveValue = useCallback((strValue) => {
    // First try safeEvaluate which handles math expressions AND mixed fractions
    // via preprocessFractions (e.g., "26 3/8 + .5" → "26.375 + .5" → 26.875)
    const evaluatedValue = safeEvaluate(strValue);
    if (evaluatedValue !== null) {
      return formatNumberValue(evaluatedValue);
    }

    // Then try pure fractional input like "30 3/8" or "3/8"
    const fractionResult = fractionToDecimal(strValue);
    if (fractionResult !== null) {
      return formatNumberValue(fractionResult);
    }

    // Fall back to regular parsing
    const parsed = parseFloat(strValue);
    return !isNaN(parsed) ? formatNumberValue(parsed) : null;
  }, []);

  // Handle blur - evaluate input and commit numeric value
  const handleBlur = useCallback(
    (fieldName) => {
      const value = inputValues[fieldName];
      const isFractional = fractionalFields.includes(fieldName);

      let numValue = null;
      if (value !== "" && value !== undefined && value !== null) {
        numValue = resolveValue(String(value));
      }

      // Update the display value
      setInputValues((prev) => ({
        ...prev,
        [fieldName]:
          numValue !== null
            ? isFractional
              ? decimalToFraction(numValue)
              : String(numValue)
            : "",
      }));

      // Commit the numeric value
      if (onCommit) {
        onCommit(fieldName, numValue);
      }
    },
    [inputValues, onCommit, fractionalFields, resolveValue]
  );

  // Set a single input value programmatically
  const setInputValue = useCallback(
    (fieldName, value) => {
      const isFractional = fractionalFields.includes(fieldName);
      setInputValues((prev) => ({
        ...prev,
        [fieldName]:
          value !== null && value !== undefined && value !== ""
            ? isFractional
              ? decimalToFraction(value)
              : String(value)
            : "",
      }));
    },
    [fractionalFields]
  );

  // Reset all input values
  const resetInputValues = useCallback(
    (newValues) => {
      const values = {};
      for (const [key, val] of Object.entries(newValues)) {
        if (val !== null && val !== undefined && val !== "") {
          values[key] = fractionalFields.includes(key)
            ? decimalToFraction(val)
            : String(val);
        } else {
          values[key] = "";
        }
      }
      setInputValues(values);
    },
    [fractionalFields]
  );

  return {
    inputValues,
    handleChange,
    handleBlur,
    setInputValue,
    resetInputValues,
  };
};

export default useMathInput;
