import { decimalToFraction, formatNumberValue } from "../utils/mathUtils";

const CABINET_TYPE_IDS = {
  BASE: 1,
  UPPER: 2,
  TALL: 3,
  FILLER: 5,
  END_PANEL: 10,
  APPLIANCE_PANEL: 11,
};

const END_PANEL_OVERHANG = 1.375;

const getTypeDefault = (
  cabinetTypes,
  dimensionOverrides,
  typeId,
  field,
  fallback,
) => {
  const override = dimensionOverrides?.[typeId]?.[field];
  if (override != null && override !== "") return Number(override);

  const cabinetType = cabinetTypes.find(
    (type) => Number(type.cabinet_type_id) === Number(typeId),
  );
  const typeDefault = cabinetType?.[`default_${field}`];
  return typeDefault != null && typeDefault !== ""
    ? Number(typeDefault)
    : fallback;
};

const asInputValue = (value) => {
  if (value == null || value === "") return "";
  return Number.isFinite(Number(value))
    ? decimalToFraction(formatNumberValue(Number(value)))
    : "";
};

const dimensionRow = ({
  key,
  typeId,
  configuration,
  facePresetKey = null,
  quantity = 1,
  width,
  height,
  depth,
  itemOverrides = {},
  shopBuilt = false,
}) => ({
  key,
  typeId,
  configuration,
  facePresetKey,
  quantity: String(quantity),
  width: asInputValue(width),
  height: asInputValue(height),
  depth: asInputValue(depth),
  itemOverrides,
  shopBuilt,
});

const createBathroomDefaults = ({ cabinetTypes, dimensionOverrides }) => ({
  leftEnd: "filler",
  rightEnd: "filler",
  cabinetHeight: asInputValue(
    getTypeDefault(
      cabinetTypes,
      dimensionOverrides,
      CABINET_TYPE_IDS.BASE,
      "height",
      34.5,
    ),
  ),
  cabinetDepth: "21",
});

const createBathroomCoreRows = (params, context) => {
  const { cabinetTypes, dimensionOverrides, parseDimension } = context;
  const cabinetHeight = parseDimension(params.cabinetHeight);
  const cabinetDepth = parseDimension(params.cabinetDepth);
  const baseWidth = getTypeDefault(
    cabinetTypes,
    dimensionOverrides,
    CABINET_TYPE_IDS.BASE,
    "width",
    24,
  );

  return [
    dimensionRow({
      key: "b3d",
      typeId: CABINET_TYPE_IDS.BASE,
      configuration: "B3D",
      facePresetKey: "3df",
      quantity: 2,
      width: baseWidth,
      height: cabinetHeight,
      depth: cabinetDepth,
    }),
    dimensionRow({
      key: "base-default",
      typeId: CABINET_TYPE_IDS.BASE,
      configuration: "Base Default",
      width: baseWidth,
      height: cabinetHeight,
      depth: cabinetDepth,
    }),
  ];
};

const createBoundaryRow = (kind, quantity, suffix, params, context) => {
  const { cabinetTypes, dimensionOverrides, parseDimension } = context;
  const cabinetDepth = parseDimension(params.cabinetDepth);

  if (kind === "end-panel") {
    return dimensionRow({
      key: `end-panel-${suffix}`,
      typeId: CABINET_TYPE_IDS.END_PANEL,
      configuration: "End Panel",
      quantity,
      width:
        cabinetDepth == null ? null : cabinetDepth + END_PANEL_OVERHANG,
      height: getTypeDefault(
        cabinetTypes,
        dimensionOverrides,
        CABINET_TYPE_IDS.END_PANEL,
        "height",
        parseDimension(params.cabinetHeight),
      ),
      depth: getTypeDefault(
        cabinetTypes,
        dimensionOverrides,
        CABINET_TYPE_IDS.END_PANEL,
        "depth",
        0.75,
      ),
    });
  }

  return dimensionRow({
    key: `filler-${suffix}`,
    typeId: CABINET_TYPE_IDS.FILLER,
    configuration: "Filler",
    quantity,
    width: getTypeDefault(
      cabinetTypes,
      dimensionOverrides,
      CABINET_TYPE_IDS.FILLER,
      "width",
      3,
    ),
    height: getTypeDefault(
      cabinetTypes,
      dimensionOverrides,
      CABINET_TYPE_IDS.FILLER,
      "height",
      parseDimension(params.cabinetHeight),
    ),
    depth: getTypeDefault(
      cabinetTypes,
      dimensionOverrides,
      CABINET_TYPE_IDS.FILLER,
      "depth",
      3,
    ),
  });
};

const arrangeRowsWithEnds = ({ left, right, coreRows, createEndRow }) => {
  if (left === right) {
    return [createEndRow(left, 2, "both"), ...coreRows];
  }

  return [
    createEndRow(left, 1, "left"),
    ...coreRows,
    createEndRow(right, 1, "right"),
  ];
};

const CABINET_END_OPTIONS = [
  { value: "filler", label: "Filler" },
  { value: "end-panel", label: "End Panel" },
];

const bathroomPreset = {
  id: "bathroom-base-run",
  label: "Bathroom Base Run",
  description:
    "Two B3Ds and one default base with independently selected ends.",
  parameterFields: [
    { key: "cabinetHeight", label: "Cabinet Height" },
    { key: "cabinetDepth", label: "Cabinet Depth" },
    {
      key: "leftEnd",
      label: "Left End",
      type: "select",
      group: "ends",
      options: CABINET_END_OPTIONS,
    },
    {
      key: "rightEnd",
      label: "Right End",
      type: "select",
      group: "ends",
      options: CABINET_END_OPTIONS,
    },
  ],
  createDefaults: createBathroomDefaults,
  createRows: (params, context) => {
    const left = params.leftEnd || "filler";
    const right = params.rightEnd || "filler";
    const coreRows = createBathroomCoreRows(params, context);
    return arrangeRowsWithEnds({
      left,
      right,
      coreRows,
      createEndRow: (kind, quantity, suffix) =>
        createBoundaryRow(kind, quantity, suffix, params, context),
    });
  },
};

export const CABINET_GROUP_PRESETS = [
  bathroomPreset,
  {
    id: "appliance-surround",
    label: "Appliance Surround",
    description:
      "An appliance panel and upper cabinet with independently selected ends.",
    parameterFields: [
      { key: "overallHeight", label: "Overall Height" },
      { key: "boxDepth", label: "Cabinet Box Depth" },
      { key: "baseHeight", label: "Base Height" },
      { key: "applianceWidth", label: "Appliance Width" },
      { key: "applianceHeight", label: "Appliance Height" },
      {
        key: "leftEnd",
        label: "Left End",
        type: "select",
        group: "ends",
        options: CABINET_END_OPTIONS,
      },
      {
        key: "rightEnd",
        label: "Right End",
        type: "select",
        group: "ends",
        options: CABINET_END_OPTIONS,
      },
    ],
    createDefaults: ({ cabinetTypes, dimensionOverrides }) => ({
      leftEnd: "end-panel",
      rightEnd: "end-panel",
      overallHeight: asInputValue(
        getTypeDefault(
          cabinetTypes,
          dimensionOverrides,
          CABINET_TYPE_IDS.TALL,
          "height",
          96,
        ),
      ),
      boxDepth: asInputValue(
        getTypeDefault(
          cabinetTypes,
          dimensionOverrides,
          CABINET_TYPE_IDS.TALL,
          "depth",
          24,
        ),
      ),
      baseHeight: "4",
      applianceWidth: asInputValue(
        getTypeDefault(
          cabinetTypes,
          dimensionOverrides,
          CABINET_TYPE_IDS.APPLIANCE_PANEL,
          "width",
          30,
        ),
      ),
      applianceHeight: "80",
    }),
    createRows: (params, context) => {
      const { cabinetTypes, dimensionOverrides, parseDimension } = context;
      const overallHeight = parseDimension(params.overallHeight);
      const boxDepth = parseDimension(params.boxDepth);
      const baseHeight = parseDimension(params.baseHeight);
      const applianceWidth = parseDimension(params.applianceWidth);
      const applianceHeight = parseDimension(params.applianceHeight);
      const upperHeight =
        overallHeight == null || applianceHeight == null || baseHeight == null
          ? null
          : overallHeight - applianceHeight - baseHeight;
      const coreRows = [
        dimensionRow({
          key: "appliance-panel",
          typeId: CABINET_TYPE_IDS.APPLIANCE_PANEL,
          configuration: "Appliance Panel",
          width: applianceWidth,
          height: applianceHeight,
          depth: getTypeDefault(
            cabinetTypes,
            dimensionOverrides,
            CABINET_TYPE_IDS.APPLIANCE_PANEL,
            "depth",
            0.75,
          ),
        }),
        dimensionRow({
          key: "upper-cabinet",
          typeId: CABINET_TYPE_IDS.UPPER,
          configuration: "Upper Default",
          width: applianceWidth,
          height: upperHeight,
          depth: boxDepth,
        }),
      ];
      const createEndRow = (kind, quantity, suffix) => {
        if (kind === "filler") {
          return dimensionRow({
            key: `appliance-filler-${suffix}`,
            typeId: CABINET_TYPE_IDS.FILLER,
            configuration: "Full Height Filler",
            quantity,
            width: getTypeDefault(
              cabinetTypes,
              dimensionOverrides,
              CABINET_TYPE_IDS.FILLER,
              "width",
              3,
            ),
            height: overallHeight,
            depth: getTypeDefault(
              cabinetTypes,
              dimensionOverrides,
              CABINET_TYPE_IDS.FILLER,
              "depth",
              3,
            ),
          });
        }

        return dimensionRow({
          key: `full-height-end-panel-${suffix}`,
          typeId: CABINET_TYPE_IDS.END_PANEL,
          configuration: "Full Height End Panel",
          quantity,
          width: boxDepth == null ? null : boxDepth + END_PANEL_OVERHANG,
          height: overallHeight,
          depth: getTypeDefault(
            cabinetTypes,
            dimensionOverrides,
            CABINET_TYPE_IDS.END_PANEL,
            "depth",
            0.75,
          ),
          itemOverrides: {
            typeSpecificOptions: {
              count_top_molding: true,
              count_base_molding: false,
            },
          },
        });
      };

      return arrangeRowsWithEnds({
        left: params.leftEnd || "end-panel",
        right: params.rightEnd || "end-panel",
        coreRows,
        createEndRow,
      });
    },
  },
  {
    id: "tall-run",
    label: "Tall Cabinet Run",
    description: "Adjustable tall cabinets with independently selected ends.",
    parameterFields: [
      { key: "tallHeight", label: "Tall Cabinet Height" },
      { key: "tallDepth", label: "Tall Cabinet Depth" },
      {
        key: "leftEnd",
        label: "Left End",
        type: "select",
        group: "ends",
        options: CABINET_END_OPTIONS,
      },
      {
        key: "rightEnd",
        label: "Right End",
        type: "select",
        group: "ends",
        options: CABINET_END_OPTIONS,
      },
    ],
    createDefaults: ({ cabinetTypes, dimensionOverrides }) => ({
      leftEnd: "filler",
      rightEnd: "end-panel",
      tallHeight: asInputValue(
        getTypeDefault(
          cabinetTypes,
          dimensionOverrides,
          CABINET_TYPE_IDS.TALL,
          "height",
          96,
        ),
      ),
      tallDepth: asInputValue(
        getTypeDefault(
          cabinetTypes,
          dimensionOverrides,
          CABINET_TYPE_IDS.TALL,
          "depth",
          24,
        ),
      ),
    }),
    createRows: (params, context) => {
      const { cabinetTypes, dimensionOverrides, parseDimension } = context;
      const tallHeight = parseDimension(params.tallHeight);
      const tallDepth = parseDimension(params.tallDepth);
      const coreRows = [
        dimensionRow({
          key: "tall-cabinets",
          typeId: CABINET_TYPE_IDS.TALL,
          configuration: "Tall Default",
          quantity: 2,
          width: getTypeDefault(
            cabinetTypes,
            dimensionOverrides,
            CABINET_TYPE_IDS.TALL,
            "width",
            24,
          ),
          height: tallHeight,
          depth: tallDepth,
        }),
      ];
      const createEndRow = (kind, quantity, suffix) => {
        if (kind === "filler") {
          return dimensionRow({
            key: `tall-filler-${suffix}`,
            typeId: CABINET_TYPE_IDS.FILLER,
            configuration: "Tall Filler",
            quantity,
            width: getTypeDefault(
              cabinetTypes,
              dimensionOverrides,
              CABINET_TYPE_IDS.FILLER,
              "width",
              3,
            ),
            height: tallHeight,
            depth: getTypeDefault(
              cabinetTypes,
              dimensionOverrides,
              CABINET_TYPE_IDS.FILLER,
              "depth",
              3,
            ),
          });
        }

        return dimensionRow({
          key: `tall-end-panel-${suffix}`,
          typeId: CABINET_TYPE_IDS.END_PANEL,
          configuration: "Full Height End Panel",
          quantity,
          width: tallDepth == null ? null : tallDepth + END_PANEL_OVERHANG,
          height: tallHeight,
          depth: getTypeDefault(
            cabinetTypes,
            dimensionOverrides,
            CABINET_TYPE_IDS.END_PANEL,
            "depth",
            0.75,
          ),
        });
      };

      return arrangeRowsWithEnds({
        left: params.leftEnd || "filler",
        right: params.rightEnd || "end-panel",
        coreRows,
        createEndRow,
      });
    },
  },
];
