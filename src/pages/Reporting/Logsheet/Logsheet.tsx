import { useEffect, useState } from 'react';
import SuggestionText from '../../Dashboard/Manpower/Leave/SuggestionText';
import toast, { Toaster } from 'react-hot-toast';
import Swal from 'sweetalert2';
import { formatNumberWithSeparator } from '../../../Utils/NumberUtility';
import { formatTimeStamp } from '../../../Utils/TimeUtility';
import { formatDateToString, formatDateToYyMmDd } from '../../../Utils/DateUtility';
import { supabase } from '../../../db/SupabaseClient';


interface LogsheetData{
  logsheet_code:string;
  tanggal: string;
  shift:number;
  fuelman:string;
  operator:string;
  fueltruck:string;
  fm_awal:number;
  fm_akhir:number;
}

interface LogsheetRecord {
  logsheet_code:string,
  queue_number: number;
  code_number: string;
  time_stamp: string;
}

const Logsheet = () => {
  const [logsheetRecords, setLogsheetRecords] = useState<LogsheetRecord[]>([]);
  const handleSetFuelman = (name: string) => {
    console.log(name);
  };
  const handleSetOperator = (name: string) => {
    console.log(name);
  };

  const handleSetFuelTruck = (name: string) => {
    console.log(name);
  };

  const [units, setUnits] = useState<string[]>([]);

  const [lastSelected, setLastSelectedUnit] = useState<string | null>(null);

  const handleClearForm = () => {
    // SweetAlert confirmation
    Swal.fire({
      title: 'Hapus Data Form',
      text: 'Form ini akan direset ulang! Yakin untuk melanjutkan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya',
      cancelButtonText: 'Tidak',
    }).then((result) => {
      if (result.isConfirmed) {
        clearForm();
      }
    });
  };

  function clearForm() {
    // Clear input fields and selections
    setLastSelectedUnit(null);
  
    // Clear logsheetRecords if needed
    setLogsheetRecords([]);

    // Clear localStorage entries
    localStorage.removeItem('fuelmanLogsheet');
    localStorage.removeItem('operatorLogsheet');
    localStorage.removeItem('ftLogsheet');
    localStorage.removeItem('fmAwal');
    localStorage.removeItem('logsheetRecords');
    localStorage.removeItem('fmAkhir');
    window.location.reload();
}

  const handleSelectUnit = (name: string) => {
    // Check if the record already exists
    const recordExists = logsheetRecords.some(
      (record) => record.code_number === name,
    );

    if (recordExists) {
      // Show an error message if the record already exists
      toast.error(`Record untuk unit "${name}" sudah ada.`);
      return;
    }
    localStorage.setItem('lastSelected', name);
    setLastSelectedUnit(name);

    // Generate the timestamp automatically
    const time_stamp = new Date().toISOString();
    const date = formatDateToString(new Date());

    // Add the new LogsheetRecord
    const newQueueNumber = logsheetRecords.length + 1;
    const ft = localStorage.getItem('ftLogsheet');

    const newRecord: LogsheetRecord = {
      logsheet_code: generateLogsheetCode(ft||'na'),
      queue_number: newQueueNumber,
      code_number: name,
      time_stamp: time_stamp, // Automatically generated timestamp
    };

    const updatedRecords = [...logsheetRecords, newRecord];
    setLogsheetRecords(updatedRecords);
    localStorage.setItem('logsheetRecords', JSON.stringify(updatedRecords)); // Save the new records array
  };

  const handleDeleteUnit = async (unitToDelete: string) => {
    const result = await Swal.fire({
      title: 'Hapus Record',
      text: `Record ${unitToDelete} akan dihapus! Yakin untuk melanjutkan?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya',
      cancelButtonText: 'Tidak',
    });

    if (result.isConfirmed) {
      const updatedRecords = logsheetRecords.filter(
        (unit) => unit.code_number !== unitToDelete,
      );
      setLogsheetRecords(updatedRecords);
      localStorage.setItem('logsheetRecords', JSON.stringify(updatedRecords));
      toast.success(`${unitToDelete} has been deleted!`);
    }
  };

  const handleClearData = async () => {
    const result = await Swal.fire({
      title: 'Hapus Daftar Refueling',
      text: 'Data pada daftar refueling akan dihapus! Yakin untuk melanjutkan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya',
      cancelButtonText: 'Tidak',
    });

    if (result.isConfirmed) {
      setLogsheetRecords([])
      localStorage.removeItem('logsheetRecords');
      toast.success('All data has been cleared!');
    }
  };

  const [fmAwal, setFmAwal] = useState<number>(0);
  const [fmAkhir, setFmAkhir] = useState<number>(0);
  const handleChangeFmAwal = (e: any) => {
    setFmAwal(parseInt(e.target.value));
    localStorage.setItem('fmAwal', e.target.value);
  };
  const handleChangeFmAkhir = (e: any) => {
    setFmAkhir(parseInt(e.target.value));
    localStorage.setItem('fmAkhir', e.target.value);
  };

  useEffect(() => {
    // Load the last selected unit from local storage
    const lastSelectedUnit = localStorage.getItem('lastSelected');
    if (lastSelectedUnit) {
      setLastSelectedUnit(lastSelectedUnit);
    }

    // // Load the saved array of units from local storage
    // const savedUnits = localStorage.getItem('units');
    // if (savedUnits) {
    //   setUnits(JSON.parse(savedUnits)); // Parse and set the saved units
    // }

    // Load the saved array of logsheet records from local storage
    const savedLogsheetRecords = localStorage.getItem('logsheetRecords');
    if (savedLogsheetRecords) {
      setLogsheetRecords(JSON.parse(savedLogsheetRecords)); // Parse and set the saved logsheet records
    }

    // Load the last saved fmAwal from local storage
    const savedFmAwal = localStorage.getItem('fmAwal');
    if (savedFmAwal) {
      setFmAwal(parseInt(savedFmAwal));
    }

    // Load the last selected fmAkhir from local storage
    const savedFmAkhir = localStorage.getItem('fmAkhir');
    if (savedFmAkhir) {
      setFmAwal(parseInt(savedFmAkhir));
    }
  }, []);

  const handleSubmit = async () => {
    const fueltruck = localStorage.getItem('ftLogsheet')
    const fuelman = localStorage.getItem('fuelmanLogsheet')
    const operator = localStorage.getItem('operatorLogsheet')
    console.log(logsheetRecords);
    if(!fueltruck){
      toast.error('Pilih Fuel Truck Terlebih Dahulu!');
      return;
    }
    if(!fuelman){
      toast.error('Pilih Fuelman Terlebih Dahulu!');
      return;
    }
    if(!operator){
      toast.error('Pilih Operator Terlebih Dahulu!');
      return;
    }

    if(fmAwal==0){
      toast.error('Isi Flowmeter Awal Terlebih Dahulu!');
      return;
    }
    if(fmAkhir==0){
      toast.error('Isi Flowmeter Akhir Terlebih Dahulu!');
      return;
    }
    if((fmAkhir - fmAwal)<0){
      toast.error('Cek Kembali Flowmeter Anda!');
      return;
    }

    
    const logsheetCode = generateLogsheetCode(fueltruck || '');
    const now = new Date();

    const logsheetData: LogsheetData = {
      logsheet_code: logsheetCode,
      tanggal: formatDateToYyMmDd(now),
      shift: getShift(now),
      fuelman: fuelman,
      operator: operator,
      fueltruck: fueltruck || '',
      fm_awal : fmAwal,
      fm_akhir: fmAkhir,
    };

    console.log(logsheetData);

    try {
      const { data, error } = await supabase.rpc('submit_logsheet_and_records', {
        logsheet: logsheetData,
        records: logsheetRecords,
      });
  
      if (error) {
        if (error.code === '23505') {
          toast.error('Logsheet ini sudah terinput');
          return;
        }
        toast.error(`Error during RPC call: : ${error.message}`);
        console.error('Error during RPC call:', error.message);
      } else {
        toast.success('Transaction successful')
        console.log('Transaction successful:', data);
      
      }
    } catch (err) {
      console.error('Error submitting logsheet and records:', err);
      toast.error(`Error : ${err}`)
    }
    

  };

  const generateLogsheetCode = (ft:string)=>{
    const worksshift = getShift(new Date());
    const logsheetPrefix = `${formatDateToYyMmDd(new Date())}${worksshift}`
    return `${logsheetPrefix}${ft}`
  }

  const getShift = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Calculate total minutes from midnight
    const totalMinutes = hours * 60 + minutes;

    // Define the shift boundaries in minutes
    const startShift = 6 * 60; // 06:00 AM
    const endShift = 17 * 60;   // 05:00 PM

    // Return 1 for the first shift, 2 for the second shift
    return (totalMinutes >= startShift && totalMinutes < endShift) ? 1 : 2;
};

  return (
    <>
      <Toaster />
      <div className="max-w-lg mx-auto p-0 font-sans  ">
        <div className="flex flex-wrap items-center">
          <div className="w-full">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Logsheet
              </h2>

              <div className=" w-full  bg-white dark:bg-boxdark rounded-2xl p-4 mb-4">
                <h2 className="mb-2 font-bold text-black dark:text-white sm:text-body-sm w-full">
                  Data Petugas FAO
                </h2>

                <SuggestionText
                  isMandatory={true}
                  storageId="ftLogsheet"
                  tableName="storage"
                  columnName="unit_id"
                  label="Nomor FT"
                  onNameSelected={handleSetFuelTruck}
                ></SuggestionText>
                <SuggestionText
                  isMandatory={true}
                  storageId="fuelmanLogsheet"
                  tableName="manpower"
                  columnName="nama"
                  label="Nama Fuelman"
                  onNameSelected={handleSetFuelman}
                ></SuggestionText>
                <SuggestionText
                  isMandatory={true}
                  storageId="operatorLogsheet"
                  tableName="manpower"
                  columnName="nama"
                  label="Nama Operator"
                  onNameSelected={handleSetOperator}
                ></SuggestionText>
              </div>

              <div className=" w-full  bg-white dark:bg-boxdark rounded-2xl p-4">
                <h2 className="mb-2 font-bold text-black dark:text-white sm:text-body-sm w-full">
                  Data Refueling
                </h2>
                <div className="mt-4 mb-8">
                  <label className=" text-gray-700 flex items-center">
                    Flowmeter Awal
                    <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                  </label>
                  <input
                    value={fmAwal}
                    type="number"
                    onChange={handleChangeFmAwal}
                    className="w-full p-2 rounded border-[1.5px] border-stroke"
                  />
                </div>

                <SuggestionText
                  isMandatory={true}
                  isAutoClear={true}
                  tableName="population"
                  columnName="code_number"
                  label="Code Number"
                  onNameSelected={handleSelectUnit}
                ></SuggestionText>

                {logsheetRecords.length > 0 ? (
                  <div>
                    <h3 className="mb-10 text-slate-300">
                      Terakhir Dipilih : {lastSelected}
                    </h3>
                    <h4 className="mb-4 font-bold">Units List:</h4>
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="py-2 px-4 text-left">#</th>
                          <th className="py-2 px-4 text-left">Unit</th>
                          <th className="py-2 px-4 text-left">Added at</th>
                          <th className="py-2 px-4 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logsheetRecords.map((unit, index) => (
                          <tr
                            key={index}
                            className={
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                            }
                          >
                            <td className="py-2 px-4">{unit.queue_number}</td>
                            <td className="py-2 px-4">{unit.code_number}</td>
                            <td className="py-2 px-4">
                              {formatTimeStamp(unit.time_stamp)}
                            </td>
                            <td className="py-2 px-4">
                              <button
                                className="text-red-600 hover:text-red-800 font-semibold"
                                onClick={() =>
                                  handleDeleteUnit(unit.code_number)
                                }
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-4 mb-8">
                      <label className=" text-gray-700 flex items-center">
                        Flowmeter Akhir
                        <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                      </label>

                      <input
                        value={fmAkhir}
                        type="number"
                        onChange={handleChangeFmAkhir}
                        className="w-full p-2 rounded border-[1.5px] border-stroke"
                      />
                    </div>

                    <div className="grid grid-cols-2">
                      <h1 className="col-span-1">Total Usage : </h1>
                      <h1 className="col-span-1 font-bold text-lg">
                        {fmAkhir
                          ? formatNumberWithSeparator(fmAkhir - fmAwal)
                          : ''}{' '}
                      </h1>
                    </div>

                    <div className=" flex flex-col mt-4 w-full gap-4">
                      <button
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={handleSubmit}
                      >
                        Submit
                      </button>
                      <button
                        className="border border-red-600 text-red-600 px-4 py-2 rounded"
                        onClick={handleClearData}
                      >
                        Clear List
                      </button>
                      <button
                        className="bg-red-500 text-white px-4 py-2 rounded"
                        onClick={handleClearForm}
                      >
                        Clear Form
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-slate-300">No units available.</h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Logsheet;


