/**
 * Calculate estimated price for multiple drawer boxes
 * @param {object[]} boxes - Array of drawer boxes
 * @param {number} boxes[].width - Width of the box (in inches)
 * @param {number} boxes[].height - Height of the box (in inches)
 * @param {number} boxes[].depth - Depth of the box (in inches)
 * @param {number} boxes[].quantity - Number of boxes
 * @param {number} sheetPrice - Price of one sheet of material
 * @param {object} sheetSize - { width: number, height: number } in inches
 * @param {number} baseLaborRate - Base labor cost for a standard box
 * @param {number} standardBoxArea - Surface area of a standard box (for scaling labor)
 * @param {number} wasteFactor - Fractional waste factor (e.g., 0.1 for 10%)
 * @returns {number} total estimated cost
 */
export const calculateDrawerBoxesPrice = ({
  boxes,
  sheetPrice,
  sheetSize,
  baseLaborRate = 0,
  standardBoxArea = 900,
  wasteFactor = 0.1,
  roundingIncrement = 0.2, // Round total sheets to nearest increment
  taxRate = 0.1,
}) => {
  let boxesCost = 0;
  //   const boxCosts = [];

  const notchCost = 3.5;
  const heightThreshold = 6; // Height threshold for extra charge
  const heightSurchargePerInch = 1.35; // Extra charge per inch above threshold

  const sheetArea = sheetSize.width * sheetSize.height;

  // First pass: calculate total sheets needed for entire order
  let totalRawSheets = 0;
  let totalBoxArea = 0;

  boxes.forEach(({ width, height, depth, quantity }) => {
    const boxArea = width * depth + 2 * (height * depth) + 2 * (width * height);
    const adjustedBoxArea = boxArea * (1 + wasteFactor);
    const sheetsForThisBox = (adjustedBoxArea / sheetArea) * quantity;
    totalRawSheets += sheetsForThisBox;
    totalBoxArea += boxArea * quantity;
  });

  // Round total sheets to nearest increment
  const totalRoundedSheets =
    Math.ceil(totalRawSheets / roundingIncrement) * roundingIncrement;
  const totalMaterialCost = totalRoundedSheets * sheetPrice;

  // Second pass: distribute material cost proportionally by box area
  boxes.forEach(({ width, height, depth, quantity, rollOut, isFaceFrame }) => {
    const boxArea = width * depth + 2 * (height * depth) + 2 * (width * height);

    const clipCost = rollOut ? 3.5 : isFaceFrame ? 8 : 3.5;
    const scoopCost = rollOut ? 5 : 0;
    // Proportional share of material cost based on area
    const boxAreaTotal = boxArea * quantity;
    const materialShare = totalBoxArea > 0 ? boxAreaTotal / totalBoxArea : 0;
    const materialCostPerBox = (totalMaterialCost * materialShare) / quantity;

    // Labor cost scaled by box size
    const laborCostPerBox = Math.max(
      baseLaborRate * (boxArea / standardBoxArea),
      baseLaborRate
    );

    // Height surcharge proportional to extra height above threshold
    const extraHeight = Math.max(0, height - heightThreshold);
    const heightCharge = extraHeight * heightSurchargePerInch;

    // Total cost per box includes fixed costs
    const totalCostPerBox =
      materialCostPerBox +
      laborCostPerBox +
      notchCost +
      clipCost +
      scoopCost +
      heightCharge;

    // Add to total cost
    boxesCost += quantity * totalCostPerBox;

    // Store individual box cost details
    // boxCosts.push({
    //   width,
    //   height,
    //   depth,
    //   quantity,
    //   boxArea,
    //   materialCost: materialCostPerBox,
    //   laborCost: laborCostPerBox,
    //   notchCost,
    //   clipCost,
    //   scoopCost,
    //   heightCharge: heightCharge,
    //   costPerBox: totalCostPerBox,
    //   totalCost: quantity * totalCostPerBox,
    // });
  });

  const totalCost = boxesCost * (1 + taxRate);

  return {
    totalCost,
    // boxCosts,
  };
};

// const masterBathDrawers = [
//     {
//       quantity: 4,
//       height: 4.25,
//       width: 14,
//       depth: 18,
//     },
//     {
//       quantity: 8,
//       height: 10.25,
//       width: 14,
//       depth: 18,
//     },
//   ];

//   // const masterBathExpectation = 768;

//   const kitchenIslandDrawers = [
//     {
//       quantity: 1,
//       height: 4.25,
//       width: 17,
//       depth: 21,
//     },
//     {
//       quantity: 1,
//       height: 4.25,
//       width: 26,
//       depth: 21,
//     },
//     {
//       quantity: 2,
//       height: 10.25,
//       width: 17,
//       depth: 21,
//     },
//     {
//       quantity: 2,
//       height: 10.25,
//       width: 26,
//       depth: 21,
//     },
//     {
//       quantity: 1,
//       height: 15.125,
//       width: 16,
//       depth: 22,
//     },
//   ];

//   // const kitchenIslandExpectation = 585;

//   const laundryDrawers = [
//     {
//       quantity: 1,
//       height: 4.25,
//       width: 16,
//       depth: 21,
//     },
//     {
//       quantity: 2,
//       height: 10.25,
//       width: 16,
//       depth: 21,
//     },
//     {
//       quantity: 1,
//       height: 15.125,
//       width: 16,
//       depth: 22,
//     },
//   ];

//   const kitchenPermDrawers = [
//     {
//       quantity: 2,
//       height: 4.25,
//       width: 25,
//       depth: 21,
//     },
//     {
//       quantity: 1,
//       height: 9.25,
//       width: 28,
//       depth: 21,
//     },
//     {
//       quantity: 4,
//       height: 10.25,
//       width: 25,
//       depth: 21,
//     },
//     {
//       quantity: 2,
//       height: 10.25,
//       width: 38,
//       depth: 18,
//     },
//     {
//       quantity: 5,
//       height: 4.25,
//       width: 25.5,
//       depth: 21,
//       rollOut: true,
//     },
//     {
//       quantity: 8,
//       height: 4.25,
//       width: 30,
//       depth: 21,
//       rollOut: true,
//     },
//   ];

//   const westMudRoomDrawers = [
//     {
//       quantity: 2,
//       height: 8.25,
//       width: 14.875,
//       depth: 15,
//     },
//     {
//       quantity: 4,
//       height: 8.25,
//       width: 16,
//       depth: 18,
//     },
//     {
//       quantity: 6,
//       height: 4.25,
//       width: 14.5,
//       depth: 15,
//       rollOut: true,
//     },
//     {
//       quantity: 6,
//       height: 4.25,
//       width: 31,
//       depth: 15,
//       rollOut: true,
//     },
//   ];

//   const westPowderDrawers = [
//     {
//       quantity: 1,
//       height: 3.25,
//       width: 11.5,
//       depth: 15,
//     },
//     {
//       quantity: 1,
//       height: 6.25,
//       width: 11.5,
//       depth: 15,
//     },
//     {
//       quantity: 1,
//       height: 8.25,
//       width: 11.5,
//       depth: 15,
//     },
//   ];

// const sheetPrice = 150;
// const sheetSize = { width: 60, height: 60 };
// const baseLaborRate = 21;
// const standardBoxArea = 1000;
// const wasteFactor = 0.12;
// const roundingIncrement = .85;

// console.log('sheetPrice', sheetPrice)
// console.log('sheetSize', sheetSize)
// console.log('baseLaborRate', baseLaborRate)
// console.log('standardBoxArea', standardBoxArea)
// console.log('wasteFactor', wasteFactor)
// console.log('roundingIncrement', roundingIncrement)

// console.log(
//   "master bath (768)",
//   calculateDrawerBoxesPrice({
//     boxes: masterBathDrawers,
//     sheetPrice,
//     sheetSize,
//     baseLaborRate,
//     standardBoxArea,
//     wasteFactor,
//     roundingIncrement,
//   }).totalCost.toFixed(2)
// );

// console.log(
//   "kitchen island (585)",
//   calculateDrawerBoxesPrice({
//     boxes: kitchenIslandDrawers,
//     sheetPrice,
//     sheetSize,
//     baseLaborRate,
//     standardBoxArea,
//     wasteFactor,
//     roundingIncrement,
//   }).totalCost.toFixed(2)
// );

// console.log(
//   "laundry (375)",
//   calculateDrawerBoxesPrice({
//     boxes: laundryDrawers,
//     sheetPrice,
//     sheetSize,
//     baseLaborRate,
//     standardBoxArea,
//     wasteFactor,
//     roundingIncrement,
//   }).totalCost.toFixed(2)
// );

// console.log(
//   "kitchen perm (1743)",
//   calculateDrawerBoxesPrice({
//     boxes: kitchenPermDrawers,
//     sheetPrice,
//     sheetSize,
//     baseLaborRate,
//     standardBoxArea,
//     wasteFactor,
//     roundingIncrement,
//   }).totalCost.toFixed(2)
// );

// console.log(
//   "west mud room (1116)",
//   calculateDrawerBoxesPrice({
//     boxes: westMudRoomDrawers,
//     sheetPrice,
//     sheetSize,
//     baseLaborRate,
//     standardBoxArea,
//     wasteFactor,
//     roundingIncrement,
//     isFaceFrame: true,
//   }).totalCost.toFixed(2)
// );

// console.log(
//   "west powder (174.50)",
//   calculateDrawerBoxesPrice({
//     boxes: westPowderDrawers,
//     sheetPrice,
//     sheetSize,
//     baseLaborRate,
//     standardBoxArea,
//     wasteFactor,
//     roundingIncrement,
//     isFaceFrame: true,
//   }).totalCost.toFixed(2)
// );
