import React, { useState, useEffect } from 'react';
import Roster from './Roster';
import LeaveList from './Leave/LeaveList';
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
      <div className="roster mb-2">
      <Roster />
      </div>
      <div className="leave-list mb-2">
      <LeaveList/>
      </div>
    </div>
  </div>
);
};

export default Manpower;
