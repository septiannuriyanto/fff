import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { AgGridReact } from 'ag-grid-react';
import StockTakingChart from './StockTakingChart';
import {
  formatDateForSupabase,
  formatDateToIndonesian,
  formatDateToIndonesianByDate,
} from '../../../../Utils/DateUtility';
import DatePickerOne from '../../../../components/Forms/DatePicker/DatePickerOne';
import moment from 'moment';

const StockTaking: React.FC = () => {
  const fullColumns = [
    { id: 'WhouseId', headerName: 'WH ID', field: 'WhouseId', editable: false },
    { id: 'UnitId', headerName: 'Unit ID', field: 'UnitId', editable: false },
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
  const gridRef = useRef();

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

    console.log(qtyBottom);
    console.log(qtyTop);

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

  const setOrUpdateDB = async (WhouseId:string, query:any) =>{
    //==========================================================================Database Execution
    let isRecorded = await checkisRecorded(WhouseId);
    if (isRecorded == 0) {
      console.log('Create New');
      query = {
        ...query,
        warehouse_id: WhouseId,
        created_at: date
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
  }

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

  const fetchWarehouseWithStockTaking = async (paramDate : any) => {
    // Call the stored procedure using the Supabase RPC functionality
    const { data, error } = await supabase
      .rpc('fetch_storage_with_stock_taking', { p_date: formatDateForSupabase(paramDate) });

    if (error) {
      console.log('Error fetching data: ' + error.message);
      return;
    }

    console.log(data); // This will log the result of the joined storage and stock_taking data

    // Prepare the data for the grid
    const dataRow = data.map((row: any) => ({
      WhouseId: row.warehouse_id,
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

  const updateStockStatus = (dataRow:any) => {
     // Initialize totals
     let totalQtyLiter = 0;
     let totalSOHSystem = 0;
     let totalPendingPosting = 0;
     let totalPendingReceive = 0;
 
     // Iterate through the array and sum values
     dataRow.forEach((record) => {
        if(record.QtyLiter != null){
          totalQtyLiter += record.QtyLiter;
        }
        if(record.SOHSystem !=null){
          totalSOHSystem += record.SOHSystem;
        }
       if(record.PendingPosting !=null){
          totalPendingPosting += record.PendingPosting || 0;
       }
      if(record.PendingReceive !=null){
        totalPendingReceive += record.PendingReceive || 0;
      }
      
     });
 
     // Update the states with the calculated totals
     setSohFisik(Math.round(totalQtyLiter));
     setSohSystem(Math.round(totalSOHSystem));
     setPendingPosting(Math.round(totalPendingPosting));
     setPendingReceive(Math.round(totalPendingReceive));
 
     // Calculate the difference
     const calculatedDiff =
       Math.round(totalQtyLiter + totalPendingPosting - totalSOHSystem - totalPendingReceive);
     setDiff(calculatedDiff);

  }

  useEffect(() => {
    fetchWarehouseWithStockTaking(date!);
  }, [date]); // Adding 'date' as a dependency, so it refetches when the date changes
  

  const handleDateChange = async (date: Date | null) => {
    console.log(date);
    setDate(date);
    await fetchWarehouseWithStockTaking(formatDateForSupabase(date!));
  };

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <div className=" flex flex-row w-full justify-between  mb-2 ">
                <div className="w-full justify-end">
                  <h2 className="font-bold text-black dark:text-white sm:text-title-sm w-full">
                    Quick Stock Taking
                  </h2>
                </div>

                <div className="flex w-full justify-end">
                  <DatePickerOne
                    enabled={true}
                    handleChange={handleDateChange}
                    setValue={formatDateToIndonesianByDate(date!)}
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
                  <h1>{sohFisik}</h1>
                </div>
                <div>
                  <h1 className="font-bold">Pending Posting</h1>
                  <h1>{pendingPosting}</h1>
                </div>
                <div>
                  <h1 className="font-bold">Stock System</h1>
                  <h1>{sohSystem}</h1>
                </div>
                <div>
                  <h1 className="font-bold">Pending Receive</h1>
                  <h1>{pendingReceive}</h1>
                </div>
                <div>
                  <h1 className="font-bold">Difference</h1>
                  <h1>{diff}</h1>
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
