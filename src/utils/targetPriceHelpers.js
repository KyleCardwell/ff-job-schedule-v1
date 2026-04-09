/**
 * Target Price helpers
 *
 * The unit-price formula used by getSectionCalculations is:
 *   raw = subTotal * (1 + profit/100 + commission/100 - discount/100)
 *   unitPrice = ceil(raw / 5) * 5          (round-up-to-nearest-$5)
 *
 * The "suggested" values reverse-solve for the rate that makes raw === target,
 * ignoring the $5 rounding so the user sees a clean percentage.
 */

/**
 * Compute the unit price from a subTotal and the three rate percentages.
 * Mirrors the rounding in getSectionCalculations.
 */
export const computeUnitPrice = (subTotal, profitRate, commissionRate, discountRate) => {
  const raw =
    subTotal *
    (1 + profitRate / 100 + commissionRate / 100 - discountRate / 100);
  return Math.ceil(raw / 5) * 5;
};

/**
 * For a given targetPrice and subTotal, compute the three independent
 * suggested rates (each assuming the other two stay at their current values).
 *
 * Returns { suggestedProfit, suggestedCommission, suggestedDiscount }.
 * Any value that would be negative is returned as null (impossible).
 */
export const computeSuggestedRates = (
  targetPrice,
  subTotal,
  currentProfit,
  currentCommission,
  currentDiscount,
) => {
  if (!subTotal || !targetPrice) {
    return {
      suggestedProfit: null,
      suggestedCommission: null,
      suggestedDiscount: null,
    };
  }

  const ratio = targetPrice / subTotal;

  // Solve for profit:  target = subTotal * (1 + P/100 + C/100 - D/100)
  const suggestedProfitRaw =
    (ratio - 1 - currentCommission / 100 + currentDiscount / 100) * 100;

  // Solve for commission:  target = subTotal * (1 + P/100 + C/100 - D/100)
  const suggestedCommissionRaw =
    (ratio - 1 - currentProfit / 100 + currentDiscount / 100) * 100;

  // Solve for discount:  target = subTotal * (1 + P/100 + C/100 - D/100)
  const suggestedDiscountRaw =
    (1 + currentProfit / 100 + currentCommission / 100 - ratio) * 100;

  const round2 = (v) => Math.round(v * 100) / 100;

  return {
    suggestedProfit: round2(suggestedProfitRaw),
    suggestedCommission: round2(suggestedCommissionRaw),
    suggestedDiscount: round2(suggestedDiscountRaw),
  };
};
