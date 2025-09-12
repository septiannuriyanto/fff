import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// Define the props type
interface StockTakingOilChartProps {
  sohFisik: number;
  pendingPosting: number;
  sohSystem: number;
  pendingReceive: number;
  diff: number; // Difference input
  title?: string; // Optional title parameter
}

const StockTakingOilChart: React.FC<StockTakingOilChartProps> = ({
  sohFisik,
  pendingPosting,
  sohSystem,
  pendingReceive,
  diff,
  title = "Stock Comparison", // Default title if not provided
}) => {
  
  const [isDarkMode, setIsDarkMode] = useState(
    document.body.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains('dark'));
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const textColor = isDarkMode ? '#ffffff' : '#000000';

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
      labels: {
        style: {
          colors: textColor, // Set x-axis label color dynamically
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (val: any) => {
          if (val === null || val === undefined) return '0';
          const num = parseFloat(val.toString());
          return isNaN(num) ? '0' : num.toFixed(2);
        },
        style: {
          colors: textColor, // Set y-axis label color dynamically
        },
      },
    },
    title: {
      text: title,
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: textColor, // Set title color dynamically
      },
    },
    colors: ['#FFC300', '#FFEB3B', '#1E90FF', '#87CEEB', differenceColor],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val}`,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val: any) => Number(val).toFixed(2),
      },
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: textColor, // Set legend label color dynamically
      },
    },
  };

  return (
    <div>
      <Chart
        options={options}
        series={sortedSeries}
        type="bar"
        height={350}
      />
    </div>
  );
};

export default StockTakingOilChart;