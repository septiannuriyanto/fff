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
  titleColor = 'text-gray-700 dark:text-gray-300', // updated default
  panelColor = 'backdrop-blur-md bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/5 shadow-lg', // updated default
}) => {
  return (
    <div className={`rounded-xl transition-all duration-300 p-4 h-full flex flex-col justify-between ${panelColor}`}>
      <h1 className={`pb-4 font-bold text-sm tracking-tight ${titleColor}`}>{panelTitle}</h1>
      <div className="flex items-center justify-between gap-4">
        {/* First Panel */}
        <div className="flex-1">
          <h4 className="text-xl font-black text-black dark:text-white tabular-nums tracking-tighter">
            {total1}
          </h4>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{title1}</span>
        </div>

        {/* Vertical Divider */}
        <div className="h-10 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>

        {/* Second Panel */}
        <div className="flex-1 text-right">
          <h4 className="text-xl font-black text-black dark:text-white tabular-nums tracking-tighter">
            {total2}
          </h4>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{title2}</span>
        </div>
      </div>
    </div>
  );
};

export default LeftRightPanel;
