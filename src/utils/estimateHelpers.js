// Helper function to calculate box material price
  export const calculateBoxPrice = (cabinet, boxMaterials) => section => {
    if (!cabinet.face_config?.boxSummary || !section.box_mat) {
      return 0;
    }

    // Find the selected box material
    const selectedMaterial = boxMaterials.find(
      (mat) => mat.id === section.box_mat
    );
    if (!selectedMaterial) return 0;

    // Calculate price based on area and material price
    const pricePerSquareInch = selectedMaterial.price / selectedMaterial.area;
    return pricePerSquareInch * cabinet.face_config.boxSummary.totalArea;
  };

  // Helper function to calculate face material price
  export const calculateSlabSheetFacePrice = (cabinet, faceMaterials) => section => {
    if (!cabinet.face_config?.faceSummary || !section.face_mat) {
      return 0;
    }

    // Find the selected face material
    const selectedMaterial = faceMaterials.find(
      (mat) => mat.id === section.face_mat
    );
    if (!selectedMaterial) return 0;

    // Calculate price based on total area of all faces and material price
    const pricePerSquareInch = selectedMaterial.price / selectedMaterial.area;

    let totalFaceArea = 0;
    // Sum up the area of all face types
    Object.values(cabinet.face_config.faceSummary).forEach((faceData) => {
      totalFaceArea += faceData.totalArea || 0;
    });

    return pricePerSquareInch * totalFaceArea;
  };

  export const calculate5PieceHardwoodFacePrice = (cabinet, faceMaterials) => section => {
    if (!cabinet.face_config?.faceSummary || !section.face_mat) {
      return 0;
    }

    // Find the selected face material
    const selectedMaterial = faceMaterials.find(
      (mat) => mat.id === section.face_mat
    );
    if (!selectedMaterial) return 0;

    // Calculate price based on total area of all faces and material price
    const pricePerSquareInch = selectedMaterial.price / selectedMaterial.area;

    let totalFaceArea = 0;
    // Sum up the area of all face types
    Object.values(cabinet.face_config.faceSummary).forEach((faceData) => {
      totalFaceArea += faceData.totalArea || 0;
    });

    return pricePerSquareInch * totalFaceArea;
  };