import PropTypes from "prop-types";

const TaskFinancialsBreakdown = ({ task, services, color, adjustments }) => {
  if (!task.financial_data) {
    return (
      <div className="text-gray-500">No financial data for this task.</div>
    );
  }

  const sections = Object.entries(task.financial_data);
  if (adjustments?.length > 0) {
    sections.push(...adjustments);
  }

  return (
    <div
      className={`${color} pb-5 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2`}
    >
      <div className="">
        {sections.map(([id, sectionData]) => {
          if (id === "hours") {
            return (
              <div key={id} className="">
                <div className="grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 text-sm">
                  <div></div>
                  <div className="font-semibold capitalize text-gray-800">
                    {sectionData.name}
                  </div>
                  <div className="text-right"></div>
                  <div className="text-right"></div>
                  <div className="text-right"></div>
                </div>

                {(sectionData.data || []).map((service) => {
                  const serviceInfo = services.find(
                    (s) => s.team_service_id === service.team_service_id
                  );
                  const rate =
                    service.rateOverride ?? serviceInfo?.hourly_rate ?? 0;
                  const estimate =
                    (service.estimate || 0) * rate + (service.fixedAmount || 0);

                  // Calculate actual hours, excluding fixed_amount entries
                  const actualHours = (service.inputRows || []).reduce(
                    (sum, row) => {
                      if (row.employee_id === "fixed_amount") return sum;
                      const hoursValue = row.hours?.decimal ?? row.hours ?? 0;
                      return sum + hoursValue;
                    },
                    0
                  );

                  return (
                    <div
                      key={service.team_service_id}
                      className="grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 text-sm py-2 hover:bg-gray-200"
                    >
                      <div></div>
                      <div className="text-gray-600">
                        {serviceInfo?.service_name}
                      </div>
                      <div className="text-right">
                        $
                        {estimate.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <div className="text-gray-500">
                          ({service.estimate.toFixed(2)} hrs)
                        </div>
                      </div>
                      <div className="text-right">
                        $
                        {service.actual_cost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <div className="text-gray-500">
                          ({actualHours.toFixed(2)} hrs)
                        </div>
                      </div>
                      <div
                        className={`text-right mx-2 ${
                          estimate - service.actual_cost > 0
                            ? "text-green-600"
                            : estimate - service.actual_cost < 0
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        $
                        {(estimate - service.actual_cost).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                        <div
                          className={`text-gray-500 ${
                            estimate - service.actual_cost > 0
                              ? "text-green-600"
                              : estimate - service.actual_cost < 0
                              ? "text-red-600"
                              : "text-blue-600"
                          }`}
                        >
                          ({(service.estimate - actualHours).toFixed(2)} hrs)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={id} className="py-2 hover:bg-gray-200">
              <div className="grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 text-sm">
                <div></div>
                <div className="font-semibold capitalize text-gray-800">
                  {sectionData.name}
                </div>
                <div className="text-right">
                  $
                  {sectionData.estimate.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-right">
                  $
                  {sectionData.actual_cost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div
                  className={`text-right mx-2 ${
                    sectionData.estimate - sectionData.actual_cost >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  $
                  {(
                    sectionData.estimate - sectionData.actual_cost
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* <div>
          <div className="grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 text-sm">
            <div></div>
            <div className="font-semibold capitalize text-gray-800">Commission</div>
            <div className="text-right">
              ${commission.estimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-right">
              ${commission.actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-right mx-2 ${commission.estimate - commission.actual >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${(commission.estimate - commission.actual).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

TaskFinancialsBreakdown.propTypes = {
  task: PropTypes.object.isRequired,
  services: PropTypes.array.isRequired,
};

export default TaskFinancialsBreakdown;
