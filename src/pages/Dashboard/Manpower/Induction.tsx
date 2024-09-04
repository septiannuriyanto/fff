import React, { useState, useEffect } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import { sendMessageToChannel } from '../../../services/TelegramSender';
import { formatDate, formatDateForSupabase } from '../../../Utils/DateUtility';
import DatePickerOne from '../../../components/Forms/DatePicker/DatePickerOne';
import moment from 'moment';

interface ManpowerData {
  nrp?: string;
  nama?: string;
}

const Induction: React.FC = () => {
  const [reportBy, setReportBy] = useState<string>('');
  const [reportBySuggestions, setReportBySuggestions] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    if (startDate) {
      const newEndDate = new Date(startDate);
      newEndDate.setDate(newEndDate.getDate() + 70); // Adjust as needed
      setEndDate(newEndDate);
      console.log(startDate);
      console.log(newEndDate);
    } else {
      setEndDate(null);
    }
  }, [startDate]);

  const handleDateChange = (date: Date | null) => {
    setStartDate(date);
    setDateErrorMessage(null);
  };



  useEffect(() => {
    const fetchNames = async () => {
      const { data, error } = await supabase
        .from<ManpowerData>('manpower')
        .select('nama');

      if (error) {
        console.error(error);
      } else {
        setNames(data?.map((item) => item.nama) || []);
      }
    };
    fetchNames();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if `reportBy` exists in the `manpower` table
    const { data: manpowerData, error: fetchError } = await supabase
      .from('manpower')
      .select('nrp')
      .eq('nama', reportBy);

    if (fetchError) {
      console.error('Error fetching manpower data:', fetchError);
      setErrorMessage('Error checking the manpower data.');
      return;
    }

    if (manpowerData.length === 0) {
      // If `reportBy` is not found
      setErrorMessage('Nama tidak ditemukan.');
      return;
    }

    //date checker
    if (startDate == null) {
      setDateErrorMessage('Tanggal belum dipilih');
      return;
    }
    const employee = manpowerData[0]; // Assumes nrp is unique

    const startDateFormatted = formatDateForSupabase(startDate); // "YYYY-MM-DD"
    const endDateFormatted = formatDateForSupabase(endDate!); // "YYYY-MM-DD"
    //update the table
    let query = {
      id: startDateFormatted + employee.nrp,
      nrp: employee.nrp,
      date_period_start: startDate ? startDateFormatted : '',
      date_period_end: endDate ? endDateFormatted : '',
    };

    const { error } = await supabase.from('roster').insert([query]);

    if (error) {
      if (error.code === '23505') {
        setErrorMessage("Anda Sudah mengisi induksi hari ini");
      }
      else{
        setErrorMessage(error.message);
      }
      
    } else {
      alert('Data successfully submitted');
      setReportBy('');
      setErrorMessage(null);
      setDateErrorMessage(null);
      setStartDate(null);
      setEndDate(null);
      const message = `INDUCTION REPORT\n\nDate Submit : ${formatDate(
        Date.now(),
      )}\nEmployee Name : ${reportBy}\nDate Start : ${
        startDate
          ? startDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : ''
      }\nDate End : ${
        endDate
          ? endDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : ''
      }\nVisit : https://fff-project.vercel.app/roster`;
      sendMessageToChannel(message);
    }
  };

  const getSuggestions = (value: string, list: string[]): string[] => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0
      ? []
      : list.filter(
          (item) => item.toLowerCase().slice(0, inputLength) === inputValue,
        );
  };

  const getSuggestionValue = (suggestion: string): string => suggestion;

  const renderSuggestion = (suggestion: string) => <div>{suggestion}</div>;

  const onReportBySuggestionsFetchRequested = ({
    value,
  }: {
    value: string;
  }) => {
    setReportBySuggestions(getSuggestions(value, names));
  };

  const onReportBySuggestionsClearRequested = () => {
    setReportBySuggestions([]);
  };

  const onReportByChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    setReportBy(newValue);
  };

  return (
    <div className="max-w-lg mx-auto p-5 font-sans bg-white dark:bg-boxdark">
      <h1 className="text-center text-2xl font-bold mb-5">
        Input Data Induksi
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="mb-2">
          <label className="block text-gray-700">Nama</label>
          <Autosuggest
            suggestions={reportBySuggestions}
            onSuggestionsFetchRequested={onReportBySuggestionsFetchRequested}
            onSuggestionsClearRequested={onReportBySuggestionsClearRequested}
            getSuggestionValue={getSuggestionValue}
            renderSuggestion={renderSuggestion}
            inputProps={{
              placeholder: 'Ketik dan pilih nama anda',
              value: reportBy,
              onChange: onReportByChange,
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
          {/* Your form fields and date pickers go here */}
          {errorMessage && <div className="text-red-500">{errorMessage}</div>}
        </div>

       
          <div className="my-4 text-gray-500">Input Tanggal Induksi</div>
          <DatePickerOne
            enabled={true}
            handleChange={handleDateChange}
            setValue={startDate ? moment(startDate).format('DD/MMM/YYYY') : ''}
          />

          <div className="my-2 text-gray-500">s/d</div>
          <DatePickerOne
            enabled={false}
            handleChange={() => {}}
            setValue={endDate ? moment(endDate).format('DD/MMM/YYYY') : ''}
          />
          {/* Your form fields and date pickers go here */}
          {dateErrorMessage && (
            <div className="text-red-500">{dateErrorMessage}</div>
          )}
    
        <div className="mb-4"></div>

        <button
          type="submit"
          className="bg-primary text-white py-2 rounded hover:bg-blue-700 mt-4"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default Induction;
