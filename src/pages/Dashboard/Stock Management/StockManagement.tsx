import React, { useState, useEffect } from 'react';
import Ritation from '../Operational/Ritation/Ritation';
const StockManagement = () => {
  useEffect(() => {}, []);

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-2 lg:p-4">
              <h2 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl w-full">
                Stock Management
              </h2>

              <div className="main-content w-full">
                <Ritation />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StockManagement;
