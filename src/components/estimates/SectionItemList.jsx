import PropTypes from "prop-types";
import { useState, useCallback, useEffect, useRef } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiCopy } from "react-icons/fi";
import { LuArrowDownUp } from "react-icons/lu";
import { RiSwapBoxLine } from "react-icons/ri";
import { useSelector } from "react-redux";

import { ITEM_TYPES, PANEL_MOD_DISPLAY_NAMES } from "../../utils/constants.js";
import { getEffectiveValueOnly } from "../../utils/estimateDefaults.js";
import { generateCabinetSummary } from "../../utils/estimateHelpers.js";
import DuplicateItemModal from "../common/DuplicateItemModal.jsx";
import ReorderModal from "../common/ReorderModal.jsx";
import Tooltip from "../common/Tooltip.jsx";

import CabinetFacePreview from "./CabinetFacePreview.jsx";

const SectionItemList = ({
  items,
  columns,
  addButtonText,
  emptyStateText,
  onSave,
  onDelete,
  onReorder,
  onDuplicate,
  onMove,
  ItemForm,
  hideAddButton = false,
  formProps = {},
  getReorderItemName,
  getItemSummary,
  listType,
  currentTaskId,
  currentSectionId,
}) => {
  const cabinetTypes = useSelector((state) => state.cabinetTypes.types);
  const cabinetStyles = useSelector((state) => state.cabinetStyles.styles);
  const accessories = useSelector((state) => state.accessories);
  const faceMaterialOptions = useSelector(
    (state) => state.materials?.faceMaterials || [],
  );
  const finishOptions = useSelector((state) => state.finishes?.finishes || []);
  const currentEstimate = useSelector((state) => state.estimates.currentEstimate);
  const teamDefaults = useSelector(
    (state) => state.teamEstimateDefaults.teamDefaults,
  );
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateItemIndex, setDuplicateItemIndex] = useState(-1);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveItemIndex, setMoveItemIndex] = useState(-1);
  const [recentlyClosedIndex, setRecentlyClosedIndex] = useState(-1);
  const [animateEditOpen, setAnimateEditOpen] = useState(false);
  const [animateNewOpen, setAnimateNewOpen] = useState(false);
  const editFormRefs = useRef({});
  const newFormRef = useRef(null);
  const closeEditTimeoutRef = useRef(null);
  const closeNewTimeoutRef = useRef(null);
  const transitionDurationMs = 300;

  // Check if any form is currently active (adding or editing)
  const isFormActive = showNewItem || editingIndex !== -1;

  const hasLayoutPreviewColumn =
    listType === ITEM_TYPES.CABINET.type &&
    columns.some((column) => column.key === "layout");
  const layoutColumn = hasLayoutPreviewColumn
    ? columns.find((column) => column.key === "layout")
    : null;
  const visibleColumns = hasLayoutPreviewColumn
    ? columns.filter((column) => column.key !== "layout")
    : columns;

  // Clear the recently closed highlight after 2 seconds
  useEffect(() => {
    if (recentlyClosedIndex !== -1) {
      const timer = setTimeout(() => {
        setRecentlyClosedIndex(-1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [recentlyClosedIndex]);

  useEffect(() => {
    return () => {
      if (closeEditTimeoutRef.current) {
        clearTimeout(closeEditTimeoutRef.current);
      }
      if (closeNewTimeoutRef.current) {
        clearTimeout(closeNewTimeoutRef.current);
      }
    };
  }, []);

  const scrollFormIntoView = useCallback((element) => {
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  }, []);

  useEffect(() => {
    if (editingIndex === -1) {
      setAnimateEditOpen(false);
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      setAnimateEditOpen(true);
      scrollFormIntoView(editFormRefs.current[editingIndex]);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [editingIndex, scrollFormIntoView]);

  useEffect(() => {
    if (!showNewItem) {
      setAnimateNewOpen(false);
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      setAnimateNewOpen(true);
      scrollFormIntoView(newFormRef.current);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [showNewItem, scrollFormIntoView]);

  const openEditForm = useCallback(
    (index) => {
      if (isFormActive) return;
      setShowNewItem(false);
      setAnimateNewOpen(false);
      setEditingIndex(index);
      setAnimateEditOpen(false);
    },
    [isFormActive],
  );

  const openNewItemForm = useCallback(() => {
    if (isFormActive) return;
    setEditingIndex(-1);
    setAnimateEditOpen(false);
    setShowNewItem(true);
    setAnimateNewOpen(false);
  }, [isFormActive]);

  const closeEditForm = useCallback(
    (itemIndex = -1) => {
      setAnimateEditOpen(false);

      if (closeEditTimeoutRef.current) {
        clearTimeout(closeEditTimeoutRef.current);
      }

      closeEditTimeoutRef.current = setTimeout(() => {
        setEditingIndex(-1);
        if (itemIndex !== -1) {
          setRecentlyClosedIndex(itemIndex);
        }
        closeEditTimeoutRef.current = null;
      }, transitionDurationMs);
    },
    [transitionDurationMs],
  );

  const closeNewItemForm = useCallback(() => {
    setAnimateNewOpen(false);

    if (closeNewTimeoutRef.current) {
      clearTimeout(closeNewTimeoutRef.current);
    }

    closeNewTimeoutRef.current = setTimeout(() => {
      setShowNewItem(false);
      closeNewTimeoutRef.current = null;
    }, transitionDurationMs);
  }, [transitionDurationMs]);

  const handleCancelEdit = useCallback(
    (itemIndex) => {
      closeEditForm(itemIndex);
    },
    [closeEditForm],
  );

  const handleCancelNew = useCallback(() => {
    closeNewItemForm();
  }, [closeNewItemForm]);

  const handleSaveItem = async (item, itemIndex = -1) => {
    try {
      await onSave(item, itemIndex);
      if (itemIndex === -1) {
        closeNewItemForm();
      } else {
        closeEditForm(itemIndex);
      }
    } catch (error) {
      void error;
    }
  };

  const handleDeleteItem = async (itemIndex) => {
    try {
      await onDelete(itemIndex);
    } catch (error) {
      void error;
    }
  };

  const handleSaveOrder = async (orderedIds) => {
    try {
      await onReorder(orderedIds);
      setIsReorderModalOpen(false);
    } catch (error) {
      void error;
    }
  };

  const handleDuplicateClick = (itemIndex) => {
    setDuplicateItemIndex(itemIndex);
    setIsDuplicateModalOpen(true);
  };

  const handleDuplicateSave = async ({ targetTaskId, targetSectionId }) => {
    try {
      if (onDuplicate) {
        await onDuplicate(duplicateItemIndex, targetTaskId, targetSectionId);
      }
      setIsDuplicateModalOpen(false);
      setDuplicateItemIndex(-1);
    } catch (error) {
      void error;
    }
  };

  const handleMoveClick = (itemIndex) => {
    setMoveItemIndex(itemIndex);
    setIsMoveModalOpen(true);
  };

  const handleMoveSave = async ({ targetTaskId, targetSectionId }) => {
    try {
      if (onMove) {
        await onMove(moveItemIndex, targetTaskId, targetSectionId);
      }
      setIsMoveModalOpen(false);
      setMoveItemIndex(-1);
    } catch (error) {
      void error;
    }
  };

  const generateTextSummary = (item) => {
    if (!item.face_config) return null;
    const currentSection = currentEstimate?.tasks
      ?.flatMap((task) => task.sections || [])
      ?.find((section) => section.est_section_id === currentSectionId);
    const effectiveDoorPanelModId = getEffectiveValueOnly(
      currentSection?.door_panel_mod_id,
      currentEstimate?.default_door_panel_mod_id,
      teamDefaults?.default_door_panel_mod_id,
    );
    const effectiveDrawerPanelModId = getEffectiveValueOnly(
      currentSection?.drawer_panel_mod_id,
      currentEstimate?.default_drawer_panel_mod_id,
      teamDefaults?.default_drawer_panel_mod_id,
    );
    const effectiveDoorStyle = getEffectiveValueOnly(
      currentSection?.door_style,
      currentEstimate?.default_door_style,
      teamDefaults?.default_door_style,
    );
    const effectiveDrawerStyle = getEffectiveValueOnly(
      currentSection?.drawer_front_style,
      currentEstimate?.default_drawer_front_style,
      teamDefaults?.default_drawer_front_style,
    );
    const effectiveDoorInsideMolding = getEffectiveValueOnly(
      currentSection?.door_inside_molding,
      currentEstimate?.default_door_inside_molding,
      teamDefaults?.default_door_inside_molding,
    );
    const effectiveDoorOutsideMolding = getEffectiveValueOnly(
      currentSection?.door_outside_molding,
      currentEstimate?.default_door_outside_molding,
      teamDefaults?.default_door_outside_molding,
    );
    const effectiveDrawerInsideMolding = getEffectiveValueOnly(
      currentSection?.drawer_inside_molding,
      currentEstimate?.default_drawer_inside_molding,
      teamDefaults?.default_drawer_inside_molding,
    );
    const effectiveDrawerOutsideMolding = getEffectiveValueOnly(
      currentSection?.drawer_outside_molding,
      currentEstimate?.default_drawer_outside_molding,
      teamDefaults?.default_drawer_outside_molding,
    );

    const styleOverrideName = item.cabinet_style_override
      ? cabinetStyles.find(
          (style) => style.cabinet_style_id === item.cabinet_style_override,
        )?.cabinet_style_name || ""
      : "";

    const finBackMaterialSummary =
      item.fin_back_mat != null
        ? faceMaterialOptions.find(
            (material) => Number(material.id) === Number(item.fin_back_mat),
          )?.name || `Material ${item.fin_back_mat}`
        : null;

    const finBackFinishSummary =
      item.fin_back_finish != null
        ? Array.isArray(item.fin_back_finish) && item.fin_back_finish.length === 0
          ? "None"
          : (Array.isArray(item.fin_back_finish) ? item.fin_back_finish : [])
              .map(
                (finishId) =>
                  finishOptions.find(
                    (finish) => Number(finish.id) === Number(finishId),
                  )?.name || `Finish ${finishId}`,
              )
              .join(", ")
        : null;

    const normalizedFinBackPanelModId =
      item.fin_back_panel_mod != null ? Number(item.fin_back_panel_mod) : null;
    const finBackPanelModSummary =
      item.fin_back_panel_mod != null
        ? normalizedFinBackPanelModId === 0
          ? "None"
          : PANEL_MOD_DISPLAY_NAMES[normalizedFinBackPanelModId] ||
            `Panel Mod ${item.fin_back_panel_mod}`
        : null;

    const summary = generateCabinetSummary(
      item.face_config,
      {
        ...item.type_specific_options,
        cabinetStyleOverride: styleOverrideName,
        finishedLeft: item.finished_left,
        finishedRight: item.finished_right,
        finishedTop: item.finished_top,
        finishedBottom: item.finished_bottom,
        finishedBack: item.finished_back,
        finBackMaterialSummary,
        finBackFinishSummary,
        finBackPanelModSummary,
        quantity: item.quantity,
      },
      item.type,
      item.quantity,
      accessories?.glass || [],
      {
        effectiveDoorPanelModId,
        effectiveDrawerPanelModId,
        effectiveDoorStyle,
        effectiveDrawerStyle,
        effectiveDoorInsideMolding,
        effectiveDoorOutsideMolding,
        effectiveDrawerInsideMolding,
        effectiveDrawerOutsideMolding,
      },
    );
    return summary ? (
      <span className="text-slate-400 capitalize">{summary}</span>
    ) : null;
  };

  const renderCellContent = (item, index, col) => {
    // If column has a custom render function, use it
    if (col.render) {
      return col.render(item, index);
    }

    // Handle actions column (standard for all item types)
    if (col.key === "actions") {
      return (
        <div className="flex justify-center space-x-2">
          <Tooltip text="Edit">
            <button
              onClick={() => openEditForm(index)}
              disabled={isFormActive}
              className={`p-1.5 ${
                isFormActive
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-blue-500"
              } transition-colors`}
            >
              <FiEdit2 size={16} />
            </button>
          </Tooltip>
          {onDuplicate && (
            <Tooltip text="Duplicate">
              <button
                onClick={() => {
                  if (!isFormActive) {
                    handleDuplicateClick(index);
                  }
                }}
                disabled={isFormActive}
                className={`p-1.5 ${
                  isFormActive
                    ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-400 hover:text-teal-500"
                } transition-colors`}
              >
                <FiCopy size={16} />
              </button>
            </Tooltip>
          )}
          {onMove && (
            <Tooltip text="Move">
              <button
                onClick={() => {
                  if (!isFormActive) {
                    handleMoveClick(index);
                  }
                }}
                disabled={isFormActive}
                className={`p-1.5 ${
                  isFormActive
                    ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-400 hover:text-purple-500"
                } transition-colors`}
              >
                <RiSwapBoxLine size={18} />
              </button>
            </Tooltip>
          )}
          <Tooltip text="Delete">
            <button
              onClick={() => {
                if (!isFormActive) {
                  handleDeleteItem(index);
                }
              }}
              disabled={isFormActive}
              className={`p-1.5 ${
                isFormActive
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-red-500"
              } transition-colors`}
            >
              <FiTrash2 size={16} />
            </button>
          </Tooltip>
        </div>
      );
    }

    // Cabinet-specific rendering (for backward compatibility)
    if (col.key === "interior") {
      return item.finished_interior ? "F" : "U";
    }

    if (col.key === "type") {
      return cabinetTypes.find((t) => t.cabinet_type_id === item.type)
        ?.cabinet_type_name;
    }

    // Default: just display the item property
    return item[col.key];
  };

  const renderSummaryRow = (item, index, summaryColumns) => {
    const customSummary = getItemSummary?.(item, index);
    const cabinetSummary =
      listType === ITEM_TYPES.CABINET.type && item.type !== 5
        ? generateTextSummary(item)
        : null;
    const summaryContent = customSummary || cabinetSummary;

    if (!summaryContent) return null;

    if (!summaryColumns[0]?.width) {
      return <div className="px-3 text-sm text-left">{summaryContent}</div>;
    }

    return (
      <div
        className="grid gap-4 px-3 text-sm text-left"
        style={{
          gridTemplateColumns: summaryColumns[0].width + " " + "1fr",
        }}
      >
        <span></span>
        {summaryContent}
      </div>
    );
  };

  return (
    <div className="mx-auto">
      {/* Column Headers */}
      {hasLayoutPreviewColumn && layoutColumn ? (
        <div className="flex gap-4 bg-slate-50 py-3 px-3 border-b border-slate-200 items-center">
          <div
            className="text-xs font-medium text-slate-500 uppercase tracking-wider"
            style={{ width: layoutColumn.width, minWidth: layoutColumn.width }}
          >
            {layoutColumn.label}
          </div>
          <div
            className="grid gap-4 flex-1 items-center"
            style={{
              gridTemplateColumns: visibleColumns.map((c) => c.width).join(" "),
            }}
          >
            {visibleColumns.map((col) => (
              <div
                key={col.key}
                className="text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                {col.label}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="grid gap-4 bg-slate-50 py-3 px-3 border-b border-slate-200 items-center"
          style={{
            gridTemplateColumns: visibleColumns.map((c) => c.width).join(" "),
          }}
        >
          {visibleColumns.map((col) => (
            <div
              key={col.key}
              className="text-xs font-medium text-slate-500 uppercase tracking-wider"
            >
              {col.label}
            </div>
          ))}
        </div>
      )}

      {/* Items List */}
      <div className="">
        {items.map((item, index) =>
          editingIndex === index ? (
            <div
              key={index}
              ref={(el) => {
                if (el) {
                  editFormRefs.current[index] = el;
                } else {
                  delete editFormRefs.current[index];
                }
              }}
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                animateEditOpen
                  ? "max-h-[2200px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-4">
                <ItemForm
                  item={item}
                  onSave={(updatedItem) => handleSaveItem(updatedItem, index)}
                  onCancel={() => handleCancelEdit(index)}
                  {...formProps}
                />
              </div>
            </div>
          ) : (
            <div
              key={index}
              className={`border-b transition-all duration-200 ${
                recentlyClosedIndex === index
                  ? "border-4 border-teal-500 bg-teal-900"
                  : ""
              } ${
                item.errorState
                  ? "bg-red-700 text-white border-red-500 hover:bg-red-600"
                  : "bg-slate-700 text-white border-slate-600 hover:bg-slate-600 hover:text-slate-200"
              }`}
            >
              {hasLayoutPreviewColumn && layoutColumn ? (
                <div className="flex items-stretch">
                  <div
                    className={`flex items-center justify-center px-2 py-1 border-r ${
                      item.errorState ? "border-red-500" : "border-slate-600"
                    }`}
                    style={{ width: layoutColumn.width, minWidth: layoutColumn.width }}
                  >
                    <CabinetFacePreview
                      faceConfig={item.face_config}
                      cabinetWidth={item.width}
                      cabinetHeight={item.height}
                      cabinetTypeId={item.type}
                      cabinetStyleId={
                        item.cabinet_style_override &&
                        item.cabinet_style_override !== -1
                          ? item.cabinet_style_override
                          : formProps?.cabinetStyleId
                      }
                      itemType={
                        cabinetTypes.find(
                          (type) => type.cabinet_type_id === item.type,
                        )?.item_type || ITEM_TYPES.CABINET.type
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`grid gap-4 items-center py-1 px-3`}
                      style={{
                        gridTemplateColumns: visibleColumns
                          .map((c) => c.width)
                          .join(" "),
                      }}
                    >
                      {visibleColumns.map((col) => {
                        return (
                          <div key={col.key} className="text-sm">
                            {renderCellContent(item, index, col)}
                          </div>
                        );
                      })}
                    </div>
                    {renderSummaryRow(item, index, visibleColumns)}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`grid gap-4 items-center py-1 px-3`}
                    style={{
                      gridTemplateColumns: visibleColumns
                        .map((c) => c.width)
                        .join(" "),
                    }}
                  >
                    {visibleColumns.map((col) => {
                      return (
                        <div key={col.key} className="text-sm">
                          {renderCellContent(item, index, col)}
                        </div>
                      );
                    })}
                  </div>
                  {renderSummaryRow(item, index, visibleColumns)}
                </>
              )}
            </div>
          ),
        )}
      </div>

      {/* New Item Form */}
      {showNewItem && (
        <div
          ref={newFormRef}
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            animateNewOpen ? "max-h-[2200px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-4">
            <ItemForm
              onSave={(item) => handleSaveItem(item)}
              onCancel={handleCancelNew}
              {...formProps}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showNewItem && items.length === 0 && (
        <div className="text-center text-slate-500 py-8">{emptyStateText}</div>
      )}

      {/* Add Item Button */}
      {!showNewItem && !hideAddButton && (
        <div className="my-2 relative">
          {onReorder && items.length > 1 && (
            <div className="flex justify-end absolute bottom-2 left-4">
              <Tooltip text="Reorder">
                <button
                  onClick={() => setIsReorderModalOpen(true)}
                  className={`text-slate-500 ${
                    isFormActive
                      ? "text-slate-600 cursor-not-allowed"
                      : "hover:text-teal-500"
                  }`}
                  aria-label="Reorder items"
                  disabled={isFormActive}
                >
                  <LuArrowDownUp size={20} />
                </button>
              </Tooltip>
            </div>
          )}
          <button
            onClick={openNewItemForm}
            disabled={isFormActive}
            className={`mx-auto py-3 px-4 text-sm font-medium ${
              isFormActive
                ? "text-blue-300 bg-blue-50/50 cursor-not-allowed"
                : "text-blue-500 bg-blue-50 hover:bg-blue-100"
            } rounded-md flex items-center justify-center`}
          >
            <FiPlus className="mr-2" />
            {addButtonText}
          </button>
        </div>
      )}

      {onReorder && (
        <ReorderModal
          open={isReorderModalOpen}
          onClose={() => setIsReorderModalOpen(false)}
          onSave={handleSaveOrder}
          items={items.map((item) => {
            // Use custom name function if provided, otherwise fall back to cabinet logic
            let name;
            if (getReorderItemName) {
              name = getReorderItemName(item);
            } else {
              // Default cabinet-specific logic for backward compatibility
              const itemType = cabinetTypes.find(
                (t) => t.cabinet_type_id === item.type,
              )?.cabinet_type_name;
              name = itemType
                ? `${
                    item.quantity > 1 ? `(${item.quantity}) ` : ""
                  }${itemType} - ${item.width} x ${item.height} x ${item.depth}`
                : `Item ${item.id}`;
            }
            return {
              id: item.id,
              name,
            };
          })}
          title="Reorder Items"
        />
      )}

      {onDuplicate && currentTaskId && currentSectionId && (
        <DuplicateItemModal
          open={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false);
            setDuplicateItemIndex(-1);
          }}
          onSave={handleDuplicateSave}
          currentTaskId={currentTaskId}
          currentSectionId={currentSectionId}
          itemType={listType || "item"}
          mode="duplicate"
        />
      )}

      {onMove && currentTaskId && currentSectionId && (
        <DuplicateItemModal
          open={isMoveModalOpen}
          onClose={() => {
            setIsMoveModalOpen(false);
            setMoveItemIndex(-1);
          }}
          onSave={handleMoveSave}
          currentTaskId={currentTaskId}
          currentSectionId={currentSectionId}
          itemType={listType || "item"}
          mode="move"
        />
      )}
    </div>
  );
};

SectionItemList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      width: PropTypes.string.isRequired,
    }),
  ).isRequired,
  addButtonText: PropTypes.string.isRequired,
  emptyStateText: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onReorder: PropTypes.func,
  onDuplicate: PropTypes.func,
  onMove: PropTypes.func,
  ItemForm: PropTypes.elementType.isRequired,
  hideAddButton: PropTypes.bool,
  formProps: PropTypes.object,
  getReorderItemName: PropTypes.func,
  getItemSummary: PropTypes.func,
  listType: PropTypes.string,
  currentTaskId: PropTypes.number,
  currentSectionId: PropTypes.number,
};

export default SectionItemList;
