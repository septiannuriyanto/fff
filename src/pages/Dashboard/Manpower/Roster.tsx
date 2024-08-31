import React, { useState, useEffect } from 'react';
import RosterGannt from './components/RosterGannt';
import { registerLicense } from '@syncfusion/ej2-base';

registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);

const Roster = () => {

useEffect(()=>{},[


]);


  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
            <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Roster Management
              </h2>
  
              <div className="w-full">
                <RosterGannt/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Roster;
