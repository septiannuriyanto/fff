<<<<<<< HEAD
import React, { ReactNode } from 'react';

interface RitationCardProps {
  panelTitle: string;
  title1: string;
  total1: string;
  title2: string;
  total2: string;
}

const LeftRightPanel: React.FC<RitationCardProps> = ({
  panelTitle,
  title1,
  total1,
  title2,
  total2,
}) => {
  return (
    <div className="border-stroke bg-white shadow-default rounded-sm border  py-4 px-4  dark:border-strokedark dark:bg-boxdark">
      <h1 className="pb-4 font-bold text-bodydark">{ panelTitle}</h1>
      <div className=" flex items-center justify-between">
        {/* First Panel */}
        <div className="mr-4 w-full">
          <h4 className="text-title-sm font-bold  text-black dark:text-white">
            {total1}
          </h4>
          <span className="text-sm text-body font-medium">{title1}</span>
        </div>

         {/* Vertical Divider */}
      <div className="h-10 w-px bg-bodydark dark:bg-gray-600 mx-4"></div>


        {/* Second Panel */}
        <div className="ml-4 w-full" >
          <h4 className="text-title-sm font-bold text-black dark:text-white">
            {total2}
          </h4>
          <span className="text-sm text-body font-medium">{title2}</span>
        </div>
      </div>
    </div>
  );
};

export default LeftRightPanel;
=======
import React from 'react';

interface RitationCardProps {
  panelTitle: string;
  title1: string;
  total1: string;
  title2: string;
  total2: string;
  titleColor?: string;   // Optional: untuk warna judul
  panelColor?: string;   // Optional: untuk warna background panel
}

const LeftRightPanel: React.FC<RitationCardProps> = ({
  panelTitle,
  title1,
  total1,
  title2,
  total2,
  titleColor = 'text-bodydark', // default value
  panelColor = 'bg-white dark:bg-boxdark', // default value
}) => {
  return (
    <div className={`border-stroke ${panelColor} shadow-default rounded-sm border py-4 px-4 dark:border-strokedark`}>
      <h1 className={`pb-4 font-bold ${titleColor}`}>{panelTitle}</h1>
      <div className="flex items-center justify-between">
        {/* First Panel */}
        <div className="mr-4 w-full">
          <h4 className="text-title-sm font-bold text-black dark:text-white">
            {total1}
          </h4>
          <span className="text-sm text-body font-medium">{title1}</span>
        </div>

        {/* Vertical Divider */}
        <div className="h-10 w-px bg-bodydark dark:bg-gray-600 mx-4"></div>

        {/* Second Panel */}
        <div className="ml-4 w-full">
          <h4 className="text-title-sm font-bold text-black dark:text-white">
            {total2}
          </h4>
          <span className="text-sm text-body font-medium">{title2}</span>
        </div>
      </div>
    </div>
  );
};

export default LeftRightPanel;
>>>>>>> 626d050065e4208e0ef0792b389eaa7a8118c890
