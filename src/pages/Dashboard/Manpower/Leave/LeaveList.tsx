import { AgGridReact } from 'ag-grid-react';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import ActionCellRenderer from './ActionCellRenderer';

const LeaveList = () => {
  const fullColumns = [
    { headerName: 'NRP', field: 'nrp' },
    { headerName: 'Nama', field: 'nama' },
    { headerName: 'Date Start', field: 'date_start' },
    { headerName: 'Date End', field: 'date_end' },
    { headerName: 'Create Date', field: 'createdate' },
    { headerName: 'Approval Date', field: 'approvaldate' },
    { headerName: 'Remark', field: 'remark' },
    { headerName: 'Closed', field: 'closed' , editable: false},
    { headerName: 'Action', field: 'action' ,cellRenderer: 'actionCellRenderer', // Use the custom cell renderer
      width: 150},
  ];

  const gridRef = useRef();
  const autoSizeStrategy = {
    type: 'fitCellContents',
  };
  const defaultColDef = {
    editable: true,
    filter: true, // Enable filtering on all columns
    sortable: true, // Enable sorting
  };

  const [rowData, setRowData] = useState<any[]>([]);
  useEffect(() => {
    async function fetchLeaveData() {
      const { data, error } = await supabase
        .rpc('get_leave_data');
    
      if (error) {
        console.error('Error fetching data:', error);
        return;
      }
    
      console.log('Fetched data:', data);
      setRowData(data)
      return data;
    }

    fetchLeaveData();

  }, []);

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Daftar Karyawan Cuti
              </h2>

              <div className="main-screen h-100 w-full">
                <div className="ag-theme-quartz-auto-dark h-100 w-full">
                  <AgGridReact
                    ref={gridRef}
                    columnDefs={fullColumns}
                    rowData={rowData}
                    defaultColDef={defaultColDef}
                    components={{
                      actionCellRenderer: ActionCellRenderer // Register the custom cell renderer
                    }}
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

export default LeaveList;
