import React, { useState, useEffect } from 'react';
import RitationPlanInput from './components/RitationPlanInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRemove } from '@fortawesome/free-solid-svg-icons';

const FuelRitationPlan = () => {
  const [docPreview, setDocPreview] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handlePreview = (file: File) => {
    setDocPreview(file);
    const fileUrl = URL.createObjectURL(file); // Create URL for the PDF file
    setPdfUrl(fileUrl); // Store the URL to use in the embed tag
  };

  const handleUnloadPreview = () => {
    setDocPreview(null);
    setPdfUrl(null); // Reset the PDF URL
  };

  useEffect(() => {
    return () => {
      // Clean up URL object on component unmount
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <>
      <div className="rounded-sm mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full ">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Fuel Ritation Plan
              </h2>

              <div className="main-content grid grid-cols-3 w-full gap-4">
                <div className="flex flex-col gap-9 col-span-3 lg:col-span-1">
                  {/* Input Form */}
                  <RitationPlanInput onPreview={handlePreview} />
                </div>

                {docPreview ? (
                  <div className="flex flex-col gap-9 col-span-3 lg:col-span-2">
                    {/* Document Preview */}
                    <div className="h-full w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                      <div className="border-b border-stroke py-1 px-6.5 dark:border-strokedark flex justify-between">
                        <h3 className="font-medium text-black dark:text-white">
                          Document Preview
                        </h3>
                        <button onClick={handleUnloadPreview}>
                          <FontAwesomeIcon icon={faRemove} color="red" />
                        </button>
                      </div>
                      {/* Display PDF when loaded */}
                      {pdfUrl && (
                        <div className="p-4">
                          <embed
                            src={pdfUrl}
                            type="application/pdf"
                            width="100%"
                            height="600px"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-9 col-span-3 lg:col-span-2">
                    {/* Ritation Stats */}
                    <div className="h-full w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                      <div className="border-b border-stroke py-1 px-6.5 dark:border-strokedark flex justify-between">
                        <h3 className="font-medium text-black dark:text-white">
                          Ritation Plan & Actual Statistics
                        </h3>
                        <div className="relative z-20 flex flex-row align-middle items-center">
                          <select className="relative z-20 inline-flex appearance-none bg-transparent py-1 pl-3 pr-8 text-sm font-medium outline-none">
                            <option
                              value="This Week"
                              className="dark:bg-boxdark"
                            >
                              This Year
                            </option>
                            <option
                              value="Last Week"
                              className="dark:bg-boxdark"
                            >
                              Prev Year
                            </option>
                            <option
                              value="This Month"
                              className="dark:bg-boxdark"
                            >
                              Prev 2 Years
                            </option>
                            <option
                              value="Last Month"
                              className="dark:bg-boxdark"
                            >
                              Prev 3 Years
                            </option>
                          </select>
                          <div className="align-middle">
                            <svg
                              width="10"
                              height="6"
                              viewBox="0 0 10 6"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0.47072 1.08816C0.47072 1.02932 0.500141 0.955772 0.54427 0.911642C0.647241 0.808672 0.809051 0.808672 0.912022 0.896932L4.85431 4.60386C4.92785 4.67741 5.06025 4.67741 5.14851 4.60386L9.09079 0.896932C9.19376 0.793962 9.35557 0.808672 9.45854 0.911642C9.56151 1.01461 9.5468 1.17642 9.44383 1.27939L5.50155 4.98632C5.22206 5.23639 4.78076 5.23639 4.51598 4.98632L0.558981 1.27939C0.50014 1.22055 0.47072 1.16171 0.47072 1.08816Z"
                                fill="#637381"
                              />
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M1.22659 0.546578L5.00141 4.09604L8.76422 0.557869C9.08459 0.244537 9.54201 0.329403 9.79139 0.578788C10.112 0.899434 10.0277 1.36122 9.77668 1.61224L9.76644 1.62248L5.81552 5.33722C5.36257 5.74249 4.6445 5.7544 4.19352 5.32924C4.19327 5.32901 4.19377 5.32948 4.19352 5.32924L0.225953 1.61241C0.102762 1.48922 -4.20186e-08 1.31674 -3.20269e-08 1.08816C-2.40601e-08 0.905899 0.0780105 0.712197 0.211421 0.578787C0.494701 0.295506 0.935574 0.297138 1.21836 0.539529L1.22659 0.546578ZM4.51598 4.98632C4.78076 5.23639 5.22206 5.23639 5.50155 4.98632L9.44383 1.27939C9.5468 1.17642 9.56151 1.01461 9.45854 0.911642C9.35557 0.808672 9.19376 0.793962 9.09079 0.896932L5.14851 4.60386C5.06025 4.67741 4.92785 4.67741 4.85431 4.60386L0.912022 0.896932C0.809051 0.808672 0.647241 0.808672 0.54427 0.911642C0.500141 0.955772 0.47072 1.02932 0.47072 1.08816C0.47072 1.16171 0.50014 1.22055 0.558981 1.27939L4.51598 4.98632Z"
                                fill="#637381"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 h-full w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
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
