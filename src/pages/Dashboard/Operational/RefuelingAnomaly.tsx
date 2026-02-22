import React, { useState, useRef, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { format, parse, isValid } from 'date-fns';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css'; // Mandatory CSS required by the Data Grid
import 'ag-grid-community/styles/ag-theme-quartz.css'; // Optional Theme applied to the Data Grid
import { supabase } from '../../../db/SupabaseClient';
import AnomalyBarChart from './components/AnomalyBarChart';
import AnomalyBarChartSwapped from './components/AnomalyBarChartSwapped';
import { sendMessageToChannel } from '../../../services/TelegramSender';
import { useTheme } from '../../../contexts/ThemeContext';

const ProblemCategoryOptions = [
  'Run Out Fuel',
  'Cycle Reset',
  'Normal Schedule',
  'Typing Error',
  'Post Breakdown',
  'Location Unreachable',
  'Wrong Max Tank',
  'Unidentified',
  'Heavy Work',
  '',
];

interface RefuelingAnomalyProps {
  allowColumnsEdit: boolean;
}

const RefuelingAnomaly: React.FC<RefuelingAnomalyProps> = ({
  allowColumnsEdit,
}) => {
  const { activeTheme } = useTheme();
  console.log('Allow Columns Edit:', allowColumnsEdit); // Add this to debug
  const gridRef = useRef<any>(null);

  const [editColumn, setEditColumn] = useState(allowColumnsEdit);
  const [swapChart, setSwapChart] = useState(false);

  const fullColumns = [
    { id: 'JobRowId', headerName: 'Job Row Id', field: 'JobRowId' },
    { id: 'Distrik', headerName: 'Distrik', field: 'Distrik' },
    { id: 'IssuedDate', headerName: 'Issued Date', field: 'IssuedDate' },
    { id: 'EquipmentClass', headerName: 'Eq Class', field: 'EquipmentClass' },
    { id: 'EGI', headerName: 'EGI', field: 'EGI' },
    { id: 'UnitNo', headerName: 'Unit No', field: 'UnitNo' },
    { id: 'Status', headerName: 'Status', field: 'Status' },
    { id: 'WhouseId', headerName: 'Whouse Id', field: 'WhouseId' },
    { id: 'RefHourStart', headerName: 'Ref Hour Start', field: 'RefHourStart' },
    { id: 'RefHourStop', headerName: 'Ref Hour Stop', field: 'RefHourStop' },
    { id: 'DriverName', headerName: 'Driver Name', field: 'DriverName' },
    { id: 'FuelmanName', headerName: 'Fuelman Name', field: 'FuelmanName' },
    { id: 'LogSheetCode', headerName: 'Log Sheet Code', field: 'LogSheetCode' },
    { id: 'FlowMeterEnd', headerName: 'Flow Meter End', field: 'FlowMeterEnd' },
    {
      id: 'FlowMeterStart',
      headerName: 'Flow Meter Start',
      field: 'FlowMeterStart',
    },
    { id: 'HMKM', headerName: 'HM/KM', field: 'HMKM' },
    {
      id: 'MaxTankCapacity',
      headerName: 'Max Tank Capacity',
      field: 'MaxTankCapacity',
    },
    { id: 'QtyL', headerName: 'Qty [L]', field: 'QtyL' },
    { id: 'QtyOverUnderL', headerName: 'Qty Variance', field: 'QtyOverUnderL' },
    {
      id: 'FreqRefueling',
      headerName: 'Freq Refueling',
      field: 'FreqRefueling',
    },
    {
      id: 'ProblemCategory',
      headerName: 'Problem Category',
      field: 'ProblemCategory',
      cellEditor: 'agSelectCellEditor', // Use agSelectCellEditor
      editable: editColumn,
      cellEditorParams: {
        values: ProblemCategoryOptions, // Provide options for the dropdown
      },
    },
    {
      id: 'Reason',
      headerName: 'Reason',
      field: 'Reason',
      editable: editColumn,
    },
    {
      id: 'Remark',
      headerName: 'Remark',
      field: 'Remark',
      editable: editColumn,
    },
  ];

  const simpleColumns = [
    { id: 'IssuedDate', headerName: 'Issued Date', field: 'IssuedDate' },
    { id: 'Shift', headerName: 'Shift', field: 'Shift', minWidth: 10 },
    { id: 'UnitNo', headerName: 'Unit No', field: 'UnitNo' },
    { id: 'WhouseId', headerName: 'Whouse Id', field: 'WhouseId' },
    { id: 'RefHourStart', headerName: 'Ref Hour Start', field: 'RefHourStart' },
    { id: 'RefHourStop', headerName: 'Ref Hour Stop', field: 'RefHourStop' },
    { id: 'DriverName', headerName: 'Driver Name', field: 'DriverName' },
    { id: 'FuelmanName', headerName: 'Fuelman Name', field: 'FuelmanName' },
    { id: 'FlowMeterEnd', headerName: 'Flow Meter End', field: 'FlowMeterEnd' },
    {
      id: 'FlowMeterStart',
      headerName: 'Flow Meter Start',
      field: 'FlowMeterStart',
    },
    { id: 'HMKM', headerName: 'HM/KM', field: 'HMKM' },
    {
      id: 'MaxTankCapacity',
      headerName: 'Max Tank Capacity',
      field: 'MaxTankCapacity',
    },
    { id: 'QtyL', headerName: 'Qty [L]', field: 'QtyL' },
    { id: 'QtyOverUnderL', headerName: 'Qty Variance', field: 'QtyOverUnderL' },
    {
      id: 'FreqRefueling',
      headerName: 'Freq Refueling',
      field: 'FreqRefueling',
    },
    {
      id: 'ProblemCategory',
      headerName: 'Problem Category',
      field: 'ProblemCategory',
      editable: editColumn,
      cellEditor: 'agSelectCellEditor', // Use agSelectCellEditor
      cellEditorParams: {
        values: ProblemCategoryOptions, // Provide options for the dropdown
      },
    },
    {
      id: 'Reason',
      headerName: 'Reason',
      field: 'Reason',
      editable: editColumn,
    },
    {
      id: 'Remark',
      headerName: 'Remark',
      field: 'Remark',
      editable: editColumn,
    },
  ];

  useEffect(() => {
    setEditColumn(allowColumnsEdit);
  }, [allowColumnsEdit]);

  const defaultColDef = {
    editable: editColumn, // Use columnEdit for default editable state
    filter: true,
    sortable: true,
  };

  const autoSizeStrategy = {
    type: 'fitCellContents',
  } as const;
  const [showDragandDrop, setShowDragandDrop] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowData, setRowData] = useState<any[]>([]);
  const [useColumn, setUseColumn] = useState<any[]>(simpleColumns);

  const onToggleFileInput = (e: any) => {
    e.preventDefault();
    setShowDragandDrop(!showDragandDrop);
    setSelectedFile(null); // Reset the selected file when toggling
    setErrorMessage(null); // Clear any previous error messages
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setShowDragandDrop(false);
      validateAndParseFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleExportCsv = (e: any) => {
    e.preventDefault();
    // exportToExcel(rowData);
    exportGrid();
  };

  const exportGrid = () => {
    const params = {
      fileName: 'refuelingAnomaly-grid-export.csv',
      sheetName: 'Sheet1',
      processCellCallback: (params: any) => {
        // Custom logic to format cell data
        return params.value;
      },
      processHeaderCallback: (params: any) => {
        return params.column.getColDef().field; // Use the 'field' as the header instead of 'headerName'
      },
    };

    gridRef.current?.api.exportDataAsCsv(params);
  };

  const validateAndParseFile = (file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setErrorMessage(null);

      Papa.parse(file, {
        complete: (result: any) => {
          console.log('Parsed CSV Result:', result); // Log the entire result for debugging

          if (result.errors.length === 0) {
            const columnXIndex = 0;
            const columnYIndex = 22; // Column U is index 20
            const columnsToDelete = [7, 12, 13]; // Columns H, M and N (zero-based indices)
            const dateIssuedIndex = 1;

            // Process data: remove specified columns, slice columns A to U, and perform replacements
            const modifiedData = result.data
              .slice(1) // Remove the header row
              .slice(2) // Remove the header row
              .map((row: any[]) => {
                // Slice the data to keep only columns A to U (0 to 20)
                const slicedRow = row.slice(columnXIndex, columnYIndex + 1);

                // Remove columns M and N from the sliced data
                const filteredRow = slicedRow.filter(
                  (_, index) => !columnsToDelete.includes(index + columnXIndex),
                );
                // Remove commas
                if (filteredRow[14] !== undefined) {
                  filteredRow[14] = filteredRow[14].replace(/,/g, '');
                  // Continue replacing commas and performing other necessary modifications
                }
                if (filteredRow[15] !== undefined) {
                  filteredRow[15] = filteredRow[15].replace(/,/g, '');
                  // Continue replacing commas and performing other necessary modifications
                }
                if (filteredRow[16] !== undefined) {
                  filteredRow[16] = filteredRow[16].replace(/,/g, '');
                  // Continue replacing commas and performing other necessary modifications
                }
                if (filteredRow[17] !== undefined) {
                  filteredRow[17] = filteredRow[17].replace(/,/g, '');
                  // Continue replacing commas and performing other necessary modifications
                }
                if (filteredRow[18] !== undefined) {
                  filteredRow[18] = filteredRow[18].replace('.00', '');
                  // Continue replacing commas and performing other necessary modifications
                }
                if (filteredRow[18] !== undefined) {
                  filteredRow[18] = filteredRow[18].replace('.0', '.');
                  // Continue replacing commas and performing other necessary modifications
                }
                if (filteredRow[18] !== undefined) {
                  // Cast to a float
                  const floatValue = parseFloat(filteredRow[18]);

                  if (!isNaN(floatValue)) {
                    // Perform your replacement
                    filteredRow[18] = floatValue.toFixed(1);
                  } else {
                    console.error(
                      'Error: Unable to parse float from',
                      filteredRow[18],
                    );
                  }
                }

                if (filteredRow[19] !== undefined) {
                  filteredRow[19] = filteredRow[19].replace('.00', '');
                  // Continue replacing commas and performing other necessary modifications
                }
                if (filteredRow[19] !== undefined) {
                  filteredRow[19] = filteredRow[19].replace('.0', '.');
                  // Continue replacing commas and performing other necessary modifications
                }

                if (filteredRow[19] !== undefined) {
                  // Cast to a float
                  const floatValue = parseFloat(filteredRow[19]);

                  if (!isNaN(floatValue)) {
                    // Perform your replacement
                    filteredRow[19] = floatValue.toFixed(1);
                  } else {
                    console.error(
                      'Error: Unable to parse float from',
                      filteredRow[19],
                    );
                  }
                }

                // Parse and format 'DateIssued'
                if (filteredRow[dateIssuedIndex]) {
                  let parsedDate: Date | undefined;
                  const dateFormats = ['MM/dd/yy', 'M/d/yyyy'];

                  for (const formatString of dateFormats) {
                    const tempDate = parse(
                      filteredRow[dateIssuedIndex],
                      formatString,
                      new Date(),
                    );
                    if (isValid(tempDate)) {
                      parsedDate = tempDate;
                      break;
                    }
                  }

                  if (parsedDate && isValid(parsedDate)) {
                    filteredRow[dateIssuedIndex] = format(
                      parsedDate,
                      'yyyy-MM-dd',
                    );
                  } else {
                    console.error(
                      'Error parsing date:',
                      filteredRow[dateIssuedIndex],
                    );

                    const splitString = filteredRow[dateIssuedIndex].split('/');
                    console.log(splitString);

                    const date = `${splitString[2]}-${splitString[1]}-${splitString[0]}`;

                    filteredRow[dateIssuedIndex] = date;
                  }
                }

                return filteredRow;
              });

            // process data

            // Set the row data for AG Grid
            const rowDatas = modifiedData.map((row: string[]) => {
              // console.log(row);

              return {
                Distrik: row[0],
                IssuedDate: row[1],
                Shift: parseInt(row[2]),
                EquipmentClass: row[3],
                EGI: row[4],
                UnitNo: row[5],
                Status: row[6],
                WhouseId: row[7],
                RefHourStart: row[8],
                RefHourStop: row[9],
                DriverName: row[10],
                FuelmanName: row[11],
                LogSheetCode: row[12],
                JobRowId: row[13],
                FlowMeterEnd: row[14],
                FlowMeterStart: row[15],
                HMKM: parseFloat(row[16]),
                MaxTankCapacity: parseFloat(row[17]),
                QtyL: parseFloat(row[18]),
                QtyOverUnderL: parseFloat(row[19]),
                FreqRefueling: parseInt(row[20]),
              };
            });

            console.log('Row Data for AG Grid:', rowDatas); // Log the row data for AG Grid
            const newItems = rowDatas.filter(
              (item2:any) =>
                !rowData.some((item1:any) => item1.JobRowId === item2.JobRowId),
            );
            const filteredRowDatas = newItems.filter(
              (item:any) => item.Distrik !== '',
            );
            if (filteredRowDatas.length > 0) {
              const updatedRowData = [...rowData, ...filteredRowDatas]; // Use spread operator to create a new array
              console.log(filteredRowDatas);
              batchInsertItems(filteredRowDatas);
              setRowData(updatedRowData); // Update state with the new array
              const message = `NEW ANOMALY DETECTED : ${filteredRowDatas.length} ITEM\nPlease add some feedback at :\nhttps://fff-project.vercel.app/anomaly`;
              sendMessageToChannel(message)
            }
          } else {
            setErrorMessage('Failed to parse the CSV file.');
          }
        },
        error: (error: any) => {
          setErrorMessage(`Error parsing file: ${error.message}`);
        },
      });
    } else {
      setErrorMessage('Please upload a valid CSV file.');
    }
  };

  async function batchInsertItems(items: any) {
    try {
      // Insert the items into the `refueling_anomaly` table
      const { data, error } = await supabase
        .from('refueling_anomaly')
        .upsert(items, { onConflict: 'JobRowId' }); // Adjust onConflict if necessary

      if (error) {
        throw new Error(`Error inserting items: ${error.message}`);
      }

      console.log('Items successfully inserted:', data);
    } catch (error) {
      console.error('Error during batch insert:', error);
    }
  }

  // const validateAndParseFile = (file: File) => {
  //   if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
  //     setErrorMessage(null);

  //     Papa.parse(file, {
  //       complete: (result: any) => {
  //         console.log('Parsed CSV Result:', result); // Log the entire result for debugging
  //         if (result.errors.length === 0) {
  //           const columnXIndex = 0;
  //           const columnYIndex = 20; // Column U is index 20
  //           const columnToReplace = 16; // Column 17 (zero-based index 16) where comma removal and replacements are applied
  //           const columnsToDelete = [12, 13]; // Columns M and N (zero-based indices)

  //           // Process data: remove specified columns, slice columns A to U, and perform replacements
  //           const modifiedData = result.data
  //             .slice(1) // Remove the header row
  //             .map((row: any[]) => {
  //               // Slice the data to keep only columns A to U (0 to 20)
  //               const slicedRow = row.slice(columnXIndex, columnYIndex + 1);

  //               // Remove columns M and N from the sliced data
  //               const filteredRow = slicedRow.filter(
  //                 (_, index) => !columnsToDelete.includes(index + columnXIndex),
  //               );

  //               // Adjust index for replacements due to column deletions
  //               const adjustedColumnToReplace =
  //                 columnToReplace -
  //                 columnsToDelete.filter((index) => index < columnToReplace)
  //                   .length;

  //               // Ensure the column to replace exists in the filtered data
  //               if (filteredRow[adjustedColumnToReplace] !== undefined) {
  //                 // Perform replacements

  //                 filteredRow[adjustedColumnToReplace] = filteredRow[
  //                   adjustedColumnToReplace
  //                 ].replace(/,/g, ''); // Remove commas
  //                 filteredRow[adjustedColumnToReplace + 1] = filteredRow[
  //                   adjustedColumnToReplace + 1
  //                 ].replace(/,/g, ''); // Remove commas
  //                 filteredRow[adjustedColumnToReplace + 2] = filteredRow[
  //                   adjustedColumnToReplace + 2
  //                 ].replace(/,/g, ''); // Remove commas
  //                 filteredRow[adjustedColumnToReplace + 3] = filteredRow[
  //                   adjustedColumnToReplace + 3
  //                 ].replace(/,/g, ''); // Remove commas
  //                 filteredRow[adjustedColumnToReplace + 4] = String(
  //                   filteredRow[adjustedColumnToReplace + 4],
  //                 ); // Ensure it's a string
  //                 filteredRow[adjustedColumnToReplace + 4] = filteredRow[
  //                   adjustedColumnToReplace + 4
  //                 ].replace(/,/g, ''); // Remove commas
  //                 filteredRow[adjustedColumnToReplace + 4] = filteredRow[
  //                   adjustedColumnToReplace + 4
  //                 ].replace('.00', ''); // Replace .00 with an empty string

  //                 // Additional replacements if needed
  //                 // Example: filteredRow[adjustedColumnToReplace] = filteredRow[adjustedColumnToReplace].replace(searchValue, replaceValue);
  //               }

  //               return filteredRow;
  //             });

  //           // Convert back to CSV

  //         } else {
  //           setErrorMessage('Failed to parse the CSV file.');
  //         }
  //       },
  //       error: (error: any) => {
  //         setErrorMessage(`Error parsing file: ${error.message}`);
  //       },
  //     });
  //   } else {
  //     setErrorMessage('Please upload a valid CSV file.');
  //   }
  // };


  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const onToggleColumn = (e: any) => {
    e.preventDefault();
    console.log('Changing column type');

    if (useColumn.length == fullColumns.length) {
      setUseColumn(simpleColumns);
    } else {
      setUseColumn(fullColumns);
    }
  };

  useEffect(() => {
    const fetchAnomalyRecords = async () => {
      const { data, error } = await supabase
        .from('refueling_anomaly')
        .select('*');

      if (error) {
        console.log('Error fetching data : ' + error.message);
        return;
      }

      // Initialize counts object
      const counts = {
        all: 0,
        feedbacked: 0,
        new: 0,
      };

      // Process each row to update counts
      data.forEach((row: any) => {
        counts.all++; // Count each row

        // Handle reason filled
        if (row.Reason == null) {
          counts.new++;
        } else if (row.Reason.trim() !== '') {
          counts.feedbacked++;
        } else {
          counts.new++;
        }
      });

      setFeedbacked(counts.feedbacked);
      setNewCase(counts.new);
      setAllCase(counts.all);
      setRowData(data);
    };

    fetchAnomalyRecords();
  }, []);

  const onCellValueChanged = async (params: any) => {
    const { data, oldValue } = params;
    const { JobRowId, Reason, ProblemCategory, Remark } = data;
    const columnId = params.column.getId();

    // The previous status before the change
    const prevStatus = oldValue;

    // Check if pressureless value has changed
    if (columnId == 'Reason') {
      // console.log('updating pressureless installation status');
      const { error: reasonError } = await supabase
        .from('refueling_anomaly')
        .update({ Reason: Reason })
        .eq('JobRowId', JobRowId);

      if (reasonError) {
        console.log(`Error updating reason: ${reasonError.message}`);
        return;
      }
      if (
        (prevStatus.Reason === '' || prevStatus.Reason === null) &&
        (Reason !== '' || Reason !== null)
      ) {
        setFeedbacked((prev) => prev + 1);
        setNewCase((prev) => prev - 1);
      } else if (
        (prevStatus.Reason !== '' || prevStatus.Reason !== null) &&
        (Reason === '' || Reason === null)
      ) {
        setFeedbacked((prev) => prev - 1);
        setNewCase((prev) => prev + 1);
      } else {
      }

      // if (pressureless === 'Y') {
      //   setNotInstalled((prev) => prev - 1);
      //   setInstalled((prev) => prev + 1);
      // } else if (pressureless === 'N') {
      //   setInstalled((prev) => prev - 1);
      //   setNotInstalled((prev) => prev + 1);
      // } else {
      //   setInstalled((prev) => prev - 1);
      //   setNotInstalled((prev) => prev - 1);
      // }
    } else if (columnId == 'ProblemCategory') {
      // console.log('updating status');
      const { error: problemCategoryError } = await supabase
        .from('refueling_anomaly')
        .update({ ProblemCategory: ProblemCategory })
        .eq('JobRowId', JobRowId);
      if (problemCategoryError) {
        console.log(
          `Error updating Problem Categoory: ${problemCategoryError.message}`,
        );
        return;
      }
      // Update for OPEN, PROGRESS, and CLOSED statuses
      // if (status === 'OPEN') {
      //   setOpenCount((prev) => prev + 1);
      //   if (prevStatus === 'PROGRESS') {
      //     setProgressCount((prev) => prev - 1);
      //   } else if (prevStatus === 'CLOSED') {
      //     setClosedCount((prev) => prev - 1);
      //   }
      // } else if (status === 'PROGRESS') {
      //   setProgressCount((prev) => prev + 1);
      //   if (prevStatus === 'OPEN') {
      //     setOpenCount((prev) => prev - 1);
      //   } else if (prevStatus === 'CLOSED') {
      //     setClosedCount((prev) => prev - 1);
      //   }
      // } else if (status === 'CLOSED') {
      //   setClosedCount((prev) => prev + 1);
      //   if (prevStatus === 'OPEN') {
      //     setOpenCount((prev) => prev - 1);
      //   } else if (prevStatus === 'PROGRESS') {
      //     setProgressCount((prev) => prev - 1);
      //   }
      // }
    } 
    else if (columnId == 'Remark'){
      console.log('updating remark');
      const { error: remarkError } = await supabase
        .from('refueling_anomaly')
        .update({ Remark: Remark })
        .eq('JobRowId', JobRowId);
      if (remarkError) {
        console.log(`Error updating remark: ${remarkError.message}`);
        return;
      }
    }
    else {
      console.log('updating data');
      // const { error: remarkError } = await supabase
      //   .from('refueling_anomaly')
      //   .update({ Remark: Remark })
      //   .eq('JobRowId', JobRowId);
      // if (remarkError) {
      //   console.log(`Error updating remark: ${remarkError.message}`);
      //   return;
      // }
    }
  };

  //------------TABBED BUTTONS\
  const [allCase, setAllCase] = useState(0);
  const [feedbacked, setFeedbacked] = useState(0);
  const [newCase, setNewCase] = useState(0);

  interface TabbedButtonProps {
    filterByStatus: (status: string) => void;
  }
  let tabs = [
    { label: `All (${allCase})`, value: 'ALL' },
    { label: `Feedbacked(${feedbacked})`, value: 'FEEDBACKED' },
    { label: `New(${newCase})`, value: 'NEW' },
  ];

  const [activeTab, setActiveTab] = useState<string>('ALL');

  const onGridReady = useCallback(async () => {
    console.log('Grid is ready.');
  }, []);

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
      } else if (status === 'FEEDBACKED') {
        gridApi.setFilterModel({
          Reason: {
            type: 'notBlank',
          },
        });
      } else {
        gridApi.setFilterModel({
          Reason: {
            type: 'blank',
          },
        });
      }
      gridApi.onFilterChanged();
    }
  };

  const onToggleChartView = (e:any)=>{
    e.preventDefault();
    setSwapChart((prev)=> !prev);
  }

   // Filter the data
   const [filterCategory, setFilterCategory]= useState(false);
   const itemsToExclude = [
    'Normal Schedule',
    'Wrong Max Tank',
    'Cycle Reset',
    'Heavy Work',
    'Post Breakdown',
    'Run Out Fuel',
  ]; // Specify items to exclude

   const filterData = (data: any[], itemsToExclude: string[], key: string): any[] => {
    return data.filter(item => !itemsToExclude.includes(item[key]));
  };

  const filteredData =filterCategory? filterData(rowData, itemsToExclude, 'ProblemCategory') : rowData;
  const onToggleFilterView = (e:any)=>{
    e.preventDefault();
    setFilterCategory((prev)=> !prev);
  }

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-9 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Refueling Frequency Anomaly Analysis
              </h2>
              {swapChart? <AnomalyBarChart data={filteredData}/> : <AnomalyBarChartSwapped data={filteredData}/>}
              <div className="buttonheaders w-full content-between flex justify-between gap-1">
                {allowColumnsEdit ? <button
                  onClick={onToggleFileInput}
                  className="mb-2 bg-gray-200 text-gray-800 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {showDragandDrop ? 'Close Panel' : 'Add New Data'}
                </button> : null}
                

                <button
                  onClick={onToggleChartView}
                  className="mb-2 bg-gray-200 text-gray-800 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Switch View
                </button>

                <button
                  onClick={onToggleFilterView}
                  className="mb-2 bg-gray-200 text-gray-800 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  View Filtered
                </button>

                <button
                  onClick={onToggleColumn}
                  className="mb-2 bg-gray-200 text-gray-800 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {useColumn.length === simpleColumns.length
                    ? 'FullSize'
                    : 'Simple'}
                </button>
              </div>

              {showDragandDrop ? (
                <div
                  style={{ width: 'calc(100% - 120px)' }}
                  className={`flex bg-white items-center justify-center h-64 absolute z-1 ${
                    isDragOver
                      ? 'bg-blue-100 dark:bg-blue-800 border-blue-400 dark:border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  } border-2 border-dashed rounded-lg cursor-pointer`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <label
                    htmlFor="dropzone-file"
                    className="flex flex-col items-center justify-center w-full h-full"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span>{' '}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        CSV File only
                      </p>
                    </div>
                    <input
                      id="dropzone-file"
                      type="file"
                      className="hidden"
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              ) : null}

              {errorMessage && (
                <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                  <p>{errorMessage}</p>
                </div>
              )}

              {selectedFile && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <p>Selected File: {selectedFile.name}</p>
                </div>
              )}
              {rowData.length > 0 && (
                <>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>CSV file successfully processed.</p>
                  </div>
                  <button
                    onClick={handleExportCsv}
                    className="mb-6 mt-2 bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    Download Modified CSV
                  </button>
                </>
              )}

            

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

              <div 
                className="ag-theme-quartz h-100 w-full transition-all duration-700"
                style={{ 
                  backgroundColor: activeTheme.grid.backgroundColor !== 'default' ? activeTheme.grid.backgroundColor : undefined,
                  '--ag-background-color': activeTheme.grid.backgroundColor !== 'default' ? 'transparent' : undefined,
                  '--ag-header-background-color': activeTheme.grid.backgroundColor !== 'default' ? 'rgba(255,255,255,0.05)' : undefined,
                  '--ag-foreground-color': activeTheme.baseTheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  '--ag-header-foreground-color': activeTheme.baseTheme === 'dark' ? '#FFFFFF' : undefined,
                  '--ag-secondary-foreground-color': activeTheme.baseTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                } as React.CSSProperties}
              >
                <AgGridReact
                  onCellValueChanged={onCellValueChanged}
                  ref={gridRef}
                  columnDefs={useColumn}
                  rowData={rowData}
                  defaultColDef={defaultColDef}
                  autoSizeStrategy={autoSizeStrategy}

                  // domLayout="autoHeight" // Automatically adjust height based on the number of rows
                />
              </div>

              <div className="change-to-your-class h-100 w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RefuelingAnomaly;
