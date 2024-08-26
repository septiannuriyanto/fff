// InstalledChart.tsx
import React from 'react';
import ReactApexChart from 'react-apexcharts';

interface InstalledChartProps {
  installed: number;
  notInstalled: number;
}

const InstalledChart: React.FC<InstalledChartProps> = ({ installed, notInstalled }) => {
  const chartOptions = {
    chart: {
      type: 'donut',
    },
    labels: ['Installed', 'Not Installed'],
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
      }
    },
  };

  const chartSeries = [installed, notInstalled];

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

export default InstalledChart;
