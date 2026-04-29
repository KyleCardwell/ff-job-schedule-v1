import PropTypes from "prop-types";
import { FiX } from "react-icons/fi";
import { useSelector } from "react-redux";

import {
  EXCLUDED_HOURS_PART_KEYS_BY_CATEGORY,
  PANEL_MOD_PART_KEY_BY_FACE_TYPE,
  PULLS_PART_KEYS_BY_TYPE,
} from "../../utils/constants.js";
import {
  formatCurrency,
  formatHours,
  getBreakdownCategories,
  getServiceName,
  getLaborAdjustmentHours,
} from "../../utils/sectionBreakdownHelpers";

import GenerateSectionBreakdownPdf from "./GenerateSectionBreakdownPdf.jsx";

const EstimateSectionBreakdown = ({
  sectionCalculations,
  section,
  projectName,
  taskName,
  sectionName,
  onClose,
}) => {
  const allServices = useSelector((state) => state.services.allServices);

  const hasExcludedPartKey = (partKey) =>
    sectionCalculations?.partsIncluded?.[partKey] === false;

  const getExcludedHoursForCategoryService = (
    categoryTitle,
    serviceId,
    totalHours,
  ) => {
    const numericTotalHours = Number(totalHours) || 0;
    if (numericTotalHours <= 0) return 0;

    if (categoryTitle === "Pulls") {
      if (hasExcludedPartKey("pullsTotal")) return numericTotalHours;

      const pullsByType = sectionCalculations?.categoryHours?.pullsByType || {};
      const excludedPullHours = Object.entries(PULLS_PART_KEYS_BY_TYPE).reduce(
        (sum, [pullType, partKeys]) => {
          const shouldExcludePullType = (partKeys || []).some((partKey) =>
            hasExcludedPartKey(partKey),
          );
          if (!shouldExcludePullType) return sum;

          return sum + (Number(pullsByType?.[pullType]?.[serviceId]) || 0);
        },
        0,
      );

      return Math.min(numericTotalHours, excludedPullHours);
    }

    if (categoryTitle === "Panel Mods") {
      const panelModsByFaceType =
        sectionCalculations?.categoryHours?.panelModsByFaceType || {};

      const excludedPanelModHours = Object.entries(
        PANEL_MOD_PART_KEY_BY_FACE_TYPE,
      ).reduce((sum, [faceType, partKey]) => {
        if (!hasExcludedPartKey(partKey)) return sum;
        return (
          sum + (Number(panelModsByFaceType?.[faceType]?.[serviceId]) || 0)
        );
      }, 0);

      return Math.min(numericTotalHours, excludedPanelModHours);
    }

    const partKeys = EXCLUDED_HOURS_PART_KEYS_BY_CATEGORY[categoryTitle] || [];
    const excludeCategoryHours = partKeys.some((partKey) =>
      hasExcludedPartKey(partKey),
    );
    return excludeCategoryHours ? numericTotalHours : 0;
  };

  const getItemHourRows = (categoryTitle) => {
    if (categoryTitle === "Other") {
      const otherItems = Array.isArray(section?.other) ? section.other : [];

      return otherItems
        .map((item, index) => ({
          id: item?.id || item?.temp_id || `other-${index}`,
          name: item?.name || "Other",
          quantity: Number(item?.quantity) || 0,
          price: (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
          hoursByService: {},
        }))
        .filter(
          (item) =>
            item.name || Number(item.quantity) > 0 || Number(item.price) > 0,
        )
        .sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    }

    const itemHoursByCatalog =
      categoryTitle === "Lengths"
        ? sectionCalculations?.categoryHours?.lengthsByCatalog
        : categoryTitle === "Accessories"
          ? sectionCalculations?.categoryHours?.accessoriesByCatalog
          : null;

    if (!itemHoursByCatalog || typeof itemHoursByCatalog !== "object") {
      return [];
    }

    return Object.values(itemHoursByCatalog)
      .filter((item) => {
        if (!item?.hoursByService) return false;
        return Object.values(item.hoursByService).some((hours) => hours > 0);
      })
      .sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
  };

  const breakdownCategories = getBreakdownCategories(sectionCalculations);

  const activeCategories = breakdownCategories.filter((cat) => {
    const hasHours =
      cat.hoursByService &&
      Object.values(cat.hoursByService).some((hours) => hours > 0);
    return cat.cost > 0 || cat.count > 0 || hasHours;
  });

  // Get labor adjustment hours from section.add_hours
  const laborAdjustmentHours = getLaborAdjustmentHours(section?.add_hours);

  const hasExcludedHoursMarker = activeCategories.some((cat) => {
    if (cat.skipHours) return false;
    return Object.entries(cat.hoursByService || {}).some(
      ([serviceId, hours]) =>
        getExcludedHoursForCategoryService(cat.title, serviceId, hours) > 0,
    );
  });

  const serviceIds = sectionCalculations?.laborCosts?.costsByService
    ? Object.keys(sectionCalculations.laborCosts.costsByService)
        .map(Number)
        .sort()
    : [];

  const totalServicesCost =
    sectionCalculations?.laborCosts?.totalLaborCost || 0;
  const subtotal = sectionCalculations?.subTotalPrice || 0;
  const sectionProfit = sectionCalculations?.profit || 0;
  const sectionCommission = sectionCalculations?.commission || 0;
  const sectionDiscount = sectionCalculations?.discount || 0;
  const sectionTotal = sectionCalculations?.totalPrice || 0;

  return (
    <div className="bg-slate-800 rounded-lg flex flex-col h-full">
      {/* Sticky Header - Title and Buttons */}
      <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-600 flex-shrink-0">
        <h2 className="text-xl font-bold text-white">
          Section Parts & Labor Breakdown
        </h2>
        <div className="flex gap-3">
          <GenerateSectionBreakdownPdf
            sectionCalculations={sectionCalculations}
            section={section}
            projectName={projectName}
            taskName={taskName}
            sectionName={sectionName}
          />
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-slate-500 transition-colors"
          >
            <FiX size={18} />
            Close
          </button>
        </div>
      </div>

      {/* Sticky Table Header */}
      <div className="px-6 pt-4 flex-shrink-0">
        <div
          className="grid gap-3 py-3 px-4 bg-slate-700 rounded text-xs font-semibold"
          style={{
            gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => "1fr").join(" ")}`,
          }}
        >
          <div className="text-slate-200">Item</div>
          <div className="text-slate-200 text-right">Cost</div>
          {serviceIds.map((serviceId) => (
            <div key={serviceId} className="text-slate-200 text-right">
              {getServiceName(serviceId, allServices)}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Data Rows */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {/* Labor Adjustments Row */}
        {laborAdjustmentHours && (
          <div
            className="grid gap-3 py-3 px-4 border-b border-slate-700 bg-blue-900/20 hover:bg-blue-900/30 transition-colors"
            style={{
              gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => "1fr").join(" ")}`,
            }}
          >
            <div className="text-white font-medium text-sm">Labor Adds</div>
            <div className="text-slate-600 text-right text-sm">-</div>
            {serviceIds.map((serviceId) => {
              if (serviceId === 3 && !sectionCalculations.finishSetupNeeded) {
                return (
                  <div
                    key={serviceId}
                    className="text-blue-300 text-right text-sm tabular-nums font-semibold"
                  >
                    -
                  </div>
                );
              }
              const hours = laborAdjustmentHours[serviceId];
              return (
                <div
                  key={serviceId}
                  className="text-blue-300 text-right text-sm tabular-nums font-semibold"
                >
                  {hours ? formatHours(hours) : "-"}
                </div>
              );
            })}
          </div>
        )}

        {activeCategories.map((category, index) => {
          const countDisplay = category.count > 0 ? ` (${category.count})` : "";
          const showAggregate =
            category.showAggregateNote && !category.skipHours;
          const itemHourRows = getItemHourRows(category.title);
          const hasItemHourRows = itemHourRows.length > 0;
          const hasExcludedHours =
            !category.skipHours &&
            Object.entries(category.hoursByService || {}).some(
              ([serviceId, hours]) =>
                getExcludedHoursForCategoryService(
                  category.title,
                  serviceId,
                  hours,
                ) > 0,
            );

          return (
            <div key={index}>
              <div
                className="grid gap-3 py-3 px-4 border-b border-slate-700 hover:bg-slate-750 transition-colors"
                style={{
                  gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => "1fr").join(" ")}`,
                }}
              >
                <div className="text-white font-medium text-sm text-left">
                  {category.title}
                  {hasExcludedHours && (
                    <span
                      className="text-amber-400 ml-1"
                      title="Hours excluded from totals"
                    >
                      *
                    </span>
                  )}
                  <span className="text-slate-500 text-xs ml-1">
                    {countDisplay}
                  </span>
                </div>
                <div className="text-teal-400 text-right font-semibold text-sm">
                  {hasItemHourRows
                    ? `(${formatCurrency(category.cost)})`
                    : formatCurrency(category.cost)}
                </div>
                {serviceIds.map((serviceId) => {
                  if (category.skipHours) {
                    return (
                      <div
                        key={serviceId}
                        className="text-slate-600 text-right text-sm"
                      >
                        -
                      </div>
                    );
                  }
                  const hours = category.hoursByService?.[serviceId];
                  const excludedHours = getExcludedHoursForCategoryService(
                    category.title,
                    serviceId,
                    hours,
                  );
                  const includedHours = Math.max(
                    0,
                    (Number(hours) || 0) - excludedHours,
                  );

                  return (
                    <div
                      key={serviceId}
                      className="text-slate-300 text-right text-sm tabular-nums"
                      title={
                        showAggregate
                          ? `Combined hours for ${category.aggregateLabel}`
                          : ""
                      }
                    >
                      {hours ? (
                        <>
                          {excludedHours > 0 && (
                            <span
                              className="text-amber-400"
                              title="Hours excluded from totals"
                            >
                              ({formatHours(excludedHours)})
                            </span>
                          )}
                          <span className={excludedHours > 0 ? "ml-1" : ""}>
                            {includedHours > 0
                              ? hasItemHourRows
                                ? `(${formatHours(includedHours)})`
                                : formatHours(includedHours)
                              : excludedHours > 0
                                ? ""
                                : "-"}
                          </span>
                          {showAggregate && includedHours > 0 && (
                            <span className="text-slate-600 ml-1">^</span>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  );
                })}
              </div>

              {itemHourRows.map((itemHours) => (
                <div
                  key={`${category.title}-${itemHours.id}`}
                  className="grid gap-3 py-2 px-4 border-b border-slate-700/60 bg-slate-900/20"
                  style={{
                    gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => "1fr").join(" ")}`,
                  }}
                >
                  <div className="text-slate-300 text-xs text-left pl-4">
                    <span className="text-slate-500 mr-1">-</span>
                    {itemHours.name}{" "}
                    {itemHours.length
                      ? `(${itemHours.quantity > 1 ? `${itemHours.quantity} @ ` : ""}${itemHours.length} ft)`
                      : itemHours.quantity
                        ? `(${itemHours.quantity})`
                        : ""}
                  </div>
                  <div className="text-slate-400 text-right text-xs">
                    {itemHours.price ? formatCurrency(itemHours.price) : "-"}
                  </div>
                  {serviceIds.map((serviceId) => {
                    const hours = itemHours.hoursByService?.[serviceId];
                    const excludedHours = hasExcludedHours
                      ? Number(hours) || 0
                      : 0;
                    const includedHours = Math.max(
                      0,
                      (Number(hours) || 0) - excludedHours,
                    );

                    return (
                      <div
                        key={`${itemHours.id}-${serviceId}`}
                        className="text-slate-400 text-right text-xs tabular-nums"
                      >
                        {hours ? (
                          excludedHours > 0 ? (
                            <>
                              <span
                                className="text-amber-400"
                                title="Hours excluded from totals"
                              >
                                ({formatHours(excludedHours)})
                              </span>
                              <span className="ml-1">
                                {includedHours > 0
                                  ? formatHours(includedHours)
                                  : "-"}
                              </span>
                            </>
                          ) : (
                            formatHours(hours)
                          )
                        ) : (
                          "-"
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Sticky Totals Row at Bottom */}
      <div className="px-6 pb-6 pt-4 border-t-2 border-teal-500 flex-shrink-0">
        <div
          className="grid gap-3 py-4 px-4 bg-teal-900 bg-opacity-30 rounded font-bold"
          style={{
            gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => "1fr").join(" ")}`,
          }}
        >
          <div className="text-white text-base">Total Parts</div>
          <div className="text-teal-300 text-right text-base">
            {formatCurrency(sectionCalculations?.partsTotalPrice || 0)}
          </div>
          {serviceIds.map((serviceId) => {
            const serviceData =
              sectionCalculations?.laborCosts?.costsByService?.[serviceId];
            return (
              <div
                key={serviceId}
                className="text-teal-300 text-right text-base tabular-nums"
              >
                {serviceData ? formatHours(serviceData.hours) : "-"}
              </div>
            );
          })}
        </div>

        <div
          className="grid gap-3 py-3 px-4 mt-2 bg-teal-900 bg-opacity-20 rounded font-semibold border border-teal-800"
          style={{
            gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => "1fr").join(" ")}`,
          }}
        >
          <div className="text-white text-sm">Total Hours Price</div>
          <div className="text-teal-300 text-right text-sm">
            {formatCurrency(totalServicesCost)}
          </div>
          {serviceIds.map((serviceId) => {
            const serviceData =
              sectionCalculations?.laborCosts?.costsByService?.[serviceId];
            return (
              <div key={serviceId} className="text-teal-300 text-right text-sm">
                {serviceData ? formatCurrency(serviceData.cost) : "-"}
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-600 space-y-1">
          {hasExcludedHoursMarker && (
            <div className="text-xs text-amber-300">
              (x) is excluded from totals; values outside parentheses are
              included.
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-300">
            <span>Subtotal (Parts + Labor)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {sectionProfit > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Profit</span>
              <span>+{formatCurrency(sectionProfit)}</span>
            </div>
          )}
          {sectionCommission > 0 && (
            <div className="flex justify-between text-sm text-blue-400">
              <span>Commission</span>
              <span>+{formatCurrency(sectionCommission)}</span>
            </div>
          )}
          {sectionDiscount > 0 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Discount</span>
              <span>-{formatCurrency(sectionDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-teal-300 pt-2 border-t border-slate-700">
            <span>Section Total</span>
            <span>{formatCurrency(sectionTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

EstimateSectionBreakdown.propTypes = {
  sectionCalculations: PropTypes.object.isRequired,
  section: PropTypes.object,
  projectName: PropTypes.string,
  taskName: PropTypes.string,
  sectionName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default EstimateSectionBreakdown;
