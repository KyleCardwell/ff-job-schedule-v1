import PropTypes from "prop-types";
import { useState, useCallback } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiMove } from "react-icons/fi";

import ReorderModal from "../common/ReorderModal.jsx";

const SectionItemList = ({
  items,
  columns,
  addButtonText,
  emptyStateText,
  onSave,
  onDelete,
  onReorder,
  ItemForm,
  hideAddButton = false,
  formProps = {},
}) => {
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Check if any form is currently active (adding or editing)
  const isFormActive = showNewItem || editingIndex !== -1;

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(-1);
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

  const handleKeys = (item, index, key, col) => {
    switch (key) {
      case "interior": {
        if (item.finished_interior) {
          return "F";
        } else {
          return "U";
        }
      }
      case "actions":
        return (
          <div key={col.key} className="flex justify-center space-x-2">
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
      default:
        return (
          <div key={col.key} className="text-sm">
            {item[col.key]}
          </div>
        );
    }
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
        {onReorder && items.length > 1 && (
          <div className="flex justify-end">
            <button
              onClick={() => setIsReorderModalOpen(true)}
              className="text-slate-500 hover:text-blue-500"
              aria-label="Reorder items"
            >
              <FiMove size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="">
        {items.map((item, index) =>
          editingIndex === index ? (
            <div key={index} className="p-4">
              <ItemForm
                item={item}
                onSave={(updatedItem) => handleSaveItem(updatedItem, index)}
                onCancel={handleCancelEdit}
                {...formProps}
              />
            </div>
          ) : (
            <div
              key={index}
              className="grid gap-4 items-center py-1 px-3 bg-slate-700 text-white border-b border-slate-600 hover:bg-slate-600 hover:text-slate-200 transition-colors"
              style={{
                gridTemplateColumns: columns.map((c) => c.width).join(" "),
              }}
            >
              {columns.map((col) => {
                return handleKeys(item, index, col.key, col);
              })}
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
        <div className="my-2">
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
          items={items.map((item) => ({ id: item.id, name: item.name || `Item ${item.id}` }))}
          title="Reorder Items"
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
  ItemForm: PropTypes.elementType.isRequired,
  hideAddButton: PropTypes.bool,
  formProps: PropTypes.object,
};

export default SectionItemList;
