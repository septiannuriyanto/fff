// ReportedChart.tsx
import React from 'react';
import ReactApexChart from 'react-apexcharts';

interface ReportedChartProps {
    reported: number;
  notReported: number;
}

const ReportedChart: React.FC<ReportedChartProps> = ({ reported, notReported }) => {
  const chartOptions = {
    chart: {
      type: 'donut',
    },
    labels: ['Reported', 'Not Reported'],
    colors: ['#aaffaa', '#ffaaaa'], // Light green for Installed, light red for Not Installed
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }],
    legend: {
      labels: {
        colors: ['#FFFFFF'], // Set label color to white
      }
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
  };

  const chartSeries = [reported, notReported];

  return (
    <div>
      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="donut"
        width="380"
      />
    </div>
  );
};

export default ReportedChart;
