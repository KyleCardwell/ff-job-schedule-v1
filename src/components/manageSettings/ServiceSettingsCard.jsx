import { Switch } from "@headlessui/react";
import PropTypes from "prop-types";

const ServiceSettingsCard = ({ service, onServiceChange, onRemove }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg mb-4">
      {service.isNew ? (
        <input
          type="text"
          value={service.service_name ?? ''}
          onChange={(e) => onServiceChange("service_name", e.target.value)}
          placeholder="Service Name"
          className="bg-slate-600 text-white p-1 rounded"
        />
      ) : (
        <span className="text-white">{service.service_name}</span>
      )}
      <div className="flex items-center space-x-4">
        <Switch
          checked={service.is_active}
          onChange={(value) => onServiceChange("is_active", value)}
          className={`${service.is_active ? "bg-blue-600" : "bg-slate-600"}
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        >
          <span
            className={`${service.is_active ? "translate-x-6" : "translate-x-1"}
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
        <div className="flex items-center">
          <span className="text-white mr-2">$</span>
          <input
            type="number"
            value={service.hourly_rate ?? 0}
            onChange={(e) =>
              onServiceChange(
                "hourly_rate",
                e.target.value === "" ? "" : parseFloat(e.target.value)
              )
            }
            onBlur={(e) => {
              if (e.target.value === "") {
                onServiceChange("hourly_rate", 0);
              }
            }}
            className="w-24 p-1 rounded bg-slate-600 text-white"
            disabled={!service.is_active}
          />
        </div>
        {service.isNew && (
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceSettingsCard;

ServiceSettingsCard.propTypes = {
  service: PropTypes.object.isRequired,
  onServiceChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};