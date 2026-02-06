import PropTypes from "prop-types";
import { useState, useCallback, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiCopy } from "react-icons/fi";
import { LuArrowDownUp } from "react-icons/lu";
import { useSelector } from "react-redux";

import { ITEM_TYPES } from "../../utils/constants.js";
import { generateCabinetSummary } from "../../utils/estimateHelpers.js";
import DuplicateItemModal from "../common/DuplicateItemModal.jsx";
import ReorderModal from "../common/ReorderModal.jsx";

const SectionItemList = ({
  items,
  columns,
  addButtonText,
  emptyStateText,
  onSave,
  onDelete,
  onReorder,
  onDuplicate,
  ItemForm,
  hideAddButton = false,
  formProps = {},
  getReorderItemName,
  listType,
  currentTaskId,
  currentSectionId,
}) => {
  const cabinetTypes = useSelector((state) => state.cabinetTypes.types);
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateItemIndex, setDuplicateItemIndex] = useState(-1);
  const [recentlyClosedIndex, setRecentlyClosedIndex] = useState(-1);

  // Check if any form is currently active (adding or editing)
  const isFormActive = showNewItem || editingIndex !== -1;

  // Clear the recently closed highlight after 2 seconds
  useEffect(() => {
    if (recentlyClosedIndex !== -1) {
      const timer = setTimeout(() => {
        setRecentlyClosedIndex(-1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [recentlyClosedIndex]);

  const handleCancelEdit = useCallback((itemIndex) => {
    setEditingIndex(-1);
    setRecentlyClosedIndex(itemIndex);
  }, []);

  const handleCancelNew = useCallback(() => {
    setShowNewItem(false);
  }, []);

  const handleSaveItem = async (item, itemIndex = -1) => {
    try {
      await onSave(item, itemIndex);
      if (itemIndex === -1) {
        setShowNewItem(false);
      } else {
        setEditingIndex(-1);
        setRecentlyClosedIndex(itemIndex);
      }
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  const handleDeleteItem = async (itemIndex) => {
    try {
      await onDelete(itemIndex);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleSaveOrder = async (orderedIds) => {
    try {
      await onReorder(orderedIds);
      setIsReorderModalOpen(false);
    } catch (error) {
      console.error("Error saving order:", error);
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
      console.error("Error duplicating item:", error);
    }
  };

  const generateTextSummary = (item) => {
    if (!item.face_config) return null;
    const summary = generateCabinetSummary(item.face_config, item.type_specific_options);
    return summary ? <span className="text-slate-400">{summary}</span> : null;
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
          <button
            onClick={() => {
              if (!isFormActive) {
                setShowNewItem(false);
                setEditingIndex(index);
              }
            }}
            disabled={isFormActive}
            className={`p-1.5 ${
              isFormActive
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-blue-500"
            } transition-colors`}
          >
            <FiEdit2 size={16} />
          </button>
          {onDuplicate && (
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
              title="Duplicate item"
            >
              <FiCopy size={16} />
            </button>
          )}
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Column Headers */}
      <div
        className="grid gap-4 bg-slate-50 py-3 px-3 border-b border-slate-200 items-center"
        style={{
          gridTemplateColumns: columns.map((c) => c.width).join(" "),
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className="text-xs font-medium text-slate-500 uppercase tracking-wider"
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Items List */}
      <div className="">
        {items.map((item, index) =>
          editingIndex === index ? (
            <div key={index} className="p-4">
              <ItemForm
                item={item}
                onSave={(updatedItem) => handleSaveItem(updatedItem, index)}
                onCancel={() => handleCancelEdit(index)}
                {...formProps}
              />
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
              <div
                className={`grid gap-4 items-center py-1 px-3`}
                style={{
                  gridTemplateColumns: columns.map((c) => c.width).join(" "),
                }}
              >
                {columns.map((col) => {
                  return (
                    <div key={col.key} className="text-sm">
                      {renderCellContent(item, index, col)}
                    </div>
                  );
                })}
              </div>
              {listType === ITEM_TYPES.CABINET.type && item.type !== 5 && (
                <div
                  className={`grid gap-4 px-3 text-sm text-left`}
                  style={{
                    gridTemplateColumns: columns[0].width + " " + "1fr",
                  }}
                >
                  <span></span>
                  {generateTextSummary(item)}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* New Item Form */}
      {showNewItem && (
        <div className="p-4">
          <ItemForm
            onSave={(item) => handleSaveItem(item)}
            onCancel={handleCancelNew}
            {...formProps}
          />
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
            </div>
          )}
          <button
            onClick={() => {
              if (!isFormActive) {
                setShowNewItem(true);
                setEditingIndex(-1);
              }
            }}
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
                (t) => t.cabinet_type_id === item.type
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
    })
  ).isRequired,
  addButtonText: PropTypes.string.isRequired,
  emptyStateText: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onReorder: PropTypes.func,
  onDuplicate: PropTypes.func,
  ItemForm: PropTypes.elementType.isRequired,
  hideAddButton: PropTypes.bool,
  formProps: PropTypes.object,
  getReorderItemName: PropTypes.func,
  listType: PropTypes.string,
  currentTaskId: PropTypes.number,
  currentSectionId: PropTypes.number,
};

export default SectionItemList;
