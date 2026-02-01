import PropTypes from "prop-types";
import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import { useSelector } from "react-redux";

import { interpolateTimeByArea, roundToHundredth } from "../../utils/estimateHelpers";

const PartsListTestCalculator = ({ onClose, formValues, onFormChange }) => {
  const { width, height, depth, selectedPartId, cabinetStyleId } = formValues;

  const { items: partsList } = useSelector((state) => state.partsList);
  const { itemsByPartsList: anchorsByPartsList } = useSelector(
    (state) => state.partsListAnchors
  ) || { itemsByPartsList: {} };
  const { allServices: services } = useSelector((state) => state.services);
  const { styles: cabinetStyles } = useSelector((state) => state.cabinetStyles);

  // Group and sort parts list by needs_finish
  const groupedPartsList = () => {
    if (!partsList || partsList.length === 0) return [];

    const unfinished = partsList
      .filter((part) => part.needs_finish === false)
      .sort((a, b) => a.name.localeCompare(b.name));

    const finished = partsList
      .filter((part) => part.needs_finish === true)
      .sort((a, b) => a.name.localeCompare(b.name));

    const groups = [];
    if (unfinished.length > 0) {
      groups.push({ type: 'group', label: 'Unfinished Parts', items: unfinished });
    }
    if (finished.length > 0) {
      groups.push({ type: 'group', label: 'Finished Parts', items: finished });
    }
    return groups;
  };

  const groupedParts = groupedPartsList();

  // Auto-select first part on load
  useEffect(() => {
    if (groupedParts.length > 0 && !selectedPartId) {
      const firstGroup = groupedParts[0];
      if (firstGroup.items.length > 0) {
        onFormChange("selectedPartId", firstGroup.items[0].id.toString());
      }
    }
  }, [groupedParts, selectedPartId, onFormChange]);
  const selectedPart = partsList?.find((p) => p.id === parseInt(selectedPartId));
  const anchors = selectedPartId ? anchorsByPartsList[selectedPartId] || [] : [];

  // Filter anchors by cabinet style if selected
  const filteredAnchors = cabinetStyleId
    ? anchors.filter(
        (anchor) =>
          anchor.cabinet_style_id === null ||
          anchor.cabinet_style_id === parseInt(cabinetStyleId)
      )
    : anchors;

  // Calculate time for each service
  const calculateTimes = () => {
    if (!selectedPartId || filteredAnchors.length === 0) {
      return {};
    }

    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const area = w * h;

    const timesByService = {};

    // Get all unique service IDs from anchors
    const allServiceIds = new Set();
    filteredAnchors.forEach((anchor) => {
      anchor.services.forEach((service) => {
        allServiceIds.add(service.team_service_id);
      });
    });

    // Calculate time for each service
    allServiceIds.forEach((teamServiceId) => {
      const minutes = interpolateTimeByArea(
        filteredAnchors,
        area,
        teamServiceId,
        cabinetStyleId ? parseInt(cabinetStyleId) : null
      );

      const service = services?.find((s) => s.team_service_id === teamServiceId);
      if (service) {
        timesByService[service.service_name] = {
          minutes: roundToHundredth(minutes),
          hours: roundToHundredth(minutes / 60),
          serviceId: service.service_id,
        };
      }
    });

    return timesByService;
  };

  // Determine if this is a box part that should show breakdown
  const isBoxPart = selectedPart?.name?.toLowerCase().includes("box part");

  // Calculate breakdown for box parts (2 sides, top, bottom, back)
  const getBoxBreakdown = () => {
    if (!isBoxPart) return null;

    const timesByService = calculateTimes();
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const d = parseFloat(depth) || 0;

    const parts = [
      { name: "Side (Left)", width: d, height: h, quantity: 1 },
      { name: "Side (Right)", width: d, height: h, quantity: 1 },
      { name: "Top", width: w, height: d, quantity: 1 },
      { name: "Bottom", width: w, height: d, quantity: 1 },
      { name: "Back", width: w, height: h, quantity: 1 },
    ];

    return parts.map((part) => {
      const partArea = part.width * part.height;
      const partTimes = {};

      Object.keys(timesByService).forEach((serviceName) => {
        const service = services?.find((s) => s.service_name === serviceName);
        if (service) {
          const minutes = interpolateTimeByArea(
            filteredAnchors,
            partArea,
            service.team_service_id,
            cabinetStyleId ? parseInt(cabinetStyleId) : null
          );
          partTimes[serviceName] = {
            minutes: roundToHundredth(minutes * part.quantity),
            hours: roundToHundredth((minutes * part.quantity) / 60),
          };
        }
      });

      return {
        ...part,
        area: roundToHundredth(partArea),
        times: partTimes,
      };
    });
  };

  const timesByService = calculateTimes();
  const boxBreakdown = isBoxPart ? getBoxBreakdown() : null;

  // Calculate totals for box breakdown
  const boxTotals = boxBreakdown
    ? Object.keys(timesByService).reduce((acc, serviceName) => {
        const totalMinutes = boxBreakdown.reduce(
          (sum, part) => sum + (part.times[serviceName]?.minutes || 0),
          0
        );
        acc[serviceName] = {
          minutes: roundToHundredth(totalMinutes),
          hours: roundToHundredth(totalMinutes / 60),
        };
        return acc;
      }, {})
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-100">
            Parts Time Calculator - Test Anchors
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Column - Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Part
                </label>
                <select
                  value={selectedPartId}
                  onChange={(e) => onFormChange("selectedPartId", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {groupedParts.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.name}
                          {part.description ? ` ${part.description}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Width (in)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={width}
                    onChange={(e) => onFormChange("width", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Height (in)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={height}
                    onChange={(e) => onFormChange("height", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Depth (in)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={depth}
                    onChange={(e) => onFormChange("depth", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cabinet Style (Optional Filter)
                </label>
                <select
                  value={cabinetStyleId || ""}
                  onChange={(e) =>
                    onFormChange("cabinetStyleId", e.target.value || null)
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">All Styles (Any Style anchors)</option>
                  {cabinetStyles?.map((style) => (
                    <option
                      key={style.cabinet_style_id}
                      value={style.cabinet_style_id}
                    >
                      {style.cabinet_style_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-slate-700 rounded-md">
                <div className="text-sm text-slate-300">
                  <div>
                    <span className="font-medium">Area:</span>{" "}
                    {roundToHundredth(
                      (parseFloat(width) || 0) * (parseFloat(height) || 0)
                    )}{" "}
                    sq in
                  </div>
                  <div>
                    <span className="font-medium">Anchors:</span>{" "}
                    {filteredAnchors.length} anchor
                    {filteredAnchors.length !== 1 ? "s" : ""} available
                  </div>
                  {cabinetStyleId && (
                    <div className="text-xs text-slate-400 mt-1">
                      Showing anchors for selected style + &quot;Any Style&quot; anchors
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Time Results */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">
                  Calculated Time{isBoxPart ? "" : " (Per Unit)"}
                </h3>
                {Object.keys(timesByService).length === 0 ? (
                  <div className="p-4 bg-slate-700 rounded-md text-slate-400 text-center">
                    No anchors available for this part
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(timesByService).map(
                      ([serviceName, timeData]) => (
                        <div
                          key={serviceName}
                          className="flex items-center justify-between p-3 bg-slate-700 rounded-md"
                        >
                          <span className="font-medium text-slate-200">
                            {serviceName}
                          </span>
                          <div className="text-right">
                            <div className="text-slate-100 font-semibold">
                              {timeData.hours} hrs
                            </div>
                            <div className="text-xs text-slate-400">
                              {timeData.minutes} min
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Box Breakdown Section */}
          {isBoxPart && boxBreakdown && (
            <div className="mt-6 border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Cabinet Box Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-300 font-medium">
                        Part
                      </th>
                      <th className="text-center py-2 px-3 text-slate-300 font-medium">
                        Dimensions
                      </th>
                      <th className="text-center py-2 px-3 text-slate-300 font-medium">
                        Area
                      </th>
                      <th className="text-center py-2 px-3 text-slate-300 font-medium">
                        Qty
                      </th>
                      {Object.keys(timesByService).map((serviceName) => (
                        <th
                          key={serviceName}
                          className="text-right py-2 px-3 text-slate-300 font-medium"
                        >
                          {serviceName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boxBreakdown.map((part, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-700 hover:bg-slate-700/30"
                      >
                        <td className="py-2 px-3 text-slate-200">
                          {part.name}
                        </td>
                        <td className="py-2 px-3 text-slate-300 text-center text-xs">
                          {part.width}&quot; × {part.height}&quot;
                        </td>
                        <td className="py-2 px-3 text-slate-300 text-center">
                          {part.area} sq in
                        </td>
                        <td className="py-2 px-3 text-slate-300 text-center">
                          {part.quantity}
                        </td>
                        {Object.keys(timesByService).map((serviceName) => (
                          <td
                            key={serviceName}
                            className="py-2 px-3 text-slate-100 text-right"
                          >
                            <div className="font-medium">
                              {part.times[serviceName]?.hours || 0} hrs
                            </div>
                            <div className="text-xs text-slate-400">
                              {part.times[serviceName]?.minutes || 0} min
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-slate-700/50 font-semibold">
                      <td className="py-3 px-3 text-slate-100">TOTAL</td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3"></td>
                      {Object.keys(timesByService).map((serviceName) => (
                        <td
                          key={serviceName}
                          className="py-3 px-3 text-slate-100 text-right"
                        >
                          <div className="font-bold">
                            {boxTotals[serviceName]?.hours || 0} hrs
                          </div>
                          <div className="text-xs text-slate-300">
                            {boxTotals[serviceName]?.minutes || 0} min
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-6 p-4 bg-slate-700/50 rounded-md">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">
              How This Works
            </h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>
                • Times are calculated using linear interpolation between your
                anchor points
              </li>
              <li>
                • For box parts, the breakdown shows time for each individual
                piece
              </li>
              <li>
                • Cabinet style filter shows only anchors matching that style
                plus &quot;Any Style&quot; anchors
              </li>
              <li>
                • Times shown do NOT include material multipliers (those are
                applied at the estimate level)
              </li>
              <li>• All calculations use area (width × height) for interpolation</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

PartsListTestCalculator.propTypes = {
  onClose: PropTypes.func.isRequired,
  formValues: PropTypes.shape({
    width: PropTypes.string.isRequired,
    height: PropTypes.string.isRequired,
    depth: PropTypes.string.isRequired,
    selectedPartId: PropTypes.string.isRequired,
    cabinetStyleId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  onFormChange: PropTypes.func.isRequired,
};

export default PartsListTestCalculator;
