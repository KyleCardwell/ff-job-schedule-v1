// import { roundToHundredth } from "./estimateHelpers.js";

// /**
//  * Calculate base price for a single drawer box based on vendor pricing formula
//  * Derived from vendor pricing tables through regression analysis:
//  * - Base price: ~$8 (setup, minimal materials, labor)
// {{ ... }}
//  * - Width: ~$0.55 per inch
//  * - Height: ~$2.50 per inch (height has biggest impact on price)
//  * - Depth: ~$0.40 per inch
//  * - Complexity factor: accounts for non-linear scaling with size
//  * Formula is calibrated to be at or slightly above vendor pricing for safety margin
//  */
// const calculateDrawerBoxBasePrice = (width, height, depth) => {
//   // Base cost (labor, setup, materials for minimal box)
//   const basePrice = 8;

//   // Linear component: cost per inch for each dimension
//   const widthCost = width * 0.55;
//   const heightCost = height * 2.5;
//   const depthCost = depth * 0.4;

//   // Non-linear component: accounts for increased complexity with larger boxes
//   // Uses square root of surface area to create diminishing returns
//   const surfaceArea = 2 * (width * height + width * depth + height * depth);
//   const complexityFactor = Math.sqrt(surfaceArea) * 0.15;

//   return basePrice + widthCost + heightCost + depthCost + complexityFactor;
// };

// /**
//  * Calculate estimated price for multiple drawer boxes
//  * @param {object[]} boxes - Array of drawer boxes
//  * @param {number} boxes[].width - Width of the box (in inches)
//  * @param {number} boxes[].height - Height of the box (in inches)
//  * @param {number} boxes[].depth - Depth of the box (in inches)
//  * @param {number} boxes[].quantity - Number of boxes
//  * @param {number} boxes[].rollOut - Whether box is a roll-out (affects clip/scoop costs)
//  * @param {number} boxes[].isFaceFrame - Whether box is for face frame cabinet (affects clip cost)
//  * @param {number} sheetPrice - Price per sheet of material
//  * @param {object} sheetSize - { width: number, height: number } in inches (default 60x60)
//  * @param {number} wasteFactor - Material waste factor (default 0.15 = 15%)
//  * @param {number} roundingIncrement - Round sheets to nearest increment (default 0.33 = 1/3 sheet minimum)
//  * @param {number} taxRate - Tax rate to apply (default 0.1 = 10%)
//  * @returns {object} { totalCost, boxCosts, totalSheets, materialCost }
//  */
// export const calculateDrawerBoxesPrice = ({
//   boxes,
//   sheetPrice,
//   sheetSize = { width: 60, height: 60 },
//   wasteFactor = 0.15,
//   roundingIncrement = 0.334,
//   taxRate = 0.1,
// }) => {
//   // Calculate total material needed across all boxes
//   const sheetArea = sheetSize.width * sheetSize.height;
//   let totalBoxArea = 0;

//   // First pass: calculate total surface area needed
//   boxes.forEach(({ width, height, depth, quantity }) => {
//     // Surface area of a box (all 6 sides, but typically no top)
//     const boxArea = width * depth + 2 * (height * depth) + 2 * (width * height);
//     totalBoxArea += boxArea * quantity;
//   });

//   // Calculate sheets needed with waste factor
//   const rawSheets = (totalBoxArea * (1 + wasteFactor)) / sheetArea;

//   // Round up to nearest increment (e.g., 0.33 = 1/3 sheet minimum)
//   const totalSheets = roundToHundredth(
//     Math.ceil(rawSheets / roundingIncrement) * roundingIncrement
//   );
//   const totalMaterialCost = totalSheets * sheetPrice;

//   // Second pass: calculate cost per box
//   let boxesCost = 0;
//   // const boxCosts = [];

//   boxes.forEach(({ width, height, depth, quantity, rollOut, isFaceFrame }) => {
//     // Get base labor/fabrication price from formula (excludes material)
//     const baseLaborPrice = calculateDrawerBoxBasePrice(width, height, depth);

//     // Calculate this box's proportional share of material cost
//     const boxArea = width * depth + 2 * (height * depth) + 2 * (width * height);
//     const boxAreaTotal = boxArea * quantity;
//     const materialShare = totalBoxArea > 0 ? boxAreaTotal / totalBoxArea : 0;
//     const materialCostPerBox = (totalMaterialCost * materialShare) / quantity;

//     // Additional costs based on box type
//     const clipCost = rollOut ? 3.5 : isFaceFrame ? 8 : 3.5;
//     const scoopCost = rollOut ? 5 : 0;

//     // Total cost per box = labor + material + extras
//     const totalCostPerBox =
//       baseLaborPrice + materialCostPerBox + clipCost + scoopCost;

//     // Add to total cost
//     boxesCost += quantity * totalCostPerBox;

//     // // Store individual box cost details
//     // boxCosts.push({
//     //   width,
//     //   height,
//     //   depth,
//     //   quantity,
//     //   baseLaborPrice,
//     //   materialCost: materialCostPerBox,
//     //   clipCost,
//     //   scoopCost,
//     //   costPerBox: totalCostPerBox,
//     //   totalCost: quantity * totalCostPerBox,
//     // });
//   });

//   const totalCost = roundToHundredth(boxesCost * (1 + taxRate));

//   return {
//     totalCost,
//     totalSheets,
//     materialCost: roundToHundredth(totalMaterialCost),
//     // boxCosts,
//   };
// };

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
// const foggLaundryDrawers = [
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

// const sheetPrice = 75;
// const sheetSize = { width: 60, height: 60 };
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
//   wasteFactor,
//   taxRate,
// });

// console.log("masterBath (768)", masterBath);

// const kitchenIsland = calculateDrawerBoxesPrice({
//   boxes: kitchenIslandDrawers,
//   sheetPrice,
//   sheetSize,
//   wasteFactor,
//   taxRate,
// });

// console.log("kitchenIsland (585)", kitchenIsland);

// const laundry = calculateDrawerBoxesPrice({
//   boxes: laundryDrawers,
//   sheetPrice,
//   sheetSize,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
// });

// console.log("laundry (375)", laundry);

// const kitchenPerm = calculateDrawerBoxesPrice({
//   boxes: kitchenPermDrawers,
//   sheetPrice,
//   sheetSize,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
// });

// console.log("kitchenPerm (1743)", kitchenPerm);

// const westMudRoom = calculateDrawerBoxesPrice({
//   boxes: westMudRoomDrawers,
//   sheetPrice,
//   sheetSize,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
//   isFaceFrame: true,
// });

// console.log("westMudRoom (1116)", westMudRoom);

// const westPowder = calculateDrawerBoxesPrice({
//   boxes: westPowderDrawers,
//   sheetPrice,
//   sheetSize,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
//   isFaceFrame: true,
// });

// console.log("westPowder (174.50)", westPowder);

// const foggLaundry = calculateDrawerBoxesPrice({
//   boxes: foggLaundryDrawers,
//   sheetPrice,
//   sheetSize,
//   wasteFactor,
//   roundingIncrement,
//   taxRate,
//   isFaceFrame: true,
// });

// console.log("foggLaundry (174.50)", foggLaundry);


