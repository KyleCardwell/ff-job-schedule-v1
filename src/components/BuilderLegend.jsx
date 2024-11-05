import React from 'react';
import { useSelector } from 'react-redux';

const BuilderLegend = () => {
  const employees = useSelector(state => state.builders.employees);

  return (
    <div className="builder-legend">
      {employees.map(employee => (
        <div key={employee.employee_id} className="builder-legend-item">
          <div 
            className="builder-color-box" 
            style={{ backgroundColor: employee.employee_color }}
          ></div>
          <span>{employee.employee_name}</span>
        </div>
      ))}
    </div>
  );
};

export default BuilderLegend;