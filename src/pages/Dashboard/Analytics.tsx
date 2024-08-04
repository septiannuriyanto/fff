import React, { useEffect, useState } from 'react';
import CardDataStats from '../../components/CardDataStats';
import TableHighestFC from '../../components/Tables/TableHighestFC';
import PortionChart from '../../components/Charts/PortionChart';
import FuelConsPercentageChart from '../../components/Charts/FuelConsPercentageChart.tsx';
import { supabase } from '../../db/SupabaseClient.tsx';
import {
  parseBarChartSchemaToEgi,
  parseBarChartSchemaToCn,
  parseBarChartSchemaToDate,
} from '../../types/BarChartSchemaParser.ts';
import Datepicker from 'tailwind-datepicker-react';
import { datePickerOptions } from '.././../components/Charts/DatePickerComponent.tsx';
import {
  getWeekNumber,
  getWeekStartAndEndDate,
  getCurrentMonthDates,
  getLastMonthDates,
} from '../../Utils/TimeUtility.ts';

import LoaderLogo from '../../common/Loader/LoaderLogo.tsx';

interface ResponseModel {
  CN: string; // Replace with your actual columns
  EGI: string;
  PERIODE: number;
  PLAN_FC: number;
  ACTUAL_FC: number;
  CATEGORY: string;
  CLASS: string;
  CONST_PERCENT: number;
  FUEL_USAGE: number;
  OWNER: string;
  WORKING_HOURS: number;
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<ResponseModel[]>([]);
  const [egiCons, setEgiCons] = useState<BarChartSchema[]>([]);
  const [unitCons, setUnitCons] = useState<BarChartSchema[]>([]);
  const [dailyCons, setDailyCons] = useState<BarChartSchema[]>([]);
  const [category, setCategory] = useState<PortionChartSchema[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEgi, setSelectedEgi] = useState<string>('');
  const [selectedCn, setSelectedCn] = useState<string>('');

  const [periode, setPeriode] = useState(
    getWeekStartAndEndDate(new Date().getFullYear(), getWeekNumber(new Date())),
  );
  const [selectedPeriodOption, setSelectedPeriodOption] = useState('This Week');

  //---------------DATEPICKER
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showFrom, setShowFrom] = useState<boolean>(false);
  const [showTo, setShowTo] = useState<boolean>(false);

  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const handleChangeFrom = (selectedDateFrom: Date) => {
    setDateFrom(selectedDateFrom);
  };
  const handleCloseFrom = (stateFrom: boolean) => {
    setShowFrom(stateFrom);
  };

  const handleChangeTo = (selectedDateTo: Date) => {
    setDateTo(selectedDateTo)
  };
  const handleCloseTo = (stateTo: boolean) => {
    setShowTo(stateTo);
  };

  const handleRenderByDate = (e)=> {
      e.preventDefault();
      setPeriode({ startDate: dateFrom, endDate: dateTo })
      fetchDataByEgiUsingDateRange(periode.startDate, periode.endDate);
  }

  //--------------------------

  useEffect(() => {}, []);

  const handleClickEgiChart = (value: { x_value: string }) => {
    
    setSelectedEgi(value.x_value);
    fetchDataByCnUsingCurrentPeriod(value.x_value);
  };

  const handleClickCnChart = (value: { x_value: string }) => {
  
    setSelectedCn(value.x_value);
    fetchDailyFCByCnUsingCnAndCurrentPeriod(value.x_value);
  };

  const handleChangePeriode = (value: { periode: string }) => {
    if (value.periode == 'This Week') {
      const thisWeek = getWeekNumber(new Date());
      const thisWeekPeriode = getWeekStartAndEndDate(
        new Date().getFullYear(),
        thisWeek,
      );
      fetchDataByEgiUsingDateRange(
        thisWeekPeriode.startDate,
        thisWeekPeriode.endDate,
      );
      setPeriode(thisWeekPeriode);
      setSelectedPeriodOption(value.periode);
      setShowDatePicker(false);
    } else if (value.periode == 'Last Week') {
      const lastWeek = getWeekNumber(new Date()) - 1;
      const lastWeekPeriode = getWeekStartAndEndDate(
        new Date().getFullYear(),
        lastWeek,
      );
      fetchDataByEgiUsingDateRange(
        lastWeekPeriode.startDate,
        lastWeekPeriode.endDate,
      );
      setPeriode(lastWeekPeriode);
      setSelectedPeriodOption(value.periode);
      setShowDatePicker(false);
    } else if (value.periode == 'This Month') {
      const thisMonthPeriode = getCurrentMonthDates();
      fetchDataByEgiUsingDateRange(
        thisMonthPeriode.startDate,
        thisMonthPeriode.endDate,
      );
      setPeriode(thisMonthPeriode);
      setSelectedPeriodOption(value.periode);
      setShowDatePicker(false);
    } else if (value.periode == 'Last Month') {
      const lastMonthPeriode = getLastMonthDates();
      fetchDataByEgiUsingDateRange(
        lastMonthPeriode.startDate,
        lastMonthPeriode.endDate,
      );
      setPeriode(lastMonthPeriode);
      setSelectedPeriodOption(value.periode);
      setShowDatePicker(false);
    } else {
      setShowDatePicker(true);
    }
  };

  const fetchDataByEgiUsingDateRange = async (
    startDate: Date,
    endDate: Date,
  ) => {
    var egiFuelConsumptionData: BarChartSchema[] = [];
    try {
      // Fetch data from the Supabase table
      const { data, error } = await supabase.rpc(
        'rpc_get_dately_aggregate_by_egi',
        {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
      );

      if (error) {
        throw error;
      }

      egiFuelConsumptionData = parseBarChartSchemaToEgi(data);
      egiFuelConsumptionData.sort(
        (a, b) => a.actual_fc / a.plan_fc - b.actual_fc / b.plan_fc,
      );
      setEgiCons(egiFuelConsumptionData);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const fetchDataByCnUsingCurrentPeriod = async (egiQuery: string) => {
    var cnFuelConsumptionData: BarChartSchema[] = [];
    try {
      // Fetch data from the Supabase table
      const { data, error } = await supabase.rpc(
        'rpc_get_dately_aggregate_by_cn',
        {
          start_date: periode.startDate.toISOString().split('T')[0],
          end_date: periode.endDate.toISOString().split('T')[0],
          egi: egiQuery,
        },
      );

      if (error) {
        throw error;
      }
      cnFuelConsumptionData = parseBarChartSchemaToCn(data);
      cnFuelConsumptionData.sort(
        (a, b) => a.actual_fc / a.plan_fc - b.actual_fc / b.plan_fc,
      );
      setUnitCons(cnFuelConsumptionData);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const fetchDailyFCByCnUsingCnAndCurrentPeriod = async (cnQuery: string) => {
    var cnDailyConsumption: BarChartSchema[] = [];
    try {
      // Fetch data from the Supabase table
      const { data, error } = await supabase.rpc('rpc_get_daily_by_cn', {
        start_date: periode.startDate.toISOString().split('T')[0],
        end_date: periode.endDate.toISOString().split('T')[0],
        cn: cnQuery,
      });

      if (error) {
        throw error;
      }
      cnDailyConsumption = parseBarChartSchemaToDate(data);

      setDailyCons(cnDailyConsumption);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  useEffect(() => {
    // fetchDataByEgiUsingWeek(week);
    fetchDataByEgiUsingDateRange(periode.startDate, periode.endDate);
    // fetchDataByEgiUsingDateRange( '2024-07-01', '2024-07-17')
  }, []);

  //=============================================================================== DATA AGGREGATION

  //==============================================================================RENDER OBJECTS

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        <CardDataStats
          title="Fuel Consumption Total"
          total="-"
          rate="0.43%"
          levelUpBad
        >
          <svg
            className="stroke-primary dark:stroke-white"
            width="30px"
            height="30px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 17V17.5V18"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M12 6V6.5V7"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M15 9.5C15 8.11929 13.6569 7 12 7C10.3431 7 9 8.11929 9 9.5C9 10.8807 10.3431 12 12 12C13.6569 12 15 13.1193 15 14.5C15 15.8807 13.6569 17 12 17C10.3431 17 9 15.8807 9 14.5"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </CardDataStats>
        <CardDataStats title="Total Unit" total="327" rate="">
          <svg
            className="fill-primary dark:fill-white"
            width="30px"
            height="30px"
            viewBox="0 0 511.985 511.985"
          >
            <g>
              <g>
                <path
                  d="M492.629,103.143l-102.409-25.6c-2.057-0.512-4.139-0.768-6.212-0.768c-6.707,0-13.244,2.637-18.099,7.501l-85.931,85.931
			c-0.316-0.845-0.674-1.664-1.075-2.475l-25.6-51.2c-4.335-8.67-13.201-14.157-22.895-14.157H153.6c-14.14,0-25.6,11.46-25.6,25.6
			v76.834H25.6c-14.14,0-25.6,11.46-25.6,25.6v51.2c0,14.14,11.46,25.6,25.6,25.6h102.409v25.6h-51.2
			c-28.237,0-51.2,22.972-51.2,51.2c0,28.237,22.972,51.2,51.2,51.2h256.017c28.237,0,51.2-22.972,51.2-51.2
			c0-28.237-22.972-51.2-51.2-51.2H230.417v-25.6h25.6c7.663,0,14.925-3.43,19.78-9.353l127.036-154.684l76.476,9.719
			l-26.377,98.517l-59.409-13.687l6.554-23.654c1.903-6.81-2.099-13.867-8.9-15.753c-6.955-1.826-13.875,2.116-15.753,8.926
			c0,0-22.639,67.038-13.978,88.832c4.173,10.547,12.279,18.5,23.373,22.989c16.205,6.554,30.003,9.822,41.626,9.822
			c7.825,0,14.703-1.485,20.651-4.454c9.626-4.813,16.375-13.466,19.473-25.011l45.201-168.132
			C513.434,118.486,505.301,106.309,492.629,103.143z M332.826,358.418c14.14,0,25.6,11.46,25.6,25.6s-11.46,25.6-25.6,25.6H76.809
			c-14.14,0-25.6-11.46-25.6-25.6s11.46-25.6,25.6-25.6H332.826z M153.609,332.818v-25.6h51.2v25.6H153.609z M256.017,281.61H25.6
			v-51.2h128.009h102.409V281.61z M256.017,204.801H153.609v-76.809h76.809l25.6,51.208V204.801z M441.839,292.814
			c-1.527,5.777-4.104,7.697-6.153,8.73c-4.301,2.15-15.454,4.224-41.25-6.187c-4.651-1.886-7.552-4.642-9.173-8.661
			c-2.85-7.117-1.425-16.862,0.623-24.44l60.425,13.918L441.839,292.814z M485.99,127.95l-93.961-11.947L281.626,250.437V204.81
			l102.409-102.409l101.973,25.498L485.99,127.95z"
                />
              </g>
            </g>
          </svg>
        </CardDataStats>
        <CardDataStats
          title="Total Stock Fuel (Liter)"
          total="-"
          rate="0%"
          levelUp
        >
          <svg
            className="fill-primary dark:fill-white"
            width="30px"
            height="30px"
            version="1.1"
            id="Layer_1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 511.999 511.999"
          >
            <g>
              <g>
                <path
                  d="M490.021,465.569h-12.25V133.921c0-4.458-3.613-8.071-8.071-8.071c-4.458,0-8.071,3.613-8.071,8.071v331.648h-58.738
			V437.88v-35.76v-35.76v-35.762v-35.76c0-0.174-0.015-0.343-0.026-0.516c0.011-0.171,0.026-0.341,0.026-0.515v-35.762v-35.76
			v-35.76v-35.76c0-0.174-0.015-0.344-0.026-0.516c0.011-0.171,0.026-0.341,0.026-0.515v-35.76v-35.76V62.903V50.527h23.269h3.878
			c17.42,0,31.592,14.173,31.592,31.592v24.903c0,4.458,3.613,8.071,8.071,8.071c4.458,0,8.071-3.613,8.071-8.071V82.114
			c0-24.896-19.16-45.389-43.508-47.537V20.985C434.264,9.414,424.85,0,413.28,0h-18.46c-4.458,0-8.071,3.613-8.071,8.071
			c0,4.458,3.613,8.071,8.071,8.071h18.46c2.67,0,4.843,2.173,4.843,4.843v13.395h-15.232v-1.614c0-4.458-3.613-8.071-8.071-8.071
			c-4.458,0-8.071,3.613-8.071,8.071v1.614h-45.197v-1.614c0-4.458-3.613-8.071-8.071-8.071c-4.458,0-8.071,3.613-8.071,8.071v1.614
			h-88.602V20.985c0-2.67,2.173-4.843,4.843-4.843h124.114c4.458,0,8.071-3.613,8.071-8.071c0-4.458-3.613-8.071-8.071-8.071H241.65
			c-11.571,0-20.985,9.414-20.985,20.985v13.609c-24.243,2.25-43.288,22.699-43.288,47.52v207.552h-14.463v-13.395
			c0-11.571-9.414-20.985-20.984-20.985h-60.98c-11.572,0-20.985,9.414-20.985,20.985v13.395h-9.932
			c-11.572,0-20.985,9.414-20.985,20.985v30.224v34.377v90.317h-7.071c-11.887,0-21.558,9.671-21.558,21.558v3.314
			c0,11.887,9.671,21.558,21.558,21.558h370.418c4.458,0,8.071-3.613,8.071-8.071c0-4.458-3.613-8.071-8.071-8.071H21.976
			c-2.986,0-5.416-2.43-5.416-5.416v-3.314c0-2.986,2.43-5.416,5.416-5.416h15.142h148.286c0.014,0,0.028,0.002,0.043,0.002H333.48
			h61.339h74.881c0.014,0,0.028-0.002,0.043-0.002h20.277c2.986,0,5.416,2.43,5.416,5.416v3.314c0,2.986-2.43,5.416-5.416,5.416
			h-70.365c-4.458,0-8.071,3.613-8.071,8.071c0,4.458,3.613,8.071,8.071,8.071h70.365c11.887,0,21.558-9.671,21.558-21.558v-3.314
			C511.58,475.24,501.908,465.569,490.021,465.569z M76.107,276.272c0-2.67,2.172-4.843,4.843-4.843h60.98
			c2.67,0,4.843,2.173,4.843,4.843v13.395H76.107V276.272z M177.377,465.569H45.189v-82.247h132.188V465.569z M177.377,367.181
			H45.189v-18.235h132.188V367.181z M177.377,332.804H45.189v-22.153c0-2.671,2.173-4.843,4.843-4.843h18.036h86.74h22.569V332.804z
			 M325.435,294.318c-0.011,0.171-0.026,0.341-0.026,0.515v35.76v35.762v35.76v35.76v27.689h-131.89v-90.317v-34.372v-43.138V82.114
			c0-17.42,14.172-31.592,31.592-31.592h3.659h96.64v12.375v15.313v35.76v35.76c0,0.174,0.015,0.344,0.026,0.516
			c-0.011,0.171-0.026,0.341-0.026,0.515v35.76v35.76v35.76v35.762C325.409,293.977,325.424,294.146,325.435,294.318z
			 M386.749,465.569h-45.197v-19.618h45.197V465.569z M386.749,429.808h-45.197v-19.618h45.197V429.808z M386.749,394.049h-45.197
			v-19.618h45.197V394.049z M386.749,358.288h-45.197v-19.62h45.197V358.288z M386.749,322.526h-45.197v-19.618h45.197V322.526z
			 M386.749,285.735h-45.197v-19.62h45.197V285.735z M386.749,249.973h-45.197v-19.618h45.197V249.973z M386.749,214.213h-45.197
			v-19.618h45.197V214.213z M386.749,178.452h-45.197v-19.618h45.197V178.452z M386.749,141.661h-45.197v-19.618h45.197V141.661z
			 M386.749,105.9h-45.197V86.282h45.197V105.9z M386.749,62.897v7.242h-45.197v-7.242V50.521h45.197V62.897z"
                />
              </g>
            </g>
          </svg>
        </CardDataStats>
        <CardDataStats title="FT Ready" total="5" rate="">
          <svg
            className="fill-primary dark:fill-white"
            width="30px"
            height="30px"
            version="1.1"
            id="Capa_1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 463 463"
          >
            <g>
              <path d="M375.5,309c-7.995,0-14.5,6.505-14.5,14.5s6.505,14.5,14.5,14.5s14.5-6.505,14.5-14.5S383.495,309,375.5,309z" />
              <path d="M127.5,309c-7.995,0-14.5,6.505-14.5,14.5s6.505,14.5,14.5,14.5s14.5-6.505,14.5-14.5S135.495,309,127.5,309z" />
              <path d="M47.5,309c-7.995,0-14.5,6.505-14.5,14.5S39.505,338,47.5,338S62,331.495,62,323.5S55.495,309,47.5,309z" />
              <path
                d="M452.535,232.51l-14.539-9.692l-20.045-73.5C415.17,139.121,405.848,132,395.279,132H335.5c-4.142,0-7.5,3.358-7.5,7.5V276
		h-81v-17.395c35.913-3.761,64-34.212,64-71.105c0-39.425-32.075-71.5-71.5-71.5H239v-8.5c0-8.547-6.953-15.5-15.5-15.5h-32
		c-8.547,0-15.5,6.953-15.5,15.5v8.5H71.5C32.075,116,0,148.075,0,187.5c0,34.102,24.005,62.686,56,69.788V276H7.5
		c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5h5.406C4.912,299.504,0,310.936,0,323.5C0,349.691,21.309,371,47.5,371
		c16.782,0,31.548-8.756,40-21.932c8.452,13.176,23.218,21.932,40,21.932c23.639,0,43.295-17.36,46.902-40h18.832
		c3.138,9.29,11.93,16,22.266,16h72c10.336,0,19.128-6.71,22.266-16h18.832c3.607,22.64,23.263,40,46.902,40s43.295-17.36,46.902-40
		H447.5c8.547,0,15.5-6.953,15.5-15.5v-63.437C463,244.188,459.088,236.878,452.535,232.51z M421.681,220H383.5
		c-4.687,0-8.5-3.813-8.5-8.5V179h35.499L421.681,220z M343,147h52.279c3.822,0,7.194,2.576,8.2,6.263L406.408,164H367.5
		c-4.142,0-7.5,3.358-7.5,7.5v40c0,12.958,10.542,23.5,23.5,23.5h45.729l14.985,9.99c2.353,1.569,3.761,4.186,3.782,7.01H439.5
		c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5h8.5v9H343V147z M328,316h-18.234c-3.138-9.29-11.93-16-22.266-16h-72
		c-10.336,0-19.128,6.71-22.266,16h-18.832c-1.528-9.589-5.938-18.224-12.309-25H328V316z M119,276v-17h113v17H119z M296,187.5
		c0,31.154-25.346,56.5-56.5,56.5H119V131.5c0-0.169-0.014-0.334-0.025-0.5H239.5C270.654,131,296,156.346,296,187.5z M71,195h33v17
		H71V195z M104,180H71v-17h33V180z M71,227h33v17H71.5c-0.168,0-0.333-0.011-0.5-0.013V227z M191,107.5c0-0.276,0.224-0.5,0.5-0.5
		h32c0.276,0,0.5,0.224,0.5,0.5v8.5h-33V107.5z M104.025,131c-0.011,0.166-0.025,0.331-0.025,0.5V148H71v-16.5
		c0-0.164-0.014-0.325-0.025-0.487C71.151,131.012,71.324,131,71.5,131H104.025z M15,187.5c0-25.779,17.361-47.565,41-54.321
		v108.641C32.361,235.065,15,213.279,15,187.5z M71,258.987c0.167,0.001,0.332,0.013,0.5,0.013H104v17H71V258.987z M92.906,291
		c-2.007,2.135-3.817,4.455-5.406,6.932c-1.589-2.477-3.399-4.797-5.406-6.932H92.906z M47.5,356C29.58,356,15,341.42,15,323.5
		S29.58,291,47.5,291S80,305.58,80,323.5S65.42,356,47.5,356z M127.5,356c-17.92,0-32.5-14.58-32.5-32.5s14.58-32.5,32.5-32.5
		s32.5,14.58,32.5,32.5S145.42,356,127.5,356z M287.5,332h-72c-4.687,0-8.5-3.813-8.5-8.5s3.813-8.5,8.5-8.5h72
		c4.687,0,8.5,3.813,8.5,8.5S292.187,332,287.5,332z M375.5,356c-17.92,0-32.5-14.58-32.5-32.5s14.58-32.5,32.5-32.5
		s32.5,14.58,32.5,32.5S393.42,356,375.5,356z M447.5,316h-25.098c-1.528-9.589-5.938-18.224-12.309-25H448v24.5
		C448,315.776,447.776,316,447.5,316z"
              />
            </g>
          </svg>
        </CardDataStats>
      </div>

       { showDatePicker ? <div className="col-span-12 xl:col-span-12 flex flex-row gap-3 justify-center align-middle items-center m-6">
          <Datepicker
            options={datePickerOptions}
            onChange={handleChangeFrom}
            show={showFrom}
            setShow={handleCloseFrom}
          />
          to
          <Datepicker
            options={datePickerOptions}
            onChange={handleChangeTo}
            show={showTo}
            setShow={handleCloseTo}
          />
          <button onClick={(e)=> handleRenderByDate(e)} className="border-solid border-black bg-meta-4 dark:bg-meta-2 p-2 text-bodydark2 rounded-lg">
            Render
          </button>
        </div> : <div></div> }

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-12">
          {egiCons ? (
            <FuelConsPercentageChart
              data={egiCons}
              title="Fuel Consumption Percentage All EGI"
              onClickChart={handleClickEgiChart}
              onClickPeriode={handleChangePeriode}
              subtitle="Click to show result below"
              period={selectedPeriodOption}
            />
          ) : (
            <LoaderLogo />
          )}
        </div>

       

        <div className="col-span-12 xl:col-span-12">
          <FuelConsPercentageChart
            data={unitCons}
            onClickChart={handleClickCnChart}
            title={selectedEgi}
            subtitle="Click to show result below"
            period={selectedPeriodOption}
          />
        </div>

        <div className="col-span-12 xl:col-span-12">
          <FuelConsPercentageChart
            data={dailyCons}
            title={selectedCn}
            subtitle="Click to show result below"
            period={selectedPeriodOption}
          />
        </div>

        <div className="col-span-12 xl:col-span-6">
          <PortionChart
            title={'Fuel Cons by Eq Category'}
            category={category}
          />
        </div>
       {/* <div className="col-span-12 xl:col-span-6">
           <PortionChart title={"Fuel Cons by Eq Class"} data/>
        </div>

        <div className="col-span-12 xl:col-span-12">
          <TableHighestFC />
        </div>
         */}
      </div>
    </>
  );
};

export default Analytics;
