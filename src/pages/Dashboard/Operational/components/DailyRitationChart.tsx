import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';

interface DailyRitationChartProps {
  chartDataInput: { date: string; total: number }[]; // Data grouped by date
  chartDataReconcile: { date: string; total: number }[]; // Data grouped by date
}

const DailyRitationChart: React.FC<DailyRitationChartProps> = ({
  chartDataInput,chartDataReconcile
}) => {
  // Prepare data for the chart
  const [date, setDate] = useState<string[]>([]);
  const [qty, setQty] = useState<number[]>([]);
  const [reconcileQty, setReconcileQty] = useState<number[]>([]); // New state for cumulative daily ritation

  const [cumulativeRitation, setCumulativeRitation] = useState<number[]>([]); // New state for cumulative daily ritation
  
  useEffect(() => {
    // const daysInMonth = new Date(
    //   new Date().getFullYear(),
    //   new Date().getMonth() + 1,
    //   0,
    // ).getDate();

    const dates: string[] = [];
    const qtys: number[] = [];
    const qtyReconcile: number[] = [];

    // Fill in the dates and quantities from chartDataInput
    for (let index = 0; index < chartDataInput.length; index++) {
      dates.push(new Date(chartDataInput[index].date).getDate().toString());
      qtys.push(chartDataInput[index].total);
      qtyReconcile.push(chartDataReconcile[index]?.total || 0); // Use optional chaining to avoid undefined
    }

    // const dailyTarget = totalPlan / daysInMonth;

    // Calculate daily targets, cumulative plan, and cumulative ritation
    // let dailyTotal = 0;
    // let cumulativePlanData: number[] = [];
    // let cumulativeRitationData: number[] = [];

    // for (let index = 0; index < daysInMonth; index++) {
    //   dailyTotal += dailyTarget;
    //   cumulativePlanData.push(dailyTotal); // Add to cumulative plan
      
    //   // Calculate cumulative ritation
    //   if (index < qtys.length) {
    //     cumulativeRitationData.push(
    //       (cumulativeRitationData[index - 1] || 0) + qtys[index]
    //     ); // Add the current qty to the last cumulative ritation
    //   } else {
    //     cumulativeRitationData.push(cumulativeRitationData[index - 1] || 0); // Keep the last cumulative ritation if no data for that day
    //   }
    // }

    setDate(dates);
    setQty(qtys);
    setReconcileQty(qtyReconcile); // Set reconcile quantities
    // setCumulativePlan(cumulativePlanData); // Update cumulative plan state
    // setCumulativeRitation(cumulativeRitationData); // Update cumulative ritation state
  }, [chartDataInput,chartDataReconcile]);

  // Create an array for the daily target line
  const chartData = {
    series: [
      {
        name: 'Ritation Qty',
        type: 'bar',
        data: qty,
      },
      {
        name: 'Reconcile Qty',
        type: 'bar',
        data: reconcileQty,
      },
    ],
    options: {
      chart: {
        height: 200,
        type: 'line' as 'line',
        stacked: false,
      },
      colors: ['#ffd6a5', '#a5d8ff'], // Warna fill lebih muda
      stroke: {
        width: [2, 2, 3], // Outline untuk bar 1 & 2, 3 untuk line chart jika dipakai
        colors: ['#f08c00', '#339af0', '#000'], // Outline warna lebih tua
      },
      plotOptions: {
        bar: {
          columnWidth: '50%',
        },
      },
      xaxis: {
        categories: date,
        title: {
          text: 'Date',
        },
      },
      yaxis: {
        title: {
          text: 'Ritation (Liters)',
        },
        labels: {
          formatter: (value: { toString: () => any }) => value.toString(),
        },
      },
      legend: {
        position: 'bottom' as 'bottom',
      },
    },
  };
  
  

  return (
    <div className=" rounded-sm border bg-white py-2 px-2 shadow-default border-stroke dark:border-strokedark dark:bg-boxdark items-left">
      <h1 className="font-bold text-bodydark">Daily Ritation Chart</h1>
      <div className="flex flex-col">
        <Chart
          options={chartData.options}
          series={chartData.series}
          type="line"
          height={200}
        />
      </div>
    </div>
  );
};

export default DailyRitationChart;
