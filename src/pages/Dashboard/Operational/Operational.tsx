import React from 'react';
import RefuelingAnomaly from './RefuelingAnomaly';

const Operational = () => {
  return (
    <div>
      <div className="title">
        <h2 className="mb-2 text-title-sm font-bold text-black dark:text-white w-full">
          Operational Management
        </h2>
      </div>
      <div className="content-container">
        <RefuelingAnomaly />
      </div>
    </div>
  );
};

export default Operational;
