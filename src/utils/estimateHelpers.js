import { CABINET_ANCHORS } from "./constants";

export const roundToHundredth = (num) => Math.round(num * 100) / 100;

export const calculateBoardFeetFor5PieceDoor = (
  doorWidth,
  doorHeight,
  thickness = 0.75,
  stileWidth = 3,
  railWidth = 3,
  panelThickness = 0.5
) => {
  // --- Stiles (2 vertical) ---
  const stileVolume = 2 * thickness * stileWidth * doorHeight;

  // --- Rails (2 horizontal) ---
  const railLength = doorWidth - 2 * stileWidth;
  const railVolume = 2 * thickness * railWidth * railLength;

  // --- Panel (center) ---
  const panelHeight = doorHeight - 2 * railWidth;
  const panelWidth = doorWidth - 2 * stileWidth;
  const panelVolume = panelThickness * panelWidth * panelHeight;

  // Total volume in cubic inches
  const totalCubicInches = stileVolume + railVolume + panelVolume;

  // Convert to board feet
  const boardFeet = totalCubicInches / 144;

  return roundToHundredth(boardFeet);
};

export const calculateBoardFeetForSlabHardwoodDoor = (
  doorWidth,
  doorHeight,
  thickness = 0.75,
) => {

  // Total volume in cubic inches
  const totalCubicInches = doorWidth * doorHeight * thickness;

  // Convert to board feet
  const boardFeet = totalCubicInches / 144;

  return roundToHundredth(boardFeet);
};

const interpolateRate = (anchors, targetWidth, type) => {
  const rates = anchors.map((a) => ({
    width: a.width,
    rate: a[type] / (a.width * a.height * a.depth),
  }));

  if (targetWidth <= rates[0].width) return rates[0].rate;
  if (targetWidth >= rates[rates.length - 1].width)
    return rates[rates.length - 1].rate;

  for (let i = 0; i < rates.length - 1; i++) {
    const a = rates[i],
      b = rates[i + 1];
    if (targetWidth >= a.width && targetWidth <= b.width) {
      const t = (targetWidth - a.width) / (b.width - a.width);
      return a.rate + t * (b.rate - a.rate);
    }
  }
};

const detectCategory = (height, depth) => {
  const profiles = {
    Base: { height: 34.5, depth: 24 },
    Upper: { height: 30, depth: 12 },
    Tall: { height: 84, depth: 24 },
    Bookcase: { height: 84, depth: 12 },
  };

  let closest = null;
  let closestDiff = Infinity;

  for (const [cat, dims] of Object.entries(profiles)) {
    const diff = Math.abs(height - dims.height) + Math.abs(depth - dims.depth);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = cat;
    }
  }
  return closest;
};

export const getCabinetHours = (width, height, depth, finishedInterior = false) => {
  const category = detectCategory(height, depth);
  const anchors = CABINET_ANCHORS[category];
  const volume = width * height * depth;

  let shopRate;
  if (finishedInterior) {
    shopRate = interpolateRate(anchors, width, "finShopHours");
  } else {
    shopRate = interpolateRate(anchors, width, "shopHours");
  }
  const installRate = interpolateRate(anchors, width, "installHours");
  const finishRate = interpolateRate(anchors, width, "finishHours");

  let shopHours = volume * shopRate;
  let installHours = volume * installRate;
  let finishHours = volume * finishRate;

  // Optional scaling for big/heavy cases
  if (height > 80) {
    shopHours *= 1.15;
    installHours *= 1.2;
  }

  return {
    category,
    shopHours: roundToHundredth(shopHours),
    installHours: roundToHundredth(installHours),
    finishHours: roundToHundredth(finishHours)
  };
}

// Helper function to calculate box material price
export const calculateBoxPrice = (cabinet, selectedMaterial) => (section) => {
  if (!cabinet.face_config?.boxSummary || !section.box_mat || !selectedMaterial) {
    return 0;
  }

  // Calculate price based on area and material price
  const pricePerSquareInch =
    selectedMaterial.sheet_price / selectedMaterial.area;
  return roundToHundredth(
    pricePerSquareInch * cabinet.face_config.boxSummary.totalArea
  );
};

// Helper function to calculate slab sheet face price for a specific face type
export const calculateSlabSheetFacePrice = (faceData, selectedMaterial) => {
  if (!faceData || !selectedMaterial) {
    return 0;
  }

  // Calculate price based on total area and material price
  const pricePerSquareInch = selectedMaterial.sq_in_price || 
    (selectedMaterial.sheet_price / selectedMaterial.area);

  let totalPrice = 0;

  // Calculate price for each individual face
  faceData.faces?.forEach((face) => {
    const width = parseFloat(face.width);
    const height = parseFloat(face.height);
    const sqInches = width * height;
    const facePrice = roundToHundredth(pricePerSquareInch * sqInches);
    totalPrice += facePrice;
  });

  return totalPrice;
};

// Helper function to calculate 5-piece hardwood face price for a specific face type
export const calculate5PieceHardwoodFacePrice = (faceData, selectedMaterial) => {
  if (!faceData || !selectedMaterial) {
    return 0;
  }

  // For 5-piece hardwood doors, we use price per board foot
  const pricePerBoardFoot = selectedMaterial.bd_ft_price;
  let totalPrice = 0;

  // Calculate board feet and price for each individual face
  faceData.faces?.forEach((face) => {
    const width = parseFloat(face.width);
    const height = parseFloat(face.height);

    // Calculate board feet for this specific door/drawer/face
    const boardFeet = parseFloat(
      calculateBoardFeetFor5PieceDoor(
        width,
        height,
        selectedMaterial.thickness || 0.75,
        3, // Default stile width of 3"
        3, // Default rail width of 3"
        0.5 // Default panel thickness of 1/2"
      )
    );

    // Calculate price for this face
    const facePrice = roundToHundredth(boardFeet * pricePerBoardFoot);
    console.log(face.id, facePrice)
    totalPrice += facePrice;
  });

  return totalPrice;
};

// Helper function to calculate slab hardwood face price for a specific face type
export const calculateSlabHardwoodFacePrice = (faceData, selectedMaterial) => {
  if (!faceData || !selectedMaterial) {
    return 0;
  }

  // For slab hardwood, we use price per board foot
  const pricePerBoardFoot = selectedMaterial.bd_ft_price;
  let totalPrice = 0;

  // Calculate board feet and price for each individual face
  faceData.faces?.forEach((face) => {
    const width = parseFloat(face.width);
    const height = parseFloat(face.height);

    // Calculate board feet for this specific door/drawer/face
    const boardFeet = parseFloat(
      calculateBoardFeetForSlabHardwoodDoor(
        width,
        height,
        selectedMaterial.thickness || 0.75
      )
    );

    // Calculate price for this face
    const facePrice = roundToHundredth(boardFeet * pricePerBoardFoot);
    totalPrice += facePrice;
  });

  return totalPrice;
};
