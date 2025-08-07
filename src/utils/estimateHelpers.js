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

  return boardFeet.toFixed(2);
};

// Helper function to calculate box material price
export const calculateBoxPrice = (cabinet, boxMaterials) => (section) => {
  if (!cabinet.face_config?.boxSummary || !section.box_mat) {
    return 0;
  }

  // Find the selected box material
  const selectedMaterial = boxMaterials.find(
    (mat) => mat.id === section.box_mat
  );
  if (!selectedMaterial) return 0;

  // Calculate price based on area and material price
  const pricePerSquareInch =
    selectedMaterial.sheet_price / selectedMaterial.area;
  return pricePerSquareInch * cabinet.face_config.boxSummary.totalArea;
};

// Helper function to calculate face material price
export const calculateSlabSheetFacePrice =
  (cabinet, faceMaterials) => (section) => {
    if (!cabinet.face_config?.faceSummary || !section.face_mat) {
      return { totalPrice: 0, priceByType: {} };
    }

    // Find the selected face material
    const selectedMaterial = faceMaterials.find(
      (mat) => mat.id === section.face_mat
    );
    if (!selectedMaterial) return { totalPrice: 0, priceByType: {} };

    // Calculate price based on total area of all faces and material price
    const pricePerSquareInch =
      selectedMaterial.sheet_price / selectedMaterial.area;

    let totalFaceArea = 0;
    let totalPrice = 0;
    const priceByType = {};
    
    // Initialize priceByType for all face types
    Object.keys(cabinet.face_config.faceSummary).forEach(faceType => {
      priceByType[faceType] = 0;
    });
    
    // Calculate area and price for each face type
    Object.entries(cabinet.face_config.faceSummary).forEach(([faceType, faceData]) => {
      // Skip open or container face types - only these should be excluded
      if (!["open", "container"].includes(faceType)) {
        const faceArea = faceData.totalArea || 0;
        const facePrice = pricePerSquareInch * faceArea;
        
        totalFaceArea += faceArea;
        totalPrice += facePrice;
        priceByType[faceType] = facePrice;
      }
    });

    return { totalPrice, priceByType };
  };

export const calculate5PieceHardwoodFacePrice =
  (cabinet, faceMaterials) => (section) => {
    if (!cabinet.face_config?.faceSummary || !section.face_mat) {
      return { totalPrice: 0, priceByType: {} };
    }

    // Find the selected face material
    const selectedMaterial = faceMaterials.find(
      (mat) => mat.id === section.face_mat
    );
    if (!selectedMaterial) return { totalPrice: 0, priceByType: {} };

    // For 5-piece hardwood doors, we use price per board foot
    // The price stored in the material is assumed to be per board foot for hardwood
    const pricePerBoardFoot = selectedMaterial.bd_ft_price;

    let totalPrice = 0;
    const priceByType = {};

    // Initialize priceByType for all face types
    Object.keys(cabinet.face_config.faceSummary).forEach(faceType => {
      priceByType[faceType] = 0;
    });

    // Calculate price for each face type
    Object.entries(cabinet.face_config.faceSummary).forEach(
      ([faceType, faceData]) => {
        // Skip open or container face types - only these should be excluded
        if (!["open", "container"].includes(faceType)) {
          let typeTotalPrice = 0;
          
          // Calculate board feet and price for each individual face
          faceData.faces?.forEach((face) => {
            const width = parseFloat(face.width);
            const height = parseFloat(face.height);

            // Calculate board feet for this specific door/drawer/face
            const boardFeet = parseFloat(
              calculateBoardFeetFor5PieceDoor(
                width,
                height,
                0.75, // Default thickness of 3/4"
                3, // Default stile width of 3"
                3, // Default rail width of 3"
                0.5 // Default panel thickness of 1/2"
              )
            );

            // Calculate price for this face
            const facePrice = boardFeet * pricePerBoardFoot;
            typeTotalPrice += facePrice;
            totalPrice += facePrice;
          });
          
          priceByType[faceType] = typeTotalPrice;
        }
      }
    );

    return { totalPrice, priceByType };
  };
