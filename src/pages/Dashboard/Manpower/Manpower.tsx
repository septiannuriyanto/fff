import React, { useState, useEffect } from 'react';
import Roster from './Roster';
const Manpower = () => {

useEffect(()=>{},[


]);

return (
  <div>
    <div className="title">
      <h2 className="mb-2 text-title-sm font-bold text-black dark:text-white w-full">
        Manpower Management
      </h2>
    </div>
    <div className="content-container">
      <Roster />
    </div>
  </div>
);
};

export default Manpower;
