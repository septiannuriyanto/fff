import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import * as XLSX from 'xlsx';
import InstalledChart from './components/InstalledChart';
import StatusChart from './components/StatusChart';
import ReportedChart from './components/ReportedChart';
import ThemedGrid from '../../../common/ThemedComponents/ThemedGrid';

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
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<any>(null);
  // Define the options for the status dropdown
  const statusOptions = ['OPEN', 'PROGRESS', 'CLOSED'];
  const pressurelesssOptions = ['Y', 'N', 'X'];
  const [allPopulation, setAllPopulation] = useState<number>(0);
  const [installed, setInstalled] = useState<number>(0);
  const [notInstalled, setNotInstalled] = useState<number>(0);
  const [openCount, setOpenCount] = useState<number>(0);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [closedCount, setClosedCount] = useState<number>(0);
  const [reportedCount, setreportedCount] = useState<number>(0);
  const [notReportedCount, setNotReportedCount] = useState<number>(0);
  const [colDefs, setColDefs] = useState<any[]>([
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
      id: 'pressureless ',
      field: 'pressureless',
      filter: 'agTextColumnFilter',
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
      editable: allowColumnsEdit,
      filterParams: {
        values: ['Y', 'N', 'X'], // Possible values for boolean filter
        cellRenderer: 'agCheckboxCellRenderer',
        cellRendererParams: {
          checkbox: true,
        },
      },
      cellEditor: 'agSelectCellEditor', // Use agSelectCellEditor
      cellEditorParams: {
        values: pressurelesssOptions, // Provide options for the dropdown
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
        } else if (params.value === 'CLOSED') {
          return { color: 'black', backgroundColor: '#aaffaa' };
        } else {
          return { color: 'black', backgroundColor: 'transparent' };
        }
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
    console.log('Grid is ready.');
  
    try {
      const { data, error } = await supabase.rpc('get_recent_pressureless_condition');
      console.log('Data:', data);
      if (error) {
        console.error('Error fetching equipment summary:', error);
        setLoading(false); // Ensure loading is set to false in case of error
        return;
      }
  
      // Initialize counts object
      const counts = {
        all: 0,
        installed: 0,
        notInstalled: 0,
        open: 0,
        progress: 0,
        close: 0,
        notReported: 0,
        reported: 0,
      };
  
      // Process each row to update counts
      data.forEach((row: any) => {
        counts.all++; // Count each row
  
        // Handle pressureless conditions
        if (row.pressureless === 'Y') {
          counts.installed++;
          if (row.status === null) {
            counts.notReported++;
          } else {
            counts.reported++;
          }
        } else if (row.pressureless === 'N') {
          counts.notInstalled++;
        }
  
        // Handle status conditions
        switch (row.status) {
          case 'OPEN':
            counts.open++;
            break;
          case 'PROGRESS':
            counts.progress++;
            break;
          case 'CLOSED':
            counts.close++;
            break;
          default:
            break;
        }
      });
  
      setAllPopulation(counts.all);
      setInstalled(counts.installed);
      setNotInstalled(counts.notInstalled);
      setOpenCount(counts.open);
      setProgressCount(counts.progress);
      setClosedCount(counts.close);
      setreportedCount(counts.reported);
      setNotReportedCount(counts.notReported);
      setRowData(data);
      // setLoading(false); // Ensure loading is set to false after processing
    } catch (error) {
      console.error('Error in onGridReady:', error);
      // setLoading(false); // Ensure loading is set to false in case of error
    }
  
    params.api.setFilterModel({
      pressureless: {
        type: 'equals',
        value: 'Y',
      },
    });
    params.api.onFilterChanged();
  }, []);
  

  const exportGrid = () => {
    const params = {
      fileName: 'infrastructure-grid-export.csv',
      sheetName: 'Sheet1',
      processCellCallback: (params: any) => {
        // Custom logic to format cell data
        return params.value;
      },
    };

    gridRef!.current!.api.exportDataAsCsv();
  };
  
  const handleExportCsv = (e: any) => {
    e.preventDefault();
    // exportToExcel(rowData);
    exportGrid();
  };

  const onCellValueChanged = async (params: any) => {
    const { data, oldValue } = params;
    const { codenumber, lastchecked, status, remark, pressureless } = data;
    const columnId = params.column.getId();

    // The previous status before the change
    const prevStatus = oldValue;

    try {
      // Check if pressureless value has changed
      if (columnId == 'pressureless') {
        // console.log('updating pressureless installation status');
        const { error: populationError } = await supabase
          .from('population')
          .update({ pressureless })
          .eq('code_number', codenumber);

        if (populationError) {
          throw new Error(
            `Error updating population table: ${populationError.message}`,
          );
        }
        if (pressureless === 'Y') {
          setNotInstalled((prev) => prev - 1);
          setInstalled((prev) => prev + 1);
        } else if (pressureless === 'N') {
          setInstalled((prev) => prev - 1);
          setNotInstalled((prev) => prev + 1);
        } else {
          setInstalled((prev) => prev - 1);
          setNotInstalled((prev) => prev - 1);
        }
      } else if (columnId == 'status') {
        // console.log('updating status');
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
        // Update for OPEN, PROGRESS, and CLOSED statuses
        if (status === 'OPEN') {
          setOpenCount((prev) => prev + 1);
          if (prevStatus === 'PROGRESS') {
            setProgressCount((prev) => prev - 1);
          } else if (prevStatus === 'CLOSED') {
            setClosedCount((prev) => prev - 1);
          }
        } else if (status === 'PROGRESS') {
          setProgressCount((prev) => prev + 1);
          if (prevStatus === 'OPEN') {
            setOpenCount((prev) => prev - 1);
          } else if (prevStatus === 'CLOSED') {
            setClosedCount((prev) => prev - 1);
          }
        } else if (status === 'CLOSED') {
          setClosedCount((prev) => prev + 1);
          if (prevStatus === 'OPEN') {
            setOpenCount((prev) => prev - 1);
          } else if (prevStatus === 'PROGRESS') {
            setProgressCount((prev) => prev - 1);
          }
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

  const autoSizeStrategy: any = {
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

  //------------TABBED BUTTONS
  interface TabbedButtonProps {
    filterByStatus: (status: string) => void;
  }
  let tabs = [
    { label: `All (${allPopulation})`, value: 'ALL' },
    { label: `Installed(${installed})`, value: 'INSTALLED' },
    { label: `Not Installed(${notInstalled})`, value: 'NOT INSTALLED' },
    { label: `Reported(${reportedCount})`, value: 'REPORTED' },
    { label: `Not Reported(${notReportedCount})`, value: 'NOT REPORTED' },
    { label: `Open(${openCount})`, value: 'OPEN' },
    { label: `Progress(${progressCount})`, value: 'PROGRESS' },
    { label: `Closed(${closedCount})`, value: 'CLOSED' },
  ];

  const [activeTab, setActiveTab] = useState<string>('ALL');

  const handleTabClick = (value: string) => {
    // console.log(value);
    setActiveTab(value);
    filterByStatus(value);
    // Handle tab click logic here
  };
  const filterByStatus = (status: string) => {
    if (gridRef.current) {
      const gridApi = gridRef.current.api;
      if (status === 'ALL') {
        gridApi.setFilterModel(null); // Show all rows
      } else if (status === 'INSTALLED') {
        gridApi.setFilterModel({
          pressureless: {
            type: 'equals',
            filter: 'Y',
          },
        });
      } else if (status === 'NOT INSTALLED') {
        gridApi.setFilterModel({
          pressureless: {
            type: 'equals',
            filter: 'N',
          },
        });
      } else if (status === 'REPORTED') {
        gridApi.setFilterModel({
          pressureless: {
            type: 'equals',
            filter: 'Y',
          },
          status: {
            type: 'notBlank',
          },
        });
      } else if (status === 'NOT REPORTED') {
        gridApi.setFilterModel({
          pressureless: {
            type: 'equals',
            filter: 'Y',
          },
          status: {
            type: 'blank',
          },
        });
      } else {
        gridApi.setFilterModel({
          status: {
            type: 'equals',
            filter: status,
          },
        });
      }
      gridApi.onFilterChanged();
    }
  };
  const CustomEmptyFilter = (params: any) => {
    const { api } = params;
    return {
      // Your filter implementation
      doesFilterPass: (params: any) => {
        return params.data.status === ''; // Customize this condition as needed
      },
      // Other filter methods...
    };
  };

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Kondisi Pressureless
              </h2>

              
              <div className="content">
                <div className="col-span-12 xl:col-span-6 lg:inline-flex flex-col lg:flex-row justify-center align-middle w-full items-center">
                  <InstalledChart
                    installed={installed}
                    notInstalled={notInstalled}
                  />
                  <ReportedChart
                    reported={reportedCount}
                    notReported={notReportedCount}
                  />
                  <StatusChart
                    openCount={openCount}
                    progressCount={progressCount}
                    closedCount={closedCount}
                  />
                </div>

                <div className="flex space-x-4 pb-4 flex-wrap">
                  {tabs.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => handleTabClick(tab.value)}
                      className={`px-4 py-2 font-semibold border-b-2 transition-colors duration-300 ${
                        activeTab === tab.value
                          ? 'border-blue-500 text-blue-500'
                          : 'border-transparent text-gray-600 hover:text-blue-500'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="h-[500px] w-full mt-4 flex flex-col">
                  <ThemedGrid
                    ref={gridRef as any}
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
                    onClick={handleExportCsv}
                    className="bg-body dark:bg-boxdark-2 text-white py-2 px-6 rounded hover:bg-blue-700 solid border-primary"
                  >
                    Export to CSV
                  </button>
                </div>
                <div className="legend mt-5">
                  <h4 className="font-bold">Keterangan Kondisi : </h4>
                  <ul>
                    <li>1.&nbsp;&nbsp;Tidak ada tumpahan</li>
                    <li>
                      2.&nbsp;&nbsp;Tumpah pada akhir Refueling, Ada tekanan
                      balik pada tuas fuel gun
                    </li>
                    <li>
                      3.&nbsp;&nbsp;Tumpah pada akhir Refueling, Tidak ada
                      tekanan balik pada tuas fuel gun
                    </li>
                    <li>4.&nbsp;&nbsp;Tumpah sejak awal pengisian</li>
                  </ul>
                </div>
              </div>
              
                
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PressurelessSummary;
