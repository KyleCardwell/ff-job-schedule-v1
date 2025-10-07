import PropTypes from "prop-types";
import React from "react";

const SettingsList = ({
  items,
  columns,
  onDelete,
  onCancelDelete,
  onChange,
  onAdd,
  addLabel,
}) => {
  return (
    <div className="flex justify-center">
      <div
        className="grid justify-items-center gap-y-2"
        style={{
          gridTemplateColumns:
            columns.map((col) => col.width).join(" ") + " 80px",
        }}
      >
        {/* Headers */}
        {columns.map((col, index) => (
          <div
            key={index}
            className="text-sm font-semibold text-slate-200 mb-2"
          >
            {col.label}
          </div>
        ))}
        <div /> {/* Space for delete/undo button */}
        {/* Items */}
        {items.map((item) => (
          <React.Fragment key={item.id}>
            <div
              className={`contents group flex items-center ${
                item.markedForDeletion ? "opacity-50" : ""
              }`}
            >
              {columns.map((col, index) => (
                <div
                  key={index}
                  className={`${item.markedForDeletion ? "bg-red-500" : "bg-slate-600 group-hover:bg-slate-400/50"} transition-colors flex items-center justify-center gap-2 w-full`}
                >
                  {col.render ? (
                    col.render(item, (field, value) =>
                      onChange(item.id, field, value)
                    )
                  ) : (
                    <input
                      type={col.type || "text"}
                      value={
                        col.getValue
                          ? col.getValue(item)
                          : item[col.field] || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        if (col.setValue) {
                          const newItem = col.setValue(item, value);
                          onChange(item.id, col.field, value);
                        } else {
                          onChange(item.id, col.field, value);
                        }
                      }}
                      className="w-full bg-slate-600 text-slate-200 px-2 py-1 my-2"
                      placeholder={col.placeholder}
                      disabled={item.markedForDeletion}
                    />
                  )}
                </div>
              ))}
              <div className="group-hover:bg-slate-400/50 transition-colors flex items-center justify-center">
                {item.markedForDeletion ? (
                  <button
                    onClick={() => onCancelDelete(item.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
                    title="Undo deletion"
                  >
                    Undo
                  </button>
                ) : (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-slate-300 hover:text-red-400"
                    title="Mark for deletion"
                  >
                    <svg
                      className="h-5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={onAdd}
        className="mt-4 px-3 py-1 text-sm bg-slate-600 text-slate-200 hover:bg-slate-500 absolute right-0 -top-4"
      >
        {addLabel}
      </button>
    </div>
  );
};

SettingsList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
    })
  ),
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string,
      label: PropTypes.string,
      width: PropTypes.string,
      placeholder: PropTypes.string,
      type: PropTypes.string,
      getValue: PropTypes.func,
      setValue: PropTypes.func,
      render: PropTypes.func,
    })
  ),
  onDelete: PropTypes.func,
  onCancelDelete: PropTypes.func,
  onChange: PropTypes.func,
  onAdd: PropTypes.func,
  addLabel: PropTypes.string,
};

export default SettingsList;
