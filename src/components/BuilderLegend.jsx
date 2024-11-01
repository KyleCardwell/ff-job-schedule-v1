import React from 'react';
import { useSelector } from 'react-redux';

const BuilderLegend = () => {
  const employees = useSelector(state => state.builders.employees);

  return (
    <div className="builder-legend">
      {employees.map(builder => (
        <div key={builder.id} className="builder-legend-item">
          <div 
            className="builder-color-box" 
            style={{ backgroundColor: builder.employee_color }}
          ></div>
          <span>{builder.employee_name}</span>
        </div>
      ))}
    </div>
  );
};

export default BuilderLegend;