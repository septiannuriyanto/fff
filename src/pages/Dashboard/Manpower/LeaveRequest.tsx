import React, { useState, useEffect } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import DatePickerOne from '../../../components/Forms/DatePicker/DatePickerOne';
import moment from 'moment';

interface ManpowerData {
  nrp?: string;
  nama?: string;
}

const LeaveRequest = () => {
  const [name, setName] = useState<string>('');
  const [names, setNames] = useState<string[]>([]);
  const [namesSuggestions, setNamesSuggestions] = useState<string[]>([]);
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

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

  const handleSubmit = () => {};
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    setDateErrorMessage(null);
  };
  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    setDateErrorMessage(null);
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
          <input type="text" className="w-full p-2 rounded border-[1.5px] border-stroke" />
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
