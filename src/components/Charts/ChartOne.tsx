import { ApexOptions } from 'apexcharts';
import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useTheme } from '../../contexts/ThemeContext';

interface ChartOneProps {
  data1: number[];
  data2: number[];
}

const ChartOne: React.FC<ChartOneProps> = ({ data1, data2 }) => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;
  const isDark = theme.baseTheme === 'dark';
  const cardTheme = theme.card;

  // ... (existing code for state) ...
  const [state, setState] = useState({
    series: [
      {
        name: 'Product One',
        data: data1,
      },
      {
        name: 'Product Two',
        data: data2,
      },
    ],
  });

  useEffect(() => {
    setState({
      series: [
        {
          name: 'Product One',
          data: data1,
        },
        {
          name: 'Product Two',
          data: data2,
        },
      ],
    });
  }, [data1, data2]);

  const options: ApexOptions = {
    // ... (existing options) ...
    colors: [theme.ui.primaryColor, '#80CAEE'],
    // ...
  };

  return (
    <div 
      className="col-span-12 p-7.5 transition-all duration-300 xl:col-span-8"
      style={{
        backgroundColor: isDark 
          ? `rgba(0, 0, 0, ${cardTheme.opacity})` 
          : `rgba(255, 255, 255, ${cardTheme.opacity})`,
        backdropFilter: cardTheme.backdropBlur !== 'none' 
          ? `blur(${cardTheme.backdropBlur === 'sm' ? '4px' : cardTheme.backdropBlur === 'md' ? '8px' : cardTheme.backdropBlur === 'lg' ? '12px' : cardTheme.backdropBlur === 'xl' ? '20px' : '0px'})` 
          : undefined,
        borderWidth: cardTheme.borderWidth,
        borderColor: cardTheme.borderColor,
        borderRadius: cardTheme.borderRadius,
        boxShadow: cardTheme.shadow,
        color: cardTheme.textColor,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div className="flex w-full flex-wrap gap-3 sm:gap-5">
          <div className="flex min-w-47.5">
            <span className="mt-1 mr-2 flex h-4 w-full max-w-4 items-center justify-center rounded-full border border-primary">
              <span className="block h-2.5 w-full max-w-2.5 rounded-full bg-primary"></span>
            </span>
            <div className="w-full">
              <p className="font-semibold text-primary">Total Revenue</p>
              <p className="text-sm font-medium">12.04.2022 - 12.05.2022</p>
            </div>
          </div>
          <div className="flex min-w-47.5">
            <span className="mt-1 mr-2 flex h-4 w-full max-w-4 items-center justify-center rounded-full border border-secondary">
              <span className="block h-2.5 w-full max-w-2.5 rounded-full bg-secondary"></span>
            </span>
            <div className="w-full">
              <p className="font-semibold text-secondary">Total Sales</p>
              <p className="text-sm font-medium">12.04.2022 - 12.05.2022</p>
            </div>
          </div>
        </div>
        <div className="flex w-full max-w-45 justify-end">
          <div className="inline-flex items-center rounded-md bg-whiter p-1.5 dark:bg-meta-4">
            <button className="rounded bg-white py-1 px-3 text-xs font-medium text-black shadow-card hover:bg-white hover:shadow-card dark:bg-boxdark dark:text-white dark:hover:bg-boxdark">
              Day
            </button>
            <button className="rounded py-1 px-3 text-xs font-medium text-black hover:bg-white hover:shadow-card dark:text-white dark:hover:bg-boxdark">
              Week
            </button>
            <button className="rounded py-1 px-3 text-xs font-medium text-black hover:bg-white hover:shadow-card dark:text-white dark:hover:bg-boxdark">
              Month
            </button>
          </div>
        </div>
      </div>

      <div>
        <div id="chartOne" className="-ml-5">
          <ReactApexChart
            options={options}
            series={state.series}
            type="area"
            height={350}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartOne;
