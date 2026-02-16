import React, { ReactNode } from 'react';

interface PanelContainerProps {
  title?: string;
  children: ReactNode;

  /** Optional class overrides */
  className?: string;
  contentClassName?: string;

  /** Optional action area (filter, button, etc) */
  actions?: ReactNode;
}

const PanelContainer: React.FC<PanelContainerProps> = ({
  title,
  children,
  className = '',
  contentClassName = '',
  actions,
}) => {
  return (
    <div
      className={`
        w-full rounded-sm border border-stroke 
        bg-white dark:border-strokedark dark:bg-boxdark
        ${className}
      `}
    >
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stroke dark:border-strokedark px-4 py-3 gap-4">
          {title && (
            <h3 className="font-semibold text-black dark:text-white">
              {title}
            </h3>
          )}

          {actions && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className={`p-4 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default PanelContainer;
