import React from 'react';
import Chart from 'react-apexcharts';

interface CardPanelProps {
  data: RitasiFuelData[];
}

const RitationValidationChart: React.FC<CardPanelProps> = ({ data }) => {
  // Group data by isValidated and count the occurrences
  const validatedCount = data.filter((item) => item.isValidated).length;
  const notValidatedCount = data.length - validatedCount;

  const chartData = {
    series: [validatedCount, notValidatedCount], // Counts of validated and not validated
    options: {
      labels: ['Validated', 'Not Validated'], // Labels for the donut chart
      chart: {
        type: 'donut' as const, // Change to donut chart
      },
      colors: ['#aaffaa', '#ffaaaa'], // Set colors for the segments
      legend: {
        position: 'bottom' as const,
        margin: 10, // Add margin to the legend
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
      plotOptions: {
        pie: {
          donut: {
            size: '50%', // Size of the donut
          },
        },
      },

    },
  };

  return (
    <div className="w-full">
      <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4 px-2">Daily Ritation Validation</h4>
      <div className="flex flex-col">
        <Chart
          options={chartData.options}
          series={chartData.series}
          type="donut"
          width="380"
        />
      </div>
    </div>
  );
};

export default RitationValidationChart;
