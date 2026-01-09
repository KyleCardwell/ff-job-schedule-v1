import PropTypes from "prop-types";
import { useMemo, useState, useEffect } from "react";
import { FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useSelector } from "react-redux";

import { FACE_STYLE_VALUES, FACE_TYPES } from "../../utils/constants";
import { createSectionContext } from "../../utils/createSectionContext";
import { roundToHundredth } from "../../utils/estimateHelpers";
import { getSectionCalculations } from "../../utils/getSectionCalculations";

import EstimateSectionPriceGroup from "./EstimateSectionPriceGroup.jsx";

const EstimateSectionPrice = ({ section, onSaveToggles }) => {
  // Get materials from Redux store
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials
  );
  const { teamDefaults } = useSelector((state) => state.teamEstimateDefaults);

  // Get employee rates from Redux store
  const services = useSelector((state) => state.services?.allServices || []);

  const finishTypes = useSelector((state) => state.finishes?.finishes || []);

  const cabinetStyles = useSelector(
    (state) =>
      state.cabinetStyles?.styles.filter((style) => style.is_active) || []
  );

  const cabinetTypes = useSelector(
    (state) => state.cabinetTypes?.types.filter((type) => type.is_active) || []
  );

  const { hardware, accessories, lengths } = useSelector((state) => state);

  // Edit mode state for toggles
  const [isEditingToggles, setIsEditingToggles] = useState(false);
  const [partsToggles, setPartsToggles] = useState({});
  const [serviceToggles, setServiceToggles] = useState({});

  // Define the parts that can be toggled
  const partsCategories = [
    { key: "boxTotal", label: "Cabinet Boxes" },
    { key: "facePrices.door", label: "Doors" },
    { key: "facePrices.drawer_front", label: "Drawer Fronts" },
    { key: "facePrices.false_front", label: "False Fronts" },
    { key: "facePrices.panel", label: "Panels" },
    { key: "drawerBoxTotal", label: "Drawer Boxes" },
    { key: "rollOutTotal", label: "Rollouts" },
    { key: "hingesTotal", label: "Hinges" },
    { key: "slidesTotal", label: "Slides" },
    { key: "pullsTotal", label: "Pulls" },
    { key: "woodTotal", label: "Wood" },
    { key: "accessoriesTotal", label: "Accessories" },
  ];

  // Initialize toggles from section data
  useEffect(() => {
    if (section?.parts_included && typeof section.parts_included === "object") {
      setPartsToggles({ ...section.parts_included });
    } else {
      const initialPartsToggles = {};
      partsCategories.forEach((part) => {
        initialPartsToggles[part.key] = true;
      });
      setPartsToggles(initialPartsToggles);
    }

    if (
      section?.services_included &&
      typeof section.services_included === "object"
    ) {
      setServiceToggles({ ...section.services_included });
    } else {
      const initialServiceToggles = {};
      services
        .filter((s) => s.is_active)
        .forEach((service) => {
          initialServiceToggles[service.service_id] = true;
        });
      setServiceToggles(initialServiceToggles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.parts_included, section?.services_included]);

  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors?.itemsByPartsList || []
  );

  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors?.itemsByType || []
  );

  const handleEditToggles = () => {
    setIsEditingToggles(true);
  };

  const handleCancelToggles = () => {
    // Reset to original values
    if (section?.parts_included && typeof section.parts_included === "object") {
      setPartsToggles({ ...section.parts_included });
    } else {
      const initialPartsToggles = {};
      partsCategories.forEach((part) => {
        initialPartsToggles[part.key] = true;
      });
      setPartsToggles(initialPartsToggles);
    }

    if (
      section?.services_included &&
      typeof section.services_included === "object"
    ) {
      setServiceToggles({ ...section.services_included });
    } else {
      const initialServiceToggles = {};
      services
        .filter((s) => s.is_active)
        .forEach((service) => {
          initialServiceToggles[service.service_id] = true;
        });
      setServiceToggles(initialServiceToggles);
    }
    setIsEditingToggles(false);
  };

  const handleSaveToggles = () => {
    if (onSaveToggles) {
      onSaveToggles({
        parts_included: partsToggles,
        services_included: serviceToggles,
      });
    }
    setIsEditingToggles(false);
  };

  const handlePartsToggle = (partKey) => {
    setPartsToggles((prev) => ({
      ...prev,
      [partKey]: !prev[partKey],
    }));
  };

  const handleServiceToggle = (serviceId) => {
    setServiceToggles((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  };

  // Get estimate and team for defaults fallback
  const currentEstimate = useSelector(
    (state) => state.estimates?.currentEstimate
  );

  // Create context and calculate section totals using extracted utility
  const { context, effectiveSection } = useMemo(() => {
    const catalogData = {
      boxMaterials,
      faceMaterials,
      drawerBoxMaterials,
      finishTypes,
      cabinetStyles,
      cabinetTypes,
      hardware,
      partsListAnchors,
      cabinetAnchors,
      globalServices: services,
      lengthsCatalog: lengths?.catalog || [],
      accessories,
      teamDefaults,
    };

    return createSectionContext(section, currentEstimate, catalogData);
  }, [
    section,
    currentEstimate,
    boxMaterials,
    faceMaterials,
    drawerBoxMaterials,
    finishTypes,
    cabinetStyles,
    cabinetTypes,
    hardware,
    partsListAnchors,
    cabinetAnchors,
    services,
    lengths,
    accessories,
    teamDefaults,
  ]);

  // Calculate the total price and face counts of all items in the section
  const sectionCalculations = useMemo(() => {
    return getSectionCalculations(effectiveSection, context);
  }, [effectiveSection, context]);

  // Calculate display values for quantity 0 handling
  const displayValues = useMemo(() => {
    const actualQuantity = section.quantity;
    const calculationQuantity = actualQuantity === 0 ? 1 : actualQuantity;

    // Get the per-unit price (what it would cost for quantity 1)
    const unitPrice = sectionCalculations.totalPrice / calculationQuantity;

    // Display total is 0 if quantity is 0, otherwise use calculated total
    const displayTotal =
      actualQuantity === 0 ? 0 : sectionCalculations.totalPrice;

    return {
      unitPrice,
      displayTotal,
      actualQuantity,
      showUnitPrice: actualQuantity === 0, // Show unit price when quantity is 0
    };
  }, [section.quantity, sectionCalculations.totalPrice]);

  // Format number as currency
  const formatCurrency = (amount, { noCents = false } = {}) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: noCents ? 0 : 2,
      maximumFractionDigits: noCents ? 0 : 2,
    }).format(amount);
  };

  // Format hours with 2 decimal places
  const formatHours = (hours) => {
    return roundToHundredth(parseFloat(hours || 0));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Section Total Price - Top Section */}
      <div className="flex justify-between items-center pb-3">
        <div className="text-slate-300">
          <span className="text-sm font-medium">Section Total Price:</span>
        </div>
        <div
          className={`text-xl font-bold ${
            displayValues.showUnitPrice ? "text-amber-400" : "text-teal-400"
          }`}
        >
          {formatCurrency(
            displayValues.showUnitPrice
              ? displayValues.unitPrice
              : displayValues.displayTotal,
            {
              noCents: true,
            }
          )}
        </div>
      </div>

      {/* Content Section - Scrollable */}
      <div className="flex-1 overflow-auto space-y-4">
        {/* Adjustments */}
        <EstimateSectionPriceGroup title="Adjustments">
          {/* Header row */}
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-sm text-slate-300 text-left">Subtotal</div>
            <div className="text-sm font-medium text-teal-400 text-right"></div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.subTotalPrice)}
            </div>
          </div>
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-sm text-slate-300 text-left">Profit</div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {sectionCalculations.profitRate}%
            </div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.profit)}
            </div>
          </div>
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-sm text-slate-300 text-left">Commission</div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {sectionCalculations.commissionRate}%
            </div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.commission)}
            </div>
          </div>
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-sm text-slate-300 text-left">Discount</div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {sectionCalculations.discountRate}%
            </div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.discount)}
            </div>
          </div>
          <div
            className={`grid grid-cols-[3fr,1fr,3fr] gap-1 ${
              displayValues.showUnitPrice ? "bg-amber-400 px-1 text-white" : ""
            }`}
          >
            <div
              className={`${
                displayValues.showUnitPrice
                  ? "text-lg text-slate-900 text-left font-bold"
                  : "text-sm text-slate-300 text-left"
              }`}
            >
              Quantity
            </div>
            <div></div>
            <div
              className={`${
                displayValues.showUnitPrice
                  ? "text-lg text-right font-bold text-slate-900"
                  : "text-sm text-right font-bold text-teal-400"
              }`}
            >
              {sectionCalculations.quantity}
            </div>
          </div>
        </EstimateSectionPriceGroup>
        {/* Price Breakdown - Title with Edit Button */}
        <EstimateSectionPriceGroup
          title="Parts Breakdown"
          titleAction={
            !isEditingToggles ? (
              <button
                onClick={handleEditToggles}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors"
              >
                <FiEdit2 size={12} />
                Edit Included
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelToggles}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  <FiX size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveToggles}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
                >
                  <FiSave size={12} />
                  Save
                </button>
              </div>
            )
          }
        >
          {/* Header row */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-xs font-medium text-slate-400">Type</div>
            <div className="text-xs font-medium text-slate-400 text-center">
              Qty
            </div>
            <div className="text-xs font-medium text-slate-400 text-right">
              Price
            </div>
          </div>
          {/* Price Breakdown - Content - Grid Layout */}
          {/* Box Information */}
          <div
            className={`grid ${
              isEditingToggles
                ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                : "grid-cols-[3fr,1fr,2fr]"
            } gap-1 py-1 border-b border-gray-700`}
          >
            {isEditingToggles && (
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={partsToggles["boxTotal"] !== false}
                  onChange={() => handlePartsToggle("boxTotal")}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
              </div>
            )}
            <span
              className={`text-sm text-left ${
                sectionCalculations.partsIncluded?.boxTotal === false
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              Cabinet Boxes:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.boxCount}
            </span>
            <span
              className={`text-sm font-medium text-right ${
                sectionCalculations.partsIncluded?.boxTotal === false
                  ? "text-amber-400"
                  : "text-teal-400"
              }`}
            >
              {formatCurrency(sectionCalculations.boxTotal)}
            </span>
          </div>

          {/* Face Types - Filter out "open", "container", "pair_door" */}
          {Object.entries(sectionCalculations.faceCounts)
            .filter(
              ([type]) =>
                ![
                  "open",
                  "container",
                  "pair_door",
                  "glassPanels",
                  "glassShelfFaces",
                ].includes(type)
            )
            .map(([type, count]) => {
              const partKey = `facePrices.${type}`;
              const isExcluded =
                sectionCalculations.partsIncluded?.[partKey] === false;
              return (
                <div
                  key={type}
                  className={`grid ${
                    isEditingToggles
                      ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                      : "grid-cols-[3fr,1fr,2fr]"
                  } gap-1 py-1 border-b border-gray-700 last:border-0`}
                >
                  {isEditingToggles && (
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={partsToggles[partKey] !== false}
                        onChange={() => handlePartsToggle(partKey)}
                        className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                      />
                    </div>
                  )}
                  <span
                    className={`text-sm text-left ${
                      isExcluded ? "text-amber-400" : "text-slate-300"
                    }`}
                  >
                    {FACE_TYPES.find((t) => t.value === type)?.label || type}
                    s:
                  </span>
                  <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
                    {count}
                  </span>
                  <span
                    className={`text-sm font-medium text-right ${
                      isExcluded ? "text-amber-400" : "text-teal-400"
                    }`}
                  >
                    {formatCurrency(sectionCalculations.facePrices[type])}
                  </span>
                </div>
              );
            })}
          {/* Drawer Box Information */}
          <div
            className={`grid ${
              isEditingToggles
                ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                : "grid-cols-[3fr,1fr,2fr]"
            } gap-1 py-1 border-b border-gray-700`}
          >
            {isEditingToggles && (
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={partsToggles["drawerBoxTotal"] !== false}
                  onChange={() => handlePartsToggle("drawerBoxTotal")}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
              </div>
            )}
            <span
              className={`text-sm text-left ${
                sectionCalculations.partsIncluded?.drawerBoxTotal === false
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              Drawer Boxes:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.drawerBoxCount}
            </span>
            <span
              className={`text-sm font-medium text-right ${
                sectionCalculations.partsIncluded?.drawerBoxTotal === false
                  ? "text-amber-400"
                  : "text-teal-400"
              }`}
            >
              {formatCurrency(sectionCalculations.drawerBoxTotal)}
            </span>
          </div>

          {/* Rollout Information */}
          <div
            className={`grid ${
              isEditingToggles
                ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                : "grid-cols-[3fr,1fr,2fr]"
            } gap-1 py-1 border-b border-gray-700`}
          >
            {isEditingToggles && (
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={partsToggles["rollOutTotal"] !== false}
                  onChange={() => handlePartsToggle("rollOutTotal")}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
              </div>
            )}
            <span
              className={`text-sm text-left ${
                sectionCalculations.partsIncluded?.rollOutTotal === false
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              Rollouts:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.rollOutCount}
            </span>
            <span
              className={`text-sm font-medium text-right ${
                sectionCalculations.partsIncluded?.rollOutTotal === false
                  ? "text-amber-400"
                  : "text-teal-400"
              }`}
            >
              {formatCurrency(sectionCalculations.rollOutTotal)}
            </span>
          </div>

          {/* Hardware Information */}
          <div
            className={`grid ${
              isEditingToggles
                ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                : "grid-cols-[3fr,1fr,2fr]"
            } gap-1 py-1 border-b border-gray-700`}
          >
            {isEditingToggles && (
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={partsToggles["hingesTotal"] !== false}
                  onChange={() => handlePartsToggle("hingesTotal")}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
              </div>
            )}
            <span
              className={`text-sm text-left ${
                sectionCalculations.partsIncluded?.hingesTotal === false
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              Hinges:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.hingesCount || 0}
            </span>
            <span
              className={`text-sm font-medium text-right ${
                sectionCalculations.partsIncluded?.hingesTotal === false
                  ? "text-amber-400"
                  : "text-teal-400"
              }`}
            >
              {formatCurrency(sectionCalculations.hingesTotal || 0)}
            </span>
          </div>
          <div
            className={`grid ${
              isEditingToggles
                ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                : "grid-cols-[3fr,1fr,2fr]"
            } gap-1 py-1 border-b border-gray-700`}
          >
            {isEditingToggles && (
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={partsToggles["slidesTotal"] !== false}
                  onChange={() => handlePartsToggle("slidesTotal")}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
              </div>
            )}
            <span
              className={`text-sm text-left ${
                sectionCalculations.partsIncluded?.slidesTotal === false
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              Slides:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.slidesCount || 0}
            </span>
            <span
              className={`text-sm font-medium text-right ${
                sectionCalculations.partsIncluded?.slidesTotal === false
                  ? "text-amber-400"
                  : "text-teal-400"
              }`}
            >
              {formatCurrency(sectionCalculations.slidesTotal || 0)}
            </span>
          </div>
          <div
            className={`grid ${
              isEditingToggles
                ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                : "grid-cols-[3fr,1fr,2fr]"
            } gap-1 py-1 border-b border-gray-700`}
          >
            {isEditingToggles && (
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={partsToggles["pullsTotal"] !== false}
                  onChange={() => handlePartsToggle("pullsTotal")}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
              </div>
            )}
            <span
              className={`text-sm text-left ${
                sectionCalculations.partsIncluded?.pullsTotal === false
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              Pulls:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.pullsCount || 0}
            </span>
            <span
              className={`text-sm font-medium text-right ${
                sectionCalculations.partsIncluded?.pullsTotal === false
                  ? "text-amber-400"
                  : "text-teal-400"
              }`}
            >
              {formatCurrency(sectionCalculations.pullsTotal || 0)}
            </span>
          </div>
          <div
            className={`grid ${
              isEditingToggles
                ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                : "grid-cols-[3fr,1fr,2fr]"
            } gap-1 py-1 border-b border-gray-700`}
          >
            {isEditingToggles && (
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={partsToggles["woodTotal"] !== false}
                  onChange={() => handlePartsToggle("woodTotal")}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
              </div>
            )}
            <span
              className={`text-sm text-left ${
                sectionCalculations.partsIncluded?.woodTotal === false
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              Wood:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.woodCount || 0}
            </span>
            <span
              className={`text-sm font-medium text-right ${
                sectionCalculations.partsIncluded?.woodTotal === false
                  ? "text-amber-400"
                  : "text-teal-400"
              }`}
            >
              {formatCurrency(sectionCalculations.woodTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Fillers:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.fillerCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {sectionCalculations.fillerCount &&
              section.doorStyle === FACE_STYLE_VALUES.SLAB_SHEET
                ? "(Panel)"
                : ""}
            </span>
          </div>
          {/* Accessories Information (includes glass) */}
          <div
            className={`grid ${
              isEditingToggles
                ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                : "grid-cols-[3fr,1fr,2fr]"
            } gap-1 py-1 border-b border-gray-700`}
          >
            {isEditingToggles && (
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={partsToggles["accessoriesTotal"] !== false}
                  onChange={() => handlePartsToggle("accessoriesTotal")}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
              </div>
            )}
            <span
              className={`text-sm text-left ${
                sectionCalculations.partsIncluded?.accessoriesTotal === false
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              Accessories:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.accessoriesCount || 0}
            </span>
            <span
              className={`text-sm font-medium text-right ${
                sectionCalculations.partsIncluded?.accessoriesTotal === false
                  ? "text-amber-400"
                  : "text-teal-400"
              }`}
            >
              {formatCurrency(sectionCalculations.accessoriesTotal || 0)}
            </span>
          </div>
          {/* Other Items Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1">
            <span className="text-sm text-slate-300 text-left">Other:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.otherCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.otherTotal || 0)}
            </span>
          </div>
        </EstimateSectionPriceGroup>

        {/* Labor Hours - Title */}
        <EstimateSectionPriceGroup title="Labor Breakdown">
          {/* Labor Hours - Content - Grid Layout */}
          {/* Header row */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-xs font-medium text-slate-400">Category</div>
            <div className="text-xs font-medium text-slate-400 text-center">
              Hours
            </div>
            <div className="text-xs font-medium text-slate-400 text-right">
              Cost
            </div>
          </div>

          {/* Dynamic Service Hours */}
          {Object.entries(sectionCalculations.laborCosts.costsByService).map(
            ([serviceType, data]) => {
              const isExcluded = data.isIncluded === false;
              return (
                <div
                  key={serviceType}
                  className={`grid ${
                    isEditingToggles
                      ? "grid-cols-[0.5fr,3fr,1fr,2fr]"
                      : "grid-cols-[3fr,1fr,2fr]"
                  } gap-1 py-1 border-b border-gray-700`}
                >
                  {isEditingToggles && (
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={serviceToggles[serviceType] !== false}
                        onChange={() => handleServiceToggle(serviceType)}
                        className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                      />
                    </div>
                  )}
                  <span
                    className={`text-sm text-left capitalize ${
                      isExcluded ? "text-amber-400" : "text-slate-300"
                    }`}
                  >
                    {data.name}:
                  </span>
                  <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
                    {formatHours(data.hours)}
                  </span>
                  <span
                    className={`text-sm font-medium text-right ${
                      isExcluded ? "text-amber-400" : "text-teal-400"
                    }`}
                  >
                    {formatCurrency(data.cost)}
                  </span>
                </div>
              );
            }
          )}

          {/* Total Labor Cost */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 mt-1 pt-2">
            <span className="text-sm font-medium text-white text-left">
              Total Labor:
            </span>
            <span className="text-sm font-medium"></span>
            <span className="text-sm font-bold text-teal-400 text-right">
              {formatCurrency(sectionCalculations.laborCosts.totalLaborCost)}
            </span>
          </div>
        </EstimateSectionPriceGroup>
      </div>
    </div>
  );
};

EstimateSectionPrice.propTypes = {
  section: PropTypes.object.isRequired,
  onSaveToggles: PropTypes.func,
};

export default EstimateSectionPrice;
