// AnomalyBarChartSwapped.tsx
import React from 'react';
import ApexCharts from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface DataItem {
  DriverName: string;
  ProblemCategory: string;
}

interface AnomalyBarChartProps {
  data: DataItem[];
}

const AnomalyBarChartSwapped: React.FC<AnomalyBarChartProps> = ({ data }) => {
  // Aggregating the data
  const countData = data.reduce((acc, { DriverName, ProblemCategory }) => {
    if (!acc[ProblemCategory]) {
      acc[ProblemCategory] = {};
    }
    if (!acc[ProblemCategory][DriverName]) {
      acc[ProblemCategory][DriverName] = 0;
    }
    acc[ProblemCategory][DriverName] += 1;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Calculate total counts for sorting
  const totalCounts = Object.entries(countData).map(([category, drivers]) => ({
    category,
    count: Object.values(drivers).reduce((sum, count) => sum + count, 0),
  }));

  // Sort categories by total count in descending order
  const sortedCategories = totalCounts
    .sort((a, b) => b.count - a.count)
    .map(({ category }) => category);

  // Prepare series data for the chart
  const drivers = new Set<string>();
  sortedCategories.forEach(category => {
    Object.keys(countData[category]).forEach(driver => {
      drivers.add(driver);
    });
  });

  const driverList = Array.from(drivers);

  const series = driverList.map(driver => ({
    name: driver,
    data: sortedCategories.map(category => countData[category][driver] || 0),
  }));

  // Chart options
  const options: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: {
          position: 'top' as const,
        },
      },
    },
    dataLabels: {
      enabled: true,
    },
    xaxis: {
      categories: sortedCategories,
    },
    yaxis: {
      labels: {
        show: true,
      },
    },
    legend: {
      position: 'top' as const,
      horizontalAlign: 'left' as const,
    },
    tooltip: {
      y: {
        formatter: (val: number) => val.toString(),
      },
    },
  };

  return (
    <div className="p-4">
      <ApexCharts
        options={options}
        series={series}
        type="bar"
        height={400}
      />
    </div>
  );
};

export default AnomalyBarChartSwapped;
