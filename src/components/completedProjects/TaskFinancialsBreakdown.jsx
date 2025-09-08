import PropTypes from 'prop-types';

const TaskFinancialsBreakdown = ({ task, services }) => {
  if (!task.financial_data) {
    return <div className="p-4 text-gray-500">No financial data for this task.</div>;
  }

  const sections = Object.entries(task.financial_data);

  return (
    <div className="p-4 bg-gray-100">
      <div className="space-y-4">
        {sections.map(([id, sectionData]) => {
          if (id === 'hours') {
            return (
              <div key={id} className="p-3 bg-white rounded-lg shadow-sm max-w-[800px] mx-auto">
                <h5 className="font-semibold capitalize text-gray-800 border-b pb-2 mb-2">{sectionData.name}</h5>
                <div className="space-y-1 pl-4">
                  {(sectionData.data || []).map(service => {
                    const serviceInfo = services.find(s => s.team_service_id === service.team_service_id);
                    const rate = service.rateOverride ?? serviceInfo?.hourly_rate ?? 0;
                    const estimate = (service.estimate || 0) * rate + (service.fixedAmount || 0);
                    
                    return (
                      <div key={service.team_service_id} className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-gray-600">{serviceInfo?.service_name}</div>
                        <div className="font-medium">Est: ${estimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="font-medium">Act: ${service.actual_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={id} className="p-3 bg-white rounded-lg shadow-sm max-w-[800px] mx-auto">
               <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="font-semibold capitalize text-gray-800">{sectionData.name}</div>
                <div className="font-medium">Est: ${sectionData.estimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="font-medium">Act: ${sectionData.actual_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

TaskFinancialsBreakdown.propTypes = {
  task: PropTypes.object.isRequired,
  services: PropTypes.array.isRequired,
};

export default TaskFinancialsBreakdown;