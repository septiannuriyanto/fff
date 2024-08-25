import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import 'ag-grid-community/styles/ag-grid.css'; // Mandatory CSS required by the Data Grid
import 'ag-grid-community/styles/ag-theme-quartz.css'; // Optional Theme applied to the Data Grid
import { supabase } from '../../../db/SupabaseClient';
import * as XLSX from 'xlsx';
import { sendMessageToChannel } from '../../../services/TelegramSender';

const exportToExcel = (data: any[]) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  XLSX.writeFile(wb, 'pressureless-detail.xlsx');
};

interface PressurelessSummaryProps {
  allowColumnsEdit: boolean;
}

const PressurelessSummary: React.FC<PressurelessSummaryProps> = ({
  allowColumnsEdit,
}) => {
  // Row Data: The data to be displayed.
  const [rowData, setRowData] = useState<any[]>([]);
  const [gridApi, setGridApi] = useState<any>(null);
  const gridRef = useRef();
  // Define the options for the status dropdown
  const statusOptions = ['OPEN', 'PROGRESS', 'CLOSE'];
  useEffect(() => {
    if (gridApi) {
      gridApi.setFilterModel({
        pressureless: {
          filterType: 'boolean',
          type: 'equals',
          value: true,
        },
      });
      gridApi.onFilterChanged();
    }
  }, [rowData, gridApi]);

  // useEffect(() => {
  //   const fetchEquipmentSummary = async () => {
  //     const { data, error } = await supabase.rpc(
  //       'get_recent_pressureless_condition',
  //     );

  //     if (error) {
  //       console.error('Error fetching equipment summary:', error);
  //     } else {
  //       console.log(data);
  //       setRowData(data);
  //     }
  //   };

  //   fetchEquipmentSummary();
  // }, []);

  // Column Definitions: Defines the columns to be displayed.
  const [colDefs, setColDefs] = useState([
    {
      id: 'codenumber',
      field: 'codenumber',
      filter: 'agTextColumnFilter',
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
    },
    {
      id: 'egi',
      field: 'egi',
      filter: 'agTextColumnFilter',
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
    },
    {
      id: 'pressureless',
      field: 'pressureless',
      filter: 'agSetColumnFilter',
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
      editable: allowColumnsEdit,
      filterParams: {
        values: [true, false], // Possible values for boolean filter
        cellRenderer: 'agCheckboxCellRenderer',
        cellRendererParams: {
          checkbox: true,
        },
      },
    },
    {
      id: 'kondisi',
      field: 'kondisi',
      filter: 'agNumberColumnFilter',
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
    },
    {
      id: 'lastchecked',
      field: 'lastchecked',
    },
    {
      id: 'lastreportby',
      field: 'lastreportby',
    },
    {
      id: 'status',
      field: 'status',
      editable: allowColumnsEdit,
      filter: 'agTextColumnFilter',
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
      cellStyle: (params: any) => {
        if (params.value === 'OPEN') {
          return { color: 'white', backgroundColor: '#ffaaaa' };
        } else if (params.value === 'PROGRESS') {
          return { color: 'black', backgroundColor: '#ffffb0' };
        } else if (params.value === 'CLOSE') {
          return { color: 'black', backgroundColor: '#aaffaa' };
        } else {
          return { color: 'black', backgroundColor: 'white' };
        }
        return null;
      },

      cellEditor: 'agSelectCellEditor', // Use agSelectCellEditor
      cellEditorParams: {
        values: statusOptions, // Provide options for the dropdown
      },
    },
    {
      id: 'remark',
      field: 'remark',
      editable: allowColumnsEdit,
      filter: 'agTextColumnFilter',
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
    },
  ]);
  const defaultColDef = {
    filter: true, // Enable filtering on all columns
    sortable: true, // Enable sorting
  };

  const onGridReady = useCallback(async (params: any) => {
    setGridApi(params.api);
    const { data, error } = await supabase.rpc(
      'get_recent_pressureless_condition',
    );

    if (error) {
      console.error('Error fetching equipment summary:', error);
    } else {
      setRowData(data);
    }
    // Apply initial filter
    params.api.setFilterModel({
      pressureless: {
        filterType: 'boolean',
        type: 'equals',
        value: true,
      },
    });
    params.api.onFilterChanged();
  }, []);

  const handleExport = (e: any) => {
    e.preventDefault();
    exportToExcel(rowData);
  };

  const onCellValueChanged = async (params: any) => {
    const { data } = params;
    const { codenumber, lastchecked, status, remark, pressureless } = data;
    const columnId = params.column.getId();
    console.log(columnId);

    try {
      // Check if pressureless value has changed
      if (columnId == 'pressureless') {
        console.log('updating pressureless installation status');
        const { error: populationError } = await supabase
          .from('population')
          .update({ pressureless })
          .eq('code_number', codenumber);

        if (populationError) {
          throw new Error(
            `Error updating population table: ${populationError.message}`,
          );
        }
      } else if (columnId == 'status') {
        console.log('updating status');
        const { error: reportError } = await supabase
          .from('pressureless_report')
          .update({ status })
          .eq('equip_number', codenumber)
          .eq('date_report', lastchecked); // Use the date_report from the edited row

        if (reportError) {
          throw new Error(
            `Error updating status table: ${reportError.message}`,
          );
        }
      } else {
        console.log('updating remark');
        const { error: reportError } = await supabase
          .from('pressureless_report')
          .update({ remark })
          .eq('equip_number', codenumber)
          .eq('date_report', lastchecked); // Use the date_report from the edited row
        if (reportError) {
          throw new Error(
            `Error updating remark table: ${reportError.message}`,
          );
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const autoSizeStrategy = {
    type: 'fitCellContents',
    // type: 'fitGridWidth',
    // defaultMinWidth: 50,
    // columnLimits: [
    //     {
    //         colId: 'codenumber',
    //         minWidth: 50,
    //     },
    //     {
    //         colId: 'model',
    //         minWidth: 50,
    //     },
    //     {
    //         colId: 'pressureless',
    //         minWidth: 50,
    //     },
    //     {
    //         colId: 'kondisi',
    //         minWidth: 50,
    //     },
    //     {
    //         colId: 'lastchecked',
    //         minWidth: 50,
    //     },
    //     {
    //         colId: 'lastreportby',
    //         minWidth: 50,
    //     },
    // ]
  };

  const getRowId = useCallback((params: any) => {
    return params.data.id;
  }, []);

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-9 font-bold text-black dark:text-white sm:text-title-md w-full">
                Kondisi Pressureless
              </h2>

              <div
                className="ag-theme-quartz h-100 w-full" // applying the Data Grid theme
              >
                <AgGridReact
                  ref={gridRef}
                  rowData={rowData}
                  columnDefs={colDefs}
                  defaultColDef={defaultColDef}
                  autoSizeStrategy={autoSizeStrategy}
                  onGridReady={onGridReady}
                  onCellValueChanged={onCellValueChanged}
                />
              </div>
              <div className="w-full flex justify-end my-5">
                <button
                  onClick={handleExport}
                  className="bg-body dark:bg-boxdark-2 text-white py-2 px-6 rounded hover:bg-blue-700 solid border-primary"
                >
                  Export to excel
                </button>
                <button
                  onClick={handleSendMessage}
                  className="bg-body dark:bg-boxdark-2 text-white py-2 px-6 rounded hover:bg-blue-700 solid border-primary"
                >
                  Send to Telegram
                </button>
              </div>
              <div className="legend mt-5">
                <h4 className="font-bold">Keterangan Kondisi : </h4>
                <ul>
                  <li>1.&nbsp;&nbsp;Tidak ada tumpahan</li>
                  <li>
                    2.&nbsp;&nbsp;Tumpah pada akhir Refueling, Ada tekanan balik
                    pada tuas fuel gun
                  </li>
                  <li>
                    3.&nbsp;&nbsp;Tumpah pada akhir Refueling, Tidak ada tekanan
                    balik pada tuas fuel gun
                  </li>
                  <li>4.&nbsp;&nbsp;Tumpah sejak awal pengisian</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PressurelessSummary;
