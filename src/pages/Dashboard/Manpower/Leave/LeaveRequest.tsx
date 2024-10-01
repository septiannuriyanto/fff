import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import DatePickerOne from '../../../../components/Forms/DatePicker/DatePickerOne';
import moment from 'moment';
import { formatDate, formatDateForSupabase } from '../../../../Utils/DateUtility';
import { sendMessageToChannel } from '../../../../services/TelegramSender';


const LeaveRequest = () => {
  const [name, setName] = useState<string>('');
  const [names, setNames] = useState<string[]>([]);
  const [namesSuggestions, setNamesSuggestions] = useState<string[]>([]);
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [remark, setRemark] = useState<string>('');

  useEffect(() => {
    const fetchNames = async () => {
      const { data, error } = await supabase
        .from('manpower')
        .select('nama');

      if (error) {
        console.error(error);
      } else {
        setNames(data?.map((item) => item.nama) || []);
      }
    };
    fetchNames();
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
    setName(newValue);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if `reportBy` exists in the `manpower` table
    const { data: manpowerData, error: fetchError } = await supabase
      .from('manpower')
      .select('nrp')
      .eq('nama', name);

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
      letter_id: startDateFormatted + employee.nrp,
      nrp: employee.nrp,
      date_leave_start: startDate ? startDateFormatted : '',
      date_leave_end: endDate ? endDateFormatted : '',
      remark: remark
    };

    const { error } = await supabase.from('leave').insert([query]);

    if (error) {
      if (error.code === '23505') {
        setErrorMessage("Anda Sudah membuat pengajuan hari ini");
      }
      else{
        setErrorMessage(error.message);
      }
      
    } else {
      alert('Data successfully submitted');
      setName('');
      setErrorMessage(null);
      setDateErrorMessage(null);
      setStartDate(null);
      setEndDate(null);
      const message = `PENGAJUAN CUTI\n\nDate Submit : ${formatDate(
        Date.now(),
      )}\nEmployee Name : ${name}\nDate Start : ${
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
      }\nRemark : ${remark}
      \nVisit : https://fff-project.vercel.app/cuti`;
      sendMessageToChannel(message);
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    setDateErrorMessage(null);
  };
  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    setDateErrorMessage(null);
  };

  const handleRemarkChange = (e:any) => {
    e.preventDefault();
    setRemark(e.target.value)
  };

  return (
    <div className="max-w-lg mx-auto p-5 font-sans bg-white dark:bg-boxdark">
      <h1 className="text-center text-2xl font-bold mb-5">
        Form Pengajuan Cuti
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="mb-2">
          <label className="block text-gray-700">Nama</label>
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
          {/* Your form fields and date pickers go here */}
          {errorMessage && <div className="text-red-500">{errorMessage}</div>}
        </div>

        <div className="my-4 text-gray-500">Input Tanggal Pengajuan Cuti</div>
        <DatePickerOne
          enabled={true}
          handleChange={handleStartDateChange}
          setValue={startDate ? moment(startDate).format('DD/MMM/YYYY') : ''}
        />

        <div className="my-1 text-gray-500">s/d</div>
        <DatePickerOne
          enabled={true}
          handleChange={handleEndDateChange}
          setValue={endDate ? moment(endDate).format('DD/MMM/YYYY') : ''}
        />
        {/* Your form fields and date pickers go here */}
        {dateErrorMessage && (
          <div className="text-red-500">{dateErrorMessage}</div>
        )}

        <div className="mt-4 mb-8">
          <label className="block text-gray-700">Keterangan :</label>
          <input type="text" onChange={handleRemarkChange} className="w-full p-2 rounded border-[1.5px] border-stroke" />
        </div>

        <button
          type="submit"
          className="bg-primary text-white py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default LeaveRequest;
