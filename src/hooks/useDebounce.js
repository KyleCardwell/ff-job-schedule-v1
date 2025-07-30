import { useEffect, useRef, useState } from "react";

/**
 * A hook for debouncing a value with a specified delay.
 * This is useful for reducing API calls when a value changes frequently.
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear the previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup on unmount or when value/delay changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A hook for debouncing a callback function with a specified delay.
 * This is useful for reducing API calls when a function is called frequently.
 *
 * @param {Function} callback - The callback function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} The debounced callback function
 */
export function useDebouncedCallback(callback, delay = 500) {
  const timeoutRef = useRef(null);

  return (...args) => {
    // Clear the previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
