// StatusChart.tsx
import React from 'react';
import ReactApexChart from 'react-apexcharts';

interface StatusChartProps {
  openCount: number;
  progressCount: number;
  closedCount: number;
}

const StatusChart: React.FC<StatusChartProps> = ({ openCount, progressCount, closedCount }) => {
  const chartOptions = {
    chart: {
      type: 'donut',
    },
    labels: ['Open', 'Progress', 'Closed'],
    colors: ['#ffaaaa', '#ffffb0', '#aaffaa'], // Light red for Open, light yellow for Progress, light green for Closed
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
        colors: ['black'], // Set data label color to white
        fontSize: '14px', // Adjust font size if needed
        fontFamily: 'Arial, sans-serif', // Set font family if needed
        textShadow: 'none' // Ensure no text shadow is applied
      },
      dropShadow: {
        enabled: false // Explicitly disable drop shadow
      }
    },
  };

  const chartSeries = [openCount, progressCount, closedCount];

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

export default StatusChart;
