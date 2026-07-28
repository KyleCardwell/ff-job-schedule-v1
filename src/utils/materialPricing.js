export const getEffectiveSheetPrice = (material) =>
  Number(material?.sheet_price || 0) +
  Number(material?.sheet_price_upcharge || 0);
