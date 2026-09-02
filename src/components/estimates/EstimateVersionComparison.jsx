import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiDownload, FiRefreshCw } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  fetchAccessoriesCatalog,
  fetchAccessoryTimeAnchors,
} from "../../redux/actions/accessories.js";
import { fetchCabinetAnchors } from "../../redux/actions/cabinetAnchors.js";
import { fetchTeamCabinetStyles } from "../../redux/actions/cabinetStyles.js";
import { fetchCabinetTypes } from "../../redux/actions/cabinetTypes.js";
import {
  fetchEstimateById,
  fetchEstimateSectionRevisions,
} from "../../redux/actions/estimates.js";
import { fetchFinishes } from "../../redux/actions/finishes.js";
import {
  fetchHinges,
  fetchPulls,
  fetchSlides,
} from "../../redux/actions/hardware.js";
import { fetchLengthsCatalog } from "../../redux/actions/lengths.js";
import {
  fetchDrawerBoxMaterials,
  fetchSheetGoods,
} from "../../redux/actions/materials.js";
import { fetchPartsList } from "../../redux/actions/partsList.js";
import { fetchPartsListAnchors } from "../../redux/actions/partsListAnchors.js";
import { fetchTeamDefaults } from "../../redux/actions/teamEstimateDefaults.js";
import {
  buildEstimateVersionComparison,
  flattenEstimateVersionComparison,
  normalizeEstimateRevisionRows,
} from "../../utils/estimateVersionComparison.js";

import GenerateVersionComparisonPdf from "./GenerateVersionComparisonPdf.jsx";

const EMPTY_ARRAY = [];

const formatCurrency = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "Unable to price";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
};

const formatDifference = (value, isActive) => {
  if (isActive) return "—";
  if (value == null || !Number.isFinite(Number(value))) return "Unable to price";
  return `${Number(value) > 0 ? "+" : ""}${formatCurrency(value)}`;
};

const csvCell = (value) => {
  if (value == null) return "";
  const stringValue = String(value);
  return /[",\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
};

const formatFileDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const downloadComparisonCsv = (estimate, rooms) => {
  const headings = [
    "Room",
    "Section",
    "Room Quantity",
    "Section Quantity",
    "Version",
    "Active",
    "Extended Total",
    "Difference vs Active",
    "Room Total if Selected",
    "Project Total if Selected",
  ];
  const dataRows = flattenEstimateVersionComparison(rooms).map((row) => [
    row.room,
    row.section,
    row.roomQuantity,
    row.sectionQuantity,
    `v${row.version}`,
    row.active ? "Yes" : "No",
    row.totalPrice?.toFixed(2),
    row.differenceFromActive?.toFixed(2),
    row.roomTotalIfSelected?.toFixed(2),
    row.projectTotalIfSelected?.toFixed(2),
  ]);
  const csv = [headings, ...dataRows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeProjectName = String(estimate?.est_project_name || "Estimate").replace(
    /[\\/:*?"<>|]/g,
    "-",
  );

  link.href = url;
  link.download = `${safeProjectName} Version Comparison ${formatFileDate()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const EstimateVersionComparison = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { estimateId } = useParams();

  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials,
  );
  const finishTypes = useSelector((state) => state.finishes?.finishes || EMPTY_ARRAY);
  const cabinetStyles = useSelector(
    (state) =>
      state.cabinetStyles?.styles?.filter((style) => style.is_active) ||
      EMPTY_ARRAY,
  );
  const cabinetTypes = useSelector(
    (state) =>
      state.cabinetTypes?.types?.filter((type) => type.is_active) || EMPTY_ARRAY,
  );
  const hardware = useSelector((state) => state.hardware);
  const accessories = useSelector((state) => state.accessories);
  const lengths = useSelector((state) => state.lengths);
  const services = useSelector(
    (state) => state.services?.allServices || EMPTY_ARRAY,
  );
  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors?.itemsByPartsList || EMPTY_ARRAY,
  );
  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors?.itemsByType || EMPTY_ARRAY,
  );
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults?.teamDefaults,
  );

  const [revisionRows, setRevisionRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [showOnlyAlternatives, setShowOnlyAlternatives] = useState(false);

  const previewPath = location.pathname.replace(/\/versions\/?$/, "");

  useEffect(() => {
    let isCancelled = false;

    const loadComparison = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const results = await Promise.all([
          dispatch(fetchEstimateById(estimateId)),
          dispatch(fetchEstimateSectionRevisions(estimateId)),
          dispatch(fetchTeamDefaults()),
          dispatch(fetchSheetGoods()),
          dispatch(fetchDrawerBoxMaterials()),
          dispatch(fetchHinges()),
          dispatch(fetchPulls()),
          dispatch(fetchSlides()),
          dispatch(fetchCabinetTypes()),
          dispatch(fetchCabinetAnchors()),
          dispatch(fetchTeamCabinetStyles()),
          dispatch(fetchPartsList()),
          dispatch(fetchPartsListAnchors()),
          dispatch(fetchFinishes()),
          dispatch(fetchAccessoriesCatalog()),
          dispatch(fetchAccessoryTimeAnchors()),
          dispatch(fetchLengthsCatalog()),
        ]);

        if (!isCancelled) {
          setRevisionRows(normalizeEstimateRevisionRows(results[1]));
        }
      } catch (error) {
        if (!isCancelled) {
          setRevisionRows([]);
          setLoadError(
            error?.message || "Unable to load the estimate version comparison.",
          );
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadComparison();

    return () => {
      isCancelled = true;
    };
  }, [dispatch, estimateId, reloadKey]);

  const catalogData = useMemo(
    () => ({
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
      lengthsCatalog: lengths?.catalog || EMPTY_ARRAY,
      accessories,
      teamDefaults,
    }),
    [
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
    ],
  );

  const comparison = useMemo(
    () =>
      buildEstimateVersionComparison({
        estimate: currentEstimate,
        revisionRows,
        catalogData,
      }),
    [currentEstimate, revisionRows, catalogData],
  );

  const visibleRooms = useMemo(() => {
    if (!showOnlyAlternatives) return comparison.rooms;

    return comparison.rooms
      .map((room) => ({
        ...room,
        sections: room.sections.filter(
          (section) => section.versions.length > 1,
        ),
      }))
      .filter((room) => room.sections.length > 0);
  }, [comparison.rooms, showOnlyAlternatives]);

  return (
    <div className="min-h-full bg-slate-900 text-slate-200">
      <div className="fixed right-0 top-0 h-[50px] z-30 flex print:hidden">
        <button
          type="button"
          onClick={() => downloadComparisonCsv(currentEstimate, visibleRooms)}
          disabled={isLoading || Boolean(loadError) || visibleRooms.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
        >
          <FiDownload className="w-4 h-4" />
          Export CSV
        </button>
        <GenerateVersionComparisonPdf
          estimate={currentEstimate}
          rooms={visibleRooms}
          currentProjectTotal={comparison.currentProjectTotal}
          disabled={isLoading || Boolean(loadError) || visibleRooms.length === 0}
        />
      </div>

      <div className="max-w-[1500px] mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate(previewPath)}
              className="mt-1 p-2 rounded-md text-slate-300 hover:text-teal-300 hover:bg-slate-800"
              aria-label="Back to estimate preview"
            >
              <FiArrowLeft size={22} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {currentEstimate?.est_project_name || "Estimate"}
              </h2>
              <p className="text-slate-400 mt-1">
                Version price comparison using current estimate and catalog rates.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Extended totals include both section and room quantities. Additional
                line items are excluded.
              </p>
            </div>
          </div>

          {!isLoading && !loadError && (
            <label className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800 border border-slate-700 rounded-md px-3 py-2">
              <input
                type="checkbox"
                checked={showOnlyAlternatives}
                onChange={(event) => setShowOnlyAlternatives(event.target.checked)}
                className="accent-teal-500"
              />
              Only sections with alternatives
            </label>
          )}
        </div>

        {isLoading ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center text-slate-400">
            Loading and pricing all versions...
          </div>
        ) : loadError ? (
          <div className="bg-red-950/40 border border-red-800 rounded-lg p-8 text-center">
            <p className="text-red-300">{loadError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white"
            >
              <FiRefreshCw /> Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Current rooms total
                </div>
                <div className="text-2xl font-bold text-teal-300 mt-1">
                  {formatCurrency(comparison.currentProjectTotal)}
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Rooms
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {comparison.rooms.length}
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Sections
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {comparison.sectionCount}
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Alternative versions
                </div>
                <div className="text-2xl font-bold text-amber-300 mt-1">
                  {comparison.alternateVersionCount}
                </div>
              </div>
            </div>

            {comparison.pricingErrorCount > 0 && (
              <div className="mb-6 px-4 py-3 rounded-md border border-amber-700 bg-amber-950/30 text-amber-200 text-sm">
                {comparison.pricingErrorCount} version
                {comparison.pricingErrorCount === 1 ? " could" : "s could"} not
                be priced. Those cells are marked in the comparison.
              </div>
            )}

            {visibleRooms.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center text-slate-400">
                {showOnlyAlternatives
                  ? "No sections have alternative versions."
                  : "No rooms were found in this estimate."}
              </div>
            ) : (
              <div className="space-y-6">
                {visibleRooms.map((room) => (
                  <section
                    key={room.taskId}
                    className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-4 px-5 py-4 bg-slate-900/40 border-b border-slate-700">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {room.taskName}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Room quantity: {room.taskQuantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Current room total
                        </div>
                        <div className="text-xl font-semibold text-teal-300">
                          {formatCurrency(room.activeRoomTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1050px] text-sm">
                        <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="px-4 py-3 text-left">Section</th>
                            <th className="px-4 py-3 text-center">Version</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Extended total</th>
                            <th className="px-4 py-3 text-right">Change vs active</th>
                            <th className="px-4 py-3 text-right">Room if selected</th>
                            <th className="px-4 py-3 text-right">Project if selected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {room.sections.flatMap((section) =>
                            section.versions.map((version, versionIndex) => (
                              <tr
                                key={version.sectionId}
                                className={
                                  version.isActive
                                    ? "bg-teal-950/20"
                                    : "hover:bg-slate-700/30"
                                }
                              >
                                <td className="px-4 py-3 font-medium text-slate-200">
                                  {versionIndex === 0 ? section.sectionName : ""}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-200">
                                  v{version.revision}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                      version.isActive
                                        ? "bg-teal-900/60 text-teal-300"
                                        : "bg-slate-700 text-slate-300"
                                    }`}
                                  >
                                    {version.isActive ? "Active" : "Alternative"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-100">
                                  {formatCurrency(version.totalPrice)}
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-medium ${
                                    version.differenceFromActive > 0
                                      ? "text-red-300"
                                      : version.differenceFromActive < 0
                                        ? "text-emerald-300"
                                        : "text-slate-400"
                                  }`}
                                >
                                  {formatDifference(
                                    version.differenceFromActive,
                                    version.isActive,
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-200">
                                  {formatCurrency(version.roomTotalIfSelected)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-200">
                                  {formatCurrency(version.projectTotalIfSelected)}
                                </td>
                              </tr>
                            )),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EstimateVersionComparison;
