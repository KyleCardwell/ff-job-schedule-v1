import { create, all } from "mathjs";

// Create a limited math.js instance with only the functions we need
const math = create(all);
const limitedEvaluate = math.evaluate;

// Restrict the scope to basic arithmetic
math.import(
  {
    import: function () {
      throw new Error("Function import is disabled");
    },
    createUnit: function () {
      throw new Error("Function createUnit is disabled");
    },
    evaluate: function () {
      throw new Error("Function evaluate is disabled");
    },
    parse: function () {
      throw new Error("Function parse is disabled");
    },
    simplify: function () {
      throw new Error("Function simplify is disabled");
    },
    derivative: function () {
      throw new Error("Function derivative is disabled");
    },
  },
  { override: true }
);

/**
 * Safely evaluates a mathematical expression
 * @param {string} expression - The expression to evaluate
 * @returns {number|null} - The result of the evaluation, or null if invalid
 */
export const safeEvaluate = (expression) => {
  try {
    // Only allow basic math operations and numbers
    if (!/^[0-9+\-*/().\s]*$/.test(expression)) {
      return null;
    }

    const result = limitedEvaluate(expression);
    return !isNaN(result) && isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

/**
 * Formats a number value to handle decimals appropriately
 * - Rounds to 2 decimal places if the number has a decimal part
 * - Returns whole numbers without decimal places
 * @param {number} value - The number to format
 * @returns {number} - The formatted number
 */
export const formatNumberValue = (value) => {
  if (value === null || value === undefined) return null;
  
  // Check if the number has a decimal part
  if (value % 1 !== 0) {
    // Round to 2 decimal places
    return Math.round(value * 100) / 100;
  }
  
  // Return whole numbers as is
  return value;
};
