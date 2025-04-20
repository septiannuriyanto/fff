import React, { ReactNode } from 'react';
import { formatNumberWithSeparator } from '../../../../../Utils/NumberUtility';

interface RitationStatsProps {
  panelTitle: string;
  titleLeft: string;
  ritationProgress: string;
  receiveProgress: string;
  ritationQty: number;
  receivedQty:number;
  planQty: number;
  poDoc: string | undefined;
  onShowPoDoc?: () => void | undefined;
  onShowBaRequest?: () => void | undefined;
}

const RitationStatsPanel: React.FC<RitationStatsProps> = ({
  ritationProgress,
  receiveProgress,
  panelTitle,
  receivedQty,
  ritationQty,
  planQty,
  poDoc,
  onShowBaRequest,
  onShowPoDoc
}) => {
  return (
    <div className="border-stroke bg-white shadow-default rounded-sm border  py-4 px-4  dark:border-strokedark dark:bg-boxdark">
      <h1 className="pb-0 font-bold text-bodydark">{panelTitle}</h1>
       {/* First Panel */}
       <div className="w-full flex items-center justify-evenly underline pb-4">
            
              <button onClick={onShowPoDoc}>{poDoc}</button>
              
            
            <button onClick={onShowBaRequest}>
              BA Request
            </button>
      
        </div>
      <div className=" flex items-center justify-between">
        <div className="panel__content flex w-full">

          {/* First Panel */}
          <div className="flex flex-col ml-4 w-full items-start">
          <h4 className="text-title font-bold text-black dark:text-white">
             Plan Qty :  {formatNumberWithSeparator(planQty)}
            </h4>
            <h4 className="text-title font-bold text-blue-600 dark:text-white">
             Reconcile Qty :  {formatNumberWithSeparator(ritationQty)}
            </h4>
            <h4 className="text-title font-bold text-green-600 dark:text-white">
             Received Qty :  {formatNumberWithSeparator(receivedQty)}
            </h4>
            {receivedQty - ritationQty < 0 && <h4 className="text-title font-bold text-red-600 dark:text-white">
             Outs Receive Qty :  {formatNumberWithSeparator(receivedQty-ritationQty)}
            </h4>}
            
            {/* <span className="text-sm text-body font-medium">{titleRight}</span> */}
            
          </div>
        </div>
        {/* Vertical Divider */}
        <div className="h-10 w-px bg-bodydark dark:bg-gray-600 mx-4"></div>
        {/* Second Panel */}
        <div className="flex flex-col ml-4 w-full items-start">
          <h4 className="text-title font-bold text-blue-600 dark:text-white">
             Ritation Progress : {ritationProgress}
            </h4>
            <h4 className="text-title font-bold text-green-600 dark:text-white">
             Receive Progress : {receiveProgress}
            </h4>

            {/* <span className="text-sm text-body font-medium">{titleRight}</span> */}
            
          </div>
      </div>
    </div>
  );
};

export default RitationStatsPanel;
