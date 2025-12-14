import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { FiSave, FiX, FiPlus, FiTrash2, FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useDispatch } from "react-redux";

import { updateEstimateLineItems } from "../../redux/actions/estimates";

const EstimateLineItemsEditor = ({ estimate, onCancel, onSave }) => {
  const dispatch = useDispatch();
  const [lineItems, setLineItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());

  useEffect(() => {
    // Initialize line items from estimate or create empty structure
    if (estimate?.line_items && Array.isArray(estimate.line_items)) {
      setLineItems(estimate.line_items);
      // Auto-expand items that have sub-items
      const expanded = new Set();
      estimate.line_items.forEach((item, index) => {
        if (item.subItems && item.subItems.length > 0) {
          expanded.add(index);
        }
      });
      setExpandedItems(expanded);
    } else {
      setLineItems([]);
    }
  }, [estimate]);

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        title: "",
        quantity: "",
        cost: "",
        subItems: [],
      },
    ]);
  };

  const addSubItem = (parentIndex) => {
    const newLineItems = [...lineItems];
    if (!newLineItems[parentIndex].subItems) {
      newLineItems[parentIndex].subItems = [];
    }
    newLineItems[parentIndex].subItems.push({
      title: "",
      quantity: "",
      cost: "",
    });
    setLineItems(newLineItems);
    // Auto-expand when adding sub-item
    setExpandedItems(new Set([...expandedItems, parentIndex]));
  };

  const updateLineItem = (index, field, value) => {
    const newLineItems = [...lineItems];
    newLineItems[index][field] = value;
    setLineItems(newLineItems);
  };

  const updateSubItem = (parentIndex, subIndex, field, value) => {
    const newLineItems = [...lineItems];
    newLineItems[parentIndex].subItems[subIndex][field] = value;
    setLineItems(newLineItems);
  };

  const deleteLineItem = (index) => {
    const newLineItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newLineItems);
    // Remove from expanded set if it was expanded
    const newExpanded = new Set(expandedItems);
    newExpanded.delete(index);
    setExpandedItems(newExpanded);
  };

  const deleteSubItem = (parentIndex, subIndex) => {
    const newLineItems = [...lineItems];
    newLineItems[parentIndex].subItems = newLineItems[parentIndex].subItems.filter(
      (_, i) => i !== subIndex
    );
    setLineItems(newLineItems);
  };

  const calculateTotal = (quantity, cost) => {
    const qty = parseFloat(quantity) || 0;
    const cst = parseFloat(cost) || 0;
    return qty * cst;
  };

  const handleSave = async () => {
    try {
      await dispatch(
        updateEstimateLineItems(estimate.estimate_id, lineItems)
      );
      onSave();
    } catch (error) {
      // Error is already logged in the action
      // Optionally show user-facing error message here
    }
  };

  const calculateGrandTotal = () => {
    let total = 0;
    lineItems.forEach((item) => {
      // Add parent item total if it has quantity and cost
      if (item.quantity && item.cost) {
        total += calculateTotal(item.quantity, item.cost);
      }
      // Add sub-items totals
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((subItem) => {
          if (subItem.quantity && subItem.cost) {
            total += calculateTotal(subItem.quantity, subItem.cost);
          }
        });
      }
    });
    return total;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-200">
          Edit Estimate Line Items
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            <FiX size={18} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors"
          >
            <FiSave size={18} />
            Save
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_120px_120px_120px_50px] gap-4 mb-4 pb-2 border-b border-slate-700">
        <div className="text-slate-400 font-medium">Title / Description</div>
        <div className="text-slate-400 font-medium text-center">Quantity</div>
        <div className="text-slate-400 font-medium text-center">Cost</div>
        <div className="text-slate-400 font-medium text-center">Total</div>
        <div className="text-slate-400 font-medium"></div>
      </div>

      {/* Line Items */}
      <div className="space-y-2 mb-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        {lineItems.map((item, index) => (
          <div key={index} className="space-y-2">
            {/* Parent Line Item */}
            <div className="grid grid-cols-[1fr_120px_120px_120px_50px] gap-4 items-center bg-slate-700 p-3 rounded">
              {/* Title with expand/collapse button */}
              <div className="flex items-center gap-2">
                {item.subItems && item.subItems.length > 0 && (
                  <button
                    onClick={() => toggleExpanded(index)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {expandedItems.has(index) ? (
                      <FiChevronDown size={18} />
                    ) : (
                      <FiChevronRight size={18} />
                    )}
                  </button>
                )}
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateLineItem(index, "title", e.target.value)}
                  placeholder="Line item title"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Quantity */}
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                placeholder="0"
                step="0.01"
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 text-center focus:outline-none focus:border-teal-500"
              />

              {/* Cost */}
              <input
                type="number"
                value={item.cost}
                onChange={(e) => updateLineItem(index, "cost", e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 text-center focus:outline-none focus:border-teal-500"
              />

              {/* Total */}
              <div className="text-slate-200 text-center font-medium">
                {item.quantity && item.cost
                  ? `$${calculateTotal(item.quantity, item.cost).toFixed(2)}`
                  : "-"}
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <button
                  onClick={() => addSubItem(index)}
                  className="p-1 text-teal-400 hover:text-teal-300 transition-colors"
                  title="Add sub-item"
                >
                  <FiPlus size={18} />
                </button>
                <button
                  onClick={() => deleteLineItem(index)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  title="Delete line item"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>

            {/* Sub Items */}
            {item.subItems &&
              item.subItems.length > 0 &&
              expandedItems.has(index) && (
                <div className="ml-8 space-y-2">
                  {item.subItems.map((subItem, subIndex) => (
                    <div
                      key={subIndex}
                      className="grid grid-cols-[1fr_120px_120px_120px_50px] gap-4 items-center bg-slate-750 p-3 rounded border-l-2 border-teal-600"
                    >
                      {/* Sub-item Title */}
                      <input
                        type="text"
                        value={subItem.title}
                        onChange={(e) =>
                          updateSubItem(index, subIndex, "title", e.target.value)
                        }
                        placeholder="Sub-item description"
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />

                      {/* Quantity */}
                      <input
                        type="number"
                        value={subItem.quantity}
                        onChange={(e) =>
                          updateSubItem(index, subIndex, "quantity", e.target.value)
                        }
                        placeholder="0"
                        step="0.01"
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 text-center focus:outline-none focus:border-teal-500"
                      />

                      {/* Cost */}
                      <input
                        type="number"
                        value={subItem.cost}
                        onChange={(e) =>
                          updateSubItem(index, subIndex, "cost", e.target.value)
                        }
                        placeholder="0.00"
                        step="0.01"
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 text-center focus:outline-none focus:border-teal-500"
                      />

                      {/* Total */}
                      <div className="text-slate-200 text-center font-medium">
                        {subItem.quantity && subItem.cost
                          ? `$${calculateTotal(subItem.quantity, subItem.cost).toFixed(2)}`
                          : "-"}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteSubItem(index, subIndex)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete sub-item"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Add Line Item Button */}
      <button
        onClick={addLineItem}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors mb-6"
      >
        <FiPlus size={18} />
        Add Line Item
      </button>

      {/* Grand Total */}
      {lineItems.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <div className="flex justify-end items-center gap-4">
            <span className="text-slate-400 text-lg font-medium">Grand Total:</span>
            <span className="text-teal-400 text-2xl font-bold">
              ${calculateGrandTotal().toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

EstimateLineItemsEditor.propTypes = {
  estimate: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default EstimateLineItemsEditor;
