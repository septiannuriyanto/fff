import React from 'react';
import Chart from 'react-apexcharts';
interface CardPanelProps {
  data: RitasiFuelData[];
}

const RitationSubtotalByFTChart: React.FC<CardPanelProps> = ({ data }) => {
  // Group data by unit and sum qty_sj for each unit
  const groupedData = data.reduce((acc: Record<string, number>, item) => {
    if (acc[item.unit]) {
      acc[item.unit] += item.qty_sj;
    } else {
      acc[item.unit] = item.qty_sj;
    }
    return acc;
  }, {});

  const chartData = {
    series: Object.values(groupedData), // Qty values
    options: {
      labels: Object.keys(groupedData), // Unit names
      chart: {
        type: 'donut',
      },
      fill: {
        type: 'gradient',
      },
      legend: {
        position: 'right',
        offsetY : 30,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '30%',
          },
        },
      },

      dataLabels: {
        style: {
          colors: ['#FFFFFF'], // Set data label color to white
          fontSize: '14px', // Adjust font size if needed
          fontFamily: 'Arial, sans-serif', // Set font family if needed
          textShadow: 'none' // Ensure no text shadow is applied
        },
        dropShadow: {
          enabled: false // Explicitly disable drop shadow
        }
      },
      stroke: {
        show: true,
        width: 2,
      },
      dropShadow: {
        enabled: false,

      },
    },
  };

  return (
    <div className=' rounded-sm border bg-white py-2 px-2  shadow-default  border-stroke dark:border-strokedark dark:bg-boxdark items-left  '>
      <h1 className='font-bold text-bodydark'>Daily Ritation Qty By Unit</h1>
      <div className="flex flex-col ">
      <Chart options={chartData.options} series={chartData.series} type="donut"  />
    </div>
    </div>
  );
};

export default RitationSubtotalByFTChart;
