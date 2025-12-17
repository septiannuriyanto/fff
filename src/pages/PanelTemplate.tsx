import React, { ReactNode, useEffect } from 'react';

interface PanelTemplateProps {
  title?: string;
  children: ReactNode;

  /** Optional class overrides */
  containerClassName?: string;
  contentClassName?: string;

  /** Optional side effect on mount / deps change */
  onEffect?: () => void;
  deps?: React.DependencyList;
}

const PanelTemplate: React.FC<PanelTemplateProps> = ({
  title,
  children,
  containerClassName = '',
  contentClassName = '',
  onEffect,
  deps = [],
}) => {
  useEffect(() => {
    if (onEffect) {
      onEffect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div
      className={`rounded-sm border border-stroke bg-white shadow-default 
      dark:border-strokedark dark:bg-boxdark mb-6 ${containerClassName}`}
    >
      <div className="flex flex-wrap items-center">
        <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
          <div className={`w-full p-4 sm:p-12.5 xl:p-5 ${contentClassName}`}>
            {title && (
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                {title}
              </h2>
            )}

            <div className="main-content w-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelTemplate;
