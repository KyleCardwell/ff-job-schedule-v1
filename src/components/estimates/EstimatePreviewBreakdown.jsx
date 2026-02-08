import PropTypes from "prop-types";

const FACE_TYPE_LABELS = {
  door: "Doors",
  drawer_front: "Drawer Fronts",
  false_front: "False Fronts",
  panel: "Panels",
};

const EXCLUDED_FACE_TYPES = [
  "open",
  "container",
  "pair_door",
  "glassPanels",
  "glassShelfFaces",
  "drawer_box",
];

const EstimatePreviewBreakdown = ({ breakdown, grandTotal, lineItemsTotal }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  if (!breakdown) {
    return (
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-0 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-bold text-teal-400 mb-4">Estimate Total</h2>
          <p className="text-slate-400 text-sm">No data yet</p>
        </div>
      </div>
    );
  }

  const totalServices = Object.values(breakdown.services).reduce(
    (sum, s) => sum + s.cost,
    0
  );

  return (
    <div className="w-72 flex-shrink-0">
      <div className="mt-8 max-h-[calc(100vh-150px)] overflow-y-auto bg-slate-800 rounded-lg p-4 space-y-4">
        {/* Grand Total */}
        <div className="pb-4 border-b-2 border-teal-500">
          <div className="text-sm text-slate-400">Estimate Total</div>
          <div className="text-3xl font-bold text-teal-400">
            {formatCurrency(grandTotal)}
          </div>
        </div>

        {/* Parts Breakdown */}
        {breakdown.partsTotal > 0 && breakdown.parts && (
          <div className="pb-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Parts
            </h3>
            <div className="space-y-1">
              {breakdown.parts.boxCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Boxes <span className="text-slate-500">({breakdown.parts.boxCount})</span>
                  </span>
                  <span className="text-slate-200">{formatCurrency(breakdown.parts.boxTotal)}</span>
                </div>
              )}

              {Object.entries(breakdown.parts.faceCounts || {})
                .filter(
                  ([type, count]) =>
                    count > 0 && !EXCLUDED_FACE_TYPES.includes(type)
                )
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-slate-300">
                      {FACE_TYPE_LABELS[type] || type}{" "}
                      <span className="text-slate-500">({count})</span>
                    </span>
                    <span className="text-slate-200">
                      {formatCurrency(breakdown.parts.facePrices[type] || 0)}
                    </span>
                  </div>
                ))}

              {breakdown.parts.drawerBoxCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Drawer Boxes{" "}
                    <span className="text-slate-500">({breakdown.parts.drawerBoxCount})</span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(breakdown.parts.drawerBoxTotal)}
                  </span>
                </div>
              )}

              {breakdown.parts.rollOutCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Rollouts{" "}
                    <span className="text-slate-500">({breakdown.parts.rollOutCount})</span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(breakdown.parts.rollOutTotal)}
                  </span>
                </div>
              )}

              {breakdown.parts.hingesCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Hinges{" "}
                    <span className="text-slate-500">({breakdown.parts.hingesCount})</span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(breakdown.parts.hingesTotal)}
                  </span>
                </div>
              )}

              {breakdown.parts.slidesCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Slides{" "}
                    <span className="text-slate-500">({breakdown.parts.slidesCount})</span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(breakdown.parts.slidesTotal)}
                  </span>
                </div>
              )}

              {breakdown.parts.pullsCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Pulls{" "}
                    <span className="text-slate-500">({breakdown.parts.pullsCount})</span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(breakdown.parts.pullsTotal)}
                  </span>
                </div>
              )}

              {breakdown.parts.woodCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Wood{" "}
                    <span className="text-slate-500">({breakdown.parts.woodCount})</span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(breakdown.parts.woodTotal)}
                  </span>
                </div>
              )}

              {breakdown.parts.accessoriesCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Accessories{" "}
                    <span className="text-slate-500">
                      ({breakdown.parts.accessoriesCount})
                    </span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(breakdown.parts.accessoriesTotal)}
                  </span>
                </div>
              )}

              {breakdown.parts.otherCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    Other{" "}
                    <span className="text-slate-500">({breakdown.parts.otherCount})</span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(breakdown.parts.otherTotal)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-700">
                <span className="text-slate-200">Total Parts</span>
                <span className="text-teal-400">
                  {formatCurrency(breakdown.partsTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Services Breakdown */}
        {Object.keys(breakdown.services).length > 0 && (
          <div className="pb-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Services
            </h3>
            <div className="space-y-1">
              {Object.entries(breakdown.services).map(([serviceId, data]) => (
                <div key={serviceId} className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    {data.name}{" "}
                    <span className="text-slate-500">
                      ({formatNumber(data.hours)} hrs)
                    </span>
                  </span>
                  <span className="text-slate-200">
                    {formatCurrency(data.cost)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-700">
                <span className="text-slate-200">Total Services</span>
                <span className="text-teal-400">
                  {formatCurrency(totalServices)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Adjustments */}
        <div className="pb-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Adjustments
          </h3>
          <div className="space-y-1">
            {breakdown.subtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Subtotal</span>
                <span className="text-slate-200">
                  {formatCurrency(breakdown.subtotal)}
                </span>
              </div>
            )}
            {breakdown.profit > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Profit</span>
                <span className="text-green-400">
                  +{formatCurrency(breakdown.profit)}
                </span>
              </div>
            )}
            {breakdown.commission > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">Commission</span>
                <span className="text-blue-400">
                  +{formatCurrency(breakdown.commission)}
                </span>
              </div>
            )}
            {breakdown.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-400">Discount</span>
                <span className="text-red-400">
                  -{formatCurrency(breakdown.discount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        {lineItemsTotal > 0 && (
          <div className="pb-3 border-b border-slate-700">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-200">Line Items</span>
              <span className="text-teal-400">
                {formatCurrency(lineItemsTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Grand Total (repeated at bottom for easy reference) */}
        <div className="pt-1">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-100">Total</span>
            <span className="text-lg font-bold text-teal-400">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

EstimatePreviewBreakdown.propTypes = {
  breakdown: PropTypes.object,
  grandTotal: PropTypes.number.isRequired,
  lineItemsTotal: PropTypes.number,
};

export default EstimatePreviewBreakdown;
