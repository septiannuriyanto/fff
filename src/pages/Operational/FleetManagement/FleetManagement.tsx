import React, { useState } from "react";
import FleetHDSection from "./component/FleetHdSection";
import DonutOCR from "./component/DonutOCR";
const FleetManagement = () => {

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Fleet Management
              </h2>

              {/* ==================== FLEET HD SECTION ==================== */}
              <div className="main-content w-full mt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  🚛 Fleet HD
                </h3>
                <DonutOCR/>
              </div>
              {/* ================== END FLEET HD SECTION ================== */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FleetManagement;
