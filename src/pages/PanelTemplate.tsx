import React, { useState, useEffect } from 'react';



const PanelTemplate = () => {

useEffect(()=>{},[


]);


  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
            <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Replace With New Title
              </h2>
  
              <div className="main-content  w-full">
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PanelTemplate;
