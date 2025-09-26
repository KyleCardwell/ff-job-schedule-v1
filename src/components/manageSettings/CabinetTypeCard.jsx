import PropTypes from "prop-types";

const CabinetTypeCard = ({ type, onInputChange, errors = {} }) => {
  const errorClass = "border-red-500";
  const baseClass =
    "w-full bg-slate-600 text-white p-1 rounded border border-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div
      className={`grid grid-cols-5 gap-4 items-center p-2 rounded-md transition-colors bg-slate-700`}
    >
      <div className="col-span-2">
        <div className={`font-bold text-md text-white`}>
          {type.cabinet_type_name}
        </div>
      </div>
      <div>
        <input
          type="number"
          value={type.default_width}
          onChange={(e) =>
            onInputChange(
              type.team_cabinet_type_id,
              "default_width",
              e.target.value === "" ? "" : parseFloat(e.target.value)
            )
          }
          className={`${baseClass} ${errors.default_width ? errorClass : ""}`}
        />
      </div>
      <div>
        <input
          type="number"
          value={type.default_height}
          onChange={(e) =>
            onInputChange(
              type.team_cabinet_type_id,
              "default_height",
              e.target.value === "" ? "" : parseFloat(e.target.value)
            )
          }
          className={`${baseClass} ${errors.default_height ? errorClass : ""}`}
        />
      </div>
      <div>
        <input
          type="number"
          value={type.default_depth}
          onChange={(e) =>
            onInputChange(
              type.team_cabinet_type_id,
              "default_depth",
              e.target.value === "" ? "" : parseFloat(e.target.value)
            )
          }
          className={`${baseClass} ${errors.default_depth ? errorClass : ""}`}
        />
      </div>
    </div>
  );
};

export default CabinetTypeCard;

CabinetTypeCard.propTypes = {
  type: PropTypes.object.isRequired,
  onInputChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
};
