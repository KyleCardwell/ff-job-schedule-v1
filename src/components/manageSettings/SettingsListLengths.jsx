import PropTypes from "prop-types";

const SettingsListLengths = ({
  items,
  columns,
  onDelete,
  onCancelDelete,
  onChange,
  onAdd,
  addLabel,
  inputRefs,
  itemPrefix,
  renderRulesSection,
}) => {
  const coreFieldOrder = [
    "name",
    "requires_miters",
    "requires_cutouts",
    "default_width",
    "default_thickness",
  ];
  const coreFieldSet = new Set(coreFieldOrder);

  const coreColumns = coreFieldOrder
    .map((field) => columns.find((col) => col.field === field))
    .filter(Boolean);
  const serviceColumns = columns.filter((col) => !coreFieldSet.has(col.field));

  const renderCell = (item, col) => {
    if (col.render) {
      return col.render(item, (field, value) =>
        onChange(item.id, field, value),
      );
    }

    return (
      <input
        ref={(el) => {
          if (inputRefs && itemPrefix) {
            inputRefs.current[`${itemPrefix}-${item.id}-${col.field}`] = el;
          }
        }}
        type={col.type || "text"}
        value={col.getValue ? col.getValue(item) : item[col.field] || ""}
        onChange={(e) => {
          const value = e.target.value;
          if (col.setValue) {
            col.setValue(item, value);
          }
          onChange(item.id, col.field, value);
        }}
        className={`w-full bg-slate-600 text-slate-200 px-2 py-1 my-2 ${
          col.hasError && col.hasError(item) ? "border-2 border-red-500" : ""
        }`}
        placeholder={col.placeholder}
        disabled={item.markedForDeletion}
      />
    );
  };

  return (
    <div className="flex justify-center relative">
      <div className="w-full flex flex-col gap-2">
        <div className="grid grid-cols-[minmax(0,1.2fr)_max-content_80px] mb-1 mr-12">
          <div
            className="grid"
            style={{
              gridTemplateColumns: coreColumns
                .map((col) => col.width || "1fr")
                .join(" "),
            }}
          >
            {coreColumns.map((col, index) => (
              <div
                key={`${col.field}-${index}`}
                className="w-full text-sm font-semibold text-slate-200 mb-1 text-center"
              >
                {col.label}
              </div>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns:
                serviceColumns.length > 0
                  ? serviceColumns.map((col) => col.width || "1fr").join(" ")
                  : "minmax(0, 1fr)",
            }}
          >
            {serviceColumns.length > 0 ? (
              serviceColumns.map((col, index) => (
                <div
                  key={`${col.field}-${index}`}
                  className="text-sm font-semibold text-slate-200 mb-1 text-center"
                >
                  {col.label}
                </div>
              ))
            ) : (
              <div className="text-sm font-semibold text-slate-200 mb-1">
                Services
              </div>
            )}
          </div>

          <div />
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className={`grid grid-cols-[minmax(0,1.2fr)_max-content_80px] mb-2 group mr-12 ${
              item.markedForDeletion ? "opacity-50" : ""
            }`}
          >
            <div className="grid grid-rows-[auto_auto]">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: coreColumns
                    .map((col) => col.width || "1fr")
                    .join(" "),
                }}
              >
                {coreColumns.map((col, index) => (
                  <div
                    key={`${item.id}-${col.field}-${index}`}
                    className={`${
                      item.markedForDeletion
                        ? "bg-red-500"
                        : "bg-slate-600 group-hover:bg-slate-400/50"
                    } transition-colors flex items-center justify-center gap-2 w-full`}
                  >
                    {renderCell(item, col)}
                  </div>
                ))}
              </div>

              <div
                className={`${
                  item.markedForDeletion
                    ? "bg-red-500"
                    : "bg-slate-600 group-hover:bg-slate-400/50"
                } transition-colors px-3 py-2`}
              >
                {renderRulesSection ? renderRulesSection(item) : null}
              </div>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns:
                  serviceColumns.length > 0
                    ? serviceColumns.map((col) => col.width).join(" ")
                    : "minmax(0, 1fr)",
              }}
            >
              {serviceColumns.length > 0 ? (
                serviceColumns.map((col, index) => (
                  <div
                    key={`${item.id}-${col.field}-${index}`}
                    className={`${
                      item.markedForDeletion
                        ? "bg-red-500"
                        : "bg-slate-600 group-hover:bg-slate-400/50"
                    } transition-colors flex items-start justify-center gap-2 w-full px-2 py-2`}
                  >
                    {renderCell(item, col)}
                  </div>
                ))
              ) : (
                <div
                  className={`${
                    item.markedForDeletion
                      ? "bg-red-500"
                      : "bg-slate-600 group-hover:bg-slate-400/50"
                  } transition-colors px-3 py-2 text-slate-300 text-sm`}
                >
                  No active services.
                </div>
              )}
            </div>

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

SettingsListLengths.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string || PropTypes.number,
    }),
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
    }),
  ),
  onDelete: PropTypes.func,
  onCancelDelete: PropTypes.func,
  onChange: PropTypes.func,
  onAdd: PropTypes.func,
  addLabel: PropTypes.string,
  inputRefs: PropTypes.object,
  itemPrefix: PropTypes.string,
  renderRulesSection: PropTypes.func,
};

export default SettingsListLengths;
