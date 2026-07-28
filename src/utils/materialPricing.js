export const getEffectiveSheetPrice = (material) => {
  const sheetPrice = Number(material?.sheet_price || 0);
  const sheetPriceUpcharge = Number(material?.sheet_price_upcharge || 0);
  const effectiveSheetPrice = sheetPrice + sheetPriceUpcharge;

  const stack = new Error().stack
    ?.split("\n")
    .slice(2, 8)
    .map((line) => line.trim())
    .join(" | ");

  console.log("[getEffectiveSheetPrice]", {
    materialId: material?.id ?? null,
    materialName: material?.name ?? null,
    sheetPrice,
    sheetPriceUpcharge,
    effectiveSheetPrice,
    stack,
  });

  return effectiveSheetPrice;
};
