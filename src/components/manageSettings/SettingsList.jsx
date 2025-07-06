import PropTypes from "prop-types";
import React from "react";

const SettingsList = ({ items, columns, onDelete, onChange, onAdd, addLabel }) => {
  return (
    <div className="flex justify-center">
      <div className="grid" style={{ gridTemplateColumns: columns.map(col => col.width).join(' ') + ' 40px' }}>
        {/* Headers */}
        {columns.map((col, index) => (
          <div key={index} className="text-sm font-semibold text-slate-200 mb-2">
            {col.label}
          </div>
        ))}
        <div /> {/* Space for delete button */}

        {/* Items */}
        {items.map((item) => (
          <React.Fragment key={item.id}>
            {columns.map((col, index) => (
              <div key={index}>
                <input
                  type={col.type || "text"}
                  value={col.getValue ? col.getValue(item) : (item[col.field] || "")}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (col.setValue) {
                      const newItem = col.setValue(item, value);
                      onChange(item.id, col.field, value);
                    } else {
                      onChange(item.id, col.field, value);
                    }
                  }}
                  className="w-full bg-slate-600 text-slate-200 px-2 py-1 mb-2"
                  placeholder={col.placeholder}
                />
              </div>
            ))}
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 text-slate-400 hover:text-red-400"
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
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
  })),
  columns: PropTypes.arrayOf(PropTypes.shape({
    field: PropTypes.string,
    label: PropTypes.string,
    width: PropTypes.string,
    placeholder: PropTypes.string,
    type: PropTypes.string,
    getValue: PropTypes.func,
    setValue: PropTypes.func,
  })),
  onDelete: PropTypes.func,
  onChange: PropTypes.func,
  onAdd: PropTypes.func,
  addLabel: PropTypes.string,
};

export default SettingsList;
