import PropTypes from "prop-types";
import { FiX } from "react-icons/fi";

import { roundToHundredth } from "../../utils/estimateHelpers";

import GenerateSectionBreakdownPdf from "./GenerateSectionBreakdownPdf.jsx";

const EstimateSectionBreakdown = ({ 
  sectionCalculations, 
  projectName,
  taskName,
  sectionName,
  onClose 
}) => {
  const formatCurrency = (value) => {
    return `$${roundToHundredth(parseFloat(value || 0)).toLocaleString()}`;
  };

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '-';
    return Number(hours.toFixed(2));
  };

  const getServiceName = (serviceId) => {
    const serviceNames = {
      2: "Shop",
      3: "Finish",
      4: "Install",
      5: "CNC",
      6: "Delivery",
    };
    return serviceNames[serviceId] || `Service ${serviceId}`;
  };

  // Helper to show aggregated hours note
  const getHoursDisplay = (hoursByService, showAggregateNote = false) => {
    if (!hoursByService || Object.keys(hoursByService).length === 0) return null;
    return { hoursByService, showAggregateNote };
  };

  const breakdownCategories = [
    {
      title: "Cabinet Boxes",
      cost: sectionCalculations?.boxTotal || 0,
      count: sectionCalculations?.boxCount || 0,
      unit: "boxes",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.boxes),
    },
    {
      title: "Doors",
      cost: sectionCalculations?.facePrices?.door || 0,
      count: sectionCalculations?.faceCounts?.door || 0,
      unit: "doors",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.door),
    },
    {
      title: "Drawer Fronts",
      cost: sectionCalculations?.facePrices?.drawer_front || 0,
      count: sectionCalculations?.faceCounts?.drawer_front || 0,
      unit: "fronts",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.drawer_front),
    },
    {
      title: "False Fronts",
      cost: sectionCalculations?.facePrices?.false_front || 0,
      count: sectionCalculations?.faceCounts?.false_front || 0,
      unit: "fronts",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.false_front),
    },
    {
      title: "Panels",
      cost: sectionCalculations?.facePrices?.panel || 0,
      count: sectionCalculations?.faceCounts?.panel || 0,
      unit: "panels",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.panel),
    },
    {
      title: "Hood",
      cost: 0, // Hoods are special cabinet types, no separate cost tracking
      count: sectionCalculations?.hoodCount || 0,
      unit: "hoods",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.hood),
    },
    {
      title: "Drawer Boxes",
      cost: sectionCalculations?.drawerBoxTotal || 0,
      count: sectionCalculations?.drawerBoxCount || 0,
      unit: "boxes",
      skipHours: true, // Included in Cabinet Boxes aggregate
    },
    {
      title: "Rollouts",
      cost: sectionCalculations?.rollOutTotal || 0,
      count: sectionCalculations?.rollOutCount || 0,
      unit: "rollouts",
      skipHours: true, // Included in Cabinet Boxes aggregate
    },
    {
      title: "Hinges",
      cost: sectionCalculations?.hingesTotal || 0,
      count: sectionCalculations?.hingesCount || 0,
      unit: "hinges",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.hinges),
    },
    {
      title: "Drawer Slides",
      cost: sectionCalculations?.slidesTotal || 0,
      count: sectionCalculations?.slidesCount || 0,
      unit: "slides",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.slides),
    },
    {
      title: "Pulls",
      cost: sectionCalculations?.pullsTotal || 0,
      count: sectionCalculations?.pullsCount || 0,
      unit: "pulls",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.pulls),
    },
    {
      title: "Face Frame",
      cost: sectionCalculations?.faceFrameWoodTotal || 0,
      count: sectionCalculations?.faceFrameWoodCount.toFixed(2) || 0,
      unit: "bd ft",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.faceFrame),
    },
    {
      title: "Fillers",
      cost: sectionCalculations?.fillerWoodTotal || 0,
      count: sectionCalculations?.fillerWoodCount.toFixed(2) || 0,
      unit: "bd ft",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.fillers),
    },
    {
      title: "End Panels/Nosing",
      cost: sectionCalculations?.endPanelNosingWoodTotal || 0,
      count: sectionCalculations?.endPanelNosingWoodCount.toFixed(2) || 0,
      unit: "bd ft",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.endPanelNosing),
    },
    {
      title: "Lengths",
      cost: sectionCalculations?.lengthsTotal || 0,
      count: sectionCalculations?.lengthsCount.toFixed(2) || 0,
      unit: "items",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.lengths),
    },
    {
      title: "Accessories",
      cost: sectionCalculations?.accessoriesTotal || 0,
      count: sectionCalculations?.accessoriesCount || 0,
      unit: "items",
      ...getHoursDisplay(sectionCalculations?.categoryHours?.accessories),
    },
    {
      title: "Other",
      cost: sectionCalculations?.otherTotal || 0,
      count: sectionCalculations?.otherCount || 0,
      unit: "items",
      skipHours: true, // Other items don't have labor hours
    },
  ];

  const activeCategories = breakdownCategories.filter(
    (cat) => cat.cost > 0 || cat.count > 0
  );

  const serviceIds = sectionCalculations?.laborCosts?.costsByService
    ? Object.keys(sectionCalculations.laborCosts.costsByService).map(Number).sort()
    : [];

  return (
    <div className="bg-slate-800 rounded-lg flex flex-col h-full">
      {/* Sticky Header - Title and Buttons */}
      <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-600 flex-shrink-0">
        <h2 className="text-xl font-bold text-white">Section Parts & Labor Breakdown</h2>
        <div className="flex gap-3">
          <GenerateSectionBreakdownPdf 
            sectionCalculations={sectionCalculations}
            projectName={projectName}
            taskName={taskName}
            sectionName={sectionName}
          />
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors"
          >
            <FiX size={18} />
            Close
          </button>
        </div>
      </div>

      {/* Sticky Table Header */}
      <div className="px-6 pt-4 flex-shrink-0">
        <div className="grid gap-3 py-3 px-4 bg-slate-700 rounded text-xs font-semibold" style={{ gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => '1fr').join(' ')}` }}>
          <div className="text-slate-200">Item</div>
          <div className="text-slate-200 text-right">Cost</div>
          {serviceIds.map((serviceId) => (
            <div key={serviceId} className="text-slate-200 text-right">
              {getServiceName(serviceId)}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Data Rows */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {activeCategories.map((category, index) => {
          const countDisplay = category.count > 0 ? ` (${category.count})` : '';
          const showAggregate = category.showAggregateNote && !category.skipHours;
          
          return (
            <div
              key={index}
              className="grid gap-3 py-3 px-4 border-b border-slate-700 hover:bg-slate-750 transition-colors"
              style={{ gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => '1fr').join(' ')}` }}
            >
              <div className="text-white font-medium text-sm">
                {category.title}
                <span className="text-slate-500 text-xs ml-1">{countDisplay}</span>
              </div>
              <div className="text-teal-400 text-right font-semibold text-sm">
                {formatCurrency(category.cost)}
              </div>
              {serviceIds.map((serviceId) => {
                if (category.skipHours) {
                  return (
                    <div key={serviceId} className="text-slate-600 text-right text-sm">
                      -
                    </div>
                  );
                }
                const hours = category.hoursByService?.[serviceId];
                return (
                  <div key={serviceId} className="text-slate-300 text-right text-sm tabular-nums" title={showAggregate ? `Combined hours for ${category.aggregateLabel}` : ''}>
                    {hours ? (
                      <>
                        {formatHours(hours)}
                        {showAggregate && <span className="text-slate-600 ml-1">*</span>}
                      </>
                    ) : '-'}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sticky Totals Row at Bottom */}
      <div className="px-6 pb-6 pt-4 border-t-2 border-teal-500 flex-shrink-0">
        <div className="grid gap-3 py-4 px-4 bg-teal-900 bg-opacity-30 rounded font-bold" style={{ gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => '1fr').join(' ')}` }}>
          <div className="text-white text-base">Total</div>
          <div className="text-teal-300 text-right text-base">
            {formatCurrency(sectionCalculations?.partsTotalPrice || 0)}
          </div>
          {serviceIds.map((serviceId) => {
            const serviceData = sectionCalculations?.laborCosts?.costsByService?.[serviceId];
            return (
              <div key={serviceId} className="text-teal-300 text-right text-base tabular-nums">
                {serviceData ? formatHours(serviceData.hours) : "-"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

EstimateSectionBreakdown.propTypes = {
  sectionCalculations: PropTypes.object.isRequired,
  projectName: PropTypes.string,
  taskName: PropTypes.string,
  sectionName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default EstimateSectionBreakdown;
