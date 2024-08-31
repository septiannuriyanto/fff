import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { format, parse, isValid } from 'date-fns';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css'; // Mandatory CSS required by the Data Grid
import 'ag-grid-community/styles/ag-theme-quartz.css'; // Optional Theme applied to the Data Grid

const fullColumns = [
  { headerName: 'Job Row Id', field: 'JobRowId' },
  { headerName: 'Distrik', field: 'Distrik' },
  { headerName: 'Issued Date', field: 'IssuedDate' },
  { headerName: 'Shift', field: 'Shift' },
  { headerName: 'Eq Class', field: 'EquipmentClass' },
  { headerName: 'EGI', field: 'EGI' },
  { headerName: 'Unit No', field: 'UnitNo' },
  { headerName: 'Status', field: 'Status' },
  { headerName: 'Whouse Id', field: 'WhouseId' },
  { headerName: 'Ref Hour Start', field: 'RefHourStart' },
  { headerName: 'Ref Hour Stop', field: 'RefHourStop' },
  { headerName: 'Driver Name', field: 'DriverName' },
  { headerName: 'Fuelman Name', field: 'FuelmanName' },
  { headerName: 'Log Sheet Code', field: 'LogSheetCode' },
  { headerName: 'Flow Meter End', field: 'FlowMeterEnd' },
  { headerName: 'Flow Meter Start', field: 'FlowMeterStart' },
  { headerName: 'HM/KM', field: 'HMKM' },
  { headerName: 'Max Tank Capacity', field: 'MaxTankCapacity' },
  { headerName: 'Qty [L]', field: 'QtyL' },
  { headerName: 'Qty Variance', field: 'QtyOverUnderL' },
  { headerName: 'Freq Refueling', field: 'FreqRefueling' },
  { headerName: 'Problem Category', field: 'ProblemCategory' },
  { headerName: 'Reason', field: 'Reason' },
  { headerName: 'Remark', field: 'Remark' },
];
const simpleColumns = [
  { headerName: 'Issued Date', field: 'IssuedDate' },
  { headerName: 'Shift', field: 'Shift' },
  { headerName: 'Unit No', field: 'UnitNo' },
  { headerName: 'Whouse Id', field: 'WhouseId' },
  { headerName: 'Ref Hour Start', field: 'RefHourStart' },
  { headerName: 'Ref Hour Stop', field: 'RefHourStop' },
  { headerName: 'Driver Name', field: 'DriverName' },
  { headerName: 'Fuelman Name', field: 'FuelmanName' },
  { headerName: 'Flow Meter End', field: 'FlowMeterEnd' },
  { headerName: 'Flow Meter Start', field: 'FlowMeterStart' },
  { headerName: 'HM/KM', field: 'HMKM' },
  { headerName: 'Max Tank Capacity', field: 'MaxTankCapacity' },
  { headerName: 'Qty [L]', field: 'QtyL' },
  { headerName: 'Qty Variance', field: 'QtyOverUnderL' },
  { headerName: 'Freq Refueling', field: 'FreqRefueling' },
  { headerName: 'Problem Category', field: 'ProblemCategory' },
  { headerName: 'Reason', field: 'Reason' },
  { headerName: 'Remark', field: 'Remark' },
];

const RefuelingAnomaly = () => {
  const [showDragandDrop, setShowDragandDrop] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [rowData, setRowData] = useState<any[]>([]);
  const [useColumn, setUseColumn] = useState<any[]>(fullColumns);

  const gridRef = useRef();
    const autoSizeStrategy = {
      type: 'fitCellContents',
    };

  const defaultColDef = {
    editable: true,
    filter: true, // Enable filtering on all columns
    sortable: true, // Enable sorting
  };

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

  const replaceInCsvData = (
    data: any[],
    searchValue: string,
    replaceValue: string,
    columnToReplace: number,
  ) => {
    // Assuming column X is the 1st column (index 0) and column Y is the 23rd column (index 22)
    const columnXIndex = 0;
    const columnYIndex = 23;

    // Remove the first row, slice the data to keep only columns from X to Y, and replace substrings in the specified column
    const modifiedData = data
      .slice(1) // Remove the first row
      .map((row: any[]) => {
        // Slice the data to keep only columns from X to Y
        const slicedRow = row.slice(columnXIndex, columnYIndex + 1);

        // Replace substring in the specified column
        if (slicedRow[columnToReplace] !== undefined) {
          slicedRow[columnToReplace] = slicedRow[columnToReplace].replace(
            searchValue,
            replaceValue,
          );
        }

        return slicedRow;
      });

    return modifiedData;
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
      processHeaderCallback: (params:any) => {
        return params.column.getColDef().field; // Use the 'field' as the header instead of 'headerName'
      },
    };

    gridRef!.current!.api.exportDataAsCsv(params);
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
            const columnsToDelete = [12, 13]; // Columns M and N (zero-based indices)
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
                    filteredRow[dateIssuedIndex] = 'Invalid Date';
                  }
                }

                return filteredRow;
              });

            // Convert back to CSV (for debugging)
            const csvString = Papa.unparse(modifiedData);
            // console.log('Modified CSV Data:', csvString);

            // Set the row data for AG Grid
            const rowDatas = modifiedData.map((row: String[]) => {
              // console.log(row);

              return {
                Distrik: row[0],
                IssuedDate: row[1],
                Shift: row[2],
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
                HMKM: row[16],
                MaxTankCapacity: row[17],
                QtyL: row[18],
                QtyOverUnderL: row[19],
                FreqRefueling: row[20],
              };
            });

            console.log('Row Data for AG Grid:', rowDatas); // Log the row data for AG Grid
            setRowData(rowDatas); // Set the processed data as the row data for AG Grid

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

  const handleDownload = () => {
    if (csvData) {
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sliced_data.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const onToggleColumn = (e: any) => {
    e.preventDefault();
    if (useColumn == fullColumns) {
      setUseColumn(simpleColumns);
    } else {
      setUseColumn(fullColumns);
    }
  };

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-9 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Refueling Frequency Anomaly Analysis
              </h2>
              <div className="buttonheaders w-full content-between flex justify-between">
                <button
                  onClick={onToggleFileInput}
                  className="mb-2 bg-gray-200 text-gray-800 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {showDragandDrop ? 'Close Panel' : 'Add New Data'}
                </button>

                <button
                  onClick={onToggleColumn}
                  className="mb-2 bg-gray-200 text-gray-800 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {useColumn == simpleColumns ? 'Simple' : 'Fullsize'}
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

              <div className="ag-theme-quartz-auto-dark h-100 w-full">
                <AgGridReact
                  ref={gridRef}
                  columnDefs={useColumn}
                  rowData={rowData}
                  defaultColDef={defaultColDef}
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
