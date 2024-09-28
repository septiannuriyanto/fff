import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import {
  formatDate,
  formatDateForSupabase,
  formatDateToYyMmDd,
} from '../../../../Utils/DateUtility';
import { sendMessageToChannel } from '../../../../services/TelegramSender';
import DropZone from '../../../Reporting/DailyReport/components/DropZone';
import toast, { Toaster } from 'react-hot-toast';

interface ManpowerData {
  nrp?: string;
  nama?: string;
}

const FuelTruckMaintenanceRequest = () => {
  const [name, setName] = useState<string>('');
  const [names, setNames] = useState<string[]>([]);
  const [namesSuggestions, setNamesSuggestions] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [codeNumbers, setCodeNumbers] = useState<string[]>([]);
  const [equipNumber, setEquipNumber] = useState<string>('');

  const [startDate, setStartDate] = useState<Date | null>(new Date());

  const [areaTrouble, setAreaTrouble] = useState<string>('');
  const [problem, setProblem] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [requestEvidenceFile, setRequestEvidenceFile] = useState<File | null>(
    null,
  );

  const [uploadProgressEvidence, setUploadProgressEvidence] = useState<
    number | null
  >(null);

  const handleChangeAreaTrouble = (e: any) => {
    setAreaTrouble(e.target.value);
  };
  const handleChangeProblem = (e: any) => {
    setProblem(e.target.value);
  };
  const handleChangeDescription = (e: any) => {
    setDescription(e.target.value);
  };

  const fetchNames = async () => {
    const { data, error } = await supabase.from('manpower').select('nama');

    if (error) {
      console.error(error);
    } else {
      setNames(data?.map((item) => item.nama) || []);
    }
  };

  const fetchCodeNumbers = async () => {
    const { data, error } = await supabase
      .from('storage')
      .select('unit_id, warehouse_id')
      .order('warehouse_id');
    if (error) {
      console.error(error);
    } else {
      const units = data?.map((item) => item.unit_id) || [];
      const whs = data?.map((item) => item.warehouse_id) || [];

      setCodeNumbers(units);
    }
  };

  //SUGGESTION FETCH REQUEST
  const onSuggestionsFetchRequested = ({ value }: { value: string }) => {
    setSuggestions(getSuggestions(value, codeNumbers));
  };

  //SUGGESTION CLEAR REQUEST
  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const onEquipNumberChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    setEquipNumber(newValue);
  };

  useEffect(() => {
    fetchNames();
  }, []);

  useEffect(() => {
    fetchCodeNumbers();
  }, []);

  const getSuggestions = (value: string, list: string[]): string[] => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0
      ? []
      : list.filter(
          (item) => item.toLowerCase().slice(0, inputLength) === inputValue,
        );
  };

  const onNameSuggestionsFetchRequested = ({ value }: { value: string }) => {
    setNamesSuggestions(getSuggestions(value, names));
  };

  const onNameSuggestionsClearRequested = () => {
    setNamesSuggestions([]);
  };

  const getSuggestionValue = (suggestion: string): string => suggestion;
  const renderSuggestion = (suggestion: string) => <div>{suggestion}</div>;

  const onNameChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    console.log(newValue);
    
    setName(newValue);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if `reportBy` exists in the `manpower` table
    const { data: manpowerData, error: fetchError } = await supabase
      .from('manpower')
      .select('nrp')
      .eq('nama', name);

    if (fetchError) {
      console.error('Error fetching manpower data:', fetchError);
      toast.error('Error checking the manpower data.');
      return;
    }

    if (manpowerData.length === 0) {
      // If `reportBy` is not found
      toast.error('Nama tidak ditemukan.');
      return;
    }

    //date checker
    if (startDate == null) {
      toast.error('Tanggal belum dipilih');
      return;
    }
    const employee = manpowerData[0]; // Assumes nrp is unique

    const startDateFormatted = formatDateForSupabase(startDate); // "YYYY-MM-DD"

    const reqId = `${startDateFormatted}${equipNumber}`;

    //update the table
    let query = {
      req_id : reqId,
      created_at: startDate ? startDateFormatted : '',
      unit_id : equipNumber,
      report_by: employee.nrp,
      problem : problem,
      description : description,
      area : areaTrouble,
      image_url : ''
    };

    const { error } = await supabase.from('ft_maintenance').insert([query]);

    if (error) {
      if (error.code === '23505') {
        toast.error('Anda Sudah membuat pengajuan hari ini');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Data successfully submitted');
      setName('');
      setEquipNumber('');
      setAreaTrouble('');
      setProblem('')
      setDescription('');
      setRequestEvidenceFile(null);

      const message = `PENGAJUAN MAINTENANCE\n\nDate Submit : ${formatDate(
        Date.now(),
      )}\nReported by : ${name}
      \nEquipment Number : ${equipNumber}
      \nDate Start : ${
        startDate
          ? startDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : ''
      }\nArea Trouble : ${areaTrouble}
      \nProblem : ${problem}
      \nDescription : ${description}
      \nVisit : https://fff-project.vercel.app/reporting/ftmaintenance/${reqId}`;
      sendMessageToChannel(message);
    }
  };

  const handleImageUpload = async (file: File) => {
    setRequestEvidenceFile(file);
  };

  return (
    <div className="max-w-lg mx-auto p-5 font-sans bg-white dark:bg-boxdark">
      <Toaster></Toaster>
      <h1 className="text-center text-2xl font-bold mb-5">
        Form Request Maintenance FT
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className=" flex  flex-row mb-2 justify-between gap-2">
          <div className="w-full">
            <label className="block text-gray-700">Dilaporkan oleh</label>
            <Autosuggest
              suggestions={namesSuggestions}
              onSuggestionsFetchRequested={onNameSuggestionsFetchRequested}
              onSuggestionsClearRequested={onNameSuggestionsClearRequested}
              getSuggestionValue={getSuggestionValue}
              renderSuggestion={renderSuggestion}
              inputProps={{
                placeholder: 'Ketik dan pilih nama anda',
                value: name,
                onChange: onNameChange,
                className: 'w-full p-2 rounded border-[1.5px] border-stroke',
                required: true,
              }}
              theme={{
                container: 'relative',
                suggestionsContainerOpen:
                  'absolute z-10 mt-1 w-full bg-white border rounded shadow-lg',
                suggestion: 'p-2 hover:bg-gray-200',
                suggestionHighlighted: 'bg-gray-300',
                input: 'w-full p-2 border rounded',
              }}
            />
          </div>
          <div className="w-full">
            <div className=" w-full">
              <label className="block text-gray-700">Nomor FT :</label>
              <Autosuggest
                suggestions={suggestions}
                onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                onSuggestionsClearRequested={onSuggestionsClearRequested}
                getSuggestionValue={getSuggestionValue}
                renderSuggestion={renderSuggestion}
                inputProps={{
                  placeholder: 'Ketik Kode Unit',
                  value: equipNumber,
                  onChange: onEquipNumberChange,
                  className: 'w-full p-2 rounded border-[1.5px] border-stroke',
                  required: true,
                }}
                theme={{
                  container: 'relative',
                  suggestionsContainerOpen:
                    'absolute z-10 mt-1 w-full bg-white border rounded shadow-lg',
                  suggestion: 'p-2 hover:bg-gray-200',
                  suggestionHighlighted: 'bg-gray-300',
                  input: 'w-full p-2 border rounded',
                }}
              />
            </div>
          </div>
        </div>

        <div className="my-2">
          <label className="block text-gray-700">Area Trouble</label>
          <input
          value={areaTrouble}
            type="text"
            onChange={handleChangeAreaTrouble}
            className="w-full p-2 rounded border-[1.5px] border-stroke"
          />
        </div>

        <div className="my-2">
          <label className="block text-gray-700">Problem</label>
          <input
            value={problem}
            type="text"
            onChange={handleChangeProblem}
            className="w-full p-2 rounded border-[1.5px] border-stroke"
          />
        </div>

        <div className="my-2">
          <label className="block text-gray-700">Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={handleChangeDescription}
            className="w-full p-2 rounded border-[1.5px] border-stroke"
          />
        </div>

        <div className="img__attachment mb-8">
          {requestEvidenceFile ? (
            <img
              src={URL.createObjectURL(requestEvidenceFile)}
              alt="Evidence Image"
              className="upload-image h-48 w-full object-contain bg-slate-600"
            />
          ) : (
            <DropZone
              id="req-evidence"
              title="Tambahkan Foto"
              onFileUpload={handleImageUpload}
              uploadProgress={uploadProgressEvidence}
              file={requestEvidenceFile}
            />
          )}
        </div>

        <button type="submit"
          className="bg-primary text-white py-2 rounded hover:bg-blue-700">
          Submit
        </button>
      </form>
    </div>
  );
};

export default FuelTruckMaintenanceRequest;
