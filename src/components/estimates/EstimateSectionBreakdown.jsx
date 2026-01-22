import PropTypes from "prop-types";
import { FiX } from "react-icons/fi";
import { useSelector } from "react-redux";

import { 
  formatCurrency,
  formatHours,
  getBreakdownCategories,
  getServiceName,
  getLaborAdjustmentHours
} from "../../utils/sectionBreakdownHelpers";

import GenerateSectionBreakdownPdf from "./GenerateSectionBreakdownPdf.jsx";

const EstimateSectionBreakdown = ({ 
  sectionCalculations,
  section,
  projectName,
  taskName,
  sectionName,
  onClose 
}) => {
  const allServices = useSelector((state) => state.services.allServices);

  const breakdownCategories = getBreakdownCategories(sectionCalculations);

  const activeCategories = breakdownCategories.filter(
    (cat) => cat.cost > 0 || cat.count > 0
  );

  // Get labor adjustment hours from section.add_hours
  const laborAdjustmentHours = getLaborAdjustmentHours(section?.add_hours);

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
        <div className="grid gap-3 py-3 px-4 bg-slate-700 rounded text-xs font-semibold" style={{ gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => '1fr').join(' ')}` }}>
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
            style={{ gridTemplateColumns: `2fr 1.5fr ${serviceIds.map(() => '1fr').join(' ')}` }}
          >
            <div className="text-white font-medium text-sm">
              Labor Adds
            </div>
            <div className="text-slate-600 text-right text-sm">
              -
            </div>
            {serviceIds.map((serviceId) => {
              const hours = laborAdjustmentHours[serviceId];
              return (
                <div key={serviceId} className="text-blue-300 text-right text-sm tabular-nums font-semibold">
                  {hours ? formatHours(hours) : '-'}
                </div>
              );
            })}
          </div>
        )}

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
  section: PropTypes.object,
  projectName: PropTypes.string,
  taskName: PropTypes.string,
  sectionName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default EstimateSectionBreakdown;
