import { roundToHundredth } from "./estimateHelpers.js";

/**
 * Calculate estimated price for multiple drawer boxes
 * @param {object[]} boxes - Array of drawer boxes
 * @param {number} boxes[].width - Width of the box (in inches)
 * @param {number} boxes[].height - Height of the box (in inches)
 * @param {number} boxes[].depth - Depth of the box (in inches)
 * @param {number} boxes[].quantity - Number of boxes
 * @param {boolean} boxes[].rollOut - Whether box is a roll-out (adds scoop cost)
 * @param {boolean} boxes[].isFaceFrame - Whether box is for face frame cabinet (higher clip cost)
 * @param {number} sheetPrice - Price per sheet of material (default 75)
 * @param {object} sheetSize - { width: number, height: number } in inches (default 60x60)
 * @param {number} baseLaborRate - Flat labor cost per box (default 16.75)
 * @param {number} wasteFactor - Material waste factor (default 0.05 = 5%)
 * @param {number} roundingIncrement - Round sheets to nearest increment (default 0.25 = 1/4 sheet)
 * @param {number} taxRate - Tax rate to apply (default 0.0 = no tax)
 * @returns {object} { totalCost, boxCosts, totalSheetsUsed }
 */
export const calculateDrawerBoxesPrice = ({
  boxes,
  sheetPrice = 75,
  sheetSize = { width: 60, height: 60 },
  baseLaborRate = 16.75,
  wasteFactor = 0.05,
  roundingIncrement = 0.25,
  taxRate = 0.1,
}) => {
  const sheetArea = sheetSize.width * sheetSize.height;

  // Fixed costs
  const notchCost = 3.5;

  // Single loop: calculate area and labor/hardware costs
  let totalRawSheets = 0;
  let totalLaborAndHardware = 0;

  boxes.forEach(({ width, height, depth, quantity, rollOut, isFaceFrame }) => {
    // Calculate area for this box
    const boxArea = width * depth + 2 * (height * depth) + 2 * (width * height);
    const adjustedBoxArea = boxArea * (1 + wasteFactor);
    totalRawSheets += (adjustedBoxArea / sheetArea) * quantity;

    // Calculate labor and hardware for this box
    let laborCostPerBox = baseLaborRate;
    if (width > 36 || height > 8) laborCostPerBox *= 1.05;

    const clipCost = isFaceFrame ? 8 : 3.5;
    const scoopCost = rollOut ? 5 : 0;
    const costPerBox = laborCostPerBox + notchCost + clipCost + scoopCost;
    
    totalLaborAndHardware += costPerBox * quantity;
  });

  // Round total sheets up to nearest increment
  const totalRoundedSheets =
    Math.ceil(totalRawSheets / roundingIncrement) * roundingIncrement;
  const totalMaterialCost = totalRoundedSheets * sheetPrice;

  // Total cost = material + labor/hardware, then apply tax
  const subtotal = totalMaterialCost + totalLaborAndHardware;
  const totalCost = roundToHundredth(subtotal * (1 + taxRate));

  return {
    totalCost,
    totalSheetsUsed: roundToHundredth(totalRoundedSheets),
    materialCost: roundToHundredth(totalMaterialCost),
    laborAndHardwareCost: roundToHundredth(totalLaborAndHardware),
  };
};

// const masterBathDrawers = [
//   {
//     quantity: 4,
//     height: 4.25,
//     width: 14,
//     depth: 18,
//   },
//   {
//     quantity: 8,
//     height: 10.25,
//     width: 14,
//     depth: 18,
//   },
// ];

// // const masterBathExpectation = 768;

// const kitchenIslandDrawers = [
//   {
//     quantity: 1,
//     height: 4.25,
//     width: 17,
//     depth: 21,
//   },
//   {
//     quantity: 1,
//     height: 4.25,
//     width: 26,
//     depth: 21,
//   },
//   {
//     quantity: 2,
//     height: 10.25,
//     width: 17,
//     depth: 21,
//   },
//   {
//     quantity: 2,
//     height: 10.25,
//     width: 26,
//     depth: 21,
//   },
//   {
//     quantity: 1,
//     height: 15.125,
//     width: 16,
//     depth: 22,
//   },
// ];

// // const kitchenIslandExpectation = 585;

// const laundryDrawers = [
//   {
//     quantity: 1,
//     height: 4.25,
//     width: 16,
//     depth: 21,
//   },
//   {
//     quantity: 2,
//     height: 10.25,
//     width: 16,
//     depth: 21,
//   },
//   {
//     quantity: 1,
//     height: 15.125,
//     width: 16,
//     depth: 22,
//   },
// ];

// const kitchenPermDrawers = [
//   {
//     quantity: 2,
//     height: 4.25,
//     width: 25,
//     depth: 21,
//   },
//   {
//     quantity: 1,
//     height: 9.25,
//     width: 28,
//     depth: 21,
//   },
//   {
//     quantity: 4,
//     height: 10.25,
//     width: 25,
//     depth: 21,
//   },
//   {
//     quantity: 2,
//     height: 10.25,
//     width: 38,
//     depth: 18,
//   },
//   {
//     quantity: 5,
//     height: 4.25,
//     width: 25.5,
//     depth: 21,
//     rollOut: true,
//   },
//   {
//     quantity: 8,
//     height: 4.25,
//     width: 30,
//     depth: 21,
//     rollOut: true,
//   },
// ];

// const westMudRoomDrawers = [
//   {
//     quantity: 2,
//     height: 8.25,
//     width: 14.875,
//     depth: 15,
//   },
//   {
//     quantity: 4,
//     height: 8.25,
//     width: 16,
//     depth: 18,
//   },
//   {
//     quantity: 6,
//     height: 4.25,
//     width: 14.5,
//     depth: 15,
//     rollOut: true,
//   },
//   {
//     quantity: 6,
//     height: 4.25,
//     width: 31,
//     depth: 15,
//     rollOut: true,
//   },
// ];

// const westPowderDrawers = [
//   {
//     quantity: 1,
//     height: 3.25,
//     width: 11.5,
//     depth: 15,
//   },
//   {
//     quantity: 1,
//     height: 6.25,
//     width: 11.5,
//     depth: 15,
//   },
//   {
//     quantity: 1,
//     height: 8.25,
//     width: 11.5,
//     depth: 15,
//   },
// ];

// const sheetPrice = 150;
// const sheetSize = { width: 60, height: 60 };
// const baseLaborRate = 16.75;
// const wasteFactor = 0.15;
// const roundingIncrement = 0.334;
// const taxRate = 0.1;

// console.log("sheetPrice", sheetPrice);
// console.log("sheetSize", sheetSize);
// console.log("wasteFactor", wasteFactor);
// console.log("roundingIncrement", roundingIncrement);

// const masterBath = calculateDrawerBoxesPrice({
//   boxes: masterBathDrawers,
//   sheetPrice,
//   sheetSize,
//   baseLaborRate,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
// });

// console.log("masterBath (768)", masterBath);

// const kitchenIsland = calculateDrawerBoxesPrice({
//   boxes: kitchenIslandDrawers,
//   sheetPrice,
//   sheetSize,
//   baseLaborRate,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
// });

// console.log("kitchenIsland (585)", kitchenIsland);

// const laundry = calculateDrawerBoxesPrice({
//   boxes: laundryDrawers,
//   sheetPrice,
//   sheetSize,
//   baseLaborRate,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
// });

// console.log("laundry (375)", laundry);

// const kitchenPerm = calculateDrawerBoxesPrice({
//   boxes: kitchenPermDrawers,
//   sheetPrice,
//   sheetSize,
//   baseLaborRate,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
// });

// console.log("kitchenPerm (1743)", kitchenPerm);

// const westMudRoom = calculateDrawerBoxesPrice({
//   boxes: westMudRoomDrawers,
//   sheetPrice,
//   sheetSize,
//   baseLaborRate,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
// });

// console.log("westMudRoom (1116)", westMudRoom);

// const westPowder = calculateDrawerBoxesPrice({
//   boxes: westPowderDrawers,
//   sheetPrice,
//   sheetSize,
//     wasteFactor,
//   roundingIncrement,
//   taxRate,
// });

// console.log("westPowder (174.50)", westPowder);
