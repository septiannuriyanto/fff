// AnomalyBarChart.tsx
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

const AnomalyBarChart: React.FC<AnomalyBarChartProps> = ({ data }) => {
  // Aggregating the data
  const countData = data.reduce((acc, { DriverName, ProblemCategory }) => {
    if (!acc[DriverName]) {
      acc[DriverName] = {};
    }
    if (!acc[DriverName][ProblemCategory]) {
      acc[DriverName][ProblemCategory] = 0;
    }
    acc[DriverName][ProblemCategory] += 1;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const drivers = Object.keys(countData);
  const categories = new Set<string>();

  drivers.forEach(driver => {
    Object.keys(countData[driver]).forEach(category => {
      categories.add(category);
    });
  });

  const categoryList = Array.from(categories);

  // Sorting drivers by the total count of issues
  const sortedDrivers = drivers.sort((a, b) => {
    const totalA = categoryList.reduce((sum, category) => sum + (countData[a][category] || 0), 0);
    const totalB = categoryList.reduce((sum, category) => sum + (countData[b][category] || 0), 0);
    return totalB - totalA; // Descending order
  });

  // Preparing series data for the chart
  const series = categoryList.map(category => ({
    name: category,
    data: sortedDrivers.map(driver => countData[driver][category] || 0),
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
      categories: sortedDrivers,
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

export default AnomalyBarChart;
