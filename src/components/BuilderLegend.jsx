import React from 'react';
import { useSelector } from 'react-redux';

const BuilderLegend = () => {
  const builders = useSelector(state => state.builders.builders);

  return (
    <div className="builder-legend">
      {builders.map(builder => (
        <div key={builder.id} className="builder-legend-item">
          <div 
            className="builder-color-box" 
            style={{ backgroundColor: builder.color }}
          ></div>
          <span>{builder.name}</span>
        </div>
      ))}
    </div>
  );
};

export default BuilderLegend;