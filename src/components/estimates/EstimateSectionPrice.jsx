import PropTypes from "prop-types";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import { FACE_STYLE_VALUES, FACE_TYPES } from "../../utils/constants";
import { roundToHundredth } from "../../utils/estimateHelpers";
import { getSectionCalculations } from "../../utils/getSectionCalculations";

const EstimateSectionPrice = ({ section }) => {
  // Get materials from Redux store
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials
  );

  // Get employee rates from Redux store
  const services = useSelector((state) => state.services?.allServices || []);

  const finishTypes = useSelector((state) => state.finishes?.finishes || []);

  const cabinetStyles = useSelector(
    (state) =>
      state.cabinetStyles?.styles.filter((style) => style.is_active) || []
  );

  const { hardware, accessories } = useSelector((state) => state);

  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors?.itemsByPartsList || []
  );

  const selectedFaceMaterial = useMemo(() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const material = faceMaterials?.find((mat) => mat.id === section.face_mat);
    if (material?.needs_finish) {
      finishMultiplier = 1;
    }
    if (material?.needs_finish && section.face_finish?.length > 0) {
      section.face_finish.forEach((finishId) => {
        const finishObj = finishTypes?.find((ft) => ft.id === finishId);
        if (finishObj?.finish_markup) {
          finishMultiplier += finishObj.finish_markup / 100;
        }
        if (finishObj?.shop_markup) {
          shopMultiplier += finishObj.shop_markup / 100;
        }
      });
    }
    return { material, finishMultiplier, shopMultiplier };
  }, [faceMaterials, section.face_mat, finishTypes, section.face_finish]);

  const selectedBoxMaterial = useMemo(() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const material = boxMaterials?.find((mat) => mat.id === section.box_mat);
    if (material?.needs_finish) {
      finishMultiplier = 1;
    }
    if (material?.needs_finish && section.box_finish?.length > 0) {
      section.box_finish.forEach((finishId) => {
        const finishObj = finishTypes?.find((ft) => ft.id === finishId);
        if (finishObj?.finish_markup) {
          finishMultiplier += finishObj.finish_markup / 100;
        }
        if (finishObj?.shop_markup) {
          shopMultiplier += finishObj.shop_markup / 100;
        }
      });
    }
    return { material, finishMultiplier, shopMultiplier };
  }, [boxMaterials, section.box_mat, finishTypes, section.box_finish]);

  // Calculate the total price and face counts of all items in the section
  const sectionCalculations = useMemo(() => {
    return getSectionCalculations(section, {
      // Materials
      boxMaterials,
      faceMaterials,
      drawerBoxMaterials,
      selectedFaceMaterial,
      selectedBoxMaterial,

      // Styles & Configuration
      cabinetStyles,
      finishTypes,

      // Hardware
      hardware,

      // Accessories
      accessories,

      // Services & Anchors
      partsListAnchors,
      globalServices: services,
    });
  }, [
    section,
    boxMaterials,
    faceMaterials,
    selectedFaceMaterial,
    selectedBoxMaterial,
    drawerBoxMaterials,
    finishTypes,
    cabinetStyles,
    hardware,
    accessories,
    partsListAnchors,
    services,
  ]);

  // Format number as currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format hours with 2 decimal places
  const formatHours = (hours) => {
    return roundToHundredth(parseFloat(hours || 0));
  };

  // Calculate labor costs by service ID
  const laborCosts = useMemo(() => {
    const hoursByService = sectionCalculations.hoursByService || {};
    let totalLaborCost = 0;
    const costsByService = {};

    Object.entries(hoursByService).forEach(([serviceId, hours]) => {
      const service = services.find(
        (s) => s.service_id === parseInt(serviceId)
      );
      if (service) {
        const cost = hours * (service.hourly_rate || 0);
        costsByService[serviceId] = {
          hours,
          rate: service.hourly_rate || 0,
          cost,
          name: service.service_name,
        };
        totalLaborCost += cost;
      }
    });

    return {
      costsByService,
      totalLaborCost,
    };
  }, [sectionCalculations.hoursByService, services]);

  return (
    <div className="h-full flex flex-col border-l border-slate-700 p-4 w-80">
      {/* Section Total Price - Top Section */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-600">
        <div className="text-slate-300">
          <span className="text-sm font-medium">Section Total Price:</span>
        </div>
        <div className="text-xl font-bold text-teal-400">
          {formatCurrency(
            sectionCalculations.totalPrice + laborCosts.totalLaborCost
          )}
        </div>
      </div>

      {/* Content Section - Scrollable */}
      <div className="flex-1 overflow-auto space-y-4">
        {/* Price Breakdown - Title */}
        <div className="bg-slate-700 py-1 px-2 rounded-t-md">
          <h3 className="text-sm font-medium text-white">Price Breakdown</h3>
        </div>

        {/* Price Breakdown - Content - Grid Layout */}
        <div className="bg-gray-800 rounded-b-md p-3">
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

          {/* Box Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">
              Cabinet Boxes:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.boxCount}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
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
            .map(([type, count]) => (
              <div
                key={type}
                className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700 last:border-0"
              >
                <span className="text-sm text-slate-300 text-left">
                  {FACE_TYPES.find((t) => t.value === type)?.label || type}s:
                </span>
                <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
                  {count}
                </span>
                <span className="text-sm font-medium text-teal-400 text-right">
                  {formatCurrency(sectionCalculations.facePrices[type])}
                </span>
              </div>
            ))}
          {/* Drawer Box Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">
              Drawer Boxes:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.drawerBoxCount}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.drawerBoxTotal)}
            </span>
          </div>

          {/* Rollout Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Rollouts:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.rollOutCount}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.rollOutTotal)}
            </span>
          </div>

          {/* Hardware Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Hinges:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.hingesCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.hingesTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Slides:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.slidesCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.slidesTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Pulls:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.pullsCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.pullsTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Wood:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.woodCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.woodTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Fillers:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.fillerCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {section.section_data.doorStyle === FACE_STYLE_VALUES.SLAB_SHEET ? "(Panel)": ""}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Glass (sqft):</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {roundToHundredth(sectionCalculations.glassCount || 0)}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.glassTotal || 0)}
            </span>
          </div>
        </div>

        {/* Labor Hours - Title */}
        <div className="bg-slate-700 py-1 px-2 rounded-t-md mt-4">
          <h3 className="text-sm font-medium text-white">Labor Hours</h3>
        </div>

        {/* Labor Hours - Content - Grid Layout */}
        <div className="bg-gray-800 rounded-b-md p-3">
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
          {Object.entries(laborCosts.costsByService).map(
            ([serviceType, data]) => (
              <div
                key={serviceType}
                className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700"
              >
                <span className="text-sm text-slate-300 text-left capitalize">
                  {data.name}:
                </span>
                <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
                  {formatHours(data.hours)}
                </span>
                <span className="text-sm font-medium text-teal-400 text-right">
                  {formatCurrency(data.cost)}
                </span>
              </div>
            )
          )}

          {/* Total Labor Cost */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 mt-2 pt-2 border-t border-gray-600">
            <span className="text-sm font-medium text-white text-left">
              Total Labor:
            </span>
            <span className="text-sm font-medium"></span>
            <span className="text-sm font-bold text-teal-400 text-right">
              {formatCurrency(laborCosts.totalLaborCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

EstimateSectionPrice.propTypes = {
  section: PropTypes.object,
};

export default EstimateSectionPrice;
