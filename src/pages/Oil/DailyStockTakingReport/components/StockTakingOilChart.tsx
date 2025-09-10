import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// Define the props type
interface StockTakingOilChartProps {
  sohFisik: number;
  pendingPosting: number;
  sohSystem: number;
  pendingReceive: number;
  diff: number; // Difference input
}

const StockTakingOilChart: React.FC<StockTakingOilChartProps> = ({
  sohFisik,
  pendingPosting,
  sohSystem,
  pendingReceive,
  diff,
}) => {
  // Calculate totals for Fisik and Sistem
  const totalFisik = sohFisik + pendingPosting;
  const totalSistem = sohSystem + pendingReceive;

  // Series data without sorting
  const unsortedSeries = [
    {
      name: 'SOH System', // Part of "Sistem"
      data: [sohSystem, 0, 0], // Value for Sistem, then placeholders
    },
    {
      name: 'Pending Receive', // Part of "Sistem"
      data: [pendingReceive, 0, 0], // Value for Sistem, then placeholders
    },
    {
      name: 'SOH Fisik', // Part of "Fisik"
      data: [0, sohFisik, 0], // Placeholder for Sistem, value for Fisik, then placeholders
    },
    {
      name: 'Pending Posting', // Part of "Fisik"
      data: [0, pendingPosting, 0], // Placeholder for Sistem, value for Fisik, then placeholders
    },
    {
      name: 'Difference', // Difference (Fisik - Sistem)
      data: [0, 0, diff], // Placeholder for Sistem and Fisik, value for Difference
    },
  ];

  // Sort Fisik and Sistem based on the highest total value
  const sortedSeries = totalFisik > totalSistem
    ? [...unsortedSeries.slice(2, 4), ...unsortedSeries.slice(0, 2), unsortedSeries[4]] // Fisik first, then Sistem
    : [...unsortedSeries.slice(0, 2), ...unsortedSeries.slice(2, 4), unsortedSeries[4]]; // Sistem first, then Fisik

  // Dynamic color for "Difference" based on whether it's positive or negative
  const differenceColor = diff >= 0 ? '#28a745' /* green */ : '#FF4560' /* red */;

  // Chart options with blue for "Fisik" and yellowish for "Sistem"
  const options: ApexOptions = {
    chart: {
      type: 'bar' as const, // Explicitly type as 'bar'
      stacked: true,
    },
    plotOptions: {
      bar: {
        horizontal: true,
        columnWidth: '50%',
      },
    },
    xaxis: {
      categories: ['Sistem', 'Fisik', 'Difference'], // X-axis categories
    },
    // Blue monochromes for "Fisik", yellowish tones for "Sistem", and dynamic color for Difference
    colors: ['#FFC300', '#FFEB3B', '#1E90FF', '#87CEEB', differenceColor], // Sistem (yellowish), Fisik (blue), Difference (dynamic)
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val}`, // Show negative values correctly
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: function(val: any): string {
          return Number(val).toFixed(2);
        }
      }
    },
    legend: {
      position: 'top',
    },
    yaxis: {
      labels: {
        formatter: function(val: any): string {
          if (val === null || val === undefined) return '0';
          const num = parseFloat(val.toString());
          return isNaN(num) ? '0' : num.toFixed(2);
        },
      },
    },
  };

  return (
    <div>
      <Chart
        options={options}
        series={sortedSeries} // Use the sorted series
        type="bar"
        height={350}
      />
    </div>
  );
};

export default StockTakingOilChart;