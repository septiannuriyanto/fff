import { useEffect, useState } from 'react';
import SuggestionText from '../../Dashboard/Manpower/Leave/SuggestionText';
import toast, { Toaster } from 'react-hot-toast';
import Swal from 'sweetalert2';
import { formatNumberWithSeparator } from '../../../Utils/NumberUtility';
import { formatTimeStamp } from '../../../Utils/TimeUtility';
import { formatDateToString, formatDateToYyMmDd } from '../../../Utils/DateUtility';
import { supabase } from '../../../db/SupabaseClient';
import { DatePicker } from 'rsuite';


interface BreakdownData{
  logsheet_code:string;
  tanggal: string;
  shift:number;
  pelapor:string;
  fueltruck:string;
}







const BreakdownRfuReport = () => {
  
  const [breakdownRecords, setBreakdownRecords] = useState<BreakdownData[]>([]);

  const [pelapor, setPelapor] = useState('');
  const handleSetPelapor = (name: string) => {
    console.log(name);
    setPelapor(name);
  };

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

const [datePicked, setDatePicked] = useState(null);
const handleChangeDate = (value:any) => {
  setDatePicked(value);
  console.log('Date Time Change', value);
};

const [ftPicked, setftPicked] = useState('');
const handleChangeFT = (value:any) => {


  if(!datePicked){
    toast.error('Tanggal dan waktu belum dipilih')
    return;
  }
  if(!pelapor){
    toast.error('Pelapor belum diisi')
    return;
  }

  setftPicked(value);
  console.log('FT Change', value);

};


  function clearForm() {
    // Clear input fields and selections
    setftPicked('');
    setPelapor('');
  
    // Clear logsheetRecords if needed
    setBreakdownRecords([]);

    // Clear localStorage entries
    localStorage.removeItem('fuelmanLogsheet');
    localStorage.removeItem('operatorLogsheet');
    localStorage.removeItem('ftLogsheet');
    localStorage.removeItem('fmAwal');
    localStorage.removeItem('logsheetRecords');
    localStorage.removeItem('fmAkhir');
    window.location.reload();
}

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
      const updatedRecords = breakdownRecords.filter(
        (unit) => unit.fueltruck !== unitToDelete,
      );
      setBreakdownRecords(updatedRecords);
      // localStorage.setItem('logsheetRecords', JSON.stringify(updatedRecords));
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
      setBreakdownRecords([])
      localStorage.removeItem('logsheetRecords');
      toast.success('All data has been cleared!');
    }
  };

  useEffect(() => {
    
    // // Load the saved array of units from local storage
    // const savedUnits = localStorage.getItem('units');
    // if (savedUnits) {
    //   setUnits(JSON.parse(savedUnits)); // Parse and set the saved units
    // }

    // Load the saved array of logsheet records from local storage
    const savedLogsheetRecords = localStorage.getItem('logsheetRecords');
    if (savedLogsheetRecords) {
      setBreakdownRecords(JSON.parse(savedLogsheetRecords)); // Parse and set the saved logsheet records
    }

  }, []);

  const handleSubmit = async () => {
    console.log(breakdownRecords);
    
    const logsheetCode = generateLogsheetCode(fueltruck || '');
    const now = new Date();

    const logsheetData: BreakdownData = {
      logsheet_code: logsheetCode,
      tanggal: formatDateToYyMmDd(now),
      shift: getShift(now),
      fuelman: fuelman,
      operator: operator,
      fueltruck: fueltruck || ''
    };

    console.log(logsheetData);

    try {
      const { data, error } = await supabase.rpc('submit_logsheet_and_records', {
        logsheet: logsheetData,
        records: breakdownRecords,
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
    const worksshift = getShift(datePicked || new Date());
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
                Laporan Fueltruck Breakdown / RFU
              </h2>

              <div className=" w-full  bg-white dark:bg-boxdark rounded-2xl p-4">
                <h2 className="mb-2 font-bold text-black dark:text-white sm:text-body-sm w-full">
                  Data Breakdown
                </h2>
                <div className='datetime__picker flex w-full mb-4'>
                <DatePicker className="w-full" format="MM/dd/yyyy HH:mm" onChange={handleChangeDate}   />
                </div>
                <SuggestionText
                  isMandatory={true}
                  storageId="pelapor"
                  tableName="manpower"
                  columnName="nama"
                  label="Nama Pelapor"
                  onNameSelected={handleSetPelapor}
                ></SuggestionText>

                <SuggestionText
                  isMandatory={true}
                  tableName="storage"
                  columnName="unit_id"
                  label="FT Number"
                  onNameSelected={handleChangeFT}
                ></SuggestionText>

                {breakdownRecords.length > 0 ? (
                  <div>
                    <h4 className="mb-4 font-bold">FT List:</h4>
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
                        {breakdownRecords.map((unit, index) => (
                          <tr
                            key={index}
                            className={
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                            }
                          >
                            <td className="py-2 px-4">{index + 1}</td>
                            <td className="py-2 px-4">{unit.fueltruck}</td>
                            <td className="py-2 px-4">
                              {formatTimeStamp(datePicked)}
                            </td>
                            <td className="py-2 px-4">
                              <button
                                className="text-red-600 hover:text-red-800 font-semibold"
                                onClick={() =>
                                  handleDeleteUnit(unit.fueltruck)
                                }
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

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

export default BreakdownRfuReport;


