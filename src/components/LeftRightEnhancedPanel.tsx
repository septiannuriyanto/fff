import React, { ReactNode } from 'react';

interface RitationCardProps {
  panelTitle: string;
  titleLeft: string;
  totalLeft: string;
  titleRight: string;
  totalRightTop: string;
  totalRightBottom: string;
}

const LeftRightEnhancedPanel: React.FC<RitationCardProps> = ({
  panelTitle,
  titleLeft,
  totalLeft,
  titleRight,
  totalRightTop,
  totalRightBottom
}) => {
  return (
    <div className="border-stroke bg-white shadow-default rounded-sm border  py-4 px-4  dark:border-strokedark dark:bg-boxdark">
      <h1 className="pb-4 font-bold text-bodydark">{panelTitle}</h1>
      <div className=" flex items-center justify-between">
        {/* First Panel */}
        <div className="mr-4 w-full">
          <h4 className="text-title-sm font-bold  text-black dark:text-white">
            {totalLeft}
          </h4>
          <span className="text-sm text-body font-medium">{titleLeft}</span>
          <div className='flex justify-between text-blue-700 underline'><button><h1 className="text-sm text-body font-medium">PO Doc</h1></button>
          <button><h1 className="text-sm text-body font-medium">BA Request</h1></button></div>
        </div>

         {/* Vertical Divider */}
      <div className="h-10 w-px bg-bodydark dark:bg-gray-600 mx-4"></div>


        {/* Second Panel */}
        <div className="flex flex-col ml-4 w-full items-center">
          <h4 className="text-title-sm font-bold text-black dark:text-white">
            {totalRightTop}
          </h4>
          <span className="text-sm text-body font-medium">{titleRight}</span>
          <h4 className="text-title-sm font-bold text-black dark:text-white">
            {totalRightBottom}
          </h4>
        </div>
      </div>
    </div>
  );
};

export default LeftRightEnhancedPanel;
