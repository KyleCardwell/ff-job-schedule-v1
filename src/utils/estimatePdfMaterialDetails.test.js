import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createServer } from "vite";

import { getEstimatePdfMaterialDetails } from "./estimatePdfMaterialDetails.js";

let vite;
let createSectionContext;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  ({ createSectionContext } = await vite.ssrLoadModule(
    "/src/utils/createSectionContext.js",
  ));
});

after(async () => {
  await vite?.close();
});

const catalogData = {
  boxMaterials: [{ id: 5, name: "Original Birch", needs_finish: true }],
  faceMaterials: [{ id: 4, name: "Original Maple", needs_finish: true }],
  drawerBoxMaterials: [{ id: 3, name: "Original Drawer", sheet_price: 8 }],
  finishTypes: [{ id: 6, name: "Original Finish" }],
  cabinetStyles: [],
  cabinetTypes: [],
  hardware: { hinges: [], pulls: [], slides: [] },
  accessories: { catalog: [] },
  teamDefaults: {},
};

const estimate = {
  price_overrides: {
    materials: {
      4: { label_override: "Custom Maple" },
      5: { label_override: "Custom Birch" },
    },
    drawerBoxMaterials: {
      3: { label_override: "Custom Drawer", sheet_price: 12 },
    },
    finishes: { 6: { label_override: "Custom Finish" } },
  },
};

const section = {
  box_mat: 5,
  face_mat: 4,
  drawer_box_mat: 3,
  face_finish: [6],
  box_finish: [6],
};

const getPdfDetails = (useDefaultPrices, hasDrawerBoxes = true) => {
  const { context, effectiveSection } = createSectionContext(
    { ...section, use_default_prices: useDefaultPrices },
    estimate,
    catalogData,
  );
  return {
    context,
    details: getEstimatePdfMaterialDetails({
      context,
      effectiveSection,
      hasDrawerBoxes,
      hasFinishedInteriors: false,
    }),
  };
};

test("active overrides supply names to both estimate PDFs and the preview", () => {
  const { context, details } = getPdfDetails(false);

  assert.equal(context.selectedFaceMaterial.material.name, "Custom Maple");
  assert.equal(context.selectedBoxMaterial.material.name, "Custom Birch");
  assert.equal(context.drawerBoxMaterials[0].sheet_price, 12);
  assert.equal(details.drawerBoxMaterialName, "Custom Drawer");
  assert.equal(details.groupingDrawerBoxMaterialName, "Custom Drawer");
  assert.equal(details.faceFinishNames, "Custom Finish");
  assert.equal(details.boxFinishNames, "Custom Finish");
  assert.equal(catalogData.drawerBoxMaterials[0].name, "Original Drawer");
});

test("sections using default prices retain catalog names", () => {
  const { context, details } = getPdfDetails(true);

  assert.equal(context.drawerBoxMaterials[0].sheet_price, 8);
  assert.equal(details.drawerBoxMaterialName, "Original Drawer");
  assert.equal(details.groupingDrawerBoxMaterialName, "Original Drawer");
  assert.equal(details.faceFinishNames, "Original Finish");
  assert.equal(details.boxFinishNames, "Original Finish");
});

test("excluded drawer boxes stay hidden in the standard PDF", () => {
  const { details } = getPdfDetails(false, false);

  assert.equal(details.drawerBoxMaterialName, "None");
  assert.equal(details.groupingDrawerBoxMaterialName, "Custom Drawer");
});
