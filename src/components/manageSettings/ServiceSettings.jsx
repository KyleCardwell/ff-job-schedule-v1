import { Switch } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import {
  fetchServices,
  saveTeamServices,
  createService,
} from "../../redux/actions/services";

import ServiceSettingsCard from "./ServiceSettingsCard.jsx";
import SettingsSection from "./SettingsSection.jsx";

// TODO: Move to its own file: ServiceSettingsCard.jsx

const ServiceSettings = forwardRef((props, ref) => {
  const { maxWidthClass } = props;
  const dispatch = useDispatch();
  const { teamId } = useSelector((state) => state.auth);
  const { allServices, loading, error } = useSelector(
    (state) => state.services
  );

  const [localServices, setLocalServices] = useState([]);

  useEffect(() => {
    if (teamId) {
      dispatch(fetchServices(teamId));
    }
  }, [dispatch, teamId]);

  useEffect(() => {
    setLocalServices(allServices || []);
  }, [allServices]);

  const handleServiceChange = (serviceId, field, value) => {
    setLocalServices((prev) =>
      prev.map((service) =>
        service.service_id === serviceId
          ? { ...service, [field]: value }
          : service
      )
    );
  };

  const handleAddService = () => {
    const newService = {
      id: uuidv4(), // temporary ID
      service_id: uuidv4(), // temporary service_id
      name: "",
      is_active: true,
      hourly_rate: 0,
      isNew: true, // flag for new service
    };
    setLocalServices((prev) => [...prev, newService]);
  };

  const handleRemoveService = (serviceId) => {
    setLocalServices((prev) =>
      prev.filter((service) => service.service_id !== serviceId)
    );
  };

  const handleSave = async () => {
    const newServicesToCreate = localServices.filter(
      (s) => s.isNew && s.name.trim() !== ""
    );
    const existingServicesToUpdate = localServices.filter((s) => !s.isNew);

    // Create new services first
    if (newServicesToCreate.length > 0) {
      await Promise.all(
        newServicesToCreate.map((newService) =>
          dispatch(
            createService({
              name: newService.name,
              team_id: teamId,
              hourly_rate: newService.hourly_rate,
            })
          )
        )
      );
    }

    // Then update team services for existing ones
    if (existingServicesToUpdate.length > 0) {
      await dispatch(saveTeamServices(existingServicesToUpdate));
    }

    // Optionally, refetch data after saving
    dispatch(fetchServices(teamId));
  };

  const handleCancel = () => {
    setLocalServices(allServices || []);
  };

  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
  }));

  return (
    <div className="flex justify-center h-full pb-10">
      <div className={`flex-1 flex flex-col ${maxWidthClass}`}>
        <div className="sticky top-0 z-10 bg-slate-800 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">
              Manage Services
            </h2>
            {/* <button
            onClick={handleAddService}
            className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Service
          </button> */}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-150px)]">
          {loading && <div className="p-4 text-white">Loading...</div>}
          {error && <div className="p-4 text-red-500">Error: {error}</div>}
          {!loading && !error && (
            <SettingsSection title="Hourly Rates">
              {localServices.map((service) => (
                <ServiceSettingsCard
                  key={service.service_id}
                  service={service}
                  onServiceChange={(field, value) =>
                    handleServiceChange(service.service_id, field, value)
                  }
                  onRemove={() => handleRemoveService(service.service_id)}
                />
              ))}
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
});

ServiceSettings.displayName = "ServiceSettings";

export default ServiceSettings;
