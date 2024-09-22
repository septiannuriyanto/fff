import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { AgGridReact } from 'ag-grid-react';
import StockTakingChart from './StockTakingChart';
import {
  formatDate,
  formatDateForSupabase,
  formatDateToIndonesian,
  formatDateToIndonesianByDate,
  formatDateToISO,
  formatDateToString,
} from '../../../../Utils/DateUtility';
import DatePickerOne from '../../../../components/Forms/DatePicker/DatePickerOne';
import moment from 'moment';

const StockTaking: React.FC = () => {
  const fullColumns = [
    { id: 'WhouseId', headerName: 'WH ID', field: 'WhouseId', editable: false },
    { id: 'UnitId', headerName: 'Unit ID', field: 'UnitId', editable: false },
    { id: 'WorkingShift', headerName: 'Shift', field: 'WorkingShift', editable: true },
    {
      id: 'HeightCm',
      headerName: 'Height Cm',
      field: 'HeightCm',
      editable: true,
    },
    {
      id: 'QtyLiter',
      headerName: 'Qty Liter',
      field: 'QtyLiter',
      editable: false,
    },
    {
      id: 'SOHSystem',
      headerName: 'SOH System',
      field: 'SOHSystem',
      editable: true,
    },
    {
      id: 'PendingPosting',
      headerName: 'Pending Posting',
      field: 'PendingPosting',
      editable: true,
    },
    {
      id: 'PendingReceive',
      headerName: 'Pending Receive',
      field: 'PendingReceive',
      editable: true,
    },
  ];
  const autoSizeStrategy = {
    type: 'fitCellContents',
  };
  const [rowData, setRowData] = useState<any[]>([]);
  const [sohFisik, setSohFisik] = useState<number>(0);
  const [sohSystem, setSohSystem] = useState<number>(0);
  const [pendingPosting, setPendingPosting] = useState<number>(0);
  const [pendingReceive, setPendingReceive] = useState<number>(0);
  const [diff, setDiff] = useState<number>(0);
  const [date, setDate] = useState<Date | null>(new Date());
  const [selecteddShift, setSelectedShift] = useState<string>('1');
  const gridRef = useRef();

  // Define a type for the possible options
  type Option = 'Shift 1' | 'Shift 2';

  const handleChangeShift = async(event: React.ChangeEvent<HTMLSelectElement>) => {
    
    console.log(event.target.value);
    setSelectedShift(event.target.value as Option);
    await fetchWarehouseWithStockTaking(date!,  parseInt(event.target.value));
  };

  const getQtyByHeight = async (height: any, whId: string) => {
    let heightBottom = Math.floor(height);
    let heightTop = Math.ceil(height);

    // Fetch data from the Supabase table
    const { data, error } = await supabase
      .from('tera_tangki')
      .select('qty_liter') // Select the qty_liter column
      .or(`height_cm.eq.${heightBottom},height_cm.eq.${heightTop}`) // Match the height for bottom and top
      .eq('warehouse_id', whId); // Filter by warehouse_id

    if (error) {
      console.log(error.message);
      return;
    }

    console.log(data);

    // Extract the quantities for bottom and top
    let qtyBottom = 0;
    let qtyTop = 0;
    let resultLiter = 0;

    if (data.length === 1) {
      resultLiter = data[0].qty_liter;
    } else {
      if (data[0].qty_liter < data[1].qty_liter) {
        qtyBottom = data[0].qty_liter;
        qtyTop = data[1].qty_liter;
      } else {
        qtyBottom = data[1].qty_liter;
        qtyTop = data[0].qty_liter;
      }

      resultLiter =
        qtyBottom +
        ((height - heightBottom) / (heightTop - heightBottom)) *
          (qtyTop - qtyBottom);
    }

    // Perform linear interpolation to get the resultLiter

    console.log('Interpolated result:', resultLiter);

    // Return both quantities to the client
    return resultLiter;
  };

  const getColumnSum = (columnId: string) => {
    let sum = 0;

    // Loop through each row
    gridRef.current?.api.forEachNode((rowNode: any) => {
      const value = rowNode.data[columnId]; // Get the value of the specific column
      if (value) {
        sum += parseFloat(value); // Add to sum if the value is a valid number
      }
    });

    return sum;
  };

  const checkisRecorded = async (whouseId: string) => {
    const { data, error } = await supabase
      .from('stock_taking')
      .select('*')
      .eq('warehouse_id', whouseId)
      .eq('created_at', formatDateForSupabase(date!));

    if (error) {
      console.log(error.message);
      return;
    }

    return data.length;
  };

  const setOrUpdateDB = async (WhouseId: string, query: any) => {
    //==========================================================================Database Execution
    let isRecorded = await checkisRecorded(WhouseId);
    if (isRecorded == 0) {
      console.log('Create New');
      query = {
        ...query,
        warehouse_id: WhouseId,
        created_at: formatDateToString(date!),
      };

      const { error } = await supabase.from('stock_taking').insert([query]);
      if (error) {
        console.error('Error inserting data:', error);
        return false;
      }
      console.log('Data added:', query);
    } else {
      console.log('Update value');
      const { error } = await supabase
        .from('stock_taking')
        .update([query])
        .eq('warehouse_id', WhouseId)
        .eq('created_at', formatDateForSupabase(date!));
      if (error) {
        console.error('Error updating data:', error);
        return false;
      }
      console.log('Data updated:', query);
    }
    //===========================================================================
  };

  const onCellValueChanged = async (params: any) => {
    const { data, oldValue } = params;
    const {
      WhouseId,
      UnitId,
      HeightCm,
      QtyLiter,
      SOHSystem,
      PendingPosting,
      PendingReceive,
    } = data;
    const columnId = params.column.getId();

    // The previous status before the change
    const prevStatus = oldValue;

    //Create Query to be executed
    const query = {
      created_at: formatDateForSupabase(date!),
      warehouse_id: params.data.whouseId,
      height_cm: params.data.HeightCm,
      qty_liter: params.data.liter,
      soh_system: params.data.SOHSystem,
      pending_posting: params.data.PendingPosting,
      pending_receive: params.data.PendingReceive,
    };

    //Select Column ID
    if (columnId == 'WhouseId') {
      console.log('Change WH ID');
    } else if (columnId == 'UnitId') {
      console.log('Change Unit Id');
    } else if (columnId == 'HeightCm') {
      console.log('Change Height Cm');
      const whouseId = params.data.WhouseId;
      let liter = await getQtyByHeight(HeightCm, whouseId);
      params.node.setDataValue('QtyLiter', liter); // Update QtyLiter

      let literSum = getColumnSum('QtyLiter');

      //=========QUERY MODIFICATION
      const query = {
        created_at: formatDateForSupabase(date!),
        warehouse_id: params.data.whouseId,
        height_cm: params.data.HeightCm,
        qty_liter: liter,
        soh_system: params.data.SOHSystem,
        pending_posting: params.data.PendingPosting,
        pending_receive: params.data.PendingReceive,
      };

      await setOrUpdateDB(params.data.WhouseId, query);

      setSohFisik(Math.round(literSum));
    } else if (columnId == 'QtyLiter') {
      console.log('Change Qty Liter');
    } else if (columnId == 'SOHSystem') {
      console.log('Change SOH System');
      let literSum = getColumnSum('SOHSystem');
      setSohSystem(literSum);

      //=========QUERY MODIFICATION
      const query = {
        soh_system: params.data.SOHSystem,
      };
      await setOrUpdateDB(params.data.WhouseId, query);
    } else if (columnId == 'PendingPosting') {
      console.log('Change Pending Posting');
      let literSum = getColumnSum('PendingPosting');
      setPendingPosting(Math.round(literSum));

      //=========QUERY MODIFICATION
      const query = {
        pending_posting: params.data.PendingPosting,
      };
      await setOrUpdateDB(params.data.WhouseId, query);
    } else if (columnId == 'PendingReceive') {
      console.log('Change Pending Receive');
      let literSum = getColumnSum('PendingReceive');
      setPendingReceive(literSum);

      //=========QUERY MODIFICATION
      const query = {
        pending_receive: params.data.PendingReceive,
      };
      await setOrUpdateDB(params.data.WhouseId, query);
    } else {
    }

    // Calculate the difference after all related states are updated
    const updatedFisik = getColumnSum('QtyLiter'); // or sohFisik from state
    const updatedSystem = getColumnSum('SOHSystem');
    const updatedPendingPosting = getColumnSum('PendingPosting');
    const updatedPendingReceive = getColumnSum('PendingReceive');

    const newDifference =
      updatedFisik +
      updatedPendingPosting -
      updatedSystem -
      updatedPendingReceive;
    setDiff(Math.round(newDifference)); // Update diff
  };

  const fetchWarehouseWithStockTaking = async (paramDate: Date, paramShift:number) => {
    
    // Call the stored procedure using the Supabase RPC functionality
    const { data, error } = await supabase.rpc(
      'fetch_storage_with_stock_taking',
      { p_date: formatDateToString(paramDate), p_shift : paramShift },
    );

    if (error) {
      console.log('Error fetching data: ' + error.message);
      return;
    }


    // Prepare the data for the grid
    const dataRow = data.map((row: any) => ({
      WhouseId: row.warehouse_id,
      WorkingShift : row.working_shift || null,
      UnitId: row.unit_id,
      HeightCm: row.height_cm || null,
      QtyLiter: row.qty_liter || 0,
      SOHSystem: row.soh_system || null,
      PendingPosting: row.pending_posting || null,
      PendingReceive: row.pending_receive || null,
    }));

    setRowData(dataRow); // Set the data in the grid
    updateStockStatus(dataRow);
  };

  const updateStockStatus = (dataRow: any) => {
    // Initialize totals
    let totalQtyLiter = 0;
    let totalSOHSystem = 0;
    let totalPendingPosting = 0;
    let totalPendingReceive = 0;

    // Iterate through the array and sum values
    dataRow.forEach((record) => {
      if (record.QtyLiter != null) {
        totalQtyLiter += record.QtyLiter;
      }
      if (record.SOHSystem != null) {
        totalSOHSystem += record.SOHSystem;
      }
      if (record.PendingPosting != null) {
        totalPendingPosting += record.PendingPosting || 0;
      }
      if (record.PendingReceive != null) {
        totalPendingReceive += record.PendingReceive || 0;
      }
    });

    // Update the states with the calculated totals
    setSohFisik(Math.round(totalQtyLiter));
    setSohSystem(Math.round(totalSOHSystem));
    setPendingPosting(Math.round(totalPendingPosting));
    setPendingReceive(Math.round(totalPendingReceive));

    // Calculate the difference
    const calculatedDiff = Math.round(
      totalQtyLiter +
        totalPendingPosting -
        totalSOHSystem -
        totalPendingReceive,
    );
    setDiff(calculatedDiff);
  };

  useEffect(() => {
    fetchWarehouseWithStockTaking(date!, parseInt(selecteddShift));
  }, [date]); // Adding 'date' as a dependency, so it refetches when the date changes

  const handleDateChange = async (date: Date | null) => {
    setDate(date);
    await fetchWarehouseWithStockTaking(date!, parseInt(selecteddShift));
  };

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-2 text-start">
                <div className="w-full sm:w-auto sm:mb-2">
                  <h2 className="font-bold text-black dark:text-white text-start sm:text-title-sm sm:w-full">
                    Quick Stock Taking
                  </h2>
                </div>

                <div className="flex align-middle  justify-end sm:justify-between">
                  <div className="relative z-20 inline-flex  align-middle">
                    <select
                      value={selecteddShift}
                      onChange={handleChangeShift}
                      className="relative z-20 inline-flex appearance-none bg-transparent py-1 pl-3 pr-8 text-sm font-medium outline-none"
                    >
                      <option value="1" className="dark:bg-boxdark">
                        Shift 1
                      </option>
                      <option value="2" className="dark:bg-boxdark">
                        Shift 2
                      </option>
                    </select>

                    <span className="absolute top-1/2 right-3 z-10 -translate-y-1/2">
                      <svg
                        width="10"
                        height="6"
                        viewBox="0 0 10 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0.47072 1.08816C0.47072 1.02932 0.500141 0.955772 0.54427 0.911642C0.647241 0.808672 0.809051 0.808672 0.912022 0.896932L4.85431 4.60386C4.92785 4.67741 5.06025 4.67741 5.14851 4.60386L9.09079 0.896932C9.19376 0.793962 9.35557 0.808672 9.45854 0.911642C9.56151 1.01461 9.5468 1.17642 9.44383 1.27939L5.50155 4.98632C5.22206 5.23639 4.78076 5.23639 4.51598 4.98632L0.558981 1.27939C0.50014 1.22055 0.47072 1.16171 0.47072 1.08816Z"
                          fill="#637381"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M1.22659 0.546578L5.00141 4.09604L8.76422 0.557869C9.08459 0.244537 9.54201 0.329403 9.79139 0.578788C10.112 0.899434 10.0277 1.36122 9.77668 1.61224L9.76644 1.62248L5.81552 5.33722C5.36257 5.74249 4.6445 5.7544 4.19352 5.32924C4.19327 5.32901 4.19377 5.32948 4.19352 5.32924L0.225953 1.61241C0.102762 1.48922 -4.20186e-08 1.31674 -3.20269e-08 1.08816C-2.40601e-08 0.905899 0.0780105 0.712197 0.211421 0.578787C0.494701 0.295506 0.935574 0.297138 1.21836 0.539529L1.22659 0.546578ZM4.51598 4.98632C4.78076 5.23639 5.22206 5.23639 5.50155 4.98632L9.44383 1.27939C9.5468 1.17642 9.56151 1.01461 9.45854 0.911642C9.35557 0.808672 9.19376 0.793962 9.09079 0.896932L5.14851 4.60386C5.06025 4.67741 4.92785 4.67741 4.85431 4.60386L0.912022 0.896932C0.809051 0.808672 0.647241 0.808672 0.54427 0.911642C0.500141 0.955772 0.47072 1.02932 0.47072 1.08816C0.47072 1.16171 0.50014 1.22055 0.558981 1.27939L4.51598 4.98632Z"
                          fill="#637381"
                        />
                      </svg>
                    </span>
                  </div>

                  <DatePickerOne
                    enabled={true}
                    handleChange={handleDateChange}
                    setValue={date ? formatDateToString(new Date(date)) : ""} 
                  />
                </div>
              </div>

              <div>
                <StockTakingChart
                  sohFisik={sohFisik}
                  pendingPosting={pendingPosting}
                  sohSystem={sohSystem}
                  pendingReceive={pendingReceive}
                  diff={diff} // Pass the calculated difference here
                />
              </div>

              <div className="w-full content-between flex justify-between mb-4 px-2">
                <div>
                  <h1 className="font-bold">Stock Fisik</h1>
                  <h1>{sohFisik.toLocaleString('id-ID')}</h1>
                </div>
                <div>
                  <h1 className="font-bold">Pending Posting</h1>
                  <h1>{pendingPosting.toLocaleString('id-ID')}</h1>
                </div>
                <div>
                  <h1 className="font-bold">Stock System</h1>
                  <h1>{sohSystem.toLocaleString('id-ID')}</h1>
                </div>
                <div>
                  <h1 className="font-bold">Pending Receive</h1>
                  <h1>{pendingReceive.toLocaleString('id-ID')}</h1>
                </div>
                <div>
                  <h1 className="font-bold">Difference</h1>
                  <h1
                    className={`${
                      diff > 0
                        ? 'text-green-500'
                        : diff < 0
                        ? 'text-red-500'
                        : ''
                    }`}
                  >
                    {diff.toLocaleString('id-ID')}
                  </h1>
                </div>
              </div>

              <div className="stock-report-content w-full">
                <div className="ag-theme-quartz-auto-dark w-full">
                  <AgGridReact
                    onCellValueChanged={onCellValueChanged}
                    ref={gridRef}
                    columnDefs={fullColumns}
                    rowData={rowData}
                    autoSizeStrategy={autoSizeStrategy}
                    domLayout="autoHeight" // Automatically adjust height based on the number of rows
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StockTaking;
