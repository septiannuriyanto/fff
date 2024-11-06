import React from 'react';

interface PageProps {
  margins: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  
  
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Page: React.FC<PageProps> = ({ margins, children, header, footer }) => {
  const { top, right, bottom, left } = margins;

  return (
    <div className='bg-white dark:bg-boxdark border border-gray-300 justify-start'>
        <div className='header w-full h-[20mm]'>
        {header}
        </div>
      <div
        className=" text-start"
        style={{  
          padding: `${top} ${right} ${bottom} ${left}`,
          width: '210mm', // Fixed width for A4
          height: '297mm', // Height adjusts based on content
          maxHeight: '297mm', // Set a maximum height for the A4 page

          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
      <div className='footer w-full h-[20mm]'>
        {footer}
        </div>
    </div>
  );
};

export default Page;
