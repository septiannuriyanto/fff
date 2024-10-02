import React, { useState, useEffect } from 'react';
import ContactForm from '../../../Form/components/ContactForm';
import RitationPlanInput from './components/RitationPlanInput';

const FuelRitationPlan = () => {
  useEffect(() => {}, []);

  return (
    <>
      <div className=" rounded-sm mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full ">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Fuel Ritation Plan
              </h2>

              <div className="main-content grid grid-cols-3 w-full gap-4">
                <div className="flex flex-col gap-9 col-span-3 lg:col-span-1">
                  {/* <!-- Input Form --> */}
                  <RitationPlanInput />
                </div>

                <div className="flex flex-col gap-9 col-span-3 lg:col-span-2">
                  {/* <!-- Ritation Stats --> */}
                  <div className=" h-full w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                    <div className="border-b border-stroke py-1 px-6.5 dark:border-strokedark">
                      <h3 className="font-medium text-black dark:text-white">
                        Ritation Plan & Actual Statistics
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
              <div className=" mt-4 h-full w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                    <div className="border-b border-stroke py-1 px-6.5 dark:border-strokedark">
                      <h3 className="font-medium text-black dark:text-white">
                        List PO Transaction
                      </h3>
                    </div>
                  </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FuelRitationPlan;
