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
 * Preprocesses an expression string by replacing mixed number patterns
 * (e.g., "26 3/8") with their decimal equivalents so they can be evaluated
 * as math. "26 3/8 + .5" → "26.375 + .5"
 * @param {string} expression - The raw input string
 * @returns {string} - Expression with mixed numbers replaced by decimals
 */
export const preprocessFractions = (expression) => {
  if (!expression) return expression;

  // Replace mixed numbers: "26 3/8" → "26.375"
  // Pattern: whole number + space(s) + numerator/denominator
  let result = expression.replace(
    /(\d+)\s+(\d+)\/(\d+)/g,
    (_, whole, num, den) => {
      const d = parseInt(den, 10);
      if (d === 0) return _;
      return String(parseInt(whole, 10) + parseInt(num, 10) / d);
    }
  );

  return result;
};

export const safeEvaluate = (expression) => {
  try {
    // Preprocess fractions in the expression first
    const preprocessed = preprocessFractions(expression);

    // Only allow basic math operations and numbers
    if (!/^[0-9+\-*/().\s]*$/.test(preprocessed)) {
      return null;
    }

    const result = limitedEvaluate(preprocessed);
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

/**
 * Converts a decimal number to a fractional inches display string (nearest 1/16").
 * Examples:
 *   30.375  → "30 3/8"
 *   0.5     → "1/2"
 *   24      → "24"
 *   12.0625 → "12 1/16"
 * @param {number} value - The decimal value to convert
 * @returns {string} - The fractional display string
 */
export const decimalToFraction = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const num = Number(value);
  if (isNaN(num)) return String(value);

  const negative = num < 0;
  const absVal = Math.abs(num);
  const wholeNumber = Math.floor(absVal);
  const decimal = absVal - wholeNumber;

  // If no fractional part, return whole number
  if (decimal < 1 / 32) {
    return `${negative ? "-" : ""}${wholeNumber}`;
  }

  // Round to nearest 1/16
  const sixteenths = Math.round(decimal * 16);

  // Handle rounding up to next whole number
  if (sixteenths === 16) {
    return `${negative ? "-" : ""}${wholeNumber + 1}`;
  }

  // Find GCD to reduce the fraction
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(sixteenths, 16);
  const numerator = sixteenths / divisor;
  const denominator = 16 / divisor;

  const fraction = `${numerator}/${denominator}`;

  if (wholeNumber === 0) {
    return `${negative ? "-" : ""}${fraction}`;
  }

  return `${negative ? "-" : ""}${wholeNumber} ${fraction}`;
};

/**
 * Parses a fractional inches string back to a decimal number.
 * Handles formats like: "30 3/8", "3/8", "30", "30.375", "12 1/16"
 * @param {string} str - The fractional string to parse
 * @returns {number|null} - The decimal value, or null if unparseable
 */
export const fractionToDecimal = (str) => {
  if (str === null || str === undefined || str === "") return null;

  const trimmed = String(str).trim();
  if (trimmed === "") return null;

  // Check for negative
  const negative = trimmed.startsWith("-");
  const abs = negative ? trimmed.slice(1).trim() : trimmed;

  // Try "whole fraction" format: "30 3/8"
  const mixedMatch = abs.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den === 0) return null;
    const result = whole + num / den;
    return negative ? -result : result;
  }

  // Try plain fraction: "3/8"
  const fractionMatch = abs.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const den = parseInt(fractionMatch[2], 10);
    if (den === 0) return null;
    const result = num / den;
    return negative ? -result : result;
  }

  // Fall back to regular number parsing
  const parsed = parseFloat(abs);
  if (!isNaN(parsed)) {
    return negative ? -parsed : parsed;
  }

  return null;
};
